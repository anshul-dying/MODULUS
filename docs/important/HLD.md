# MODULUS - High Level Design (HLD)

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Design](#architecture-design)
3. [System Components](#system-components)
4. [Data Flow](#data-flow)
5. [Technology Stack](#technology-stack)
6. [Deployment Architecture](#deployment-architecture)
7. [Security Architecture](#security-architecture)
8. [Scalability & Performance](#scalability--performance)

---

## System Overview

MODULUS is an end-to-end machine learning platform that simplifies the ML lifecycle from data ingestion to model deployment. The system provides an interactive web interface for automated data preprocessing, model training, and artifact export.

### Key Features

- **Automated Data Preprocessing** with AI-powered suggestions
- **Interactive Web Interface** for non-technical users
- **Multiple ML Domains** - Tabular, Computer Vision
- **Comprehensive Reporting** - EDA, training, and preprocessing reports
- **Reproducible Pipelines** with exportable artifacts

---

## Architecture Design

### High-Level Architecture

```mermaid
graph TB
    subgraph Client["Client Layer"]
        Browser["Web Browser"]
        User["End User"]
    end

    subgraph Presentation["Presentation Layer"]
        React["React Frontend<br/>Port: 5173"]
        Components["UI Components"]
        State["State Management"]
    end

    subgraph API["API Gateway Layer"]
        FastAPI["FastAPI Backend<br/>Port: 8000"]
        CORS["CORS Middleware"]
        Validation["Request Validation"]
    end

    subgraph Business["Business Logic Layer"]
        DatasetService["Dataset Service"]
        PreprocessingService["Preprocessing Service"]
        TrainingService["Training Service"]
        ImageTrainingService["Image Training Service"]
        EDAService["EDA Service"]
        AIService["AI Analysis Service"]
        ExportService["Export Service"]
    end

    subgraph Data["Data Layer"]
        FileSystem["File System Storage"]
        Uploads["uploads/"]
        Processed["processed/"]
        Artifacts["artifacts/"]
        Exports["exports/"]
    end

    subgraph External["External Services"]
        OpenRouter["OpenRouter API<br/>Qwen Model"]
        Gemini["Google Gemini API"]
    end

    User --> Browser
    Browser --> React
    React -->|HTTP/REST| FastAPI
    FastAPI --> Business
    Business --> Data
    AIService --> OpenRouter
    AIService --> Gemini

    style Client fill:#e1f5ff
    style Presentation fill:#fff4e1
    style API fill:#e8f5e9
    style Business fill:#fce4ec
    style Data fill:#f3e5f5
    style External fill:#fff9c4
```

### System Architecture Layers

```mermaid
graph LR
    subgraph Layer1["Layer 1: Client"]
        Web["Web Browser"]
        Mobile["Mobile Browser<br/>(Future)"]
    end

    subgraph Layer2["Layer 2: Presentation"]
        Frontend["React SPA"]
        Static["Static Assets"]
    end

    subgraph Layer3["Layer 3: API Gateway"]
        Gateway["FastAPI"]
        Auth["Auth (Future)"]
        RateLimit["Rate Limiting"]
    end

    subgraph Layer4["Layer 4: Services"]
        S1["Dataset"]
        S2["Preprocessing"]
        S3["Training"]
        S4["EDA"]
        S5["AI Analysis"]
        S6["Export"]
    end

    subgraph Layer5["Layer 5: Storage"]
        FS["File System"]
        Cache["Cache<br/>(Future)"]
    end

    Layer1 --> Layer2
    Layer2 --> Layer3
    Layer3 --> Layer4
    Layer4 --> Layer5

    style Layer1 fill:#e1f5ff
    style Layer2 fill:#fff4e1
    style Layer3 fill:#e8f5e9
    style Layer4 fill:#fce4ec
    style Layer5 fill:#f3e5f5
```

---

## System Components

### Component Architecture

```mermaid
graph TB
    subgraph Frontend["Frontend Components"]
        Dashboard["Dashboard"]
        Datasets["Datasets Page"]
        Preprocessing["Preprocessing Page"]
        Training["Training Page"]
        ImageTraining["Image Training Page"]
        Reports["Reports Page"]
        Help["Help Page"]
    end

    subgraph Backend["Backend Services"]
        DatasetAPI["Dataset API"]
        PreprocessingAPI["Preprocessing API"]
        TrainingAPI["Training API"]
        ImageTrainingAPI["Image Training API"]
        EDAAPI["EDA API"]
        AIAPI["AI Analysis API"]
        ExportAPI["Export API"]
    end

    subgraph Core["Core Services"]
        DatasetSvc["DatasetService"]
        PreprocessingSvc["PreprocessingService"]
        TrainingSvc["TrainingService"]
        ImageTrainingSvc["ImageTrainingService"]
        EDASvc["EDAService"]
        AISvc["AIAnalysisService"]
        ExportSvc["ExportService"]
    end

    Frontend --> Backend
    Backend --> Core

    style Frontend fill:#e1f5ff
    style Backend fill:#fff4e1
    style Core fill:#e8f5e9
```

### Service Interaction Diagram

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Service
    participant Storage
    participant External

    User->>Frontend: Upload Dataset
    Frontend->>API: POST /api/datasets/upload
    API->>Service: process_upload()
    Service->>Storage: Save file
    Storage-->>Service: Success
    Service-->>API: Response
    API-->>Frontend: Dataset Info
    Frontend-->>User: Show Success

    User->>Frontend: Run AI Analysis
    Frontend->>API: POST /api/ai/analyze/{name}
    API->>Service: analyze_dataset()
    Service->>External: LLM API Call
    External-->>Service: Analysis Results
    Service-->>API: Recommendations
    API-->>Frontend: Analysis Results
    Frontend-->>User: Display Suggestions
```

---

## Data Flow

### End-to-End Data Flow

```mermaid
flowchart TD
    Start([User Action]) --> Upload[Upload Dataset]
    Upload --> Validate[Validate File]
    Validate -->|Valid| Store1[(Storage: uploads/)]
    Validate -->|Invalid| Error1[Error Response]

    Store1 --> EDA[Generate EDA]
    EDA --> Report1[HTML Report]
    Report1 --> Store2[(Storage: artifacts/)]

    Store1 --> Preprocess[Preprocessing]
    Preprocess --> AI[AI Analysis]
    AI --> Suggestions[Get Suggestions]
    Suggestions --> Manual[Manual Operations]
    Manual --> Processed[Processed Dataset]
    Processed --> Store3[(Storage: processed/)]

    Store3 --> Train[Training]
    Train --> Model[Model + Report]
    Model --> Store4[(Storage: artifacts/)]

    Store4 --> Export[Export Package]
    Export --> ZIP[ZIP File]
    ZIP --> Store5[(Storage: exports/)]

    Store5 --> Download([User Downloads])

    style Start fill:#c8e6c9
    style Download fill:#c8e6c9
    style Store1 fill:#fff9c4
    style Store2 fill:#fff9c4
    style Store3 fill:#fff9c4
    style Store4 fill:#fff9c4
    style Store5 fill:#fff9c4
```

### Data Storage Structure

```
data/
├── uploads/              # Raw uploaded datasets
│   ├── dataset1.csv
│   ├── dataset2.parquet
│   └── image_autotrain/  # Image datasets
│
├── processed/            # Preprocessed datasets
│   ├── dataset1.parquet
│   └── dataset2.parquet
│
├── artifacts/            # Generated artifacts
│   ├── eda_report_*.html
│   ├── preprocessing_report_*.html
│   ├── training_report_*.html
│   ├── model_*.pkl
│   └── image_autotrain/  # CV training outputs
│
├── exports/              # Export packages
│   └── model_export_*.zip
│
└── bin/                  # Backup of original files
    └── timestamped_files/
```

---

## Technology Stack

### Technology Stack Overview

```mermaid
graph TB
    subgraph FrontendTech["Frontend Technologies"]
        React["React 18"]
        Vite["Vite"]
        TS["TypeScript"]
        Tailwind["Tailwind CSS"]
        Shadcn["shadcn/ui"]
        Router["React Router"]
    end

    subgraph BackendTech["Backend Technologies"]
        FastAPI["FastAPI"]
        Python["Python 3.10+"]
        Uvicorn["Uvicorn"]
        Pydantic["Pydantic"]
    end

    subgraph MLTech["ML Technologies"]
        SKLearn["scikit-learn"]
        Pandas["pandas"]
        NumPy["NumPy"]
        PyTorch["PyTorch"]
        Transformers["transformers"]
    end

    subgraph AITech["AI Technologies"]
        OpenRouter["OpenRouter"]
        Gemini["Gemini API"]
        LangChain["LangChain"]
    end

    FrontendTech --> BackendTech
    BackendTech --> MLTech
    BackendTech --> AITech

    style FrontendTech fill:#e1f5ff
    style BackendTech fill:#fff4e1
    style MLTech fill:#e8f5e9
    style AITech fill:#f3e5f5
```

---

## Deployment Architecture

### Current Deployment (Local)

```mermaid
graph LR
    Dev[Developer Machine]

    subgraph Local["Local Environment"]
        FrontendServer["Vite Dev Server<br/>:5173"]
        BackendServer["Uvicorn Server<br/>:8000"]
        FileSystem["Local File System"]
    end

    Browser["Web Browser"]

    Dev --> FrontendServer
    Dev --> BackendServer
    Browser --> FrontendServer
    FrontendServer --> BackendServer
    BackendServer --> FileSystem

    style Local fill:#e8f5e9
```

### Future Cloud Deployment

```mermaid
graph TB
    subgraph Internet["Internet"]
        Users["End Users"]
    end

    subgraph Cloud["Cloud Infrastructure"]
        subgraph LoadBalancer["Load Balancer"]
            LB["NGINX/ALB"]
        end

        subgraph FrontendCluster["Frontend Cluster"]
            F1["Frontend Instance 1"]
            F2["Frontend Instance 2"]
            F3["Frontend Instance N"]
        end

        subgraph BackendCluster["Backend Cluster"]
            B1["Backend Instance 1"]
            B2["Backend Instance 2"]
            B3["Backend Instance N"]
        end

        subgraph Storage["Storage"]
            S3["S3 Bucket"]
            RDS["RDS Database<br/>(Future)"]
        end

        subgraph Cache["Cache Layer"]
            Redis["Redis<br/>(Future)"]
        end
    end

    Users --> LB
    LB --> FrontendCluster
    FrontendCluster --> BackendCluster
    BackendCluster --> Storage
    BackendCluster --> Cache

    style Cloud fill:#e8f5e9
```

---

## Security Architecture

### Security Layers

```mermaid
graph TB
    subgraph Network["Network Security"]
        HTTPS["HTTPS/TLS"]
        CORS["CORS Policy"]
        Firewall["Firewall"]
    end

    subgraph Application["Application Security"]
        Validation["Input Validation"]
        Sanitization["Data Sanitization"]
        Auth["Authentication<br/>(Future)"]
        RateLimit["Rate Limiting"]
    end

    subgraph Data["Data Security"]
        Encryption["Encryption at Rest"]
        Backup["Backup Strategy"]
        Audit["Audit Logging"]
    end

    subgraph FileSystem["File System Security"]
        PathValidation["Path Validation"]
        AccessControl["Access Control"]
        FileTypeCheck["File Type Validation"]
    end

    Network --> Application
    Application --> Data
    Data --> FileSystem

    style Network fill:#ffcdd2
    style Application fill:#fff9c4
    style Data fill:#c8e6c9
    style FileSystem fill:#e1f5ff
```

---

## Scalability & Performance

### Scalability Design

```mermaid
graph LR
    subgraph Current["Current Architecture"]
        Single["Single Instance"]
    end

    subgraph Horizontal["Horizontal Scaling"]
        LB["Load Balancer"]
        Multi["Multiple Instances"]
    end

    subgraph Vertical["Vertical Scaling"]
        Resources["More Resources"]
    end

    subgraph Optimizations["Performance Optimizations"]
        Cache["Caching"]
        Async["Async Processing"]
        CDN["CDN<br/>(Future)"]
    end

    Current --> Horizontal
    Current --> Vertical
    Horizontal --> Optimizations
    Vertical --> Optimizations

    style Current fill:#ffcdd2
    style Horizontal fill:#c8e6c9
    style Vertical fill:#fff9c4
    style Optimizations fill:#e1f5ff
```

### Performance Characteristics

| Component         | Current Performance | Target Performance |
| ----------------- | ------------------- | ------------------ |
| API Response Time | < 180ms (p95)       | < 100ms (p95)      |
| Concurrent Users  | 120+                | 1000+              |
| Data Processing   | 1.2M rows/min       | 5M+ rows/min       |
| Training Time     | 3-18 min (10k rows) | < 10 min           |
| EDA Generation    | < 45s (100k rows)   | < 30s              |

---

## System Boundaries

### In Scope

- ✅ Tabular data preprocessing
- ✅ Tabular model training (classification/regression)
- ✅ Computer vision model training (CLI)
- ✅ EDA report generation
- ✅ AI-powered analysis
- ✅ Model export and packaging
- ✅ Web-based user interface

### Out of Scope (Future)

- ❌ Multi-user authentication
- ❌ Real-time collaboration
- ❌ Cloud storage integration
- ❌ Advanced hyperparameter tuning
- ❌ Model deployment infrastructure
- ❌ Model monitoring and serving

---

## Integration Points

### External System Integrations

```mermaid
graph LR
    MODULUS["MODULUS System"]

    OpenRouter["OpenRouter API<br/>- Qwen Model<br/>- LLM Analysis"]
    Gemini["Google Gemini API<br/>- Alternative LLM<br/>- Fallback"]

    MODULUS --> OpenRouter
    MODULUS --> Gemini

    style MODULUS fill:#e8f5e9
    style OpenRouter fill:#fff9c4
    style Gemini fill:#fff9c4
```

### Future Integration Points

- Cloud Storage (S3, Azure Blob)
- Model Registry (MLflow, Weights & Biases)
- CI/CD Pipelines
- Monitoring Tools (Prometheus, Grafana)
- Authentication Providers (OAuth, SSO)

---

## Non-Functional Requirements

### Performance Requirements

- API response time: < 200ms (95th percentile)
- Support 100+ concurrent users
- Process datasets up to 10GB
- Generate reports in < 60 seconds

### Scalability Requirements

- Horizontal scaling capability
- Stateless service design
- Efficient resource utilization

### Security Requirements

- HTTPS in production
- Input validation and sanitization
- Path traversal protection
- File type validation

### Reliability Requirements

- 99% uptime target
- Graceful error handling
- Automatic recovery from transient failures
- Data backup and recovery

### Usability Requirements

- Intuitive user interface
- Responsive design (desktop/tablet)
- Comprehensive help system
- Keyboard shortcuts for power users

---

## Design Decisions

### Key Design Decisions

1. **Microservices Architecture**: Modular design allows independent scaling and updates
2. **RESTful API**: Standard HTTP/REST for simplicity and interoperability
3. **File-based Storage**: Local filesystem for simplicity; extensible to cloud
4. **Async Processing**: Background jobs for long-running operations
5. **TypeScript Frontend**: Type safety and better developer experience
6. **FastAPI Backend**: High performance, automatic documentation, async support
7. **AI Integration**: Dual LLM support (OpenRouter + Gemini) for reliability
8. **Hybrid Preprocessing**: AI suggestions + manual control for flexibility

---

## Risk Assessment

### Technical Risks

| Risk                    | Impact | Probability | Mitigation                   |
| ----------------------- | ------ | ----------- | ---------------------------- |
| API Rate Limits         | High   | Medium      | Caching, fallback mechanisms |
| Large File Handling     | Medium | High        | Streaming, chunking          |
| LLM API Failures        | Medium | Medium      | Fallback to heuristics       |
| Storage Exhaustion      | High   | Low         | Cleanup jobs, size limits    |
| Performance Degradation | Medium | Medium      | Caching, optimization        |

---

## Conclusion

MODULUS follows a modern, scalable architecture that separates concerns across presentation, API, business logic, and data layers. The system is designed for extensibility, allowing future enhancements while maintaining current functionality and performance.
