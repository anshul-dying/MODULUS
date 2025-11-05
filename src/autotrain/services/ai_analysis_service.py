"""
AI-powered dataset analysis service using Google Gemini API
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
import google.generativeai as genai
import os
import json

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

class AIAnalysisService:
    def __init__(self):
        
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model = None
        
        if not self.api_key or self.api_key == "your_gemini_api_key_here":
            print("⚠️  Gemini API key not configured. AI analysis will use fallback mode.")
            print("📝 To enable AI analysis:")
            print("   1. Create a .env file in the project root")
            print("   2. Add: GEMINI_API_KEY=your_actual_api_key")
            print("   3. Get your API key from: https://makersuite.google.com/app/apikey")
            return
        
        try:
            # Configure Gemini API
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
            print("✅ Gemini API configured successfully")
        except Exception as e:
            print(f"❌ Failed to initialize Gemini API: {e}")
            self.model = None
    
    async def analyze_dataset_for_preprocessing(self, df: pd.DataFrame, dataset_name: str) -> Dict[str, Any]:
        """
        Analyze dataset specifically for preprocessing recommendations
        """
        try:
            print(f"🔍 Analyzing dataset for preprocessing: {dataset_name}")
            print(f"📊 Dataset shape: {df.shape}")
            print(f"📊 Missing values: {df.isnull().sum().sum()}")
            print(f"📊 Duplicates: {df.duplicated().sum()}")
            
            # Basic dataset statistics
            dataset_info = self._get_dataset_info(df)
            
            # Generate preprocessing-specific analysis
            preprocessing_suggestions = self._generate_preprocessing_suggestions(df, dataset_name, dataset_info)
            print(f"🤖 Generated {len(preprocessing_suggestions)} preprocessing suggestions")
            
            return {
                "preprocessing_suggestions": preprocessing_suggestions,
                "data_quality_score": self._calculate_data_quality_score(df),
                "issues_found": self._identify_data_issues(df),
                "dataset_info": dataset_info
            }
        except Exception as e:
            print(f"Error in preprocessing analysis: {e}")
            import traceback
            traceback.print_exc()
            return {
                "preprocessing_suggestions": [],
                "data_quality_score": 0,
                "issues_found": [],
                "dataset_info": {}
            }

    def analyze_dataset(self, df: pd.DataFrame, dataset_name: str) -> Dict[str, Any]:
        """
        Analyze dataset and provide AI-powered recommendations
        """
        try:
            print(f"🔍 Starting AI analysis for {dataset_name}")
            # Basic dataset statistics
            dataset_info = self._get_dataset_info(df)
            print(f"✅ Dataset info generated")
            
            # Generate AI analysis
            ai_analysis = self._generate_ai_analysis(df, dataset_name, dataset_info)
            print(f"✅ AI analysis generated")
            
            # Generate recommendations
            recommendations = self._generate_recommendations(df, ai_analysis)
            print(f"✅ Recommendations generated")
            
            return {
                "dataset_info": dataset_info,
                "ai_analysis": ai_analysis,
                "recommendations": recommendations
            }
        except Exception as e:
            print(f"❌ Error in analyze_dataset: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "error": f"AI analysis failed: {str(e)}",
                "dataset_info": self._get_dataset_info(df),
                "recommendations": self._get_fallback_recommendations(df)
            }
    
    def _get_dataset_info(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get basic dataset information"""
        # Convert sample data to JSON-serializable format
        sample_df = df.head(3).fillna('')
        # Convert datetime columns to strings for JSON serialization
        for col in sample_df.columns:
            if sample_df[col].dtype.name.startswith('datetime'):
                sample_df[col] = sample_df[col].astype(str)
        
        # Convert missing values to JSON-serializable format
        missing_values = df.isnull().sum().to_dict()
        # Convert any Timestamp values to strings
        for key, value in missing_values.items():
            if hasattr(value, 'item'):  # Check if it's a numpy scalar
                missing_values[key] = value.item()
        
        return {
            "shape": df.shape,
            "columns": list(df.columns),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "missing_values": missing_values,
            "numeric_columns": df.select_dtypes(include=[np.number]).columns.tolist(),
            "categorical_columns": df.select_dtypes(include=['object']).columns.tolist(),
            "sample_data": sample_df.to_dict('records')
        }
    
    def _generate_ai_analysis(self, df: pd.DataFrame, dataset_name: str, dataset_info: Dict) -> Dict[str, Any]:
        """Generate AI analysis using Gemini API or fallback"""
        
        # If model is not available, use fallback analysis
        if self.model is None:
            print("🔄 Using fallback analysis (Gemini API not configured)")
            return self._get_fallback_analysis(df, dataset_info)
        
        # Prepare data summary for AI
        # Convert sample data to JSON-serializable format
        sample_df = df.head(3).fillna('')
        # Convert datetime columns to strings for JSON serialization
        for col in sample_df.columns:
            if sample_df[col].dtype.name.startswith('datetime'):
                sample_df[col] = sample_df[col].astype(str)
        
        # Get numeric summary safely
        numeric_summary = {}
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            try:
                numeric_summary = df[numeric_cols].describe().to_dict()
                # Convert any Timestamp objects to strings
                for col in numeric_summary:
                    for stat in numeric_summary[col]:
                        if hasattr(numeric_summary[col][stat], 'item'):
                            numeric_summary[col][stat] = numeric_summary[col][stat].item()
            except Exception as e:
                print(f"Warning: Could not generate numeric summary: {e}")
                numeric_summary = {}
        
        # Get missing values safely
        missing_values = df.isnull().sum().to_dict()
        for key, value in missing_values.items():
            if hasattr(value, 'item'):
                missing_values[key] = value.item()
        
        data_summary = {
            "dataset_name": dataset_name,
            "shape": df.shape,
            "columns": list(df.columns),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "missing_values": missing_values,
            "numeric_summary": numeric_summary,
            "categorical_summary": {col: df[col].value_counts().head(5).to_dict() for col in df.select_dtypes(include=['object']).columns},
            "sample_rows": sample_df.to_dict('records')
        }
        
        prompt = f"""
        You are an expert data scientist and machine learning engineer. Analyze the following dataset and provide recommendations.

        Dataset Information:
        {json.dumps(data_summary, indent=2)}

        Please provide:
        1. **Dataset Type**: What type of dataset is this? (e.g., "Customer data", "Sales data", "Medical data", "Financial data", etc.)
        2. **Business Context**: What business problem could this dataset solve?
        3. **Target Column Suggestions**: Suggest 2-3 potential target columns for machine learning, ranked by suitability
        4. **Task Type Recommendations**: For each suggested target column, recommend whether it's a classification or regression task
        5. **Algorithm Suggestions**: Recommend 2-3 best algorithms for each suggested target column
        6. **Data Quality Assessment**: Rate data quality (1-10) and identify potential issues
        7. **Preprocessing Suggestions**: Specific preprocessing steps needed

        Format your response as a JSON object with the following structure:
        {{
            "dataset_type": "string",
            "business_context": "string",
            "target_suggestions": [
                {{
                    "column": "column_name",
                    "task_type": "classification/regression",
                    "confidence": 0.0-1.0,
                    "reasoning": "why this is a good target",
                    "algorithms": ["algorithm1", "algorithm2", "algorithm3"]
                }}
            ],
            "data_quality_score": 1-10,
            "data_quality_issues": ["issue1", "issue2"],
            "preprocessing_suggestions": ["suggestion1", "suggestion2"]
        }}
        """
        
        try:
            response = self.model.generate_content(prompt)
            
            # Parse JSON response
            ai_response = json.loads(response.text)
            print("✅ Gemini AI analysis completed successfully")
            return ai_response
        except Exception as e:
            print(f"❌ Gemini AI analysis failed: {e}")
            print("🔄 Falling back to heuristic analysis")
            # Fallback if AI fails
            return self._get_fallback_analysis(df, dataset_info)
    
    def _generate_recommendations(self, df: pd.DataFrame, ai_analysis: Dict) -> Dict[str, Any]:
        """Generate actionable recommendations based on AI analysis"""
        
        recommendations = {
            "best_targets": [],
            "model_suggestions": [],
            "preprocessing_steps": [],
            "next_steps": []
        }
        
        if "target_suggestions" in ai_analysis:
            for target in ai_analysis["target_suggestions"]:
                recommendations["best_targets"].append({
                    "column": target["column"],
                    "task_type": target["task_type"],
                    "confidence": target.get("confidence", 0.8),
                    "reasoning": target.get("reasoning", "AI recommended"),
                    "algorithms": target.get("algorithms", ["Random Forest", "SVM", "Neural Network"])
                })
        
        if "preprocessing_suggestions" in ai_analysis:
            recommendations["preprocessing_steps"] = ai_analysis["preprocessing_suggestions"]
        
        # Generate next steps
        recommendations["next_steps"] = [
            "Review the suggested target columns and choose the most relevant one",
            "Select appropriate preprocessing options based on data quality",
            "Choose recommended algorithms for your selected target",
            "Start training with the suggested configuration"
        ]
        
        return recommendations
    
    def _get_fallback_analysis(self, df: pd.DataFrame, dataset_info: Dict) -> Dict[str, Any]:
        """Fallback analysis when AI is unavailable"""
        
        # Simple heuristic-based analysis
        numeric_cols = dataset_info["numeric_columns"]
        categorical_cols = dataset_info["categorical_columns"]
        
        target_suggestions = []
        
        # Suggest numeric columns for regression
        for col in numeric_cols[:2]:  # Take first 2 numeric columns
            target_suggestions.append({
                "column": col,
                "task_type": "regression",
                "confidence": 0.7,
                "reasoning": f"Numeric column '{col}' is suitable for regression tasks",
                "algorithms": ["Random Forest", "Linear Regression", "SVM"]
            })
        
        # Suggest categorical columns for classification
        for col in categorical_cols[:2]:  # Take first 2 categorical columns
            target_suggestions.append({
                "column": col,
                "task_type": "classification",
                "confidence": 0.6,
                "reasoning": f"Categorical column '{col}' is suitable for classification tasks",
                "algorithms": ["Random Forest", "Logistic Regression", "SVM"]
            })
        
        # Calculate data quality score based on missing values
        missing_ratio = df.isnull().sum().sum() / (df.shape[0] * df.shape[1])
        quality_score = max(1, min(10, int(10 - missing_ratio * 10)))
        
        return {
            "dataset_type": "General dataset",
            "business_context": "This dataset can be used for various machine learning tasks. Consider the column types and data patterns to determine the best use case.",
            "target_suggestions": target_suggestions,
            "data_quality_score": quality_score,
            "data_quality_issues": ["Review missing values", "Check for outliers", "Validate data types"] if missing_ratio > 0.1 else ["Check for outliers", "Validate data consistency"],
            "preprocessing_suggestions": ["Handle missing values", "Encode categorical variables", "Scale numerical features", "Remove duplicates"]
        }
    
    def _get_fallback_recommendations(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Fallback recommendations when AI is unavailable"""
        return {
            "best_targets": [
                {
                    "column": df.columns[0] if len(df.columns) > 0 else "unknown",
                    "task_type": "classification",
                    "confidence": 0.5,
                    "reasoning": "First column suggested as default target",
                    "algorithms": ["Random Forest", "Logistic Regression"]
                }
            ],
            "model_suggestions": ["Random Forest", "SVM", "Neural Network"],
            "preprocessing_steps": ["Handle missing values", "Encode categorical variables"],
            "next_steps": ["Choose a target column", "Configure preprocessing", "Start training"]
        }
    
    def _generate_preprocessing_suggestions(self, df: pd.DataFrame, dataset_name: str, dataset_info: Dict) -> List[Dict]:
        """Generate preprocessing suggestions based on data analysis"""
        suggestions = []
        
        print(f"🔍 Generating preprocessing suggestions for {dataset_name}")
        print(f"📊 Dataset shape: {df.shape}")
        
        # Check for missing values
        missing_counts = df.isnull().sum()
        print(f"📊 Missing values per column: {missing_counts.to_dict()}")
        
        for col, count in missing_counts.items():
            if count > 0:
                percentage = (count / len(df)) * 100
                print(f"🔍 Column '{col}' has {count} missing values ({percentage:.1f}%)")
                if percentage > 50:
                    suggestions.append({
                        "type": "handle_missing_values",
                        "columns": [col],
                        "method": "drop_column",
                        "reason": f"Column '{col}' has {percentage:.1f}% missing values"
                    })
                elif percentage > 20:
                    suggestions.append({
                        "type": "handle_missing_values",
                        "columns": [col],
                        "method": "drop_rows",
                        "reason": f"Column '{col}' has {percentage:.1f}% missing values"
                    })
                else:
                    if df[col].dtype in ['object', 'string']:
                        suggestions.append({
                            "type": "handle_missing_values",
                            "columns": [col],
                            "method": "mode_imputation",
                            "reason": f"Text column '{col}' with {percentage:.1f}% missing values"
                        })
                    else:
                        suggestions.append({
                            "type": "handle_missing_values",
                            "columns": [col],
                            "method": "mean_imputation",
                            "reason": f"Numeric column '{col}' with {percentage:.1f}% missing values"
                        })
        
        # Check for duplicates
        duplicate_count = df.duplicated().sum()
        print(f"📊 Duplicate rows: {duplicate_count}")
        if duplicate_count > 0:
            duplicate_percentage = (duplicate_count / len(df)) * 100
            suggestions.append({
                "type": "remove_duplicates",
                "subset": None,
                "reason": f"Dataset has {duplicate_percentage:.1f}% duplicate rows"
            })
        
        # Check for outliers in numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)]
            outlier_percentage = (len(outliers) / len(df)) * 100
            
            if outlier_percentage > 5:
                suggestions.append({
                    "type": "handle_outliers",
                    "columns": [col],
                    "method": "iqr_capping",
                    "reason": f"Column '{col}' has {outlier_percentage:.1f}% outliers"
                })
        
        # Check for data type issues and suggest conversions
        data_type_suggestions = self._analyze_data_types(df)
        suggestions.extend(data_type_suggestions)
        
        return suggestions
    
    def _calculate_data_quality_score(self, df: pd.DataFrame) -> float:
        """Calculate overall data quality score"""
        # Completeness score
        missing_ratio = df.isnull().sum().sum() / (df.shape[0] * df.shape[1])
        completeness_score = (1 - missing_ratio) * 100
        
        # Uniqueness score
        duplicate_ratio = df.duplicated().sum() / len(df)
        uniqueness_score = (1 - duplicate_ratio) * 100
        
        # Overall score
        overall_score = (completeness_score + uniqueness_score) / 2
        return round(overall_score, 2)
    
    def _identify_data_issues(self, df: pd.DataFrame) -> List[str]:
        """Identify data quality issues"""
        issues = []
        
        # Check for missing values
        missing_counts = df.isnull().sum()
        for col, count in missing_counts.items():
            if count > 0:
                percentage = (count / len(df)) * 100
                issues.append(f"Column '{col}' has {percentage:.1f}% missing values")
        
        # Check for duplicates
        duplicate_count = df.duplicated().sum()
        if duplicate_count > 0:
            duplicate_percentage = (duplicate_count / len(df)) * 100
            issues.append(f"Dataset has {duplicate_percentage:.1f}% duplicate rows")
        
        # Check for outliers
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)]
            outlier_percentage = (len(outliers) / len(df)) * 100
            
            if outlier_percentage > 5:
                issues.append(f"Column '{col}' has {outlier_percentage:.1f}% outliers")
        
        return issues
    
    def _analyze_data_types(self, df: pd.DataFrame) -> List[Dict]:
        """Analyze data types and suggest conversions"""
        suggestions = []
        
        print(f"🔍 Analyzing data types for {len(df.columns)} columns")
        
        for col in df.columns:
            current_dtype = str(df[col].dtype)
            print(f"🔍 Column '{col}': {current_dtype}")
            
            # Check if numeric data is stored as object/string
            if current_dtype in ['object', 'string']:
                # Try to detect if it should be numeric
                numeric_suggestion = self._detect_numeric_conversion(df, col)
                if numeric_suggestion:
                    suggestions.append(numeric_suggestion)
                
                # Check for date conversion
                date_suggestion = self._detect_date_conversion(df, col)
                if date_suggestion:
                    suggestions.append(date_suggestion)
            
            # Check if categorical data is stored as numeric
            elif current_dtype in ['int64', 'float64']:
                categorical_suggestion = self._detect_categorical_conversion(df, col)
                if categorical_suggestion:
                    suggestions.append(categorical_suggestion)
        
        print(f"🔍 Generated {len(suggestions)} data type suggestions")
        return suggestions
    
    def _detect_numeric_conversion(self, df: pd.DataFrame, col: str) -> Dict:
        """Detect if object column should be converted to numeric"""
        try:
            # Sample a subset for analysis
            sample_size = min(1000, len(df))
            sample_data = df[col].dropna().head(sample_size)
            
            if len(sample_data) == 0:
                return None
            
            # Check if values look like numbers
            numeric_count = 0
            total_count = len(sample_data)
            
            for value in sample_data:
                try:
                    float(str(value).replace(',', '').replace('$', '').replace('%', ''))
                    numeric_count += 1
                except (ValueError, TypeError):
                    pass
            
            numeric_ratio = numeric_count / total_count
            
            if numeric_ratio > 0.8:  # 80% of values are numeric
                return {
                    "type": "convert_data_type",
                    "columns": [col],
                    "method": "to_numeric",
                    "target_type": "numeric",
                    "reason": f"Column '{col}' contains {numeric_ratio:.1%} numeric values but is stored as text"
                }
        except Exception as e:
            print(f"Error analyzing numeric conversion for {col}: {e}")
        
        return None
    
    def _detect_date_conversion(self, df: pd.DataFrame, col: str) -> Dict:
        """Detect if object column should be converted to datetime"""
        try:
            # Sample a subset for analysis
            sample_size = min(1000, len(df))
            sample_data = df[col].dropna().head(sample_size)
            
            if len(sample_data) == 0:
                return None
            
            # Check if values look like dates
            date_count = 0
            total_count = len(sample_data)
            
            for value in sample_data:
                try:
                    pd.to_datetime(str(value), errors='raise')
                    date_count += 1
                except (ValueError, TypeError):
                    pass
            
            date_ratio = date_count / total_count
            
            if date_ratio > 0.7:  # 70% of values are dates
                return {
                    "type": "convert_data_type",
                    "columns": [col],
                    "method": "to_datetime",
                    "target_type": "datetime",
                    "reason": f"Column '{col}' contains {date_ratio:.1%} date values but is stored as text"
                }
        except Exception as e:
            print(f"Error analyzing date conversion for {col}: {e}")
        
        return None
    
    def _detect_categorical_conversion(self, df: pd.DataFrame, col: str) -> Dict:
        """Detect if numeric column should be converted to categorical"""
        try:
            # Check if numeric column has few unique values (likely categorical)
            unique_count = df[col].nunique()
            total_count = len(df[col].dropna())
            
            if total_count == 0:
                return None
            
            unique_ratio = unique_count / total_count
            
            # If less than 10% unique values and less than 20 unique values, likely categorical
            if unique_ratio < 0.1 and unique_count < 20:
                return {
                    "type": "convert_data_type",
                    "columns": [col],
                    "method": "to_categorical",
                    "target_type": "categorical",
                    "reason": f"Column '{col}' has only {unique_count} unique values ({unique_ratio:.1%}), likely categorical"
                }
        except Exception as e:
            print(f"Error analyzing categorical conversion for {col}: {e}")
        
        return None