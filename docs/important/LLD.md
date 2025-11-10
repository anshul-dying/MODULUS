# MODULUS - Low Level Design (LLD)

## Table of Contents

1. [Component Design](#component-design)
2. [Database Schema](#database-schema)
3. [API Design](#api-design)
4. [Class Diagrams](#class-diagrams)
5. [Sequence Diagrams](#sequence-diagrams)
6. [Data Structures](#data-structures)
7. [Algorithm Design](#algorithm-design)
8. [Error Handling](#error-handling)

---

## Component Design

### Frontend Component Hierarchy

```mermaid
graph TB
    App["App.tsx"]

    subgraph Layout["Layout Components"]
        Navbar["Navbar"]
        InteractiveGrid["InteractiveGrid"]
        KeyboardShortcuts["KeyboardShortcuts"]
    end

    subgraph Pages["Page Components"]
        Dashboard["Dashboard"]
        Datasets["Datasets"]
        Preprocessing["Preprocessing"]
        Training["Training"]
        ImageTraining["ImageTraining"]
        Reports["Reports"]
        Help["Help"]
    end

    subgraph UI["UI Components"]
        Card["Card"]
        Button["Button"]
        Input["Input"]
        Select["Select"]
        Badge["Badge"]
        Breadcrumb["Breadcrumb"]
        StatsCard["StatsCard"]
        EmptyState["EmptyState"]
    end

    subgraph Services["Services"]
        API["api.ts"]
        Types["types/api.ts"]
    end

    App --> Layout
    App --> Pages
    Pages --> UI
    Pages --> Services

    style App fill:#e1f5ff
    style Layout fill:#fff4e1
    style Pages fill:#e8f5e9
    style UI fill:#fce4ec
    style Services fill:#f3e5f5
```

### Backend Service Architecture

```mermaid
graph TB
    subgraph API["API Routers"]
        DatasetRouter["DatasetRouter"]
        PreprocessingRouter["PreprocessingRouter"]
        TrainingRouter["TrainingRouter"]
        ImageTrainingRouter["ImageTrainingRouter"]
        EDARouter["EDARouter"]
        AIRouter["AIRouter"]
        ExportRouter["ExportRouter"]
    end

    subgraph Services["Service Layer"]
        DatasetService["DatasetService"]
        PreprocessingService["PreprocessingService"]
        TrainingService["TrainingService"]
        ImageTrainingService["ImageTrainingService"]
        EDAService["EDAService"]
        AIService["AIAnalysisService"]
        ExportService["ExportService"]
    end

    subgraph Utils["Utilities"]
        MLUtils["ML Utils"]
        FileUtils["File Utils"]
        Config["Config"]
    end

    API --> Services
    Services --> Utils

    style API fill:#e1f5ff
    style Services fill:#fff4e1
    style Utils fill:#e8f5e9
```

---

## Database Schema

### File System Schema (Current Implementation)

Since MODULUS uses file-based storage, the "database" is actually a structured file system:

```
data/
├── uploads/              # Dataset files
│   ├── {dataset_name}.csv
│   └── {dataset_name}.parquet
│
├── processed/            # Preprocessed datasets
│   └── {basename}.parquet
│
├── artifacts/            # Generated artifacts
│   ├── eda_report_{dataset}.html
│   ├── preprocessing_report_{job_id}.html
│   ├── training_report_{job_id}.html
│   └── model_{timestamp}.pkl
│
├── exports/              # Export packages
│   └── model_export_{job_id}_{timestamp}.zip
│
└── bin/                  # Backup files
    └── {timestamp}_{original_name}
```

### In-Memory Data Structures

```mermaid
erDiagram
    TRAINING_JOB ||--o{ TRAINING_METRICS : has
    PREPROCESSING_JOB ||--o{ PREPROCESSING_STEPS : has
    DATASET ||--o{ EDA_REPORT : generates
    DATASET ||--o{ PREPROCESSING_JOB : processes
    PREPROCESSING_JOB ||--o{ TRAINING_JOB : enables

    TRAINING_JOB {
        string job_id PK
        string dataset_name
        string algorithm
        string task_type
        string status
        float accuracy
        datetime created_at
        datetime completed_at
        string model_path
        string report_path
    }

    PREPROCESSING_JOB {
        string job_id PK
        string dataset_name
        dict preprocessing_options
        string status
        datetime created_at
        datetime completed_at
        string processed_path
        string report_path
    }

    DATASET {
        string name PK
        int size
        int rows
        int columns
        datetime upload_date
        string file_type
    }
```

### Future Database Schema (SQL)

```sql
-- Datasets Table
CREATE TABLE datasets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    size BIGINT NOT NULL,
    rows INTEGER NOT NULL,
    columns INTEGER NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_type VARCHAR(10),
    file_path VARCHAR(500),
    metadata JSONB
);

-- Training Jobs Table
CREATE TABLE training_jobs (
    id UUID PRIMARY KEY,
    dataset_name VARCHAR(255) REFERENCES datasets(name),
    algorithm VARCHAR(100) NOT NULL,
    task_type VARCHAR(20) NOT NULL,
    target_column VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    accuracy FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    model_path VARCHAR(500),
    report_path VARCHAR(500),
    metrics JSONB,
    config JSONB
);

-- Preprocessing Jobs Table
CREATE TABLE preprocessing_jobs (
    id UUID PRIMARY KEY,
    dataset_name VARCHAR(255) REFERENCES datasets(name),
    status VARCHAR(20) NOT NULL,
    preprocessing_options JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    processed_path VARCHAR(500),
    report_path VARCHAR(500),
    quality_improvements JSONB
);

-- EDA Reports Table
CREATE TABLE eda_reports (
    id SERIAL PRIMARY KEY,
    dataset_name VARCHAR(255) REFERENCES datasets(name),
    report_path VARCHAR(500) NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    summary JSONB
);
```

---

## API Design

### API Endpoint Structure

```mermaid
graph TB
    API["/api"]

    subgraph Datasets["/datasets"]
        D1["GET / - List"]
        D2["POST /upload - Upload"]
        D3["GET /{name} - Info"]
        D4["DELETE /{name} - Delete"]
    end

    subgraph Preprocessing["/preprocessing"]
        P1["POST /start - Start"]
        P2["GET /status/{job_id} - Status"]
        P3["GET /jobs - List Jobs"]
        P4["POST /ai-analyze/{name} - AI Analysis"]
        P5["GET /manual/preview/{name} - Preview"]
        P6["POST /manual/apply - Apply"]
        P7["GET /reports/{job_id} - Report"]
    end

    subgraph Training["/training"]
        T1["POST /start - Start"]
        T2["GET /status/{job_id} - Status"]
        T3["GET /jobs - List Jobs"]
        T4["GET /reports - List Reports"]
        T5["GET /reports/{filename} - Get Report"]
    end

    subgraph EDA["/eda"]
        E1["POST /generate/{name} - Generate"]
        E2["GET /report/{name} - Get Report"]
        E3["GET /reports - List Reports"]
    end

    subgraph AI["/ai"]
        A1["POST /analyze/{name} - Analyze"]
        A2["GET /suggestions/{name} - Suggestions"]
        A3["GET /health - Health Check"]
    end

    API --> Datasets
    API --> Preprocessing
    API --> Training
    API --> EDA
    API --> AI

    style API fill:#e1f5ff
```

### API Request/Response Models

#### Training Request Schema

```typescript
interface TrainingRequest {
  dataset_name: string;
  task_type: "classification" | "regression";
  target_column: string;
  algorithm: string;
  test_size?: number; // 0.1 - 0.5
  random_state?: number;
  exclude_columns?: string[];
  ohe_columns?: string[]; // One-hot encoding
  scale_columns?: string[]; // Standard scaling
  null_handling?: string; // 'drop' | 'fill' | 'mean' | 'median' | 'mode'
  null_fill_value?: string | number;
  separator?: string; // CSV separator
}
```

#### Training Response Schema

```typescript
interface TrainingResponse {
  job_id: string;
  status: "pending" | "running" | "completed" | "failed";
  message: string;
}

interface TrainingResult {
  job_id: string;
  status: string;
  accuracy?: number;
  metrics: {
    precision?: number;
    recall?: number;
    f1_score?: number;
    roc_auc?: number;
    mae?: number;
    mse?: number;
    r2_score?: number;
  };
  model_path?: string;
  report_path?: string;
  error?: string;
}
```

---

## Class Diagrams

### Backend Service Classes

```mermaid
classDiagram
    class DatasetService {
        +upload_dataset(file, separator)
        +list_datasets()
        +get_dataset_info(name)
        +delete_dataset(name)
        +preview_dataset(name, limit)
    }

    class PreprocessingService {
        -ai_service: AIAnalysisService
        +process_dataset(name, options)
        +ai_analyze(dataset_name)
        +manual_preview(dataset_name)
        +manual_apply(dataset_name, operations)
        -_assess_data_quality(df)
        -_apply_preprocessing(df, options)
        -convert_numpy_types(obj)
    }

    class TrainingService {
        +train_model(request)
        +get_status(job_id)
        +list_jobs()
        -_load_data(path)
        -_preprocess_features(df, request)
        -_train_classifier(X, y, algorithm)
        -_train_regressor(X, y, algorithm)
        -_evaluate_model(model, X_test, y_test)
        -_generate_report(job_id, metrics)
    }

    class EDAService {
        +generate_report(dataset_name)
        +get_report(dataset_name)
        -_create_profile(df)
    }

    class AIAnalysisService {
        -openrouter_client
        -gemini_client
        +analyze_dataset(df, name)
        +analyze_dataset_for_preprocessing(df, name)
        -_get_dataset_info(df)
        -_generate_preprocessing_suggestions(df, info)
        -_calculate_data_quality_score(df)
        -_identify_data_issues(df)
    }

    DatasetService --> PreprocessingService
    PreprocessingService --> AIAnalysisService
    PreprocessingService --> TrainingService
```

### Frontend Component Classes

```mermaid
classDiagram
    class Dashboard {
        -data: DashboardData
        -loading: boolean
        -tutorial: object
        +loadDashboardData()
        +handleRefresh()
        +markStep(id, status)
        +calculateProgress()
    }

    class Datasets {
        -datasets: Dataset[]
        -selectedDataset: string
        -aiAnalysis: AIAnalysisResponse
        +loadDatasets()
        +handleUpload(file)
        +runAIAnalysis(name)
        +startTraining()
    }

    class Preprocessing {
        -datasets: Dataset[]
        -selectedDataset: string
        -aiSuggestions: AISuggestion[]
        -manualOps: ManualOperations
        -columnSummaries: ColumnSummary[]
        +loadDatasets()
        +runAIAnalysis()
        +manualPreview()
        +applyOperations()
    }

    class Training {
        -datasets: Dataset[]
        -selectedDataset: string
        -targetColumn: string
        -taskType: string
        -algorithm: string
        +loadDatasets()
        +startTraining()
        +loadJobs()
    }

    Dashboard --> Datasets
    Datasets --> Preprocessing
    Preprocessing --> Training
```

---

## Sequence Diagrams

### Dataset Upload Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant DatasetService
    participant FileSystem

    User->>Frontend: Select & Upload File
    Frontend->>API: POST /api/datasets/upload
    API->>API: Validate File (size, type)

    alt Valid File
        API->>DatasetService: upload_dataset(file, separator)
        DatasetService->>DatasetService: Extract Metadata
        DatasetService->>FileSystem: Save to data/uploads/
        FileSystem-->>DatasetService: Success
        DatasetService->>DatasetService: Create DatasetInfo
        DatasetService-->>API: DatasetInfo
        API-->>Frontend: 200 OK + DatasetInfo
        Frontend-->>User: Show Success + Dataset Card
    else Invalid File
        API-->>Frontend: 400 Bad Request
        Frontend-->>User: Show Error Message
    end
```

### Preprocessing Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant PreprocessingService
    participant AIService
    participant External
    participant FileSystem

    User->>Frontend: Run AI Analysis
    Frontend->>API: POST /api/preprocessing/ai-analyze/{name}
    API->>PreprocessingService: ai_analyze(dataset_name)
    PreprocessingService->>FileSystem: Load Dataset
    FileSystem-->>PreprocessingService: DataFrame
    PreprocessingService->>AIService: analyze_dataset_for_preprocessing(df)
    AIService->>AIService: Extract Statistics
    AIService->>External: Call LLM API
    External-->>AIService: Analysis Results
    AIService-->>PreprocessingService: Suggestions
    PreprocessingService-->>API: Preprocessing Suggestions
    API-->>Frontend: 200 OK + Suggestions
    Frontend-->>User: Display Suggestions

    User->>Frontend: Apply Operations
    Frontend->>API: POST /api/preprocessing/manual/apply
    API->>PreprocessingService: manual_apply(dataset_name, operations)
    PreprocessingService->>PreprocessingService: Apply Operations
    PreprocessingService->>FileSystem: Save Processed Dataset
    PreprocessingService->>PreprocessingService: Generate Report
    PreprocessingService->>FileSystem: Save Report
    FileSystem-->>PreprocessingService: Success
    PreprocessingService-->>API: Job Result
    API-->>Frontend: 200 OK + Result
    Frontend-->>User: Show Success + Report Link
```

### Training Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant TrainingService
    participant MLUtils
    participant FileSystem

    User->>Frontend: Configure & Start Training
    Frontend->>API: POST /api/training/start
    API->>API: Validate Request
    API->>TrainingService: train_model(request)
    TrainingService->>FileSystem: Load Dataset
    FileSystem-->>TrainingService: DataFrame

    TrainingService->>TrainingService: Preprocess Features
    TrainingService->>TrainingService: Train/Test Split
    TrainingService->>MLUtils: Train Model
    MLUtils->>MLUtils: Fit Algorithm
    MLUtils-->>TrainingService: Trained Model

    TrainingService->>MLUtils: Evaluate Model
    MLUtils-->>TrainingService: Metrics

    TrainingService->>FileSystem: Save Model (PKL)
    TrainingService->>TrainingService: Generate Report
    TrainingService->>FileSystem: Save Report (HTML)

    TrainingService-->>API: Job Result
    API-->>Frontend: 200 OK + Job ID

    loop Polling
        Frontend->>API: GET /api/training/status/{job_id}
        API->>TrainingService: get_status(job_id)
        TrainingService-->>API: Status
        API-->>Frontend: Status Response
    end
```

---

## Data Structures

### Core Data Models

#### DatasetInfo

```python
class DatasetInfo(BaseModel):
    name: str                    # Dataset filename
    size: int                    # File size in bytes
    rows: int                    # Number of rows
    columns: int                 # Number of columns
    upload_date: float          # Unix timestamp
    file_type: str = "csv"      # "csv" or "parquet"
```

#### TrainingJob

```python
class TrainingJob(BaseModel):
    job_id: str
    dataset_name: str
    algorithm: str
    target_column: str
    task_type: str              # "classification" or "regression"
    status: str                 # "pending" | "running" | "completed" | "failed"
    accuracy: Optional[float]
    error: Optional[str]
    created_at: str
    model_path: Optional[str]
    report_path: Optional[str]
```

#### PreprocessingJob

```python
class PreprocessingJob(BaseModel):
    job_id: str
    dataset_name: str
    status: str
    preprocessing_options: Dict[str, Any]
    created_at: str
    completed_at: Optional[str]
    result: Optional[Dict[str, Any]]
    report_path: Optional[str]
```

### Internal Data Structures

#### Preprocessing Log

```python
preprocessing_log = {
    "job_id": str,
    "dataset_name": str,
    "original_shape": tuple[int, int],
    "steps_applied": List[str],
    "ai_suggestions": List[Dict],
    "manual_options": Dict,
    "final_shape": tuple[int, int],
    "quality_improvements": {
        "missing_values_removed": int,
        "outliers_handled": int,
        "duplicates_removed": int,
        "columns_dropped": int,
        "type_conversions": int
    },
    "processing_time": float
}
```

---

## Algorithm Design

### Preprocessing Algorithm

```mermaid
flowchart TD
    Start([Start Preprocessing]) --> Load[Load Dataset]
    Load --> Analyze[Analyze Data Quality]
    Analyze --> CheckAI{AI Analysis?}

    CheckAI -->|Yes| AI[Get AI Suggestions]
    CheckAI -->|No| Manual[Use Manual Options]

    AI --> Merge[Merge Suggestions]
    Merge --> Manual

    Manual --> Apply[Apply Operations]

    Apply --> DropCols[Drop Columns]
    DropCols --> TypeConv[Type Conversion]
    TypeConv --> Missing[Handle Missing Values]
    Missing --> Outliers[Handle Outliers]
    Outliers --> Encoding[Encoding]
    Encoding --> Scaling[Scaling]
    Scaling --> Balance{Class Imbalance?}

    Balance -->|Yes| SMOTE[Apply SMOTE]
    Balance -->|No| Save
    SMOTE --> Save

    Save[Save Processed Dataset] --> Report[Generate Report]
    Report --> End([Complete])

    style Start fill:#c8e6c9
    style End fill:#c8e6c9
    style AI fill:#fff9c4
```

### Training Algorithm

```mermaid
flowchart TD
    Start([Start Training]) --> Load[Load Dataset]
    Load --> Preprocess[Preprocess Features]

    Preprocess --> Exclude[Exclude Columns]
    Exclude --> Encode[One-Hot Encode]
    Encode --> Scale[Scale Features]
    Scale --> Split[Train/Test Split]

    Split --> Select{Task Type}

    Select -->|Classification| ClassAlgo[Select Classifier]
    Select -->|Regression| RegAlgo[Select Regressor]

    ClassAlgo --> Train[Train Model]
    RegAlgo --> Train

    Train --> Eval[Evaluate Model]
    Eval --> Metrics[Calculate Metrics]
    Metrics --> Save[Save Model & Report]
    Save --> End([Complete])

    style Start fill:#c8e6c9
    style End fill:#c8e6c9
```

---

## Error Handling

### Error Handling Strategy

```mermaid
graph TB
    Error[Error Occurs] --> Type{Error Type}

    Type -->|Validation| Validation[Validation Error<br/>400 Bad Request]
    Type -->|Not Found| NotFound[Not Found Error<br/>404 Not Found]
    Type -->|Server| Server[Server Error<br/>500 Internal Server Error]
    Type -->|Timeout| Timeout[Timeout Error<br/>504 Gateway Timeout]
    Type -->|External| External[External API Error<br/>503 Service Unavailable]

    Validation --> Log[Log Error]
    NotFound --> Log
    Server --> Log
    Timeout --> Log
    External --> Log

    Log --> Response[Return Error Response]
    Response --> Client[Client Handles]

    Client --> User[User Sees<br/>Friendly Message]

    style Error fill:#ffcdd2
    style User fill:#c8e6c9
```

### Error Response Format

```python
class ErrorResponse(BaseModel):
    error: str
    detail: str
    code: str
    timestamp: str
```

### Exception Hierarchy

```mermaid
graph TB
    BaseException --> AutoTrainException
    AutoTrainException --> ValidationError
    AutoTrainException --> NotFoundError
    AutoTrainException --> ProcessingError
    AutoTrainException --> TrainingError
    AutoTrainException --> ExternalAPIError

    style AutoTrainException fill:#fff9c4
```

---

## Performance Optimization

### Caching Strategy

```mermaid
graph LR
    Request[API Request] --> Check{Check Cache}
    Check -->|Hit| Cache[Return Cached]
    Check -->|Miss| Process[Process Request]
    Process --> Store[Store in Cache]
    Store --> Return[Return Response]

    style Cache fill:#c8e6c9
```

### Async Processing

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Queue
    participant Worker
    participant Storage

    Client->>API: POST /start
    API->>Queue: Create Background Job
    Queue-->>API: Job ID
    API-->>Client: 202 Accepted + Job ID

    Queue->>Worker: Process Job
    Worker->>Worker: Execute Task
    Worker->>Storage: Save Results
    Storage-->>Worker: Success
    Worker->>Queue: Update Status

    Client->>API: GET /status/{job_id}
    API->>Queue: Check Status
    Queue-->>API: Status
    API-->>Client: Status Response
```

---

## Security Implementation

### Input Validation Flow

```mermaid
flowchart TD
    Input[User Input] --> Validate[Pydantic Validation]
    Validate -->|Valid| Sanitize[Sanitize Input]
    Validate -->|Invalid| Error[Return 400 Error]

    Sanitize --> PathCheck{Path Validation}
    PathCheck -->|Safe| Process[Process Request]
    PathCheck -->|Unsafe| Block[Block Request]

    Process --> Execute[Execute Operation]
    Block --> LogError[Log Security Event]

    style Error fill:#ffcdd2
    style Block fill:#ffcdd2
    style Process fill:#c8e6c9
```

---

## Conclusion

The Low Level Design provides detailed specifications for each component, including class structures, data models, API endpoints, and algorithms. This design ensures consistent implementation and maintainability across the MODULUS platform.
