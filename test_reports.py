#!/usr/bin/env python3
"""
Test preprocessing reports
"""

import requests

def test_reports():
    base_url = 'http://localhost:8000/api'
    
    print('🧪 Testing preprocessing reports...')
    response = requests.get(f'{base_url}/preprocessing/reports')
    print(f'Status: {response.status_code}')
    
    if response.status_code == 200:
        data = response.json()
        print(f'✅ Reports endpoint successful')
        reports = data.get('reports', [])
        print(f'📊 Found {len(reports)} reports')
        
        for report in reports:
            filename = report.get('filename', 'Unknown')
            size = report.get('size', 0)
            print(f'  - {filename} ({size} bytes)')
    else:
        print(f'❌ Reports endpoint failed: {response.text}')

if __name__ == "__main__":
    test_reports()
