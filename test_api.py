#!/usr/bin/env python3
"""
Test script to verify API endpoints are working
"""

import requests
import json

def test_api():
    base_url = "http://localhost:8000/api"
    
    print("🧪 Testing AutoTrain Advanced API...")
    print("=" * 50)
    
    # Test 1: Health check
    try:
        response = requests.get("http://localhost:8000/health")
        if response.status_code == 200:
            print("✅ Health check: OK")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return
    
    # Test 2: List datasets
    try:
        response = requests.get(f"{base_url}/datasets/")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ List datasets: OK ({len(data.get('datasets', []))} datasets)")
        else:
            print(f"❌ List datasets failed: {response.status_code}")
    except Exception as e:
        print(f"❌ List datasets error: {e}")
    
    # Test 3: List training jobs
    try:
        response = requests.get(f"{base_url}/training/jobs")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ List training jobs: OK ({len(data.get('jobs', []))} jobs)")
        else:
            print(f"❌ List training jobs failed: {response.status_code}")
    except Exception as e:
        print(f"❌ List training jobs error: {e}")
    
    # Test 4: Test specific dataset (if exists)
    try:
        response = requests.get(f"{base_url}/datasets/")
        if response.status_code == 200:
            data = response.json()
            datasets = data.get('datasets', [])
            if datasets:
                dataset_name = datasets[0]['name']
                print(f"🔍 Testing dataset info for: {dataset_name}")
                
                info_response = requests.get(f"{base_url}/datasets/{dataset_name}")
                if info_response.status_code == 200:
                    info_data = info_response.json()
                    print(f"✅ Dataset info: OK")
                    print(f"   Columns: {info_data.get('column_names', [])}")
                else:
                    print(f"❌ Dataset info failed: {info_response.status_code}")
            else:
                print("ℹ️  No datasets found to test")
    except Exception as e:
        print(f"❌ Dataset info test error: {e}")
    
    print("\n🎯 API Test Complete!")
    print("If you see errors, make sure the backend is running:")
    print("   python -m autotrain.api.main")

if __name__ == "__main__":
    test_api()
