"""
Pydantic schemas for API requests and responses
"""

from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

# Dataset schemas
class DatasetInfo(BaseModel):
    name: str
    size: int
    rows: int
    columns: int
    upload_date: float
    file_type: str = "csv"  # csv or parquet

class DatasetList(BaseModel):
    datasets: List[DatasetInfo]

# EDA schemas
class EDAResponse(BaseModel):
    dataset_name: str
    report_path: str
    report_url: str
    summary: Dict[str, Any]

# Training schemas
class TrainingRequest(BaseModel):
    dataset_name: str
    task_type: str  # "classification" or "regression"
    target_column: str
    algorithm: str
    test_size: float = 0.2
    random_state: int = 42
    exclude_columns: List[str] = []
    ohe_columns: List[str] = []
    scale_columns: List[str] = []
    null_handling: str = "drop"  # "drop", "fill", "mean", "median", "mode"
    null_fill_value: Optional[str] = None
    separator: str = ","  # CSV separator: ",", ";", "\t", etc.

class TrainingResponse(BaseModel):
    job_id: str
    status: str
    message: str

class TrainingResult(BaseModel):
    job_id: str
    status: str
    accuracy: Optional[float] = None
    metrics: Dict[str, Any]
    model_path: Optional[str] = None
    report_path: Optional[str] = None
    error: Optional[str] = None

# Export schemas
class ExportRequest(BaseModel):
    job_id: str
    format: str = "zip"  # "zip", "tar", "model"

class ExportResponse(BaseModel):
    download_url: str
    filename: str
    size: int

# Preprocessing schemas
class PreprocessingRequest(BaseModel):
    dataset_name: str
    preprocessing_options: Dict[str, Any] = {}
    ai_analysis: bool = True
    selected_suggestions: List[Dict[str, Any]] = []
    separator: str = ","

class PreprocessingResponse(BaseModel):
    job_id: str
    status: str
    message: str

class PreprocessingResult(BaseModel):
    job_id: str
    status: str
    dataset_name: str
    preprocessing_options: Dict[str, Any]
    ai_analysis: bool
    created_at: str
    completed_at: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# Manual preprocessing schemas
class ColumnSummary(BaseModel):
    name: str
    dtype: str
    non_null: int
    nulls: int
    unique: int
    zeros: int = 0
    sample_values: List[Any] = []
    stats: Dict[str, Any] = {}

class ManualPreviewResponse(BaseModel):
    dataset_name: str
    columns: List[ColumnSummary]
    target_column: Optional[str] = None
    class_balance: Optional[Dict[str, int]] = None

class ManualApplyOperations(BaseModel):
    drop_columns: List[str] = []
    change_types: Dict[str, str] = {}
    missing: Dict[str, Dict[str, Any]] = {}
    balance: Optional[Dict[str, Any]] = None  # e.g., { method: 'smote', target_column: 'y' }

class ManualApplyRequest(BaseModel):
    dataset_name: str
    operations: ManualApplyOperations
    separator: str = ","