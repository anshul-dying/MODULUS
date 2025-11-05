"""
FastAPI main application
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .routers import datasets, eda, training, export, image_training, ai_analysis, preprocessing


FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Create FastAPI app
app = FastAPI(
    title="AutoTrain Advanced API",
    description="End-to-end ML pipeline API",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])
app.include_router(eda.router, prefix="/api/eda", tags=["eda"])
app.include_router(training.router, prefix="/api/training", tags=["training"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
app.include_router(image_training.router, prefix="/api/image-training", tags=["image-training"])
app.include_router(ai_analysis.router, prefix="/api/ai", tags=["ai-analysis"])
app.include_router(preprocessing.router, prefix="/api/preprocessing", tags=["preprocessing"])

# Serve static files (for frontend)
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")

# Serve artifacts (reports, models, etc.)
if os.path.exists("data/artifacts"):
    app.mount("/static/artifacts", StaticFiles(directory="data/artifacts"), name="artifacts")

# Add favicon endpoint to prevent 404 errors
@app.get("/favicon.ico")
async def favicon():
    return {"message": "No favicon"}

@app.get("/")
async def root():
    return {"message": "AutoTrain Advanced API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/api/health")
async def api_health_check():
    return await health_check()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
