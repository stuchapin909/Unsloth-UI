from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
from pathlib import Path
import json

from docker_manager import DockerManager
from training_manager import TrainingManager

app = FastAPI(title="Slothbuckler API")

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize managers
docker_manager = DockerManager()
training_manager = TrainingManager()

# Paths
WORK_DIR = Path(__file__).parent.parent / "work"
DATASETS_DIR = WORK_DIR / "datasets"
MODELS_DIR = WORK_DIR / "models"
CONFIG_DIR = WORK_DIR / "config"

# Ensure directories exist
DATASETS_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)
CONFIG_DIR.mkdir(parents=True, exist_ok=True)

# Config file paths
HF_TOKEN_FILE = CONFIG_DIR / "hf_token.txt"

# Pydantic models
class DockerStatus(BaseModel):
    docker_installed: bool
    image_pulled: bool
    container_running: bool
    container_id: str | None = None
    container_name: str | None = None
    message: str

class TrainingConfig(BaseModel):
    model_config = {"protected_namespaces": ()}

    model_name: str
    dataset_path: str
    max_seq_length: int = 2048
    learning_rate: float = 2e-4
    num_epochs: int = 1
    batch_size: int = 2
    gradient_accumulation_steps: int = 4
    lora_r: int = 16
    lora_alpha: int = 16
    output_dir: str

class ModelInfo(BaseModel):
    name: str
    size: int
    created: str

class HFToken(BaseModel):
    token: str


# ============= DOCKER ENDPOINTS =============

@app.get("/api/docker/status", response_model=DockerStatus)
async def get_docker_status():
    """Check if Docker is installed and Unsloth container is running"""
    return docker_manager.get_status()

@app.get("/api/docker/containers")
async def list_docker_containers():
    """List all Unsloth Docker containers"""
    return docker_manager.list_containers()

@app.post("/api/docker/start")
async def start_docker_container():
    """Start the Unsloth Docker container"""
    try:
        result = docker_manager.start_container()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/docker/stop")
async def stop_docker_container():
    """Stop the Unsloth Docker container"""
    try:
        result = docker_manager.stop_container()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/docker/pull-progress")
async def get_docker_pull_progress():
    """Get Docker image pull progress"""
    try:
        return docker_manager.get_pull_progress()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/docker/models")
async def get_available_models():
    """Get list of available Unsloth models"""
    try:
        return docker_manager.get_available_models()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= DATASET ENDPOINTS =============

@app.post("/api/datasets/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a dataset file (JSON, JSONL, CSV)"""
    try:
        file_path = DATASETS_DIR / file.filename

        # Save uploaded file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        return {
            "success": True,
            "filename": file.filename,
            "path": str(file_path),
            "size": len(content)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/datasets/list")
async def list_datasets():
    """List all uploaded datasets"""
    try:
        datasets = []
        for file_path in DATASETS_DIR.iterdir():
            if file_path.is_file():
                stat = file_path.stat()
                datasets.append({
                    "name": file_path.name,
                    "size": stat.st_size,
                    "created": stat.st_ctime
                })
        return {"datasets": datasets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= TRAINING ENDPOINTS =============

@app.post("/api/training/start")
async def start_training(config: TrainingConfig):
    """Start model training with given configuration"""
    try:
        # Validate dataset exists
        dataset_path = Path(config.dataset_path)
        if not dataset_path.exists():
            raise HTTPException(status_code=404, detail="Dataset not found")

        # Start training in background
        result = training_manager.start_training(config.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/training/status")
async def get_training_status():
    """Get current training status and progress"""
    return training_manager.get_status()

@app.post("/api/training/stop")
async def stop_training():
    """Stop current training"""
    try:
        result = training_manager.stop_training()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= WEBSOCKET FOR REAL-TIME LOGS =============

@app.websocket("/ws/training")
async def websocket_training_logs(websocket: WebSocket):
    """WebSocket endpoint for real-time training logs"""
    await websocket.accept()
    try:
        while True:
            # Send training logs/progress updates
            log_data = training_manager.get_latest_logs()
            if log_data:
                await websocket.send_json(log_data)
            await websocket.receive_text()  # Keep connection alive
    except WebSocketDisconnect:
        pass


# ============= MODEL ENDPOINTS =============

@app.get("/api/models/list")
async def list_models():
    """List all trained models"""
    try:
        models = []
        for model_dir in MODELS_DIR.iterdir():
            if model_dir.is_dir():
                stat = model_dir.stat()

                # Calculate directory size
                size = sum(f.stat().st_size for f in model_dir.rglob('*') if f.is_file())

                models.append({
                    "name": model_dir.name,
                    "size": size,
                    "created": stat.st_ctime
                })
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= HEALTH CHECK =============

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "slothbuckler-backend"}


# ============= SETTINGS ENDPOINTS =============

@app.get("/api/settings/hf-token")
async def get_hf_token():
    """Get stored Hugging Face token"""
    try:
        if HF_TOKEN_FILE.exists():
            token = HF_TOKEN_FILE.read_text().strip()
            return {"token": token}
        return {"token": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/settings/hf-token")
async def save_hf_token(token_data: HFToken):
    """Save Hugging Face token"""
    try:
        HF_TOKEN_FILE.write_text(token_data.token)
        return {"success": True, "message": "Token saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/settings/hf-token")
async def delete_hf_token():
    """Delete stored Hugging Face token"""
    try:
        if HF_TOKEN_FILE.exists():
            HF_TOKEN_FILE.unlink()
        return {"success": True, "message": "Token deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import sys
    import os

    # Fix Windows console encoding
    if sys.platform == 'win32':
        os.system('chcp 65001 > nul')

    try:
        print("🦥⚔️ Starting Slothbuckler Backend...")
        print(f"📁 Work directory: {WORK_DIR}")
        print(f"🌐 API will be available at: http://localhost:8000")
        print(f"📚 API docs at: http://localhost:8000/docs")
    except UnicodeEncodeError:
        print("Starting Slothbuckler Backend...")
        print(f"Work directory: {WORK_DIR}")
        print(f"API will be available at: http://localhost:8000")
        print(f"API docs at: http://localhost:8000/docs")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
