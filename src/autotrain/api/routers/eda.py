"""
Exploratory Data Analysis API endpoints
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from ..schemas import EDAResponse
import pandas as pd
import os
from ...services.eda_service import EDAService

router = APIRouter()
eda_service = EDAService()

@router.post("/generate/{dataset_name}", response_model=EDAResponse)
async def generate_eda_report(dataset_name: str):
    """Generate EDA report for a dataset"""
    # Resolve dataset location: uploads/, data/, or processed parquet
    filepath = f"data/uploads/{dataset_name}"
    if not os.path.exists(filepath):
        alt_path = f"data/{dataset_name}"
        if os.path.exists(alt_path):
            filepath = alt_path
        else:
            # Check if it's already a parquet file in processed directory
            if dataset_name.endswith('.parquet'):
                parquet_path = f"data/processed/{dataset_name}"
                if os.path.exists(parquet_path):
                    filepath = parquet_path
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
        # Load dataset (CSV or Parquet)
        if filepath.endswith('.parquet'):
            df = pd.read_parquet(filepath)
        else:
            df = pd.read_csv(filepath, low_memory=False)
        
        # Generate EDA report
        report_path = await eda_service.generate_report(df, dataset_name)
        
        # Get summary statistics (convert to JSON-serializable format)
        summary = {
            "shape": [int(x) for x in df.shape],
            "columns": df.columns.tolist(),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "missing_values": {col: int(count) for col, count in df.isnull().sum().items()},
            "numeric_summary": {}
        }
        
        # Add numeric summary if numeric columns exist
        try:
            numeric_cols = df.select_dtypes(include=['number']).columns
            if len(numeric_cols) > 0:
                numeric_summary = df[numeric_cols].describe()
                summary["numeric_summary"] = {
                    col: {
                        stat: float(value) if pd.notna(value) else None 
                        for stat, value in numeric_summary[col].items()
                    } 
                    for col in numeric_summary.columns
                }
        except Exception as e:
            print(f"Warning: Could not generate numeric summary: {e}")
            summary["numeric_summary"] = {}
        
        # Get the URL for the report
        report_filename = os.path.basename(report_path)
        report_url = f"/static/artifacts/{report_filename}"
        
        return EDAResponse(
            dataset_name=dataset_name,
            report_path=report_path,
            report_url=report_url,
            summary=summary
        )
    except Exception as e:
        print(f"Error in EDA generation: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating EDA report: {str(e)}")

@router.get("/report/{dataset_name}")
async def get_eda_report(dataset_name: str):
    """Get the EDA report for a dataset"""
    report_path = f"data/artifacts/eda_{dataset_name.replace('.csv', '')}.html"
    if not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail="EDA report not found")
    
    return {"report_path": report_path, "url": f"/static/{os.path.basename(report_path)}"}

@router.get("/reports")
async def list_eda_reports():
    """List all available EDA reports"""
    artifacts_dir = "data/artifacts"
    if not os.path.exists(artifacts_dir):
        return {"reports": []}
    
    reports = []
    for filename in os.listdir(artifacts_dir):
        if filename.startswith("eda_") and filename.endswith(".html"):
            filepath = os.path.join(artifacts_dir, filename)
            stat = os.stat(filepath)
            reports.append({
                "filename": filename,
                "dataset_name": filename.replace("eda_", "").replace(".html", ""),
                "size": stat.st_size,
                "created": stat.st_ctime,
                "url": f"/static/artifacts/{filename}"
            })
    
    return {"reports": sorted(reports, key=lambda x: x["created"], reverse=True)}

@router.get("/view/{filename}")
async def view_eda_report(filename: str):
    """Serve EDA report HTML file directly in browser"""
    filepath = f"data/artifacts/{filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="EDA report not found")
    
    return FileResponse(
        path=filepath,
        media_type='text/html'
    )

@router.delete("/reports/{filename}")
async def delete_eda_report(filename: str):
    """Delete an EDA report"""
    filepath = f"data/artifacts/{filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="EDA report not found")
    
    try:
        os.remove(filepath)
        return {"message": "EDA report deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete EDA report: {str(e)}")
