"""
Data Preprocessing Service
Handles AI-powered data cleaning and preprocessing
"""

import pandas as pd
import numpy as np
import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from ..services.ai_analysis_service import AIAnalysisService
from ..core.config import get_settings
from imblearn.over_sampling import SMOTE


def convert_numpy_types(obj):
    """Convert numpy types to native Python types for JSON serialization"""
    if isinstance(obj, (np.integer, np.int_, np.intc, np.intp, np.int8,
                        np.int16, np.int32, np.int64, np.uint8, np.uint16,
                        np.uint32, np.uint64)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float_, np.float16, np.float32, np.float64)):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, tuple):
        return tuple(convert_numpy_types(item) for item in obj)
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    return obj

class PreprocessingService:
    def __init__(self):
        self.ai_service = AIAnalysisService()
        self.settings = get_settings()
    
    async def process_dataset(
        self, 
        dataset_name: str, 
        preprocessing_options: Dict[str, Any] = None,
        ai_analysis: bool = True,
        selected_suggestions: List[Dict[str, Any]] = None,
        job_id: str = None
    ) -> Dict[str, Any]:
        """
        Process a dataset with AI suggestions and manual options
        """
        try:
            print(f"🚀 Starting preprocessing for {dataset_name}")
            
            # Resolve dataset location: uploads/, data/, or processed parquet
            filepath = f"data/uploads/{dataset_name}"
            source_is_uploads = True
            if not os.path.exists(filepath):
                source_is_uploads = False
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
                            raise FileNotFoundError(f"Dataset not found: {dataset_name}")
                    else:
                        # Try to find processed parquet version derived from CSV name
                        parquet_name = dataset_name.replace('.csv', '.parquet')
                        parquet_path = f"data/processed/processed_{parquet_name}"
                        if os.path.exists(parquet_path):
                            filepath = parquet_path
                        else:
                            raise FileNotFoundError(f"Dataset not found: {dataset_name}")
            
            # Load dataset (CSV or Parquet)
            if filepath.endswith('.parquet'):
                df = pd.read_parquet(filepath)
            else:
                df = pd.read_csv(filepath, low_memory=False)
            original_shape = df.shape
            print(f"📊 Original dataset shape: {original_shape}")
            
            # Initialize preprocessing log
            preprocessing_log = {
                "job_id": job_id,
                "dataset_name": dataset_name,
                "original_shape": original_shape,
                "steps_applied": [],
                "ai_suggestions": [],
                "manual_options": preprocessing_options or {},
                "final_shape": None,
                "quality_improvements": {},
                "processing_time": None
            }
            
            start_time = datetime.now()
            
            # Apply AI suggestions if provided
            if selected_suggestions and len(selected_suggestions) > 0:
                try:
                    df = await self._apply_ai_suggestions(df, selected_suggestions, preprocessing_log)
                    print(f"✅ Successfully applied {len(selected_suggestions)} AI suggestions")
                except Exception as e:
                    error_msg = f"Failed to apply AI suggestions: {str(e)}"
                    preprocessing_log["steps_applied"].append(error_msg)
                    print(f"❌ AI Suggestions Error: {error_msg}")
                    raise e
            
            # Apply manual preprocessing options
            if preprocessing_options:
                try:
                    # Support detailed manual operations payload
                    manual_ops = preprocessing_options.get("manual_operations")
                    if manual_ops:
                        df = await self._apply_detailed_manual_operations(df, manual_ops, preprocessing_log)
                    else:
                        df = await self._apply_manual_preprocessing(df, preprocessing_options, preprocessing_log)
                    print(f"✅ Successfully applied manual preprocessing options")
                except Exception as e:
                    error_msg = f"Failed to apply manual preprocessing: {str(e)}"
                    preprocessing_log["steps_applied"].append(error_msg)
                    print(f"❌ Manual Preprocessing Error: {error_msg}")
                    raise e
            
            # Final data quality checks
            final_quality = self._assess_data_quality(df)
            preprocessing_log["final_quality"] = final_quality
            
            # Save processed data as parquet - keep same filename, just change extension
            # Remove .csv extension if present, then add .parquet
            base_name = dataset_name
            if base_name.endswith('.csv'):
                base_name = base_name[:-4]  # Remove .csv
            elif base_name.endswith('.parquet'):
                base_name = base_name[:-8]  # Remove .parquet
            
            processed_filename = f"{base_name}.parquet"
            processed_path = f"data/processed/{processed_filename}"
            
            # Ensure processed directory exists
            os.makedirs("data/processed", exist_ok=True)
            
            print(f"💾 Saving processed data to: {processed_path}")
            print(f"📊 Final DataFrame shape: {df.shape}")
            
            # Save as parquet for better performance and compression
            try:
                df.to_parquet(processed_path, index=False, compression='snappy')
                print(f"✅ Successfully saved parquet file: {processed_filename}")
            except Exception as e:
                print(f"❌ Failed to save parquet: {e}")
                raise e
            
            # Move original file to bin (from uploads/ or data/)
            original_path = None
            if source_is_uploads:
                original_path = f"data/uploads/{dataset_name}"
            else:
                # Check if it's in data/ directory
                alt_path = f"data/{dataset_name}"
                if os.path.exists(alt_path):
                    original_path = alt_path
            
            if original_path and os.path.exists(original_path):
                bin_dir = "data/bin"
                os.makedirs(bin_dir, exist_ok=True)
                
                # Create timestamped filename for bin
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                bin_filename = f"{timestamp}_{dataset_name}"
                bin_path = f"{bin_dir}/{bin_filename}"
                
                try:
                    import shutil
                    shutil.move(original_path, bin_path)
                    print(f"🗑️ Moved original file to bin: {bin_path}")
                    preprocessing_log["original_moved_to_bin"] = bin_path
                except Exception as e:
                    print(f"⚠️ Failed to move original to bin: {e}")
                    preprocessing_log["bin_move_error"] = str(e)
            
            # Calculate processing time
            end_time = datetime.now()
            processing_time = (end_time - start_time).total_seconds()
            preprocessing_log["processing_time"] = processing_time
            preprocessing_log["final_shape"] = df.shape
            
            # Generate preprocessing report (after all data is processed)
            report_path = await self._generate_preprocessing_report(
                preprocessing_log, 
                original_shape, 
                df.shape, 
                final_quality,
                job_id
            )
            
            print(f"✅ Preprocessing completed in {processing_time:.2f} seconds")
            print(f"📈 Shape change: {original_shape} → {df.shape}")
            print(f"📄 Report generated: {report_path}")
            
            # Convert numpy types to native Python types for JSON serialization
            result = {
                "success": True,
                "original_shape": tuple(int(x) for x in original_shape),
                "final_shape": tuple(int(x) for x in df.shape),
                "processing_time": float(processing_time),
                "report_path": report_path,
                "report_filename": os.path.basename(report_path),
                "processed_file": processed_filename,
                "processed_path": processed_path,
                "preprocessing_log": convert_numpy_types(preprocessing_log),
                "quality_improvements": convert_numpy_types(final_quality)
            }
            
            return result
            
        except Exception as e:
            error_msg = f"Preprocessing failed: {str(e)}"
            print(f"❌ {error_msg}")
            result = {
                "success": False,
                "error": error_msg,
                "original_shape": None,
                "final_shape": None
            }
            if 'original_shape' in locals():
                result["original_shape"] = tuple(int(x) for x in original_shape) if original_shape else None
            if 'df' in locals():
                result["final_shape"] = tuple(int(x) for x in df.shape) if df is not None else None
            return result
    
    async def _apply_ai_suggestions(
        self, 
        df: pd.DataFrame, 
        suggestions: List[Dict[str, Any]], 
        log: Dict[str, Any]
    ) -> pd.DataFrame:
        """Apply AI-generated preprocessing suggestions"""
        
        for suggestion in suggestions:
            try:
                suggestion_type = suggestion.get("type", "")
                columns = suggestion.get("columns", [])
                method = suggestion.get("method", "")
                
                print(f"🔧 Applying suggestion: {suggestion_type} on {columns} with method: {method}")
                print(f"   Original shape: {df.shape}")
                
                if suggestion_type == "handle_missing_values":
                    for col in columns:
                        if col in df.columns:
                            if method == "mean_imputation":
                                df[col] = df[col].fillna(df[col].mean())
                            elif method == "median_imputation":
                                df[col] = df[col].fillna(df[col].median())
                            elif method == "mode_imputation":
                                mode_value = df[col].mode()
                                if not mode_value.empty:
                                    df[col] = df[col].fillna(mode_value.iloc[0])
                                else:
                                    df[col] = df[col].fillna("Unknown")
                            elif method == "forward_fill":
                                df[col] = df[col].fillna(method='ffill')
                            elif method == "backward_fill":
                                df[col] = df[col].fillna(method='bfill')
                            elif method == "drop_rows":
                                df = df.dropna(subset=[col])
                            elif method == "drop_column":
                                df = df.drop(columns=[col])
                            elif method == "mean":
                                df[col] = df[col].fillna(df[col].mean())
                            elif method == "median":
                                df[col] = df[col].fillna(df[col].median())
                            elif method == "mode":
                                mode_value = df[col].mode()
                                if not mode_value.empty:
                                    df[col] = df[col].fillna(mode_value.iloc[0])
                                else:
                                    df[col] = df[col].fillna("Unknown")
                
                elif suggestion_type == "handle_outliers":
                    for col in columns:
                        if col in df.columns and df[col].dtype in ['int64', 'float64']:
                            Q1 = df[col].quantile(0.25)
                            Q3 = df[col].quantile(0.75)
                            IQR = Q3 - Q1
                            lower_bound = Q1 - 1.5 * IQR
                            upper_bound = Q3 + 1.5 * IQR
                            df = df[(df[col] >= lower_bound) & (df[col] <= upper_bound)]
                
                elif suggestion_type == "remove_duplicates":
                    df = df.drop_duplicates()
                
                elif suggestion_type == "convert_data_type":
                    for col in columns:
                        if col in df.columns:
                            method = suggestion.get("method", "")
                            target_type = suggestion.get("target_type", "")
                            
                            print(f"🔄 Converting column '{col}' to {target_type} using method: {method}")
                            
                            if method == "to_numeric":
                                # Clean numeric data before conversion
                                df[col] = df[col].astype(str).str.replace(',', '').str.replace('$', '').str.replace('%', '')
                                df[col] = pd.to_numeric(df[col], errors='coerce')
                                print(f"✅ Converted '{col}' to numeric")
                                
                            elif method == "to_datetime":
                                df[col] = pd.to_datetime(df[col], errors='coerce')
                                print(f"✅ Converted '{col}' to datetime")
                                
                            elif method == "to_categorical":
                                df[col] = df[col].astype('category')
                                print(f"✅ Converted '{col}' to categorical")
                
                elif suggestion_type == "data_type_conversion":
                    for col in columns:
                        if col in df.columns:
                            target_type = suggestion.get("target_type", "string")
                            if target_type == "numeric":
                                df[col] = pd.to_numeric(df[col], errors='coerce')
                            elif target_type == "datetime":
                                df[col] = pd.to_datetime(df[col], errors='coerce')
                            elif target_type == "category":
                                df[col] = df[col].astype('category')
                
                elif suggestion_type == "text_cleaning":
                    for col in columns:
                        if col in df.columns and df[col].dtype == 'object':
                            df[col] = df[col].astype(str).str.strip()
                            df[col] = df[col].str.replace(r'\s+', ' ', regex=True)
                
                elif suggestion_type == "normalization":
                    for col in columns:
                        if col in df.columns and df[col].dtype in ['int64', 'float64']:
                            df[col] = (df[col] - df[col].mean()) / df[col].std()
                
                print(f"   Final shape: {df.shape}")
                log["steps_applied"].append(f"Applied {suggestion_type} on {columns} - Shape: {df.shape}")
                
            except Exception as e:
                error_msg = f"Failed to apply {suggestion_type}: {str(e)}"
                log["steps_applied"].append(error_msg)
                print(f"⚠️ {error_msg}")
                continue
        
        return df

    async def _apply_detailed_manual_operations(self, df: pd.DataFrame, ops: dict, log: Dict[str, Any]) -> pd.DataFrame:
        """Apply detailed manual operations including drop, dtype changes, missing handling, and balancing."""
        # Drop columns
        drop_cols = ops.get("drop_columns", [])
        for col in drop_cols:
            if col in df.columns:
                df = df.drop(columns=[col])
        if drop_cols:
            log["steps_applied"].append(f"Dropped columns: {drop_cols}")

        # Change types
        change_types = ops.get("change_types", {})
        for col, target in change_types.items():
            if col in df.columns:
                try:
                    if target == "numeric":
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                    elif target == "datetime":
                        df[col] = pd.to_datetime(df[col], errors='coerce')
                    elif target == "category":
                        df[col] = df[col].astype('category')
                    elif target == "string":
                        df[col] = df[col].astype(str)
                    else:
                        df[col] = df[col].astype(target)
                except Exception as e:
                    log["steps_applied"].append(f"Failed to convert {col} to {target}: {e}")
        if change_types:
            log["steps_applied"].append(f"Changed data types: {change_types}")

        # Missing handling per column
        missing = ops.get("missing", {})
        for col, cfg in missing.items():
            if col in df.columns:
                method = cfg.get("method", "mean")
                if method == "mean":
                    if pd.api.types.is_numeric_dtype(df[col]):
                        df[col] = df[col].fillna(df[col].mean())
                elif method == "median":
                    if pd.api.types.is_numeric_dtype(df[col]):
                        df[col] = df[col].fillna(df[col].median())
                elif method == "mode":
                    mode_value = df[col].mode()
                    if not mode_value.empty:
                        df[col] = df[col].fillna(mode_value.iloc[0])
                elif method == "drop_rows":
                    df = df.dropna(subset=[col])
                elif method == "ffill":
                    df[col] = df[col].fillna(method='ffill')
                elif method == "bfill":
                    df[col] = df[col].fillna(method='bfill')
                elif method == "constant":
                    value = cfg.get("value", 0)
                    df[col] = df[col].fillna(value)
        if missing:
            log["steps_applied"].append(f"Handled missing values for columns: {list(missing.keys())}")

        # Balancing
        balance_cfg = ops.get("balance")
        if balance_cfg:
            method = balance_cfg.get("method", "smote").lower()
            target = balance_cfg.get("target_column")
            if target and target in df.columns:
                X = df.drop(columns=[target])
                y = df[target]
                # SMOTE works with numeric features; try to coerce non-numeric using get_dummies
                X_encoded = pd.get_dummies(X, drop_first=False)
                if method == "smote":
                    try:
                        smote = SMOTE()
                        X_res, y_res = smote.fit_resample(X_encoded, y)
                        # Combine back; keep encoded features to avoid lossy inverse
                        df = pd.concat([pd.DataFrame(X_res), pd.Series(y_res, name=target)], axis=1)
                        log["steps_applied"].append(f"Applied SMOTE to balance target '{target}'")
                    except Exception as e:
                        log["steps_applied"].append(f"SMOTE failed: {e}")
                else:
                    log["steps_applied"].append(f"Unknown balancing method: {method}")

        return df
    
    async def _apply_manual_preprocessing(
        self, 
        df: pd.DataFrame, 
        options: Dict[str, Any], 
        log: Dict[str, Any]
    ) -> pd.DataFrame:
        """Apply manual preprocessing options"""
        
        # Handle missing values
        if options.get("handle_missing_values"):
            method = options.get("missing_values_method", "mean")
            for col in df.columns:
                if df[col].isnull().any():
                    if method == "mean" and df[col].dtype in ['int64', 'float64']:
                        df[col] = df[col].fillna(df[col].mean())
                    elif method == "median" and df[col].dtype in ['int64', 'float64']:
                        df[col] = df[col].fillna(df[col].median())
                    elif method == "mode":
                        mode_value = df[col].mode()
                        if not mode_value.empty:
                            df[col] = df[col].fillna(mode_value.iloc[0])
                    elif method == "drop":
                        df = df.dropna()
        
        # Handle outliers
        if options.get("handle_outliers"):
            for col in df.columns:
                if df[col].dtype in ['int64', 'float64']:
                    Q1 = df[col].quantile(0.25)
                    Q3 = df[col].quantile(0.75)
                    IQR = Q3 - Q1
                    lower_bound = Q1 - 1.5 * IQR
                    upper_bound = Q3 + 1.5 * IQR
                    df = df[(df[col] >= lower_bound) & (df[col] <= upper_bound)]
        
        # Remove duplicates
        if options.get("remove_duplicates"):
            df = df.drop_duplicates()
        
        # Data type conversion
        if options.get("convert_data_types"):
            for col, dtype in options.get("data_types", {}).items():
                if col in df.columns:
                    try:
                        if dtype == "numeric":
                            df[col] = pd.to_numeric(df[col], errors='coerce')
                        elif dtype == "datetime":
                            df[col] = pd.to_datetime(df[col], errors='coerce')
                        elif dtype == "category":
                            df[col] = df[col].astype('category')
                    except Exception as e:
                        print(f"⚠️ Failed to convert {col} to {dtype}: {e}")
        
        log["steps_applied"].append("Applied manual preprocessing options")
        return df
    
    def _assess_data_quality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Assess data quality metrics"""
        # Convert all numpy types to native Python types for JSON serialization
        total_rows = int(len(df))
        total_columns = int(len(df.columns))
        missing_values = int(df.isnull().sum().sum())
        missing_percentage = float((df.isnull().sum().sum() / (len(df) * len(df.columns))) * 100)
        duplicate_rows = int(df.duplicated().sum())
        duplicate_percentage = float((df.duplicated().sum() / len(df)) * 100)
        
        return {
            "total_rows": total_rows,
            "total_columns": total_columns,
            "missing_values": missing_values,
            "missing_percentage": missing_percentage,
            "duplicate_rows": duplicate_rows,
            "duplicate_percentage": duplicate_percentage,
            "numeric_columns": int(len(df.select_dtypes(include=[np.number]).columns)),
            "categorical_columns": int(len(df.select_dtypes(include=['object']).columns)),
            "datetime_columns": int(len(df.select_dtypes(include=['datetime64']).columns))
        }
    
    async def _generate_preprocessing_report(
        self, 
        log: Dict[str, Any], 
        original_shape: tuple, 
        final_shape: tuple, 
        quality: Dict[str, Any],
        job_id: str
    ) -> str:
        """Generate HTML preprocessing report"""
        
        report_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Preprocessing Report - {log['dataset_name']}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
                .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .section {{ margin-bottom: 30px; }}
                .metric {{ display: inline-block; margin: 10px; padding: 15px; background: #f8f9fa; border-radius: 5px; text-align: center; }}
                .metric-value {{ font-size: 24px; font-weight: bold; color: #007bff; }}
                .metric-label {{ font-size: 14px; color: #666; }}
                .step {{ margin: 10px 0; padding: 10px; background: #e9ecef; border-radius: 5px; }}
                .success {{ color: #28a745; }}
                .error {{ color: #dc3545; }}
                table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🧹 Data Preprocessing Report</h1>
                    <p><strong>Dataset:</strong> {log['dataset_name']}</p>
                    <p><strong>Job ID:</strong> {job_id}</p>
                    <p><strong>Generated:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                </div>
                
                <div class="section">
                    <h2>📊 Data Shape Changes</h2>
                    <div class="metric">
                        <div class="metric-value">{original_shape[0]:,}</div>
                        <div class="metric-label">Original Rows</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">{final_shape[0]:,}</div>
                        <div class="metric-label">Final Rows</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">{original_shape[1]}</div>
                        <div class="metric-label">Original Columns</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">{final_shape[1]}</div>
                        <div class="metric-label">Final Columns</div>
                    </div>
                </div>
                
                <div class="section">
                    <h2>🔧 Processing Steps</h2>
                    {"".join([f'<div class="step">{step}</div>' for step in log.get("steps_applied", [])])}
                </div>
                
                <div class="section">
                    <h2>📈 Quality Metrics</h2>
                    <table>
                        <tr><th>Metric</th><th>Value</th></tr>
                        <tr><td>Total Rows</td><td>{quality.get('total_rows', 0):,}</td></tr>
                        <tr><td>Total Columns</td><td>{quality.get('total_columns', 0)}</td></tr>
                        <tr><td>Missing Values</td><td>{quality.get('missing_values', 0):,}</td></tr>
                        <tr><td>Missing Percentage</td><td>{quality.get('missing_percentage', 0):.2f}%</td></tr>
                        <tr><td>Duplicate Rows</td><td>{quality.get('duplicate_rows', 0):,}</td></tr>
                        <tr><td>Numeric Columns</td><td>{quality.get('numeric_columns', 0)}</td></tr>
                        <tr><td>Categorical Columns</td><td>{quality.get('categorical_columns', 0)}</td></tr>
                    </table>
                </div>
                
                <div class="section">
                    <h2>⏱️ Processing Information</h2>
                    <p><strong>Processing Time:</strong> {log.get('processing_time', 0):.2f} seconds</p>
                    <p><strong>Original File:</strong> {log.get('original_moved_to_bin', 'Not moved')}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Save report
        report_path = f"data/artifacts/preprocessing_report_{job_id}.html"
        os.makedirs("data/artifacts", exist_ok=True)
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        print(f"📄 Generated preprocessing report: {report_path}")
        return report_path
