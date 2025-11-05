#!/usr/bin/env python3
"""
Test AI analysis with different datasets
"""

import requests
import json

def test_ai_analysis(dataset_name):
    base_url = 'http://localhost:8000/api'
    
    print(f'🧪 Testing AI analysis with {dataset_name}...')
    response = requests.post(f'{base_url}/ai/analyze/{dataset_name}')
    print(f'Status: {response.status_code}')
    
    if response.status_code == 200:
        data = response.json()
        if 'analysis' in data and 'error' in data['analysis']:
            error_msg = data['analysis']['error']
            print(f'❌ Error: {error_msg}')
            return False
        else:
            print(f'✅ Analysis successful')
            return True
    else:
        print(f'❌ Failed: {response.text}')
        return False

if __name__ == "__main__":
    # Test with different datasets
    datasets = ['Advertising.csv', 'processed_Summary of Weather.parquet']
    
    for dataset in datasets:
        success = test_ai_analysis(dataset)
        result = "✅ Success" if success else "❌ Failed"
        print(f'Result for {dataset}: {result}')
        print()
