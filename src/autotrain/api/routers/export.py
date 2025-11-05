"""
Model export API endpoints
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from ..schemas import ExportRequest, ExportResponse
import os
import zipfile
import shutil
from datetime import datetime

router = APIRouter()

@router.post("/model", response_model=ExportResponse)
async def export_model(request: ExportRequest):
    """Export a trained model and artifacts"""
    from .training import training_jobs
    
    # Get job info
    if request.job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Training job not found")
    
    job = training_jobs[request.job_id]
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Can only export completed training jobs")
    
    # Create exports directory if it doesn't exist
    exports_dir = "data/exports"
    os.makedirs(exports_dir, exist_ok=True)
    
    # Create export package
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_filename = f"model_export_{request.job_id}_{timestamp}.zip"
    export_path = f"{exports_dir}/{export_filename}"
    
    # Create zip file with model and related files
    with zipfile.ZipFile(export_path, 'w') as zipf:
        # Add model file if it exists
        if job.get("model_path") and os.path.exists(job["model_path"]):
            zipf.write(job["model_path"], "model.pkl")
        
        # Add report file if it exists
        if job.get("report_path") and os.path.exists(job["report_path"]):
            zipf.write(job["report_path"], "training_report.html")
        
        # Add job metadata
        metadata = {
            "job_id": request.job_id,
            "dataset_name": job["dataset_name"],
            "algorithm": job["algorithm"],
            "target_column": job["target_column"],
            "task_type": job["task_type"],
            "accuracy": job.get("accuracy"),
            "metrics": job.get("metrics", {}),
            "created_at": job["created_at"]
        }
        
        import json
        zipf.writestr("metadata.json", json.dumps(metadata, indent=2))
    
    return ExportResponse(
        download_url=f"/api/export/download/{export_filename}",
        filename=export_filename,
        size=os.path.getsize(export_path)
    )

@router.get("/download/{filename}")
async def download_export(filename: str):
    """Download an exported model package"""
    filepath = f"data/exports/{filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Export file not found")
    
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type='application/zip'
    )

@router.get("/list")
async def list_exports():
    """List all available exports"""
    exports_dir = "data/exports"
    if not os.path.exists(exports_dir):
        os.makedirs(exports_dir, exist_ok=True)
        return {"exports": []}
    
    exports = []
    try:
        for filename in os.listdir(exports_dir):
            if filename.endswith('.zip'):
                filepath = os.path.join(exports_dir, filename)
                # Extract job_id from filename for display
                job_id = filename.split('_')[2] if '_' in filename else 'unknown'
                exports.append({
                    "filename": filename,
                    "model_name": f"Model {job_id}",
                    "size": os.path.getsize(filepath),
                    "created": os.path.getctime(filepath),
                    "url": f"/api/export/download/{filename}"
                })
    except Exception as e:
        print(f"Error listing exports: {e}")
        return {"exports": []}
    
    return {"exports": exports}

@router.delete("/{filename}")
async def delete_export(filename: str):
    """Delete a model export"""
    filepath = f"data/exports/{filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Export not found")
    
    try:
        os.remove(filepath)
        return {"message": "Export deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete export: {str(e)}")
