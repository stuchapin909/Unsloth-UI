# 🦥 Slothbuckler

A beautiful desktop application for fine-tuning Large Language Models using Unsloth - making LLM training 2x faster with 70% less VRAM.

![Slothbuckler](https://img.shields.io/badge/Status-Beta-yellow) ![Python](https://img.shields.io/badge/Python-3.10+-blue) ![React](https://img.shields.io/badge/React-18+-61dafb)

## ✨ Features

- 🎨 **Modern UI** - Beautiful, intuitive interface built with React + TailwindCSS
- 🐳 **Docker Integration** - Automatic Docker container management
- 📊 **Real-time Progress** - Monitor training progress and metrics live
- 📁 **Drag & Drop** - Easy dataset uploading
- ⚙️ **Flexible Configuration** - Customize training parameters
- 🚀 **One-Click Start** - Simple launcher script to run everything

## 🏗️ Architecture

```
Slothbuckler
├── Frontend (React + TypeScript + Vite)
│   └── Runs on http://localhost:5173
├── Backend (FastAPI + Python)
│   └── Runs on http://localhost:8000
└── Unsloth Docker Container
    └── Handles the actual model training
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

1. **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
2. **Python 3.10+** - [Download here](https://www.python.org/downloads/)
3. **Node.js 18+** - [Download here](https://nodejs.org/)
4. **NVIDIA GPU** (recommended) with CUDA support

## 🚀 Quick Start

### 1. Clone or Download this Repository

```bash
cd "Slothbuckler"
```

### 2. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
cd ..
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Run the Application

**Recommended: Simple One-Command Start**

```bash
npm run dev
```

This automatically:
- Kills any processes on ports 8000 and 5173
- Starts both backend and frontend
- Press Ctrl+C to stop everything

**Alternative: Manual Start**

Terminal 1 (Backend):
```bash
cd backend
python main.py
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Then open http://localhost:5173 in your browser.

## 📖 How to Use

### 1. Start Docker Container

When you first open the app, click the **"Start Container"** button to launch the Unsloth Docker container.

### 2. Upload Dataset

- Go to the **"Upload Dataset"** tab
- Drag and drop your dataset file (JSON, JSONL, or CSV)
- Your dataset should have a `text` field with training examples

Example dataset format (JSON):
```json
[
  {"text": "Question: What is AI? Answer: Artificial Intelligence is..."},
  {"text": "Question: What is ML? Answer: Machine Learning is..."}
]
```

### 3. Configure Training

- Go to the **"Configure Training"** tab
- Select your uploaded dataset
- Choose a base model (e.g., Llama 3.1 8B)
- Adjust training parameters:
  - **Learning Rate**: 2e-4 is a good default
  - **Epochs**: 1-3 to prevent overfitting
  - **Batch Size**: 2 (adjust based on your GPU)
  - **LoRA Rank**: 16 (higher = more parameters)
- Enter an output model name
- Click **"Start Training"**

### 4. Monitor Progress

- Automatically switches to the **"Training Progress"** tab
- View real-time training metrics
- Monitor loss and progress
- Stop training anytime if needed

### 5. Access Your Model

Trained models are saved to:
```
work/models/your-model-name/
```

You can use these models with Unsloth, Hugging Face Transformers, or export to GGUF/Ollama formats.

## 🎯 Supported Models

- **Llama 3.1** (8B, 70B)
- **Mistral** (7B)
- **Qwen 2.5** (7B)
- **Gemma 2** (9B)
- **Phi 3.5** (Mini)
- And many more!

## 🛠️ Configuration

### Backend Configuration

Edit `backend/main.py` to customize:
- Port (default: 8000)
- CORS origins
- Work directories

### Frontend Configuration

Edit `frontend/src/api/docker.ts` and `frontend/src/api/training.ts` to change the API base URL if needed.

## 📁 Project Structure

```
unsloth-ui/
├── backend/                    # FastAPI backend
│   ├── main.py                # Main API server
│   ├── docker_manager.py      # Docker container management
│   ├── training_manager.py    # Unsloth training logic
│   └── requirements.txt       # Python dependencies
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── api/              # API client functions
│   │   └── App.tsx           # Main app component
│   └── package.json          # Node dependencies
├── work/                       # User data
│   ├── datasets/             # Uploaded datasets
│   └── models/               # Trained models
├── start.py                   # Launcher script
└── README.md                  # This file
```

## 🐛 Troubleshooting

### Docker Not Starting

- Make sure Docker Desktop is running
- Check if you have permission to access Docker
- On Windows, ensure WSL2 is enabled

### Backend Errors

- Verify Python dependencies: `pip install -r backend/requirements.txt`
- Check if port 8000 is available
- Look at backend logs for specific errors

### Frontend Errors

- Delete `node_modules` and run `npm install` again
- Clear browser cache
- Check if port 5173 is available

### Training Fails

- Make sure the Unsloth container is running
- Check your dataset format
- Verify you have enough GPU memory
- Look at training logs for specific errors

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Credits

- **Unsloth AI** - For the amazing Unsloth library
- **FastAPI** - For the backend framework
- **React** - For the frontend framework
- **TailwindCSS** - For the styling

## 📞 Support

For issues and questions:
- Check the [Unsloth Documentation](https://docs.unsloth.ai)
- Visit the [Unsloth GitHub](https://github.com/unslothai/unsloth)

---

Made with ❤️ using Unsloth, FastAPI, and React
