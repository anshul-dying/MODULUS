"""
Dataset management API endpoints
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from typing import List, Tuple, Optional, Dict
import pandas as pd
import os
import csv
import json
from datetime import datetime
from threading import Lock
from ..schemas import DatasetInfo, DatasetList

router = APIRouter()

METADATA_DIR = "data/.metadata"
METADATA_FILE = os.path.join(METADATA_DIR, "datasets.json")
os.makedirs(METADATA_DIR, exist_ok=True)
_metadata_lock = Lock()

def _load_metadata_store() -> Dict[str, Dict]:
    if os.path.exists(METADATA_FILE):
        try:
            with open(METADATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception as e:
            print(f"Warning: Failed to load dataset metadata store: {e}")
    return {}

def _save_metadata_store(store: Dict[str, Dict]) -> None:
    try:
        with open(METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(store, f, indent=2)
    except Exception as e:
        print(f"Warning: Failed to save dataset metadata store: {e}")

_metadata_store = _load_metadata_store()

def _metadata_key(filepath: str) -> str:
    return os.path.abspath(filepath).replace("\\", "/")

def _detect_csv_delimiter(filepath: str) -> str:
    try:
        with open(filepath, "r", newline="", encoding="utf-8", errors="ignore") as f:
            sample = f.read(8192)
            f.seek(0)
            dialect = csv.Sniffer().sniff(sample, delimiters=[",", ";", "\t", "|"])
            return dialect.delimiter
    except Exception:
        return ","

def _compute_csv_metadata(filepath: str) -> Tuple[int, int, str]:
    delimiter = _detect_csv_delimiter(filepath)
    rows = 0
    columns = 0
    try:
        with open(filepath, "r", newline="", encoding="utf-8", errors="ignore") as f:
            reader = csv.reader(f, delimiter=delimiter)
            headers = next(reader, [])
            columns = len(headers)
            for _ in reader:
                rows += 1
    except Exception as e:
        print(f"Warning: Could not compute CSV metadata for {filepath}: {e}")
    return rows, columns, delimiter

def _compute_parquet_metadata(filepath: str) -> Tuple[int, int]:
    try:
        df = pd.read_parquet(filepath)
        return len(df), len(df.columns)
    except Exception as e:
        print(f"Warning: Could not compute Parquet metadata for {filepath}: {e}")
        return 0, 0

def _get_or_refresh_metadata(filepath: str, file_type: str) -> Dict[str, Optional[int]]:
    global _metadata_store
    key = _metadata_key(filepath)
    try:
        stat = os.stat(filepath)
    except FileNotFoundError:
        return {"rows": 0, "columns": 0, "size": 0, "file_type": file_type}

    needs_refresh = True
    existing = _metadata_store.get(key)
    if existing:
        stored_mtime = existing.get("modified_at")
        stored_size = existing.get("size")
        if stored_mtime == stat.st_mtime and stored_size == stat.st_size:
            needs_refresh = False

    if not needs_refresh:
        return existing

    if file_type == "csv":
        rows, columns, delimiter = _compute_csv_metadata(filepath)
    else:
        rows, columns = _compute_parquet_metadata(filepath)
        delimiter = None

    metadata = {
        "name": os.path.basename(filepath),
        "file_type": file_type,
        "rows": rows,
        "columns": columns,
        "size": stat.st_size,
        "modified_at": stat.st_mtime,
        "detected_separator": delimiter,
        "updated_at": datetime.utcnow().isoformat()
    }

    with _metadata_lock:
        _metadata_store[key] = metadata
        _save_metadata_store(_metadata_store)

    return metadata

def _invalidate_metadata(filepath: str):
    global _metadata_store
    key = _metadata_key(filepath)
    with _metadata_lock:
        if key in _metadata_store:
            _metadata_store.pop(key, None)
            _save_metadata_store(_metadata_store)

@router.get("/", response_model=DatasetList)
async def list_datasets():
    """List datasets from data/, data/uploads (CSV) and data/processed (Parquet)"""
    datasets = []

    # Helper to append a dataset entry safely
    def append_csv(path_dir: str, filename: str):
        filepath = os.path.join(path_dir, filename)
        if not os.path.exists(filepath):
            return
        metadata = _get_or_refresh_metadata(filepath, "csv")
        datasets.append(DatasetInfo(
            name=filename,
            size=metadata.get("size", 0),
            rows=metadata.get("rows", 0),
            columns=metadata.get("columns", 0),
            upload_date=os.path.getctime(filepath),
            file_type="csv"
        ))

    # CSVs in data/uploads
    uploads_dir = "data/uploads"
    if os.path.exists(uploads_dir):
        for filename in os.listdir(uploads_dir):
            if filename.lower().endswith('.csv'):
                append_csv(uploads_dir, filename)

    # CSVs in data/ (exclude common subdirs)
    data_root = "data"
    exclude_dirs = {"uploads", "processed", "artifacts", "bin", "exports"}
    if os.path.exists(data_root):
        for filename in os.listdir(data_root):
            candidate_path = os.path.join(data_root, filename)
            if os.path.isdir(candidate_path) and filename in exclude_dirs:
                continue
            if filename.lower().endswith('.csv'):
                append_csv(data_root, filename)

    # Parquet in data/processed
    processed_dir = "data/processed"
    if os.path.exists(processed_dir):
        for filename in os.listdir(processed_dir):
            if filename.lower().endswith('.parquet'):
                filepath = os.path.join(processed_dir, filename)
                if not os.path.exists(filepath):
                    continue
                metadata = _get_or_refresh_metadata(filepath, "parquet")
                datasets.append(DatasetInfo(
                    name=filename,
                    size=metadata.get("size", 0),
                    rows=metadata.get("rows", 0),
                    columns=metadata.get("columns", 0),
                    upload_date=os.path.getctime(filepath),
                    file_type="parquet"
                ))

    return DatasetList(datasets=datasets)

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...), separator: str = ","):
    """Upload a new dataset"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    # Create uploads directory if it doesn't exist
    os.makedirs("data/uploads", exist_ok=True)
    
    # Save file
    filepath = f"data/uploads/{file.filename}"
    with open(filepath, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Validate CSV with specified separator
    try:
        df = pd.read_csv(filepath, sep=separator)
        _get_or_refresh_metadata(filepath, "csv")
        return {
            "message": "Dataset uploaded successfully",
            "filename": file.filename,
            "rows": len(df),
            "columns": len(df.columns),
            "separator": separator
        }
    except Exception as e:
        os.remove(filepath)
        raise HTTPException(status_code=400, detail=f"Invalid CSV file with separator '{separator}': {str(e)}")

@router.get("/{dataset_name}")
async def get_dataset_info(dataset_name: str, separator: str = ","):
    """Get information about a specific dataset (CSV in data/ or uploads, or Parquet in processed)"""
    # Check if it's a parquet file in processed directory
    if dataset_name.endswith('.parquet'):
        filepath = f"data/processed/{dataset_name}"
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        try:
            df = pd.read_parquet(filepath)
            return {
                "name": dataset_name,
                "rows": len(df),
                "columns": len(df.columns),
                "column_names": df.columns.tolist(),
                "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
                "sample_data": df.head().fillna('').to_dict('records'),
                "file_type": "parquet"
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading parquet dataset: {str(e)}")
    
    # Check CSV file in uploads directory, then in data/
    filepath = f"data/uploads/{dataset_name}"
    if not os.path.exists(filepath):
        alt_path = f"data/{dataset_name}"
        if os.path.exists(alt_path):
            filepath = alt_path
        else:
            raise HTTPException(status_code=404, detail="Dataset not found")
    
    try:
        df = pd.read_csv(filepath, sep=separator)
        return {
            "name": dataset_name,
            "rows": len(df),
            "columns": len(df.columns),
            "column_names": df.columns.tolist(),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "sample_data": df.head().fillna('').to_dict('records'),
            "separator": separator,
            "file_type": "csv"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading dataset with separator '{separator}': {str(e)}")

@router.get("/{dataset_name}/download")
async def download_dataset(dataset_name: str):
    """Download a dataset file (CSV from data/ or uploads, Parquet from processed)"""
    # Parquet in processed
    if dataset_name.endswith('.parquet'):
        parquet_path = f"data/processed/{dataset_name}"
        if not os.path.exists(parquet_path):
            raise HTTPException(status_code=404, detail="Dataset not found")
        return FileResponse(
            path=parquet_path,
            filename=dataset_name,
            media_type='application/octet-stream'
        )

    # CSV in uploads or data/
    filepath = f"data/uploads/{dataset_name}"
    if not os.path.exists(filepath):
        alt_path = f"data/{dataset_name}"
        if os.path.exists(alt_path):
            filepath = alt_path
        else:
            raise HTTPException(status_code=404, detail="Dataset not found")
    return FileResponse(
        path=filepath,
        filename=dataset_name,
        media_type='text/csv'
    )

@router.get("/{dataset_name}/preview")
async def preview_dataset(dataset_name: str, limit: int = 10):
    """Get a preview of the dataset (first N rows) for CSV or Parquet"""
    # Parquet in processed
    if dataset_name.endswith('.parquet'):
        parquet_path = f"data/processed/{dataset_name}"
        if not os.path.exists(parquet_path):
            raise HTTPException(status_code=404, detail="Dataset not found")
        try:
            df = pd.read_parquet(parquet_path)
            preview_data = df.head(limit).fillna('').to_dict('records')
            return {
                "preview": preview_data,
                "total_rows": len(df),
                "columns": df.columns.tolist()
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading dataset: {str(e)}")

    # CSV in uploads or data/
    filepath = f"data/uploads/{dataset_name}"
    if not os.path.exists(filepath):
        alt_path = f"data/{dataset_name}"
        if os.path.exists(alt_path):
            filepath = alt_path
        else:
            raise HTTPException(status_code=404, detail="Dataset not found")
    try:
        df = pd.read_csv(filepath)
        preview_data = df.head(limit).fillna('').to_dict('records')
        return {
            "preview": preview_data,
            "total_rows": len(df),
            "columns": df.columns.tolist()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading dataset: {str(e)}")

@router.post("/preview-columns")
async def preview_columns(file: UploadFile = File(...), separator: str = ","):
    """Preview columns of a CSV file before upload"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    try:
        # Read the file content
        content = await file.read()
        
        # Create a temporary file to read with pandas
        import tempfile
        with tempfile.NamedTemporaryFile(mode='wb', suffix='.csv', delete=False) as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            df = pd.read_csv(temp_file_path, sep=separator)
            return {
                "columns": df.columns.tolist(),
                "rows": len(df),
                "sample_data": df.head(3).to_dict('records')
            }
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV file: {str(e)}")

@router.post("/{dataset_name}/drop-columns")
async def drop_columns(dataset_name: str, columns_to_drop: str = Form(...), separator: str = Form(",")):
    """Drop specified columns from a dataset"""
    # Resolve dataset location: uploads/, data/, or processed parquet
    filepath = f"data/uploads/{dataset_name}"
    if not os.path.exists(filepath):
        alt_path = f"data/{dataset_name}"
        if os.path.exists(alt_path):
            filepath = alt_path
        else:
            # Check if it's already a parquet file in processed directory
            if dataset_name.endswith('.parquet'):
                parquet_direct = f"data/processed/{dataset_name}"
                if os.path.exists(parquet_direct):
                    filepath = parquet_direct
                else:
                    raise HTTPException(status_code=404, detail="Dataset not found")
            else:
                # Try to find processed parquet version derived from CSV name
                parquet_name = dataset_name.replace('.csv', '.parquet')
                parquet_path = f"data/processed/processed_{parquet_name}"
                if os.path.exists(parquet_path):
                    filepath = parquet_path
                else:
                    raise HTTPException(status_code=404, detail="Dataset not found")
    
    try:
        # Read the dataset (CSV or Parquet)
        if filepath.endswith('.parquet'):
            df = pd.read_parquet(filepath)
        else:
            df = pd.read_csv(filepath, sep=separator)
        
        # Parse columns to drop
        columns_to_drop_list = [col.strip() for col in columns_to_drop.split(',') if col.strip()]
        existing_columns = [col for col in columns_to_drop_list if col in df.columns]
        
        if not existing_columns:
            raise HTTPException(status_code=400, detail="No valid columns found to drop")
        
        # Drop the columns
        df_modified = df.drop(columns=existing_columns)
        
        # Save the modified dataset (preserve original format)
        if filepath.endswith('.parquet'):
            df_modified.to_parquet(filepath, index=False)
            _invalidate_metadata(filepath)
            _get_or_refresh_metadata(filepath, "parquet")
        else:
            df_modified.to_csv(filepath, index=False, sep=separator)
            _invalidate_metadata(filepath)
            _get_or_refresh_metadata(filepath, "csv")
        
        return {
            "message": "Columns dropped successfully",
            "columns_dropped": existing_columns,
            "remaining_columns": len(df_modified.columns),
            "rows": len(df_modified)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error dropping columns: {str(e)}")

@router.delete("/{dataset_name}")
async def delete_dataset(dataset_name: str):
    """Delete a dataset (CSV in data/ or uploads, or Parquet in processed)"""
    # Parquet in processed
    if dataset_name.endswith('.parquet'):
        parquet_path = f"data/processed/{dataset_name}"
        if not os.path.exists(parquet_path):
            raise HTTPException(status_code=404, detail="Dataset not found")
        os.remove(parquet_path)
        _invalidate_metadata(parquet_path)
        return {"message": "Processed dataset deleted successfully"}

    # CSV in uploads or data/
    csv_path = f"data/uploads/{dataset_name}"
    if not os.path.exists(csv_path):
        alt_csv = f"data/{dataset_name}"
        if os.path.exists(alt_csv):
            csv_path = alt_csv
        else:
            raise HTTPException(status_code=404, detail="Dataset not found")
    os.remove(csv_path)
    _invalidate_metadata(csv_path)
    return {"message": "Dataset deleted successfully"}
