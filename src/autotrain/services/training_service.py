"""
Model Training Service
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.svm import SVC, SVR
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, mean_squared_error, r2_score
import joblib
import os
from datetime import datetime
from pandas.api.types import is_datetime64_any_dtype

class TrainingService:
    def __init__(self):
        self.artifacts_dir = "data/artifacts"
        os.makedirs(self.artifacts_dir, exist_ok=True)
    
    def _handle_nulls(self, df: pd.DataFrame, null_handling: str, null_fill_value: str = None) -> pd.DataFrame:
        """Handle null values in the dataframe"""
        if null_handling == "drop":
            return df.dropna()
        elif null_handling == "fill":
            if null_fill_value is not None:
                # Try to convert to numeric if possible
                try:
                    fill_val = float(null_fill_value)
                    return df.fillna(fill_val)
                except ValueError:
                    return df.fillna(null_fill_value)
            else:
                return df.fillna(0)
        elif null_handling == "mean":
            return df.fillna(df.select_dtypes(include=[np.number]).mean())
        elif null_handling == "median":
            return df.fillna(df.select_dtypes(include=[np.number]).median())
        elif null_handling == "mode":
            return df.fillna(df.mode().iloc[0])
        else:
            return df
    
    async def train_model(self, df: pd.DataFrame, target_column: str, task_type: str, 
                         algorithm: str, test_size: float = 0.2, random_state: int = 42,
                         exclude_columns: list = None, ohe_columns: list = None, 
                         scale_columns: list = None, null_handling: str = "drop", 
                         null_fill_value: str = None) -> dict:
        """Train a machine learning model"""
        
        # Initialize preprocessing parameters
        if exclude_columns is None:
            exclude_columns = []
        if ohe_columns is None:
            ohe_columns = []
        if scale_columns is None:
            scale_columns = []
        
        # Create a copy of the dataframe
        df_processed = df.copy()
        
        # Handle null values
        df_processed = self._handle_nulls(df_processed, null_handling, null_fill_value)
        
        # Exclude specified columns
        columns_to_drop = [col for col in exclude_columns if col in df_processed.columns]
        # if "Unnamed: 0" in df.columns():
        #     columns_to_drop.append("Unnamed: 0")
        if columns_to_drop:
            df_processed = df_processed.drop(columns=columns_to_drop)
        
        # Prepare features and target
        X = df_processed.drop(columns=[target_column])
        y = df_processed[target_column]
        
        # Auto-coerce unsupported feature dtypes
        # 1) Convert datetime features (including tz-aware) to numeric timestamps (ns since epoch)
        for col in list(X.columns):
            try:
                if is_datetime64_any_dtype(X[col]):
                    try:
                        X[col] = X[col].astype("int64")
                    except Exception:
                        # Fallback: drop column if conversion fails
                        X = X.drop(columns=[col])
            except Exception:
                # Defensive: if dtype inspection itself fails, skip
                continue

        # 2) One-hot encode any remaining object/string features automatically
        object_cols_auto = X.select_dtypes(include=["object", "string"]).columns
        if len(object_cols_auto) > 0:
            X = pd.get_dummies(X, columns=list(object_cols_auto), drop_first=True)

        # Apply One-Hot Encoding to specified columns
        if ohe_columns:
            ohe_cols_to_encode = [col for col in ohe_columns if col in X.columns]
            if ohe_cols_to_encode:
                X = pd.get_dummies(X, columns=ohe_cols_to_encode, drop_first=True)
        
        # Apply Standard Scaling to specified columns
        if scale_columns:
            from sklearn.preprocessing import StandardScaler
            scaler = StandardScaler()
            scale_cols_to_scale = [col for col in scale_columns if col in X.columns]
            if scale_cols_to_scale:
                X[scale_cols_to_scale] = scaler.fit_transform(X[scale_cols_to_scale])
        
        # Split data
        stratify_param = None
        if task_type == "classification" and len(y.unique()) > 1:
            stratify_param = y
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=stratify_param
        )
        
        # Select model
        model = self._get_model(task_type, algorithm)
        
        # Train model
        model.fit(X_train, y_train)
        
        # Make predictions
        y_pred = model.predict(X_test)
        
        # Calculate metrics
        metrics = self._calculate_metrics(y_test, y_pred, task_type)
        
        # Save model
        model_path = f"{self.artifacts_dir}/model_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pkl"
        joblib.dump(model, model_path)
        
        # Generate report
        report_path = await self._generate_training_report(
            model, X_test, y_test, y_pred, metrics, task_type
        )
        
        return {
            "accuracy": metrics.get("accuracy", metrics.get("r2_score")),
            "metrics": metrics,
            "model_path": model_path,
            "report_path": report_path
        }
    
    def _get_model(self, task_type: str, algorithm: str):
        """Get the appropriate model based on task type and algorithm"""
        models = {
            "classification": {
                "random_forest": RandomForestClassifier(n_estimators=100, random_state=42),
                "logistic_regression": LogisticRegression(random_state=42),
                "svm": SVC(random_state=42)
            },
            "regression": {
                "random_forest": RandomForestRegressor(n_estimators=100, random_state=42),
                "linear_regression": LinearRegression(),
                "svm": SVR()
            }
        }
        
        if task_type not in models or algorithm not in models[task_type]:
            raise ValueError(f"Unsupported task type '{task_type}' or algorithm '{algorithm}'")
        
        return models[task_type][algorithm]
    
    def _calculate_metrics(self, y_true, y_pred, task_type: str) -> dict:
        """Calculate appropriate metrics based on task type"""
        if task_type == "classification":
            return {
                "accuracy": float(accuracy_score(y_true, y_pred)),
                "precision": float(precision_score(y_true, y_pred, average='weighted')),
                "recall": float(recall_score(y_true, y_pred, average='weighted')),
                "f1_score": float(f1_score(y_true, y_pred, average='weighted'))
            }
        else:  # regression
            return {
                "mse": float(mean_squared_error(y_true, y_pred)),
                "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
                "r2_score": float(r2_score(y_true, y_pred))
            }
    
    async def _generate_training_report(self, model, X_test, y_test, y_pred, metrics, task_type: str) -> str:
        """Generate training report"""
        report_name = f"training_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        report_path = f"{self.artifacts_dir}/{report_name}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Training Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
                .section {{ margin: 20px 0; }}
                .metric {{ display: inline-block; margin: 10px; padding: 10px; background-color: #e8f4f8; border-radius: 3px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Model Training Report</h1>
                <p>Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
            
            <div class="section">
                <h3>Model Performance</h3>
                {self._format_metrics(metrics)}
            </div>
            
            <div class="section">
                <h3>Model Information</h3>
                <p><strong>Task Type:</strong> {task_type}</p>
                <p><strong>Algorithm:</strong> {type(model).__name__}</p>
                <p><strong>Test Samples:</strong> {len(y_test)}</p>
            </div>
        </body>
        </html>
        """
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return report_path
    
    def _format_metrics(self, metrics: dict) -> str:
        """Format metrics for HTML display"""
        html = ""
        for metric, value in metrics.items():
            html += f'<div class="metric"><strong>{metric.replace("_", " ").title()}:</strong> {value:.4f}</div>'
        return html
