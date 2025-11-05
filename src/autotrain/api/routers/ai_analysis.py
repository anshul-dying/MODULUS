"""
AI-powered dataset analysis API endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import pandas as pd
import os
from ..schemas import DatasetInfo
from ...services.ai_analysis_service import AIAnalysisService

router = APIRouter()

def get_ai_service():
    """Get AI service instance (lazy initialization)"""
    return AIAnalysisService()

@router.post("/analyze/{dataset_name}")
async def analyze_dataset(dataset_name: str, separator: str = ",") -> Dict[str, Any]:
    """
    Analyze a dataset and provide AI-powered recommendations (CSV or Parquet)
    """
    try:
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
                    # Try to find processed parquet version
                    parquet_name = dataset_name.replace('.csv', '.parquet')
                    parquet_path = f"data/processed/processed_{parquet_name}"
                    if os.path.exists(parquet_path):
                        filepath = parquet_path
                    else:
                        raise HTTPException(status_code=404, detail="Dataset not found")
        
        # Read dataset (CSV or Parquet)
        if filepath.endswith('.parquet'):
            df = pd.read_parquet(filepath)
        else:
            df = pd.read_csv(filepath, sep=separator)
        
        # Perform AI analysis
        ai_service = get_ai_service()
        analysis_result = ai_service.analyze_dataset(df, dataset_name)
        
        return {
            "dataset_name": dataset_name,
            "separator": separator,
            "analysis": analysis_result,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/suggestions/{dataset_name}")
async def get_dataset_suggestions(dataset_name: str, separator: str = ",") -> Dict[str, Any]:
    """
    Get quick suggestions for a dataset without full AI analysis (CSV or Parquet)
    """
    try:
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
                    # Try to find processed parquet version
                    parquet_name = dataset_name.replace('.csv', '.parquet')
                    parquet_path = f"data/processed/processed_{parquet_name}"
                    if os.path.exists(parquet_path):
                        filepath = parquet_path
                    else:
                        raise HTTPException(status_code=404, detail="Dataset not found")
        
        # Read dataset (CSV or Parquet)
        if filepath.endswith('.parquet'):
            df = pd.read_parquet(filepath)
        else:
            df = pd.read_csv(filepath, sep=separator)
        
        # Get basic info and simple suggestions
        ai_service = get_ai_service()
        dataset_info = ai_service._get_dataset_info(df)
        fallback_recommendations = ai_service._get_fallback_recommendations(df)
        
        return {
            "dataset_name": dataset_name,
            "separator": separator,
            "basic_info": dataset_info,
            "quick_suggestions": fallback_recommendations,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get suggestions: {str(e)}")

@router.get("/health")
async def ai_health_check() -> Dict[str, Any]:
    """
    Check if AI service is working
    """
    try:
        # Test with a simple dataset
        test_df = pd.DataFrame({
            'feature1': [1, 2, 3, 4, 5],
            'feature2': ['A', 'B', 'A', 'C', 'B'],
            'target': [0, 1, 0, 1, 0]
        })
        
        # Try to analyze the test dataset
        ai_service = get_ai_service()
        result = ai_service.analyze_dataset(test_df, "test_dataset")
        
        return {
            "status": "healthy",
            "ai_service": "operational",
            "openrouter_api": "connected" if "error" not in result else "error"
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "ai_service": "error",
            "error": str(e)
        }
