# MODULUS Research Paper - Required Diagrams

This document contains all diagrams required for the research paper in Mermaid format. These diagrams can be rendered in Markdown viewers, exported to PNG/PDF, or converted for LaTeX inclusion.

## 1. System Architecture Diagram (`figures/system_architecture.png`)

**Placeholder in paper:** Line 159  
**Description:** High-level system architecture showing frontend, API gateway, services, and data layers

```mermaid
graph TB
    subgraph Frontend["Frontend Layer"]
        React["React 18 + Vite"]
        TS["TypeScript"]
        Tailwind["Tailwind CSS"]
        UI["shadcn/ui Components"]
        Dashboard["Dashboard"]
        Datasets["Datasets"]
        Preprocessing["Preprocessing"]
        Training["Training"]
        Reports["Reports"]
        Help["Help"]
    end

    subgraph API["API Gateway Layer"]
        FastAPI["FastAPI"]
        Pydantic["Pydantic Validation"]
        CORS["CORS"]
        Router["REST API Routes"]
    end

    subgraph Services["Service Layer"]
        DatasetSvc["Dataset Service"]
        PreprocessingSvc["Preprocessing Service"]
        TrainingSvc["Training Service"]
        ImageTrainingSvc["Image Training Service"]
        EDASvc["EDA Service"]
        AISvc["AI Analysis Service"]
        ExportSvc["Export Service"]
    end

    subgraph Data["Data Layer"]
        Uploads["uploads/"]
        Processed["processed/"]
        Artifacts["artifacts/"]
        Exports["exports/"]
        Bin["bin/"]
    end

    subgraph External["External Services"]
        OpenRouter["OpenRouter API<br/>(Qwen)"]
        Gemini["Google Gemini API"]
    end

    Frontend -->|HTTP/REST| API
    API --> Services
    Services --> Data
    AISvc --> OpenRouter
    AISvc --> Gemini

    style Frontend fill:#e1f5ff
    style API fill:#fff4e1
    style Services fill:#e8f5e9
    style Data fill:#fce4ec
    style External fill:#f3e5f5
```

---

## 2. Data Flow Diagram (`figures/data_flow.png`)

**Placeholder in paper:** Line 200  
**Description:** End-to-end data flow from upload to exportable artifacts

```mermaid
flowchart LR
    Start([User Uploads<br/>Dataset]) --> Validate[File Validation<br/>& Schema Check]
    Validate -->|Valid| Store1[(Storage:<br/>uploads/)]
    Validate -->|Invalid| Error1[Error Message]

    Store1 --> EDA[EDA Generation]
    EDA --> Report1[HTML Report]
    Report1 --> Store2[(Storage:<br/>artifacts/)]

    Store1 --> Preprocess[Preprocessing]
    Preprocess --> AI[AI Analysis]
    AI --> Suggestions[Suggestions]
    Suggestions --> Manual[Manual/Auto<br/>Operations]
    Manual --> Preview[Preview]
    Preview --> Processed[Processed Dataset]
    Processed --> Store3[(Storage:<br/>processed/)]

    Store3 --> Train[Model Training]
    Train --> Eval[Evaluation]
    Eval --> Model[Model + Report]
    Model --> Store4[(Storage:<br/>artifacts/)]

    Store4 --> Export[Export Package]
    Export --> ZIP[ZIP File]
    ZIP --> Store5[(Storage:<br/>exports/)]

    Store5 --> Download([User Downloads<br/>Export Package])

    style Start fill:#c8e6c9
    style Download fill:#c8e6c9
    style Store1 fill:#fff9c4
    style Store2 fill:#fff9c4
    style Store3 fill:#fff9c4
    style Store4 fill:#fff9c4
    style Store5 fill:#fff9c4
    style Error1 fill:#ffcdd2
```

---

## 3. API Flow Diagram (`figures/api_flow.png`)

**Placeholder in paper:** Line 210  
**Description:** API request/response patterns and asynchronous processing

```mermaid
sequenceDiagram
    participant Client as React Frontend
    participant Router as FastAPI Router
    participant Validator as Pydantic Validator
    participant Service as Service Layer
    participant Queue as Background Queue
    participant Storage as Storage Layer

    Client->>Router: POST /api/training/start
    Router->>Validator: Validate Request
    alt Valid Request
        Validator->>Router: Validated Data
        Router->>Service: Process Request
        alt Short Operation
            Service->>Storage: Save Data
            Storage-->>Service: Success
            Service-->>Router: Response
            Router-->>Client: Immediate Response
        else Long Operation
            Service->>Queue: Create Background Job
            Queue-->>Service: Job ID
            Service-->>Router: Job ID
            Router-->>Client: Job ID (202 Accepted)

            loop Status Polling
                Client->>Router: GET /api/training/status/{job_id}
                Router->>Queue: Check Status
                Queue-->>Router: Status (pending/running/completed)
                Router-->>Client: Status Response
            end

            Queue->>Service: Process Job
            Service->>Storage: Save Results
            Storage-->>Service: Success
            Service-->>Queue: Job Complete
        end
    else Invalid Request
        Validator-->>Router: Validation Error
        Router-->>Client: 400 Bad Request
    end
```

---

## 4. Security Architecture Diagram (`figures/security_architecture.png`)

**Placeholder in paper:** Line 222  
**Description:** Defense in depth security layers

```mermaid
graph TB
    subgraph Network["Network Layer"]
        HTTPS["HTTPS/TLS"]
        CORS["CORS Policy"]
        Firewall["Firewall Rules"]
    end

    subgraph App["Application Layer"]
        Validation["Input Validation<br/>(Pydantic)"]
        Auth["Authentication<br/>(Extensible)"]
        RateLimit["Rate Limiting"]
        Sanitize["Input Sanitization"]
    end

    subgraph Data["Data Layer"]
        Encrypt["Encryption<br/>(At Rest)"]
        Audit["Audit Logging"]
        Backup["Backup Strategy"]
    end

    subgraph FileSystem["File System Layer"]
        PathValidation["Path Validation"]
        AccessControl["Access Control"]
        FileTypeCheck["File Type Validation"]
    end

    Network --> App
    App --> Data
    Data --> FileSystem

    style Network fill:#ffcdd2
    style App fill:#fff9c4
    style Data fill:#c8e6c9
    style FileSystem fill:#e1f5ff
```

---

## 5. Technology Stack Diagram (`figures/tech_stack.png`)

**Placeholder in paper:** Line 244  
**Description:** Technology stack visualization

```mermaid
graph TB
    subgraph Frontend["Frontend Stack"]
        React["React 18"]
        Vite["Vite"]
        TS["TypeScript"]
        Tailwind["Tailwind CSS"]
        Shadcn["shadcn/ui"]
        Router["React Router"]
    end

    subgraph Backend["Backend Stack"]
        FastAPI["FastAPI"]
        Python["Python 3.10+"]
        Uvicorn["Uvicorn"]
        AsyncIO["AsyncIO"]
    end

    subgraph ML["Machine Learning"]
        SKLearn["scikit-learn"]
        Pandas["pandas"]
        NumPy["NumPy"]
        PyTorch["PyTorch"]
        Transformers["transformers"]
        Accelerate["accelerate"]
    end

    subgraph AI["AI Services"]
        OpenRouter["OpenRouter API"]
        Qwen["Qwen Model"]
        Gemini["Gemini API"]
        LangChain["LangChain"]
    end

    subgraph Storage["Storage"]
        FileSystem["Local File System"]
        Future["Future: S3/Cloud"]
    end

    subgraph Viz["Visualization"]
        Matplotlib["matplotlib"]
        Seaborn["seaborn"]
        YDataProfiling["ydata-profiling"]
        Plotly["Plotly"]
    end

    Frontend --> Backend
    Backend --> ML
    Backend --> AI
    Backend --> Storage
    ML --> Viz

    style Frontend fill:#e1f5ff
    style Backend fill:#fff4e1
    style ML fill:#e8f5e9
    style AI fill:#f3e5f5
    style Storage fill:#fce4ec
    style Viz fill:#fff9c4
```

---

## 6. Motivation Icons Diagram (`figures/motivation_icons.png`)

**Placeholder in paper:** Line 128  
**Description:** Visual representation of ML workflow challenges

```mermaid
mindmap
  root((ML Workflow<br/>Challenges))
    Manual Tasks
      Data Cleaning
      Feature Engineering
      Type Conversion
      Missing Value Handling
    Error-Prone
      Script Bugs
      Inconsistent Logic
      Version Mismatches
      Data Corruption
    Time Consuming
      Weeks to Months
      Repetitive Work
      Trial and Error
      Manual Debugging
    Complexity
      Multiple Tools
      Steep Learning Curve
      Technical Expertise
      Domain Knowledge Gap
```

---

## 7. Problem Statement Diagram (`figures/problem_diagram.png`)

**Placeholder in paper:** Line 139  
**Description:** Current problems vs. MODULUS solution

```mermaid
graph LR
    subgraph Problems["Current State - Problems"]
        P1["Manual Data<br/>Handling"]
        P2["Error-Prone<br/>Transformations"]
        P3["Lack of<br/>Reproducibility"]
        P4["High Time-to-Model"]
        P5["Requires<br/>Programming"]
        P6["Inconsistent<br/>Workflows"]
    end

    subgraph Solution["MODULUS Solution - Benefits"]
        S1["Automated<br/>Preprocessing"]
        S2["Guided<br/>Workflows"]
        S3["Reproducible<br/>Pipelines"]
        S4["Fast Time-to-Model"]
        S5["No-Code<br/>Interface"]
        S6["Standardized<br/>Process"]
    end

    P1 -->|MODULUS| S1
    P2 -->|MODULUS| S2
    P3 -->|MODULUS| S3
    P4 -->|MODULUS| S4
    P5 -->|MODULUS| S5
    P6 -->|MODULUS| S6

    style Problems fill:#ffcdd2
    style Solution fill:#c8e6c9
```

---

## Additional Suggested Diagrams

### 8. Preprocessing Workflow Diagram (`figures/preprocessing_workflow.png`)

**Description:** Detailed preprocessing workflow showing AI analysis, manual operations, and preview

```mermaid
flowchart TD
    Start([Dataset Selected]) --> AI[AI Analysis Request]
    AI --> Stats[Extract Statistics]
    Stats --> LLM[Send to LLM<br/>OpenRouter/Gemini]
    LLM --> Suggestions[Get Suggestions]

    Suggestions --> Display[Display Suggestions<br/>in UI]
    Display --> UserChoice{User Choice}

    UserChoice -->|Accept All| Apply[Apply All Suggestions]
    UserChoice -->|Accept Some| Select[Select Specific Suggestions]
    UserChoice -->|Manual| ManualOps[Manual Operations]

    Select --> Apply
    ManualOps --> Preview[Live Preview]
    Apply --> Preview

    Preview --> Confirm{User Confirms?}
    Confirm -->|Yes| Execute[Execute Operations]
    Confirm -->|No| UserChoice

    Execute --> Save[Save Processed Dataset]
    Save --> Report[Generate Report]
    Report --> End([Complete])

    style Start fill:#c8e6c9
    style End fill:#c8e6c9
    style AI fill:#fff9c4
    style Suggestions fill:#e1f5ff
    style Preview fill:#f3e5f5
```

---

### 9. Training Pipeline Diagram (`figures/training_pipeline.png`)

**Description:** Training pipeline for tabular and CV tasks

```mermaid
flowchart LR
    subgraph DataPrep["Data Preparation"]
        Load[Load Dataset] --> Split[Train/Val/Test Split]
        Split --> Features[Feature Engineering]
    end

    subgraph Training["Training"]
        Features --> Select[Model Selection]
        Select --> Config[Configure Parameters]
        Config --> Train[Training Loop]
        Train --> Eval[Evaluation]
    end

    subgraph Persist["Persistence"]
        Eval --> Metrics[Calculate Metrics]
        Metrics --> SaveModel[Save Model]
        SaveModel --> Report[Generate Report]
        Report --> Artifacts[(Artifacts Storage)]
    end

    DataPrep --> Training
    Training --> Persist

    style DataPrep fill:#e1f5ff
    style Training fill:#fff9c4
    style Persist fill:#e8f5e9
```

---

### 10. User Journey Map (`figures/user_journey.png`)

**Description:** User journey from first visit to model export

```mermaid
journey
    title User Journey Through MODULUS
    section Onboarding
      Welcome Screen: 5: User
      Tutorial Roadmap: 4: User
    section Data Upload
      Upload Dataset: 5: User
      View Metadata: 4: User
    section Exploration
      Generate EDA: 5: User
      Review Report: 4: User
    section Preprocessing
      AI Analysis: 5: User
      Apply Operations: 4: User
      Preview Changes: 5: User
    section Training
      Configure Model: 4: User
      Start Training: 5: User
      Monitor Progress: 4: User
    section Results
      Review Metrics: 5: User
      View Report: 4: User
    section Export
      Export Model: 5: User
      Download Package: 5: User
```

---

### 11. Component Interaction Diagram (`figures/component_interaction.png`)

**Description:** How different components interact (UML-style)

```mermaid
classDiagram
    class Frontend {
        +Dashboard Component
        +Datasets Component
        +Preprocessing Component
        +Training Component
        +Reports Component
    }

    class API {
        +DatasetRouter
        +PreprocessingRouter
        +TrainingRouter
        +EDARouter
        +ExportRouter
    }

    class Services {
        +DatasetService
        +PreprocessingService
        +TrainingService
        +EDAService
        +AIAnalysisService
    }

    class Storage {
        +FileSystem
        +save()
        +load()
        +delete()
    }

    Frontend --> API : HTTP Requests
    API --> Services : Method Calls
    Services --> Storage : File Operations
    Services --> Services : Inter-service Communication
```

---

### 12. AI Analysis Flow Diagram (`figures/ai_analysis_flow.png`)

**Description:** AI-powered analysis workflow

```mermaid
flowchart TD
    Start([Dataset Input]) --> Extract[Extract Statistics<br/>- Column types<br/>- Missing values<br/>- Distributions<br/>- Correlations]

    Extract --> Build[Build Prompt<br/>with Context]

    Build --> Choose{API Choice}
    Choose -->|OpenRouter| OpenRouter[OpenRouter API<br/>Qwen Model]
    Choose -->|Gemini| Gemini[Google Gemini API]

    OpenRouter --> LLM[LLM Processing]
    Gemini --> LLM

    LLM --> Response[Structured JSON Response]

    Response --> Parse[Parse JSON]
    Parse --> Validate[Validate Structure]

    Validate -->|Valid| Format[Format Recommendations]
    Validate -->|Invalid| Fallback[Fallback to<br/>Heuristics]

    Format --> Display[Display in UI<br/>- Target suggestions<br/>- Algorithm recommendations<br/>- Quality score<br/>- Preprocessing steps]

    Fallback --> Display

    Display --> End([User Reviews])

    style Start fill:#c8e6c9
    style End fill:#c8e6c9
    style LLM fill:#fff9c4
    style Display fill:#e1f5ff
    style Fallback fill:#ffcdd2
```

---

## Implementation Notes

### Mermaid Rendering:

1. **Online:** Use [Mermaid Live Editor](https://mermaid.live/) to render and export diagrams
2. **VS Code:** Install "Markdown Preview Mermaid Support" extension
3. **GitHub/GitLab:** Native Mermaid support in Markdown files
4. **Export:** Use Mermaid CLI or online tools to export as PNG/PDF/SVG

### Converting to LaTeX:

1. Render Mermaid diagrams to SVG using Mermaid CLI or online tools
2. Convert SVG to PNG/PDF at 300 DPI
3. Include in LaTeX using `\includegraphics`

### Format Requirements:

- **Resolution:** Minimum 300 DPI for print
- **Format:** PNG or PDF (PDF preferred for vector graphics)
- **Size:** Fit within IEEE column width (3.5 inches) or full page width (7 inches)
- **Colors:** Ensure diagrams are readable in grayscale (IEEE prints in black & white)

### Diagram Placement:

- Place diagrams close to their first reference in text
- Use `[t]` for top placement, `[b]` for bottom, `[h]` for here
- Use `\centering` for center alignment
- Ensure captions are descriptive and include figure numbers

### Style Guidelines:

- Use consistent color scheme across diagrams
- Clear labels and legends
- Appropriate font sizes (readable at print size)
- Professional appearance
- Avoid clutter, focus on clarity

---

## Diagram Creation Checklist

- [x] System Architecture Diagram (Mermaid)
- [x] Data Flow Diagram (Mermaid)
- [x] API Flow Diagram (Mermaid)
- [x] Security Architecture Diagram (Mermaid)
- [x] Technology Stack Diagram (Mermaid)
- [x] Motivation Icons Diagram (Mermaid)
- [x] Problem Statement Diagram (Mermaid)
- [x] Preprocessing Workflow Diagram (Mermaid)
- [x] Training Pipeline Diagram (Mermaid)
- [x] User Journey Map (Mermaid)
- [x] Component Interaction Diagram (Mermaid)
- [x] AI Analysis Flow Diagram (Mermaid)

---

## Quick Implementation Tips

1. **Render Mermaid:** Use [Mermaid Live Editor](https://mermaid.live/) to preview and export
2. **Export Options:** PNG for raster, SVG/PDF for vector
3. **Customization:** Adjust colors and styles in Mermaid syntax
4. **Test Readability:** Convert to grayscale to ensure IEEE print compatibility
5. **Iterate:** Create multiple versions and choose the clearest
6. **Maintain Consistency:** Use same color scheme across all diagrams
7. **Document Sources:** If using external templates, ensure proper attribution

---

## File Organization

Place all exported diagrams in: `docs/researchPaper/figures/`

```
docs/researchPaper/
├── figures/
│   ├── system_architecture.png
│   ├── data_flow.png
│   ├── api_flow.png
│   ├── security_architecture.png
│   ├── tech_stack.png
│   ├── motivation_icons.png
│   ├── problem_diagram.png
│   ├── preprocessing_workflow.png
│   ├── training_pipeline.png
│   ├── user_journey.png
│   ├── component_interaction.png
│   └── ai_analysis_flow.png
├── researchpaper.tex
├── references.bib
└── diagrams.md (this file)
```

---

## Exporting Mermaid Diagrams

### Using Mermaid CLI:

```bash
# Install Mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# Export diagram
mmdc -i diagrams.md -o figures/ -e png -b white
```

### Using Online Tools:

1. Go to [Mermaid Live Editor](https://mermaid.live/)
2. Copy Mermaid code from this file
3. Paste into editor
4. Click "Export" → Choose format (PNG/PDF/SVG)
5. Save to `figures/` directory

### Using VS Code:

1. Install "Markdown Preview Mermaid Support" extension
2. Open this markdown file
3. Preview diagrams
4. Right-click → Save as image
