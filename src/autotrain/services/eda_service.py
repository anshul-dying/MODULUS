"""
Exploratory Data Analysis Service
"""

import pandas as pd
from ydata_profiling import ProfileReport
import os

class EDAService:
    def __init__(self):
        self.artifacts_dir = "data/artifacts"
        os.makedirs(self.artifacts_dir, exist_ok=True)
    
    async def generate_report(self, df: pd.DataFrame, dataset_name: str) -> str:
        """Generate comprehensive EDA report using ydata_profiling"""
        report_name = f"eda_{dataset_name.replace('.csv', '')}"
        report_path = f"{self.artifacts_dir}/{report_name}.html"
        
        # Generate profile report using ydata_profiling
        profile = ProfileReport(
            df, 
            title=f"EDA Report - {dataset_name}",
            explorative=True,
            minimal=False
        )
        
        # Save the report
        profile.to_file(report_path)
        
        return report_path
    
