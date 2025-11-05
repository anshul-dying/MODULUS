"""
Data Preprocessing and Cleaning API endpoints
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from ..schemas import PreprocessingRequest, PreprocessingResponse, PreprocessingResult, ManualPreviewResponse, ManualApplyRequest
import pandas as pd
import os
import uuid
from datetime import datetime
from typing import Dict
from ...services.preprocessing_service import PreprocessingService
from ...services.ai_analysis_service import AIAnalysisService

router = APIRouter()
preprocessing_service = PreprocessingService()
ai_service = AIAnalysisService()

# In-memory storage for preprocessing jobs (in production, use Redis or database)
preprocessing_jobs = {}

@router.post("/start", response_model=PreprocessingResponse)
async def start_preprocessing(request: PreprocessingRequest, background_tasks: BackgroundTasks):
    """Start a new data preprocessing job"""
    # Resolve dataset location: uploads/, data/, or processed parquet
    filepath = f"data/uploads/{request.dataset_name}"
    if not os.path.exists(filepath):
        alt_path = f"data/{request.dataset_name}"
        if os.path.exists(alt_path):
            filepath = alt_path
        else:
            # If a parquet name is provided directly, check in processed
            if request.dataset_name.endswith('.parquet'):
                parquet_direct = f"data/processed/{request.dataset_name}"
                if os.path.exists(parquet_direct):
                    filepath = parquet_direct
                else:
                    raise HTTPException(status_code=404, detail="Dataset not found")
            else:
                # Try to find processed parquet version (same name, different extension)
                base_name = request.dataset_name
                if base_name.endswith('.csv'):
                    base_name = base_name[:-4]
                # Try new naming convention first (same name, different extension)
                parquet_path = f"data/processed/{base_name}.parquet"
                # Fallback to old naming convention for backward compatibility
                if not os.path.exists(parquet_path):
                    old_parquet_path = f"data/processed/processed_{base_name}.parquet"
                    if os.path.exists(old_parquet_path):
                        parquet_path = old_parquet_path
                    else:
                        raise HTTPException(status_code=404, detail="Dataset not found")
                filepath = parquet_path
    
    job_id = str(uuid.uuid4())
    
    # Store job info
    preprocessing_jobs[job_id] = {
        "job_id": job_id,
        "status": "running",
        "dataset_name": request.dataset_name,
        "preprocessing_options": request.preprocessing_options,
        "ai_analysis": request.ai_analysis,
        "created_at": datetime.now().isoformat()
    }
    
    # Start preprocessing in background
    background_tasks.add_task(
        run_preprocessing,
        job_id,
        request
    )
    
    return PreprocessingResponse(
        job_id=job_id,
        status="started",
        message="Preprocessing job started"
    )

@router.get("/status/{job_id}", response_model=PreprocessingResult)
async def get_preprocessing_status(job_id: str):
    """Get the status of a preprocessing job"""
    try:
        if job_id not in preprocessing_jobs:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job_data = preprocessing_jobs[job_id]
        print(f"📊 Job {job_id} status: {job_data.get('status', 'unknown')}")
        
        return job_data
    except Exception as e:
        print(f"❌ Error getting job status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get job status: {str(e)}")

@router.get("/jobs")
async def list_preprocessing_jobs():
    """List all preprocessing jobs"""
    # Convert numpy types to native Python types for JSON serialization
    jobs_list = []
    for job in preprocessing_jobs.values():
        job_copy = job.copy()
        # Convert result dict if present
        if "result" in job_copy and job_copy["result"]:
            result = job_copy["result"]
            if isinstance(result, dict):
                # Ensure all numpy types are converted
                if "original_shape" in result and result["original_shape"]:
                    result["original_shape"] = tuple(int(x) for x in result["original_shape"]) if isinstance(result["original_shape"], tuple) else result["original_shape"]
                if "final_shape" in result and result["final_shape"]:
                    result["final_shape"] = tuple(int(x) for x in result["final_shape"]) if isinstance(result["final_shape"], tuple) else result["final_shape"]
        jobs_list.append(job_copy)
    return {"jobs": jobs_list}

@router.get("/manual/preview/{dataset_name}", response_model=ManualPreviewResponse)
async def manual_preview(dataset_name: str, target_column: str = None, separator: str = ","):
    """Return column summaries and optional class balance for manual preprocessing UI"""
    # Resolve dataset path (CSV or Parquet)
    filepath = f"data/uploads/{dataset_name}"
    if not os.path.exists(filepath):
        alt_path = f"data/{dataset_name}"
        if os.path.exists(alt_path):
            filepath = alt_path
        else:
            if dataset_name.endswith('.parquet'):
                parquet_direct = f"data/processed/{dataset_name}"
                if os.path.exists(parquet_direct):
                    filepath = parquet_direct
                else:
                    raise HTTPException(status_code=404, detail="Dataset not found")
            else:
                # Try to find processed parquet version (same name, different extension)
                base_name = dataset_name
                if base_name.endswith('.csv'):
                    base_name = base_name[:-4]
                # Try new naming convention first (same name, different extension)
                parquet_path = f"data/processed/{base_name}.parquet"
                # Fallback to old naming convention for backward compatibility
                if not os.path.exists(parquet_path):
                    old_parquet_path = f"data/processed/processed_{base_name}.parquet"
                    if os.path.exists(old_parquet_path):
                        parquet_path = old_parquet_path
                    else:
                        raise HTTPException(status_code=404, detail="Dataset not found")
                filepath = parquet_path

    # Load dataset
    if filepath.endswith('.parquet'):
        df = pd.read_parquet(filepath)
    else:
        df = pd.read_csv(filepath, sep=separator, low_memory=False)

    columns = []
    for col in df.columns:
        series = df[col]
        # Calculate zeros for numeric columns
        zeros = 0
        if pd.api.types.is_numeric_dtype(series):
            zeros = int((series == 0).sum())
        
        summary = {
            "name": col,
            "dtype": str(series.dtype),
            "non_null": int(series.notnull().sum()),
            "nulls": int(series.isnull().sum()),
            "unique": int(series.nunique(dropna=True)),
            "zeros": zeros,
            "sample_values": [
                float(series.dropna().iloc[i]) if pd.api.types.is_numeric_dtype(series) and i < len(series.dropna()) 
                else str(series.dropna().iloc[i]) if i < len(series.dropna())
                else None
                for i in range(min(5, len(series.dropna())))
            ],
            "stats": {}
        }
        if pd.api.types.is_numeric_dtype(series):
            desc = series.describe()
            summary["stats"] = {k: (float(v) if pd.notna(v) else None) for k, v in desc.items()}
        columns.append(summary)

    class_balance = None
    if target_column and target_column in df.columns:
        counts = df[target_column].value_counts(dropna=False).to_dict()
        class_balance = {str(k): int(v) for k, v in counts.items()}

    return {
        "dataset_name": dataset_name,
        "columns": columns,
        "target_column": target_column,
        "class_balance": class_balance
    }

@router.post("/manual/apply")
async def manual_apply(request: ManualApplyRequest, background_tasks: BackgroundTasks):
    """Apply manual preprocessing operations and enqueue processing"""
    job_id = str(uuid.uuid4())
    preprocessing_jobs[job_id] = {
        "job_id": job_id,
        "status": "running",
        "dataset_name": request.dataset_name,
        "preprocessing_options": {
            "manual_operations": request.operations.dict()
        },
        "ai_analysis": False,
        "created_at": datetime.now().isoformat()
    }

    background_tasks.add_task(
        run_preprocessing,
        job_id,
        PreprocessingRequest(
            dataset_name=request.dataset_name,
            preprocessing_options={ "manual_operations": request.operations.dict() },
            ai_analysis=False,
            selected_suggestions=[],
            separator=request.separator
        )
    )

    return PreprocessingResponse(
        job_id=job_id,
        status="started",
        message="Manual operations applied and preprocessing started"
    )

@router.post("/ai-analyze/{dataset_name}")
async def ai_analyze_for_preprocessing(dataset_name: str):
    """Use AI to analyze dataset and suggest preprocessing steps"""
    # Resolve dataset location: uploads/, data/, or processed parquet
    filepath = f"data/uploads/{dataset_name}"
    if not os.path.exists(filepath):
        alt_path = f"data/{dataset_name}"
        if os.path.exists(alt_path):
            filepath = alt_path
        else:
            # If a parquet name is provided directly, check in processed
            if dataset_name.endswith('.parquet'):
                parquet_direct = f"data/processed/{dataset_name}"
                if os.path.exists(parquet_direct):
                    filepath = parquet_direct
                else:
                    raise HTTPException(status_code=404, detail="Dataset not found")
            else:
                # Try to find processed parquet version (same name, different extension)
                base_name = dataset_name
                if base_name.endswith('.csv'):
                    base_name = base_name[:-4]
                # Try new naming convention first (same name, different extension)
                parquet_path = f"data/processed/{base_name}.parquet"
                # Fallback to old naming convention for backward compatibility
                if not os.path.exists(parquet_path):
                    old_parquet_path = f"data/processed/processed_{base_name}.parquet"
                    if os.path.exists(old_parquet_path):
                        parquet_path = old_parquet_path
                    else:
                        raise HTTPException(status_code=404, detail="Dataset not found")
                filepath = parquet_path
    
    try:
        # Load dataset (CSV or Parquet)
        if filepath.endswith('.parquet'):
            df = pd.read_parquet(filepath)
        else:
            df = pd.read_csv(filepath, low_memory=False)
        
        # Get AI analysis
        analysis = await ai_service.analyze_dataset_for_preprocessing(df, dataset_name)
        
        return {
            "dataset_name": dataset_name,
            "analysis": analysis,
            "preprocessing_suggestions": analysis.get("preprocessing_suggestions", []),
            "suggested_preprocessing": analysis.get("preprocessing_suggestions", []),
            "data_quality_score": analysis.get("data_quality_score", 0),
            "issues_found": analysis.get("issues_found", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

@router.get("/download/{job_id}")
async def download_processed_data(job_id: str):
    """Download the processed dataset"""
    if job_id not in preprocessing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = preprocessing_jobs[job_id]
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job not completed yet")
    
    # Look for the processed file - check job result first, then construct filename
    processed_path = job.get("processed_path")
    if not processed_path:
        # Fallback: construct filename (keep same name, change extension)
        base_name = job['dataset_name']
        if base_name.endswith('.csv'):
            base_name = base_name[:-4]
        elif base_name.endswith('.parquet'):
            base_name = base_name[:-8]
        processed_filename = f"{base_name}.parquet"
        processed_path = f"data/processed/{processed_filename}"
    
    if not os.path.exists(processed_path):
        raise HTTPException(status_code=404, detail=f"Processed file not found at {processed_path}")
    
    return FileResponse(
        processed_path,
        filename=processed_filename,
        media_type='application/octet-stream'
    )

@router.get("/reports/{job_id}")
async def get_preprocessing_report(job_id: str):
    """Get the preprocessing report"""
    # Clean job_id - remove .html extension if present
    if job_id.endswith('.html'):
        job_id = job_id[:-5]  # Remove .html extension
    
    # First, try to get report path from job if it exists in memory
    report_path = None
    if job_id in preprocessing_jobs:
        job = preprocessing_jobs[job_id]
        if job.get("status") != "completed":
            raise HTTPException(status_code=400, detail="Job not completed yet")
        # Try to get report path from job result
        report_path = job.get("report_path")
    
    # If not found in job, try default naming convention
    if not report_path:
        report_path = f"data/artifacts/preprocessing_report_{job_id}.html"
    
    # Check if report file exists
    if not os.path.exists(report_path):
        # Try searching the artifacts directory for any matching file
        artifacts_dir = "data/artifacts"
        if os.path.exists(artifacts_dir):
            for filename in os.listdir(artifacts_dir):
                if filename.startswith(f"preprocessing_report_{job_id}"):
                    report_path = os.path.join(artifacts_dir, filename)
                    print(f"📄 Found report file: {report_path}")
                    break
        
        # If still not found, raise error
        if not os.path.exists(report_path):
            print(f"❌ Report not found for job_id: {job_id}")
            print(f"   Tried path: {report_path}")
            # List available reports for debugging
            if os.path.exists(artifacts_dir):
                available = [f for f in os.listdir(artifacts_dir) if f.startswith("preprocessing_report_")]
                print(f"   Available reports: {available[:5]}")  # Show first 5
            raise HTTPException(status_code=404, detail=f"Preprocessing report not found for job {job_id}. The report file may not exist or the job may not have completed successfully.")
    
    print(f"✅ Serving report: {report_path}")
    return FileResponse(report_path, media_type='text/html', headers={"Content-Disposition": f'inline; filename="preprocessing_report_{job_id}.html"'})

@router.get("/reports")
async def list_preprocessing_reports():
    """List all available preprocessing reports"""
    artifacts_dir = "data/artifacts"
    if not os.path.exists(artifacts_dir):
        return {"reports": []}
    
    reports = []
    for filename in os.listdir(artifacts_dir):
        if filename.startswith("preprocessing_report_") and filename.endswith(".html"):
            filepath = os.path.join(artifacts_dir, filename)
            stat = os.stat(filepath)
            job_id = filename.replace("preprocessing_report_", "").replace(".html", "")
            
            # Get job info if available
            job_info = {}
            if job_id in preprocessing_jobs:
                job_data = preprocessing_jobs[job_id]
                job_info = {
                    "dataset_name": job_data.get("dataset_name", "Unknown"),
                    "status": job_data.get("status", "Unknown"),
                    "created_at": job_data.get("created_at", ""),
                    "completed_at": job_data.get("completed_at", "")
                }
            
            reports.append({
                "filename": filename,
                "job_id": job_id,
                "size": stat.st_size,
                "created": stat.st_ctime,
                "url": f"/api/preprocessing/reports/{job_id}",
                **job_info
            })
    
    return {"reports": sorted(reports, key=lambda x: x["created"], reverse=True)}

@router.get("/view/{filename}")
async def view_preprocessing_report(filename: str):
    """Serve preprocessing report HTML file directly in browser"""
    # Ensure it's a preprocessing report, not an EDA report
    if not filename.startswith("preprocessing_report_") or not filename.endswith(".html"):
        raise HTTPException(status_code=400, detail="Invalid preprocessing report filename")
    
    filepath = f"data/artifacts/{filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Preprocessing report not found")
    
    return FileResponse(
        path=filepath,
        media_type='text/html',
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )

@router.post("/manual")
async def start_manual_preprocessing(
    dataset_name: str,
    handle_missing_values: bool = False,
    missing_values_method: str = "mean",
    handle_outliers: bool = False,
    remove_duplicates: bool = False,
    convert_data_types: bool = False,
    data_types: Dict[str, str] = {},
    background_tasks: BackgroundTasks = None
):
    """Start manual preprocessing with specific options"""
    # Resolve dataset location: uploads/, data/, or processed parquet
    filepath = f"data/uploads/{dataset_name}"
    if not os.path.exists(filepath):
        alt_path = f"data/{dataset_name}"
        if os.path.exists(alt_path):
            filepath = alt_path
        else:
            # If a parquet name is provided directly, check in processed
            if dataset_name.endswith('.parquet'):
                parquet_direct = f"data/processed/{dataset_name}"
                if os.path.exists(parquet_direct):
                    filepath = parquet_direct
                else:
                    raise HTTPException(status_code=404, detail="Dataset not found")
            else:
                # Try to find processed parquet version (same name, different extension)
                base_name = dataset_name
                if base_name.endswith('.csv'):
                    base_name = base_name[:-4]
                # Try new naming convention first (same name, different extension)
                parquet_path = f"data/processed/{base_name}.parquet"
                # Fallback to old naming convention for backward compatibility
                if not os.path.exists(parquet_path):
                    old_parquet_path = f"data/processed/processed_{base_name}.parquet"
                    if os.path.exists(old_parquet_path):
                        parquet_path = old_parquet_path
                    else:
                        raise HTTPException(status_code=404, detail="Dataset not found")
                filepath = parquet_path
    
    # Create preprocessing request
    preprocessing_options = {
        "handle_missing_values": handle_missing_values,
        "missing_values_method": missing_values_method,
        "handle_outliers": handle_outliers,
        "remove_duplicates": remove_duplicates,
        "convert_data_types": convert_data_types,
        "data_types": data_types
    }
    
    request = PreprocessingRequest(
        dataset_name=dataset_name,
        preprocessing_options=preprocessing_options,
        ai_analysis=False,
        selected_suggestions=[]
    )
    
    job_id = str(uuid.uuid4())
    
    # Store job info
    preprocessing_jobs[job_id] = {
        "job_id": job_id,
        "status": "running",
        "dataset_name": dataset_name,
        "preprocessing_options": preprocessing_options,
        "ai_analysis": False,
        "created_at": datetime.now().isoformat()
    }
    
    # Start preprocessing in background
    background_tasks.add_task(
        run_preprocessing,
        job_id,
        request
    )
    
    return PreprocessingResponse(
        job_id=job_id,
        status="started",
        message="Manual preprocessing job started"
    )

@router.delete("/reports/{filename}")
async def delete_preprocessing_report(filename: str):
    """Delete a preprocessing report"""
    filepath = f"data/artifacts/{filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Preprocessing report not found")
    
    try:
        os.remove(filepath)
        return {"message": "Preprocessing report deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete preprocessing report: {str(e)}")

async def run_preprocessing(job_id: str, request: PreprocessingRequest):
    """Background task to run preprocessing"""
    try:
        print(f"🚀 Starting preprocessing job {job_id}")
        preprocessing_jobs[job_id]["status"] = "running"
        
        # Run preprocessing
        result = await preprocessing_service.process_dataset(
            request.dataset_name,
            request.preprocessing_options,
            request.ai_analysis,
            request.selected_suggestions,
            job_id
        )
        
        print(f"✅ Preprocessing job {job_id} completed successfully")
        preprocessing_jobs[job_id].update({
            "status": "completed",
            "result": result,
            "completed_at": datetime.now().isoformat(),
            "report_path": result.get("report_path", ""),
            "report_filename": result.get("report_filename", ""),
            "processed_file": result.get("processed_file", ""),
            "processed_path": result.get("processed_path", "")
        })
        print(f"📊 Job {job_id} updated with report_path: {result.get('report_path', 'N/A')}")
        
    except Exception as e:
        error_msg = f"Preprocessing failed: {str(e)}"
        print(f"❌ Preprocessing job {job_id} failed: {error_msg}")
        preprocessing_jobs[job_id].update({
            "status": "failed",
            "error": error_msg,
            "failed_at": datetime.now().isoformat()
        })

