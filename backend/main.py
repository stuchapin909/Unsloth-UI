from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
from pathlib import Path
import json

from docker_manager import DockerManager
from training_manager import TrainingManager
from database import Database
from dataset_validator import DatasetValidator
from resource_monitor import ResourceMonitor

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
db = Database()
resource_monitor = ResourceMonitor()

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

@app.post("/api/datasets/validate")
async def validate_dataset_endpoint(file: UploadFile = File(...)):
    """Validate a dataset file before training"""
    try:
        # Save temporarily
        temp_path = DATASETS_DIR / f"_temp_{file.filename}"
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Validate
        result = DatasetValidator.validate_dataset(temp_path)

        # Clean up temp file
        if temp_path.exists():
            temp_path.unlink()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/datasets/{dataset_name}/validate")
async def validate_existing_dataset(dataset_name: str):
    """Validate an existing dataset"""
    try:
        dataset_path = DATASETS_DIR / dataset_name
        if not dataset_path.exists():
            raise HTTPException(status_code=404, detail="Dataset not found")

        result = DatasetValidator.validate_dataset(dataset_path)

        # Save validation result to database
        if result['valid']:
            stats = result.get('stats', {})
            db.add_dataset(
                name=dataset_name,
                path=str(dataset_path),
                size_bytes=dataset_path.stat().st_size,
                row_count=stats.get('row_count'),
                fields=stats.get('fields'),
                validated=True
            )

        return result
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
    """List all trained models with metadata"""
    try:
        # Get models from database
        db_models = {m['name']: m for m in db.list_models()}

        models = []
        for model_dir in MODELS_DIR.iterdir():
            if model_dir.is_dir() and not model_dir.name.startswith('_'):
                stat = model_dir.stat()

                # Calculate directory size
                size = sum(f.stat().st_size for f in model_dir.rglob('*') if f.is_file())

                model_data = {
                    "name": model_dir.name,
                    "size": size,
                    "created": stat.st_ctime,
                    "path": str(model_dir)
                }

                # Add database metadata if available
                if model_dir.name in db_models:
                    db_model = db_models[model_dir.name]
                    model_data.update({
                        "base_model": db_model.get('base_model'),
                        "training_run_id": db_model.get('training_run_id'),
                        "metadata": db_model.get('metadata')
                    })

                models.append(model_data)

        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/models/{model_name}")
async def delete_model(model_name: str):
    """Delete a trained model"""
    try:
        import shutil

        model_path = MODELS_DIR / model_name
        if not model_path.exists():
            raise HTTPException(status_code=404, detail="Model not found")

        # Delete from filesystem
        shutil.rmtree(model_path)

        # Delete from database
        db.delete_model(model_name)

        return {"success": True, "message": f"Model '{model_name}' deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/models/{model_name}/export")
async def export_model_info(model_name: str):
    """Get model export options"""
    try:
        model_path = MODELS_DIR / model_name
        if not model_path.exists():
            raise HTTPException(status_code=404, detail="Model not found")

        return {
            "name": model_name,
            "path": str(model_path),
            "export_formats": ["gguf", "ollama"],
            "note": "GGUF and Ollama export available"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ExportRequest(BaseModel):
    format: str
    quantization: str = "q4_k_m"  # For GGUF: q4_k_m, q5_k_m, q8_0, etc.

@app.post("/api/models/{model_name}/export/{format}")
async def export_model(model_name: str, format: str, request: ExportRequest):
    """Export a model to GGUF or Ollama format"""
    try:
        model_path = MODELS_DIR / model_name
        if not model_path.exists():
            raise HTTPException(status_code=404, detail="Model not found")

        # Check if container is running
        containers = docker_manager.docker_client.containers.list(
            filters={"ancestor": "unsloth/unsloth", "status": "running"}
        )

        if not containers:
            raise HTTPException(status_code=503, detail="Docker container not running. Please start the container first.")

        container = containers[0]

        if format.lower() == "gguf":
            # Generate GGUF export script
            output_file = f"{model_name}.{request.quantization}.gguf"
            export_script = f'''
import sys
from unsloth import FastLanguageModel

try:
    print("Loading model for GGUF export...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name="/workspace/work/models/{model_name}",
        max_seq_length=2048,
        dtype=None,
        load_in_4bit=True,
    )

    print("Exporting to GGUF format (quantization: {request.quantization})...")
    model.save_pretrained_gguf(
        "/workspace/work/models/{output_file}",
        tokenizer,
        quantization_method="{request.quantization}"
    )

    print("EXPORT_SUCCESS")
    print(f"Model exported to: /workspace/work/models/{output_file}")

except Exception as e:
    print(f"ERROR: {{str(e)}}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
'''

        elif format.lower() == "ollama":
            # Generate Ollama export script (saves as GGUF then creates Modelfile)
            output_file = f"{model_name}.Q4_K_M.gguf"
            modelfile_name = model_name.replace('/', '_').replace(' ', '_')

            export_script = f'''
import sys
from unsloth import FastLanguageModel

try:
    print("Loading model for Ollama export...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name="/workspace/work/models/{model_name}",
        max_seq_length=2048,
        dtype=None,
        load_in_4bit=True,
    )

    print("Exporting to GGUF format for Ollama...")
    model.save_pretrained_gguf(
        "/workspace/work/models/{output_file}",
        tokenizer,
        quantization_method="q4_k_m"
    )

    # Create Modelfile for Ollama
    modelfile_content = f"""FROM /workspace/work/models/{output_file}
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER stop "<|im_end|>"
"""

    with open("/workspace/work/models/Modelfile.{modelfile_name}", "w") as f:
        f.write(modelfile_content)

    print("EXPORT_SUCCESS")
    print(f"Model exported to: /workspace/work/models/{output_file}")
    print(f"Modelfile created: Modelfile.{modelfile_name}")
    print("")
    print("To use with Ollama, run:")
    print(f"  ollama create {modelfile_name} -f work/models/Modelfile.{modelfile_name}")

except Exception as e:
    print(f"ERROR: {{str(e)}}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
'''

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported export format: {format}")

        # Save export script
        script_path = Path(__file__).parent.parent / "work" / "export_script.py"
        script_path.write_text(export_script)

        # Execute in container
        exec_result = container.exec_run(
            ["python", "/workspace/work/export_script.py"],
            demux=True
        )

        # Parse output
        output = ""
        error = ""
        if exec_result.output:
            for stdout_chunk, stderr_chunk in exec_result.output:
                if stdout_chunk:
                    output += stdout_chunk.decode('utf-8')
                if stderr_chunk:
                    error += stderr_chunk.decode('utf-8')

        # Check if export was successful
        if "EXPORT_SUCCESS" in output:
            return {
                "success": True,
                "format": format,
                "output_file": output_file,
                "message": f"Model exported successfully to {format.upper()} format",
                "logs": output
            }
        else:
            return {
                "success": False,
                "error": "Export failed",
                "logs": output,
                "stderr": error
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class InferenceRequest(BaseModel):
    prompt: str
    max_tokens: int = 100
    temperature: float = 0.7

@app.post("/api/models/{model_name}/inference")
async def run_inference(model_name: str, request: InferenceRequest):
    """Run inference with a trained model"""
    try:
        model_path = MODELS_DIR / model_name
        if not model_path.exists():
            raise HTTPException(status_code=404, detail="Model not found")

        # Check if container is running
        containers = docker_manager.docker_client.containers.list(
            filters={"ancestor": "unsloth/unsloth", "status": "running"}
        )

        if not containers:
            raise HTTPException(status_code=503, detail="Docker container not running. Please start the container first.")

        container = containers[0]

        # Generate inference script
        inference_script = f'''
import sys
import torch
from unsloth import FastLanguageModel

try:
    print("Loading model...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name="/workspace/work/models/{model_name}",
        max_seq_length=2048,
        dtype=None,
        load_in_4bit=True,
    )

    FastLanguageModel.for_inference(model)

    print("Running inference...")
    inputs = tokenizer(["""{request.prompt}"""], return_tensors="pt").to("cuda")

    outputs = model.generate(
        **inputs,
        max_new_tokens={request.max_tokens},
        temperature={request.temperature},
        use_cache=True
    )

    result = tokenizer.batch_decode(outputs)[0]
    print("RESULT_START")
    print(result)
    print("RESULT_END")

except Exception as e:
    print(f"ERROR: {{str(e)}}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
'''

        # Save script to work directory
        script_path = Path(__file__).parent.parent / "work" / "inference_script.py"
        script_path.write_text(inference_script)

        # Execute in container
        exec_result = container.exec_run(
            ["python", "/workspace/work/inference_script.py"],
            demux=True
        )

        # Parse output
        output = ""
        if exec_result.output:
            for stdout_chunk, stderr_chunk in exec_result.output:
                if stdout_chunk:
                    output += stdout_chunk.decode('utf-8')

        # Extract result
        if "RESULT_START" in output and "RESULT_END" in output:
            result_text = output.split("RESULT_START")[1].split("RESULT_END")[0].strip()
            return {
                "success": True,
                "result": result_text,
                "prompt": request.prompt
            }
        else:
            return {
                "success": False,
                "error": "Failed to generate output",
                "output": output
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= RESOURCE MONITORING =============

@app.get("/api/system/resources")
async def get_system_resources():
    """Get current system resource usage"""
    try:
        return resource_monitor.get_system_resources()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/system/container-stats")
async def get_container_stats():
    """Get Docker container resource stats"""
    try:
        stats = resource_monitor.get_container_stats()
        if stats is None:
            return {"error": "No running container"}
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/system/check-resources")
async def check_resources(dataset_size_mb: float, model_size_gb: float = 8.0):
    """Check if system has adequate resources for training"""
    try:
        return resource_monitor.check_resources_adequate(dataset_size_mb, model_size_gb)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= TRAINING HISTORY =============

@app.get("/api/training/history")
async def get_training_history(limit: int = 50):
    """Get training run history"""
    try:
        return {"runs": db.list_training_runs(limit)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/training/history/{run_id}")
async def get_training_run_details(run_id: int):
    """Get detailed information about a training run"""
    try:
        run = db.get_training_run(run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Training run not found")

        # Get metrics
        metrics = db.get_training_metrics(run_id)

        return {
            "run": run,
            "metrics": metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= HEALTH CHECK =============

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "slothbuckler-backend"}

@app.get("/api/health/container")
async def check_container_health():
    """Check if Docker container is healthy"""
    try:
        containers = docker_manager.docker_client.containers.list(
            filters={"ancestor": "unsloth/unsloth", "status": "running"}
        )

        if not containers:
            return {
                "healthy": False,
                "message": "No running container"
            }

        container = containers[0]

        # Test if Unsloth is importable
        result = container.exec_run(["python", "-c", "import unsloth; print('OK')"])

        return {
            "healthy": result.exit_code == 0,
            "container_id": container.short_id,
            "container_name": container.name,
            "message": result.output.decode('utf-8').strip() if result.exit_code == 0 else "Unsloth import failed"
        }
    except Exception as e:
        return {
            "healthy": False,
            "error": str(e)
        }


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
