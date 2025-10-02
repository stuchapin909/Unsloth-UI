# 🚀 Quick Start Guide

## First Time Setup

### 1. Install Dependencies

Run the setup script:

```bash
python setup.py
```

This will install all backend (Python) and frontend (Node.js) dependencies.

### 2. Start Docker Desktop

Make sure Docker Desktop is running on your machine. You can download it from:
https://www.docker.com/products/docker-desktop/

### 3. Launch the Application

```bash
python start.py
```

This single command will:
- ✅ Start the backend API server (port 8000)
- ✅ Start the frontend dev server (port 5173)
- ✅ Open your browser automatically

## Using the Application

### Step 1: Start Docker Container

When the app opens, you'll see the Docker status at the top. Click **"Start Container"** to launch the Unsloth Docker container. This may take a few minutes the first time as it downloads the image (~7GB).

### Step 2: Upload Your Dataset

1. Click the **"📁 Upload Dataset"** tab
2. Drag and drop your dataset file (or click to browse)
3. Supported formats: JSON, JSONL, CSV

**Example dataset (JSON):**
```json
[
  {
    "text": "Below is an instruction that describes a task. Write a response that appropriately completes the request.\n\n### Instruction:\nWhat is Python?\n\n### Response:\nPython is a high-level programming language..."
  },
  {
    "text": "Below is an instruction that describes a task. Write a response that appropriately completes the request.\n\n### Instruction:\nExplain machine learning.\n\n### Response:\nMachine learning is a subset of AI..."
  }
]
```

### Step 3: Configure Training

1. Click the **"⚙️ Configure Training"** tab
2. Select your uploaded dataset
3. Choose a model (e.g., `unsloth/llama-3.1-8b-bnb-4bit`)
4. Enter an output model name (e.g., `my-custom-llama`)
5. Adjust parameters if needed (defaults are good for most cases)
6. Click **"🚀 Start Training"**

### Step 4: Monitor Progress

The app will automatically switch to the **"📊 Training Progress"** tab where you can:
- See real-time progress
- Monitor training loss
- View training logs
- Stop training if needed

### Step 5: Use Your Model

After training completes, your model will be saved to:
```
work/models/your-model-name/
```

You can use this model with:
- Unsloth library
- Hugging Face Transformers
- Export to GGUF for Ollama
- Export to vLLM for inference

## Recommended Settings

### For Small Datasets (<1000 examples)
- Epochs: 3
- Learning Rate: 2e-4
- Batch Size: 2

### For Medium Datasets (1000-10000 examples)
- Epochs: 1-2
- Learning Rate: 2e-4
- Batch Size: 4

### For Large Datasets (>10000 examples)
- Epochs: 1
- Learning Rate: 1e-4
- Batch Size: 8

## Troubleshooting

### "Docker not installed"
- Install Docker Desktop and make sure it's running
- On Windows, enable WSL2

### "Backend failed to start"
- Make sure port 8000 is not in use
- Run: `cd backend && pip install -r requirements.txt`

### "Frontend failed to start"
- Make sure port 5173 is not in use
- Run: `cd frontend && npm install`

### "Training failed"
- Check your dataset format (should have a "text" field)
- Make sure you have enough GPU memory
- Try reducing batch size

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check out [Unsloth Documentation](https://docs.unsloth.ai) for advanced usage
- Join the Unsloth community for support

---

**Need help?** Open an issue or check the README.md file for more details.
