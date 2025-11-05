# AutoTrain Advanced

An end-to-end machine learning pipeline that enables users to upload datasets, perform exploratory data analysis, train models, and export deployable artifacts through a simple web interface.

## Features

- **Dataset Management**: Upload and validate CSV datasets
- **Exploratory Data Analysis**: Automated profiling and visualization
- **Model Training**: Support for classification and regression tasks
- **Model Evaluation**: Comprehensive metrics and visualizations
- **Artifact Export**: Download trained models and reports
- **Config-driven Training**: YAML-based configuration for reproducible experiments

## Quick Start

### Prerequisites
- Python 3.10+ installed
- Node.js 16+ installed
- Git (optional, for version control)

### Installation

1. **Clone and setup the project:**
```bash
git clone <your-repo-url>
cd autotrain-advanced
```

2. **Backend Setup:**
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements-simple.txt
pip install scikit-learn --only-binary=all
```

3. **Frontend Setup:**
```bash
cd frontend
npm install
```

### Running the Application

**Option 1: Using batch files (Windows)**
```bash
# Terminal 1 - Backend
run_backend.bat

# Terminal 2 - Frontend  
run_frontend.bat
```

**Option 2: Manual commands**
```bash
# Terminal 1 - Backend
python main.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Project Structure

```
autotrain-advanced/
├── src/autotrain/           # Backend Python code
│   ├── api/                # FastAPI routes and schemas
│   ├── core/               # Configuration and logging
│   ├── services/           # Business logic services
│   └── storage/            # Data storage utilities
├── frontend/               # React + Vite + TypeScript frontend
├── data/                   # Data storage (uploads, artifacts, exports)
├── configs/                # YAML configuration files
├── docs/                   # Documentation
├── run_backend.bat         # Windows batch file to start backend
├── run_frontend.bat        # Windows batch file to start frontend
└── requirements-simple.txt # Simplified Python dependencies
```

## Technology Stack

- **Backend**: FastAPI, Python 3.10+
- **Frontend**: React 18, Vite, TypeScript, Material-UI
- **ML**: scikit-learn, pandas, numpy, matplotlib, seaborn
- **Storage**: Local filesystem, SQLite
- **Visualization**: Matplotlib, Seaborn, Plotly

## API Endpoints

### Datasets
- `GET /api/datasets/` - List all datasets
- `POST /api/datasets/upload` - Upload a new dataset
- `GET /api/datasets/{dataset_name}` - Get dataset info
- `DELETE /api/datasets/{dataset_name}` - Delete dataset

### EDA
- `POST /api/eda/generate/{dataset_name}` - Generate EDA report
- `GET /api/eda/report/{dataset_name}` - Get EDA report

### Training
- `POST /api/training/start` - Start training job
- `GET /api/training/status/{job_id}` - Get training status
- `GET /api/training/jobs` - List all training jobs

### Export
- `POST /api/export/model` - Export model
- `GET /api/export/download/{filename}` - Download export
- `GET /api/export/list` - List exports

## Troubleshooting

### Windows Installation Issues

If you encounter compilation errors with scikit-learn:

1. **Use the simplified requirements:**
```bash
pip install -r requirements-simple.txt
pip install scikit-learn --only-binary=all
```

2. **Or use conda (if available):**
```bash
conda create -n autotrain python=3.10
conda activate autotrain
conda install scikit-learn pandas numpy matplotlib seaborn
pip install fastapi uvicorn pydantic python-multipart
```

3. **Install Microsoft C++ Build Tools:**
   - Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Then run: `pip install -r requirements.txt`

### Common Issues

- **Port already in use**: Change ports in `main.py` (backend) or `vite.config.js` (frontend)
- **CORS errors**: Ensure backend is running on port 8000 and frontend on port 5173
- **Module not found**: Make sure virtual environment is activated and dependencies are installed

## Development

### Adding New Features

1. **Backend**: Add new routes in `src/autotrain/api/routers/`
2. **Frontend**: Add new pages in `frontend/src/pages/`
3. **Services**: Add business logic in `src/autotrain/services/`

### Testing

```bash
# Backend tests
pytest tests/

# Frontend tests
cd frontend
npm test
```

## License

MIT License