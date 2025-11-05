# Modulus

An end-to-end machine learning platform that simplifies the ML lifecycle from data ingestion to model deployment. The system provides an interactive web interface for automated data preprocessing, AI-powered analysis, model training, and artifact export.

## Overview

AutoTrain Advanced (also known as MODULUS) addresses the challenge that machine learning practitioners spend up to 80% of their time on data preparation and preprocessing. The platform automates key tasks while maintaining user control and transparency, making ML accessible to both beginners and experienced practitioners.

## Features

### Core Capabilities

- **Dataset Management**: Upload, validate, and manage CSV datasets with automatic schema detection
- **AI-Powered Analysis**: Context-aware data quality assessment and preprocessing recommendations using large language models (Qwen via OpenRouter and Google Gemini)
- **Automated Exploratory Data Analysis**: Comprehensive data profiling with statistical summaries and visualizations
- **Interactive Preprocessing**: Manual preprocessing with column-level control and transformation pipelines
- **Model Training**:
  - Tabular data: Classification and regression with scikit-learn algorithms
  - Computer Vision: Image classification and regression using transformer-based models (ViT, ResNet, Swin)
- **Model Evaluation**: Comprehensive metrics, confusion matrices, and performance visualizations
- **Comprehensive Reporting**: Automated generation of EDA, preprocessing, and training reports
- **Artifact Export**: Download trained models, preprocessing pipelines, and reports for deployment
- **Config-driven Training**: YAML-based configuration for reproducible experiments
- **Hugging Face Integration**: Push trained models to Hugging Face Hub

### Technical Highlights

- RESTful API architecture with FastAPI backend
- Modern React frontend with TypeScript and Tailwind CSS
- Asynchronous job processing for long-running tasks
- Support for multiple ML domains (tabular, computer vision)
- AI-assisted decision making for data quality and preprocessing
- Exportable and reproducible ML pipelines

## Prerequisites

- Python 3.10 or higher
- Node.js 16 or higher
- Git (optional, for version control)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/anshul-dying/MODULUS.git
cd modulus
```

### 2. Backend Setup

Create and activate a virtual environment:

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
```

Install Python dependencies:

```bash
# Install core dependencies
pip install -r requirements-simple.txt

# Install scikit-learn (pre-compiled wheels for Windows compatibility)
pip install scikit-learn --only-binary=all
```

For full feature support (including AI analysis and image training):

```bash
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Environment Configuration (Optional)

For AI-powered analysis features, create a `.env` file in the project root:

```bash
# For Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# For OpenRouter API (Qwen model)
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

Get API keys:
- Gemini: https://makersuite.google.com/app/apikey
- OpenRouter: https://openrouter.ai/keys

## Running the Application

### Option 1: Using Batch Files (Windows)

```bash
# Terminal 1 - Start Backend
run_backend.bat

# Terminal 2 - Start Frontend
run_frontend.bat
```

### Option 2: Using PowerShell Script (Windows)

```bash
start_app.ps1
```

### Option 3: Manual Commands

```bash
# Terminal 1 - Backend
python main.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Access Points

- **Frontend Application**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation (Swagger)**: http://localhost:8000/docs
- **Alternative API Docs (ReDoc)**: http://localhost:8000/redoc

## Project Structure

```
modulus/
├── src/autotrain/              # Backend Python code
│   ├── api/                   # FastAPI routes and schemas
│   │   ├── routers/           # API endpoint routers
│   │   │   ├── datasets.py    # Dataset management
│   │   │   ├── eda.py         # Exploratory data analysis
│   │   │   ├── preprocessing.py # Data preprocessing
│   │   │   ├── training.py    # Tabular model training
│   │   │   ├── image_training.py # Image model training
│   │   │   ├── ai_analysis.py # AI-powered analysis
│   │   │   └── export.py      # Model export
│   │   └── schemas.py         # Pydantic models
│   ├── services/              # Business logic services
│   │   ├── eda_service.py
│   │   ├── preprocessing_service.py
│   │   ├── training_service.py
│   │   └── ai_analysis_service.py
│   ├── trainers/              # Training implementations
│   │   ├── image_classification/
│   │   └── image_regression/
│   ├── preprocessor/          # Data preprocessing modules
│   ├── backends/              # Training backend abstractions
│   ├── core/                  # Configuration and logging
│   └── cli/                   # Command-line interfaces
├── frontend/                  # React frontend application
│   ├── src/
│   │   ├── pages/             # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Datasets.tsx
│   │   │   ├── Preprocessing.tsx
│   │   │   ├── Training.tsx
│   │   │   ├── ImageTraining.tsx
│   │   │   ├── Reports.tsx
│   │   │   └── Help.tsx
│   │   ├── components/        # Reusable UI components
│   │   ├── services/          # API client services
│   │   └── types/             # TypeScript type definitions
│   └── package.json
├── data/                      # Data storage directories
│   ├── uploads/              # User uploaded datasets
│   ├── processed/            # Preprocessed datasets
│   ├── artifacts/            # Training artifacts and reports
│   ├── exports/              # Exported models
│   └── bin/                  # Temporary data files
├── configs/                   # YAML configuration files
├── docs/                      # Documentation
│   ├── important/            # HLD, LLD, presentations
│   └── researchPaper/        # Research paper and diagrams
├── main.py                    # Application entry point
├── requirements.txt           # Full Python dependencies
├── requirements-simple.txt    # Minimal dependencies
├── run_backend.bat           # Windows backend launcher
├── run_frontend.bat           # Windows frontend launcher
└── start_app.ps1             # PowerShell launcher
```

## Technology Stack

### Backend

- **Framework**: FastAPI 0.104+
- **Language**: Python 3.10+
- **ML Libraries**: scikit-learn, pandas, numpy
- **Deep Learning**: PyTorch, Transformers, Hugging Face Hub
- **Data Processing**: ydata-profiling, openpyxl, pyarrow
- **Computer Vision**: OpenCV, Pillow, albumentations
- **AI/LLM**: google-generativeai (Gemini), langchain-openai (OpenRouter)
- **Database**: SQLAlchemy (for future database integration)
- **Utilities**: python-dotenv, pydantic-settings, loguru

### Frontend

- **Framework**: React 19
- **Build Tool**: Vite 7
- **Language**: TypeScript 5.8
- **UI Library**: Material-UI (MUI) 7, Radix UI components
- **Styling**: Tailwind CSS 4
- **State Management**: React hooks and context
- **Routing**: React Router 7
- **HTTP Client**: Axios
- **Animations**: Framer Motion

### Infrastructure

- **API Server**: Uvicorn (ASGI server)
- **Storage**: Local filesystem
- **File Formats**: CSV, PKL, JSON, HTML reports

## API Endpoints

### Datasets

- `GET /api/datasets/` - List all uploaded datasets
- `POST /api/datasets/upload` - Upload a new CSV dataset
- `GET /api/datasets/{dataset_name}` - Get dataset information and statistics
- `DELETE /api/datasets/{dataset_name}` - Delete a dataset

### Exploratory Data Analysis

- `POST /api/eda/generate/{dataset_name}` - Generate comprehensive EDA report
- `GET /api/eda/report/{dataset_name}` - Retrieve generated EDA report

### Preprocessing

- `POST /api/preprocessing/analyze/{dataset_name}` - Analyze dataset and get AI-powered preprocessing suggestions
- `POST /api/preprocessing/apply/{dataset_name}` - Apply preprocessing transformations
- `GET /api/preprocessing/report/{dataset_name}` - Get preprocessing report

### Training (Tabular Data)

- `POST /api/training/start` - Start a new training job
- `GET /api/training/status/{job_id}` - Get training job status
- `GET /api/training/jobs` - List all training jobs
- `GET /api/training/report/{job_id}` - Get training report

### Image Training

- `POST /api/image-training/start` - Start image classification or regression training
- `GET /api/image-training/status/{job_id}` - Get image training job status
- `GET /api/image-training/jobs` - List all image training jobs

### AI Analysis

- `POST /api/ai/analyze/{dataset_name}` - Perform AI-powered dataset analysis
- `GET /api/ai/suggestions/{dataset_name}` - Get quick AI suggestions
- `GET /api/ai/health` - Check AI service health

### Export

- `POST /api/export/model` - Export trained model with artifacts
- `GET /api/export/download/{filename}` - Download exported model archive
- `GET /api/export/list` - List all available exports

## Usage Guide

### 1. Upload Dataset

Navigate to the Datasets page and upload a CSV file. The system will automatically validate the dataset and extract basic statistics.

### 2. Perform EDA

Generate an Exploratory Data Analysis report to understand your data's characteristics, distributions, and potential issues.

### 3. AI-Powered Analysis (Optional)

Use the AI Analysis feature to get intelligent recommendations for:
- Target column suggestions
- Task type classification (classification vs regression)
- Algorithm recommendations
- Data quality assessment
- Preprocessing suggestions

### 4. Preprocess Data

Choose between:
- **Automated Preprocessing**: Apply AI-suggested transformations
- **Manual Preprocessing**: Use the interactive interface for column-level control

### 5. Train Model

For tabular data:
- Select target column
- Choose task type (classification or regression)
- Configure hyperparameters
- Start training

For image data:
- Upload image dataset (organized in folders by class)
- Select model architecture (ViT, ResNet, Swin)
- Configure training parameters
- Optionally push to Hugging Face Hub

### 6. Evaluate Results

Review training metrics, confusion matrices, and performance visualizations in the Reports section.

### 7. Export Model

Export the trained model along with preprocessing pipeline and metadata as a ZIP archive for deployment.

## Configuration

### Training Configuration

Create YAML configuration files in the `configs/` directory:

```yaml
task: classification
target_column: target
algorithm: random_forest
hyperparameters:
  n_estimators: 100
  max_depth: 10
test_size: 0.2
random_state: 42
```

### Environment Variables

Set the following in `.env` file:

```bash
GEMINI_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
```

## Troubleshooting

### Windows Installation Issues

If you encounter compilation errors with scikit-learn:

**Option 1: Use pre-compiled wheels**
```bash
pip install -r requirements-simple.txt
pip install scikit-learn --only-binary=all
```

**Option 2: Use conda**
```bash
conda create -p modulus python=3.10
conda activate ./modulus
```

**Option 3: Install Microsoft C++ Build Tools**
- Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- Then run: `pip install -r requirements.txt`

## Architecture

The system follows a layered architecture:

1. **Presentation Layer**: React frontend with component-based UI
2. **API Gateway Layer**: FastAPI with CORS and request validation
3. **Business Logic Layer**: Service modules for each feature domain
4. **Data Layer**: File system storage with structured directories
5. **External Services**: OpenRouter API and Google Gemini API for AI features

Communication between layers uses RESTful APIs with JSON payloads. Long-running operations (training, EDA generation) are processed asynchronously with status tracking.

## Security Considerations

- API keys are stored in environment variables (`.env` file, not committed to git)
- User-uploaded data is stored locally and isolated per session
- File upload validation prevents malicious file execution
- CORS is configured to allow only specific origins
- Sensitive tokens are masked in logs

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[MIT License](./licence)


