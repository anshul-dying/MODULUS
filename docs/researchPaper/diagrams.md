# MODULUS Research Paper Diagrams (Mermaid Format)

This document contains all relevant diagrams for the MODULUS research paper in Mermaid format. These diagrams are designed to fit properly in IEEE Transactions format and can be converted to LaTeX-compatible formats.

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[React Frontend<br/>TypeScript + Vite]
    end
    
    subgraph "API Gateway Layer"
        API[FastAPI Gateway<br/>REST API + CORS]
    end
    
    subgraph "Service Layer"
        DS[Dataset Service]
        EDA[EDA Service]
        PREP[Preprocessing Service]
        TRAIN[Training Service]
        IMG[Image Training Service]
        AI[AI Analysis Service]
        EXP[Export Service]
    end
    
    subgraph "External Services"
        LLM1[OpenRouter API<br/>Qwen]
        LLM2[Google Gemini API]
    end
    
    subgraph "Storage Layer"
        UPLOAD[Uploads<br/>Raw Data]
        PROC[Processed<br/>Parquet Files]
        ART[Artifacts<br/>Models + Reports]
        EXPORT[Exports<br/>Deployable Packages]
    end
    
    UI -->|HTTP/REST| API
    API --> DS
    API --> EDA
    API --> PREP
    API --> TRAIN
    API --> IMG
    API --> AI
    API --> EXP
    
    PREP --> AI
    AI --> LLM1
    AI --> LLM2
    
    DS --> UPLOAD
    EDA --> ART
    PREP --> PROC
    TRAIN --> ART
    IMG --> ART
    EXP --> EXPORT
    
    style UI fill:#e1f5ff
    style API fill:#fff4e1
    style DS fill:#e8f5e9
    style EDA fill:#e8f5e9
    style PREP fill:#e8f5e9
    style TRAIN fill:#e8f5e9
    style IMG fill:#e8f5e9
    style AI fill:#e8f5e9
    style EXP fill:#e8f5e9
    style LLM1 fill:#fce4ec
    style LLM2 fill:#fce4ec
```

---

## 2. End-to-End Data Flow

```mermaid
flowchart TD
    START([User Uploads Dataset]) --> VALIDATE{Validate Format<br/>& Size}
    VALIDATE -->|Invalid| ERROR1([Error Message])
    VALIDATE -->|Valid| SAVE[Save to Uploads]
    
    SAVE --> METADATA[Extract Metadata<br/>Rows, Columns, Types]
    METADATA --> EDA_GEN[Generate EDA Report<br/>ydata-profiling]
    
    EDA_GEN --> AI_ANALYSIS[AI Analysis<br/>LLM Suggestions]
    AI_ANALYSIS --> USER_CHOICE{User Choice}
    
    USER_CHOICE -->|Accept AI| AUTO_PREP[Automated Preprocessing]
    USER_CHOICE -->|Manual| MANUAL_PREP[Manual Preprocessing]
    
    AUTO_PREP --> PREVIEW[Live Preview]
    MANUAL_PREP --> PREVIEW
    
    PREVIEW --> APPLY{Apply Changes?}
    APPLY -->|No| USER_CHOICE
    APPLY -->|Yes| SAVE_PROC[Save Processed Data<br/>Parquet Format]
    
    SAVE_PROC --> MODEL_SEL[Model Selection<br/>Algorithm + Hyperparameters]
    MODEL_SEL --> TRAIN[Training Pipeline<br/>Stratified Split + CV]
    
    TRAIN --> EVAL[Evaluation<br/>Metrics Calculation]
    EVAL --> ARTIFACTS[Generate Artifacts<br/>Model PKL + Report HTML]
    
    ARTIFACTS --> EXPORT[Export Package<br/>ZIP with Inference Code]
    EXPORT --> DEPLOY([Download/Deploy])
    
    style START fill:#c8e6c9
    style DEPLOY fill:#c8e6c9
    style ERROR1 fill:#ffcdd2
    style AI_ANALYSIS fill:#fff9c4
    style TRAIN fill:#bbdefb
    style EVAL fill:#bbdefb
```

---

## 3. API Request Flow (Asynchronous Processing)

```mermaid
sequenceDiagram
    participant U as User (React UI)
    participant API as FastAPI Gateway
    participant SVC as Service Layer
    participant BG as Background Task
    participant ST as Storage
    
    Note over U,ST: Synchronous Request Flow
    U->>API: POST /datasets/list
    API->>SVC: Validate Request
    SVC->>ST: Query Datasets
    ST-->>SVC: Return Metadata
    SVC-->>API: JSON Response
    API-->>U: Dataset List
    
    Note over U,ST: Asynchronous Job Flow
    U->>API: POST /train (Job Request)
    API->>SVC: Validate & Create Job ID
    SVC->>BG: Dispatch Background Task
    SVC-->>API: Return Job ID (202 Accepted)
    API-->>U: Job ID + Status URL
    
    loop Polling
        U->>API: GET /jobs/{job_id}/status
        API->>SVC: Query Job Status
        SVC-->>API: Status (pending/running/completed)
        API-->>U: Status Response
    end
    
    BG->>ST: Load Dataset
    BG->>BG: Preprocess Data
    BG->>BG: Train Model
    BG->>ST: Save Artifacts
    BG->>SVC: Update Job Status (completed)
    
    U->>API: GET /jobs/{job_id}/result
    API->>SVC: Retrieve Results
    SVC-->>API: Model + Metrics
    API-->>U: Final Results
```

---

## 4. Security Architecture (Defense in Depth)

```mermaid
graph TB
    subgraph "External Layer"
        CLIENT[Client Browser]
    end
    
    subgraph "Network Layer"
        HTTPS[HTTPS/TLS<br/>Encrypted Transport]
        CORS[CORS Policy<br/>Origin Validation]
    end
    
    subgraph "Application Layer"
        RATE[Rate Limiting<br/>Request Throttling]
        AUTH[Authentication<br/>Extensible Auth]
        VALID[Input Validation<br/>Pydantic Models]
        SANIT[Input Sanitization<br/>Path Traversal Prevention]
    end
    
    subgraph "Data Layer"
        ENCRYPT[Encryption at Rest<br/>Sensitive Data]
        AUDIT[Audit Logging<br/>Operation Tracking]
        PATH[Path Validation<br/>Directory Traversal Prevention]
    end
    
    CLIENT --> HTTPS
    HTTPS --> CORS
    CORS --> RATE
    RATE --> AUTH
    AUTH --> VALID
    VALID --> SANIT
    SANIT --> ENCRYPT
    ENCRYPT --> AUDIT
    AUDIT --> PATH
    
    style CLIENT fill:#e3f2fd
    style HTTPS fill:#fff3e0
    style CORS fill:#fff3e0
    style RATE fill:#f3e5f5
    style AUTH fill:#f3e5f5
    style VALID fill:#f3e5f5
    style SANIT fill:#f3e5f5
    style ENCRYPT fill:#e8f5e9
    style AUDIT fill:#e8f5e9
    style PATH fill:#e8f5e9
```

---

## 5. ML Pipeline Workflow

```mermaid
flowchart LR
    subgraph "Phase 1: Data Preparation"
        D1[Raw Dataset] --> D2[Validation]
        D2 --> D3[Metadata Extraction]
        D3 --> D4[EDA Report]
        D4 --> D5[AI Analysis]
        D5 --> D6[Preprocessing]
        D6 --> D7[Processed Dataset]
    end
    
    subgraph "Phase 2: Model Training"
        D7 --> M1[Train/Val Split]
        M1 --> M2[Feature Engineering]
        M2 --> M3[Algorithm Selection]
        M3 --> M4[Hyperparameter Tuning]
        M4 --> M5[Cross-Validation]
        M5 --> M6[Trained Model]
    end
    
    subgraph "Phase 3: Evaluation & Export"
        M6 --> E1[Metrics Calculation]
        E1 --> E2[Visualization]
        E2 --> E3[Report Generation]
        E3 --> E4[Model Serialization]
        E4 --> E5[Export Package]
    end
    
    style D1 fill:#ffebee
    style D7 fill:#e8f5e9
    style M6 fill:#e3f2fd
    style E5 fill:#fff9c4
```

---

## 6. Component Interaction Diagram

```mermaid
graph LR
    subgraph "Frontend Components"
        DASH[Dashboard]
        DATASET[Dataset Manager]
        PREP_UI[Preprocessing UI]
        TRAIN_UI[Training UI]
        REPORTS[Reports Viewer]
    end
    
    subgraph "API Endpoints"
        DS_API[/datasets]
        PREP_API[/preprocessing]
        TRAIN_API[/training]
        EXP_API[/export]
        AI_API[/ai-analysis]
    end
    
    subgraph "Backend Services"
        DS_SVC[Dataset Service]
        PREP_SVC[Preprocessing Service]
        TRAIN_SVC[Training Service]
        AI_SVC[AI Analysis Service]
        EXP_SVC[Export Service]
    end
    
    DASH --> DS_API
    DATASET --> DS_API
    PREP_UI --> PREP_API
    TRAIN_UI --> TRAIN_API
    REPORTS --> EXP_API
    
    DS_API --> DS_SVC
    PREP_API --> PREP_SVC
    TRAIN_API --> TRAIN_SVC
    AI_API --> AI_SVC
    EXP_API --> EXP_SVC
    
    PREP_SVC --> AI_SVC
    TRAIN_SVC --> EXP_SVC
    
    style DASH fill:#e1f5ff
    style DATASET fill:#e1f5ff
    style PREP_UI fill:#e1f5ff
    style TRAIN_UI fill:#e1f5ff
    style REPORTS fill:#e1f5ff
    style DS_API fill:#fff4e1
    style PREP_API fill:#fff4e1
    style TRAIN_API fill:#fff4e1
    style EXP_API fill:#fff4e1
    style AI_API fill:#fff4e1
    style DS_SVC fill:#e8f5e9
    style PREP_SVC fill:#e8f5e9
    style TRAIN_SVC fill:#e8f5e9
    style AI_SVC fill:#e8f5e9
    style EXP_SVC fill:#e8f5e9
```

---

## 7. AI-Powered Preprocessing Flow

```mermaid
flowchart TD
    START([Dataset Uploaded]) --> SAMPLE[Sample Dataset]
    SAMPLE --> PROMPT[Construct LLM Prompt<br/>Dataset Schema + Statistics]
    
    PROMPT --> LLM_REQ{LLM API Available?}
    
    LLM_REQ -->|Yes| OPENROUTER[OpenRouter API<br/>Qwen Model]
    LLM_REQ -->|Yes| GEMINI[Google Gemini API]
    LLM_REQ -->|No| FALLBACK[Heuristic Fallback<br/>Rule-Based Suggestions]
    
    OPENROUTER --> PARSE1[Parse JSON Response]
    GEMINI --> PARSE2[Parse JSON Response]
    FALLBACK --> VALIDATE
    
    PARSE1 --> VALIDATE[Validate Suggestions]
    PARSE2 --> VALIDATE
    
    VALIDATE --> FILTER[Safety Filter<br/>Sanitize Recommendations]
    FILTER --> SCORE[Quality Score<br/>1-10 Scale]
    SCORE --> PRESENT[Present to User<br/>Target Column + Algorithm + Preprocessing]
    
    PRESENT --> USER_ACTION{User Action}
    USER_ACTION -->|Accept| APPLY[Apply Suggestions]
    USER_ACTION -->|Modify| MANUAL[Manual Configuration]
    USER_ACTION -->|Reject| MANUAL
    
    APPLY --> EXECUTE[Execute Preprocessing]
    MANUAL --> EXECUTE
    EXECUTE --> PREVIEW[Live Preview]
    PREVIEW --> SAVE([Save Processed Data])
    
    style START fill:#c8e6c9
    style SAVE fill:#c8e6c9
    style OPENROUTER fill:#fff9c4
    style GEMINI fill:#fff9c4
    style FALLBACK fill:#ffccbc
    style PRESENT fill:#bbdefb
```

---

## 8. Training Pipeline Architecture

```mermaid
graph TB
    subgraph "Input"
        DATA[Processed Dataset]
        CONFIG[Training Configuration<br/>Algorithm + Hyperparameters]
    end
    
    subgraph "Preprocessing"
        SPLIT[Train/Val Split<br/>Stratified 80/20]
        SCALE[Feature Scaling<br/>StandardScaler]
    end
    
    subgraph "Model Training"
        TABULAR{Task Type}
        TABULAR -->|Classification| CLF[Classification Models<br/>RF, LR, SVM]
        TABULAR -->|Regression| REG[Regression Models<br/>LR, RF]
        TABULAR -->|Image| CV[CV Models<br/>ViT, ResNet, Swin]
        
        CLF --> CVAL[Cross-Validation<br/>5-Fold]
        REG --> CVAL
        CV --> AUG[Data Augmentation<br/>Albumentations]
        AUG --> FINE[Fine-Tuning<br/>Hugging Face]
    end
    
    subgraph "Evaluation"
        CVAL --> METRICS[Metrics Calculation<br/>Accuracy, F1, ROC-AUC]
        FINE --> METRICS
        METRICS --> VIZ[Visualization<br/>Confusion Matrix, Curves]
    end
    
    subgraph "Output"
        VIZ --> MODEL[Model Serialization<br/>PKL Format]
        MODEL --> REPORT[Training Report<br/>HTML]
        REPORT --> ARTIFACTS[Artifacts Storage]
    end
    
    DATA --> SPLIT
    CONFIG --> TABULAR
    SPLIT --> SCALE
    SCALE --> TABULAR
    
    style DATA fill:#e3f2fd
    style CONFIG fill:#e3f2fd
    style MODEL fill:#c8e6c9
    style REPORT fill:#c8e6c9
    style ARTIFACTS fill:#c8e6c9
```

---

## 9. System Scalability Architecture

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Load Balancer<br/>Round-Robin]
    end
    
    subgraph "Frontend Instances"
        FE1[React Instance 1]
        FE2[React Instance 2]
        FE3[React Instance N]
    end
    
    subgraph "API Gateway Instances"
        API1[FastAPI Instance 1]
        API2[FastAPI Instance 2]
        API3[FastAPI Instance N]
    end
    
    subgraph "Background Workers"
        WORKER1[Worker 1<br/>Training Jobs]
        WORKER2[Worker 2<br/>EDA Generation]
        WORKER3[Worker N<br/>Preprocessing]
    end
    
    subgraph "Shared Storage"
        CACHE[Redis Cache<br/>Job Status + Metadata]
        FS[File System<br/>Datasets + Artifacts]
    end
    
    LB --> FE1
    LB --> FE2
    LB --> FE3
    
    FE1 --> API1
    FE2 --> API2
    FE3 --> API3
    
    API1 --> WORKER1
    API1 --> WORKER2
    API2 --> WORKER2
    API2 --> WORKER3
    API3 --> WORKER1
    API3 --> WORKER3
    
    API1 --> CACHE
    API2 --> CACHE
    API3 --> CACHE
    
    WORKER1 --> FS
    WORKER2 --> FS
    WORKER3 --> FS
    
    style LB fill:#fff3e0
    style FE1 fill:#e1f5ff
    style FE2 fill:#e1f5ff
    style FE3 fill:#e1f5ff
    style API1 fill:#fff4e1
    style API2 fill:#fff4e1
    style API3 fill:#fff4e1
    style WORKER1 fill:#e8f5e9
    style WORKER2 fill:#e8f5e9
    style WORKER3 fill:#e8f5e9
    style CACHE fill:#f3e5f5
    style FS fill:#f3e5f5
```

---

## 10. User Workflow State Machine

```mermaid
stateDiagram-v2
    [*] --> Upload: Start
    Upload --> Validation: File Selected
    Validation --> Error: Invalid
    Validation --> Metadata: Valid
    Error --> Upload: Retry
    
    Metadata --> EDA: Generate Report
    EDA --> Preprocessing: Review Complete
    
    Preprocessing --> AI_Analysis: Request Suggestions
    AI_Analysis --> Suggestions: LLM Response
    Suggestions --> Manual_Edit: User Modifies
    Suggestions --> Apply: User Accepts
    Manual_Edit --> Preview: Configure
    Apply --> Preview: Execute
    
    Preview --> Preprocessing: Reject Changes
    Preview --> Processed: Accept Changes
    
    Processed --> Model_Config: Ready
    Model_Config --> Training: Start Training
    Training --> Evaluating: Training Complete
    Evaluating --> Results: Metrics Calculated
    
    Results --> Export: Generate Package
    Results --> Model_Config: Retrain
    Export --> [*]: Complete
    
    note right of AI_Analysis
        Fallback to heuristics
        if LLM unavailable
    end note
```

---

## Usage Instructions

These Mermaid diagrams can be:

1. **Rendered in Markdown viewers**: GitHub, GitLab, VS Code with Mermaid extension
2. **Converted to images**: Use Mermaid CLI (`mmdc`) or online tools
3. **Integrated into LaTeX**: Convert to PDF/SVG and include with `\includegraphics`
4. **Exported for IEEE format**: Use appropriate sizing (column width: ~3.5in for single column)

### Recommended Sizes for IEEE Transactions:
- Single column: 3.5 inches width
- Double column: 7 inches width
- Maintain aspect ratio for readability

### Conversion Commands:
```bash
# Install Mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# Convert to PNG
mmdc -i diagrams.md -o output.png -w 1200 -H 800

# Convert to SVG (better for LaTeX)
mmdc -i diagrams.md -o output.svg
```
