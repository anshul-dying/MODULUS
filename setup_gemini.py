#!/usr/bin/env python3
"""
Setup script for Gemini API integration
"""

import subprocess
import sys
import os

def install_gemini_package():
    """Install the Google Generative AI package"""
    try:
        print("🔧 Installing Google Generative AI package...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "google-generativeai"])
        print("✅ Google Generative AI package installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install Google Generative AI package: {e}")
        return False

def create_env_template():
    """Create a template .env file"""
    env_content = """# Gemini API Configuration
# Get your API key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Instructions:
# 1. Go to https://makersuite.google.com/app/apikey
# 2. Create an account and generate an API key
# 3. Replace 'your_gemini_api_key_here' with your actual API key
# 4. Save this file
# 5. Restart the backend server
"""
    
    try:
        with open('.env', 'w') as f:
            f.write(env_content)
        print("📝 Created .env template file")
        print("📋 Please edit .env file and add your Gemini API key")
        return True
    except Exception as e:
        print(f"❌ Failed to create .env file: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 Setting up Gemini API integration...")
    
    # Install package
    if not install_gemini_package():
        return False
    
    # Create .env template
    if not create_env_template():
        return False
    
    print("\n✅ Setup completed!")
    print("\n📋 Next steps:")
    print("1. Edit the .env file and add your Gemini API key")
    print("2. Get your API key from: https://makersuite.google.com/app/apikey")
    print("3. Restart the backend server")
    print("4. Test AI analysis functionality")
    
    return True

if __name__ == "__main__":
    main()
