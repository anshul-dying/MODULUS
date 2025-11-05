#!/usr/bin/env python3
"""
Installation script for AutoTrain Advanced Image Training dependencies
"""

import subprocess
import sys
import os

def install_requirements():
    """Install requirements from requirements.txt"""
    try:
        print("🚀 Installing AutoTrain Advanced dependencies...")
        print("=" * 50)
        
        # Check if requirements.txt exists
        if not os.path.exists("requirements.txt"):
            print("❌ requirements.txt not found!")
            return False
        
        # Install requirements
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ All dependencies installed successfully!")
            print("\n📦 Installed packages for Image Training:")
            print("   • opencv-python - Computer vision library")
            print("   • Pillow - Python Imaging Library")
            print("   • imageio - Image I/O library")
            print("   • scikit-image - Image processing algorithms")
            print("   • joblib - Model serialization")
            print("\n🎯 You can now use the Image Training feature!")
            return True
        else:
            print("❌ Installation failed!")
            print("Error:", result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ Error during installation: {e}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required!")
        print(f"Current version: {sys.version}")
        return False
    return True

if __name__ == "__main__":
    print("AutoTrain Advanced - Image Training Setup")
    print("=" * 50)
    
    if not check_python_version():
        sys.exit(1)
    
    if install_requirements():
        print("\n🎉 Setup complete! You can now start the application:")
        print("   Backend: python -m autotrain.api.main")
        print("   Frontend: cd frontend && npm run dev")
    else:
        print("\n💡 Manual installation:")
        print("   pip install -r requirements.txt")
        sys.exit(1)
