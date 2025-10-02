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

                # Count rows if it's a JSON/JSONL file
                rows = None
                try:
                    if file_path.suffix in ['.json', '.jsonl']:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            if file_path.suffix == '.jsonl':
                                rows = sum(1 for _ in f)
                            else:
                                data = json.load(f)
                                rows = len(data) if isinstance(data, list) else 1
                except:
                    pass

                datasets.append({
                    "name": file_path.name,
                    "size": stat.st_size,
                    "created": stat.st_ctime,
                    "rows": rows,
                    "source": "local"  # local upload or pulled from HF
                })
        return {"datasets": datasets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_hf_token():
    """Get HuggingFace token from config file"""
    if HF_TOKEN_FILE.exists():
        return HF_TOKEN_FILE.read_text().strip()
    return None

@app.get("/api/datasets/hf/search")
async def search_hf_datasets(query: str = "", limit: int = 20):
    """Search HuggingFace datasets"""
    try:
        from huggingface_hub import HfApi

        token = get_hf_token()
        api = HfApi(token=token)
        datasets = api.list_datasets(
            search=query if query else None,
            sort="downloads",
            limit=limit,
            full=True
        )

        result = []
        for ds in datasets:
            result.append({
                "id": ds.id,
                "name": ds.id.split('/')[-1],
                "author": ds.author,
                "downloads": getattr(ds, 'downloads', 0),
                "likes": getattr(ds, 'likes', 0),
                "updated": str(getattr(ds, 'lastModified', '')),
                "tags": getattr(ds, 'tags', [])
            })

        return {"datasets": result}
    except ImportError:
        raise HTTPException(status_code=500, detail="huggingface_hub not installed. Run: pip install huggingface_hub")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/datasets/hf/preview/{dataset_id:path}")
async def preview_hf_dataset(dataset_id: str, limit: int = 5):
    """Preview samples from a HuggingFace dataset"""
    try:
        from datasets import load_dataset

        token = get_hf_token()
        # Load just a few samples
        dataset = load_dataset(dataset_id, split="train", streaming=True, token=token)
        samples = []

        for i, item in enumerate(dataset):
            if i >= limit:
                break
            samples.append(item)

        return {
            "samples": samples,
            "dataset_id": dataset_id
        }
    except ImportError:
        raise HTTPException(status_code=500, detail="datasets library not installed. Run: pip install datasets")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class HFDatasetPull(BaseModel):
    dataset_id: str
    split: str = "train"
    text_field: str | None = None  # Auto-detect if None

@app.post("/api/datasets/hf/pull")
async def pull_hf_dataset(pull_request: HFDatasetPull):
    """Pull a dataset from HuggingFace and save locally"""
    try:
        from datasets import load_dataset

        token = get_hf_token()
        if not token:
            raise HTTPException(
                status_code=401,
                detail="HuggingFace token required. Please add your token in Settings."
            )

        # Load the dataset
        dataset = load_dataset(pull_request.dataset_id, split=pull_request.split, token=token)

        # Determine text field
        text_field = pull_request.text_field
        if not text_field:
            # Auto-detect common text fields
            common_fields = ['text', 'prompt', 'instruction', 'input', 'question', 'content']
            for field in common_fields:
                if field in dataset.column_names:
                    text_field = field
                    break

            if not text_field:
                text_field = dataset.column_names[0]  # Use first field as fallback

        # Save as JSONL
        safe_name = pull_request.dataset_id.replace('/', '_').replace('\\', '_')
        output_path = DATASETS_DIR / f"{safe_name}.jsonl"

        with open(output_path, 'w', encoding='utf-8') as f:
            for item in dataset:
                f.write(json.dumps(item) + '\n')

        return {
            "success": True,
            "filename": output_path.name,
            "path": str(output_path),
            "rows": len(dataset),
            "text_field": text_field
        }
    except ImportError:
        raise HTTPException(status_code=500, detail="datasets library not installed. Run: pip install datasets")
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
