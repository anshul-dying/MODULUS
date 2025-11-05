"""
Dataset management API endpoints
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from typing import List
import pandas as pd
import os
from ..schemas import DatasetInfo, DatasetList

router = APIRouter()

@router.get("/", response_model=DatasetList)
async def list_datasets():
    """List datasets from data/, data/uploads (CSV) and data/processed (Parquet)"""
    datasets = []

    # Helper to append a dataset entry safely
    def append_csv(path_dir: str, filename: str):
        filepath = os.path.join(path_dir, filename)
        try:
            df = pd.read_csv(filepath)
            datasets.append(DatasetInfo(
                name=filename,
                size=os.path.getsize(filepath),
                rows=len(df),
                columns=len(df.columns),
                upload_date=os.path.getctime(filepath),
                file_type="csv"
            ))
        except Exception as e:
            print(f"Error reading {filename} from {path_dir}: {e}")

    # CSVs in data/uploads
    uploads_dir = "data/uploads"
    if os.path.exists(uploads_dir):
        for filename in os.listdir(uploads_dir):
            if filename.endswith('.csv'):
                append_csv(uploads_dir, filename)

    # CSVs in data/ (exclude common subdirs)
    data_root = "data"
    exclude_dirs = {"uploads", "processed", "artifacts", "bin", "exports"}
    if os.path.exists(data_root):
        for filename in os.listdir(data_root):
            candidate_path = os.path.join(data_root, filename)
            if os.path.isdir(candidate_path) and filename in exclude_dirs:
                continue
            if filename.endswith('.csv'):
                append_csv(data_root, filename)

    # Parquet in data/processed
    processed_dir = "data/processed"
    if os.path.exists(processed_dir):
        for filename in os.listdir(processed_dir):
            if filename.endswith('.parquet'):
                filepath = os.path.join(processed_dir, filename)
                try:
                    df = pd.read_parquet(filepath)
                    datasets.append(DatasetInfo(
                        name=filename,
                        size=os.path.getsize(filepath),
                        rows=len(df),
                        columns=len(df.columns),
                        upload_date=os.path.getctime(filepath),
                        file_type="parquet"
                    ))
                except Exception as e:
                    print(f"Error reading {filename}: {e}")

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
        else:
            df_modified.to_csv(filepath, index=False, sep=separator)
        
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
    return {"message": "Dataset deleted successfully"}
