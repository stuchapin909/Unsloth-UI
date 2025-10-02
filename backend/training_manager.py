import threading
import queue
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class TrainingManager:
    """Manages Unsloth model training lifecycle"""

    def __init__(self):
        self.training_thread: Optional[threading.Thread] = None
        self.is_training = False
        self.training_status = {
            "running": False,
            "progress": 0.0,
            "current_step": 0,
            "total_steps": 0,
            "loss": None,
            "message": "Ready to train"
        }
        self.log_queue = queue.Queue()
        self.stop_flag = False

    def start_training(self, config: Dict[str, Any]):
        """Start training in a background thread"""
        if self.is_training:
            return {
                "success": False,
                "message": "Training already in progress"
            }

        # Reset state
        self.stop_flag = False
        self.training_status = {
            "running": True,
            "progress": 0.0,
            "current_step": 0,
            "total_steps": 0,
            "loss": None,
            "message": "Starting training..."
        }

        # Start training thread
        self.training_thread = threading.Thread(
            target=self._training_worker,
            args=(config,),
            daemon=True
        )
        self.training_thread.start()
        self.is_training = True

        return {
            "success": True,
            "message": "Training started",
            "config": config
        }

    def _training_worker(self, config: Dict[str, Any]):
        """Background worker that performs the actual training"""
        try:
            self._log("🚀 Initializing training...")
            self._log(f"Model: {config['model_name']}")
            self._log(f"Dataset: {config['dataset_path']}")

            # Import Unsloth (only when needed, inside Docker container)
            try:
                from unsloth import FastLanguageModel
                from datasets import load_dataset
                from trl import SFTTrainer, SFTConfig
                import torch

                self._log("✅ Unsloth imported successfully")
            except ImportError as e:
                self._log(f"❌ Error: Unsloth not available. Make sure you're running inside the Docker container.")
                self._log(f"Error details: {str(e)}")
                self.training_status["running"] = False
                self.training_status["message"] = "Unsloth not available"
                self.is_training = False
                return

            # Load model
            self._log("📦 Loading model...")
            self._update_status(message="Loading model...", progress=0.1)

            model, tokenizer = FastLanguageModel.from_pretrained(
                model_name=config['model_name'],
                max_seq_length=config.get('max_seq_length', 2048),
                dtype=None,
                load_in_4bit=True,
            )

            self._log("✅ Model loaded")

            # Add LoRA adapters
            self._log("🔧 Adding LoRA adapters...")
            self._update_status(message="Adding LoRA adapters...", progress=0.2)

            model = FastLanguageModel.get_peft_model(
                model,
                r=config.get('lora_r', 16),
                target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                               "gate_proj", "up_proj", "down_proj"],
                lora_alpha=config.get('lora_alpha', 16),
                lora_dropout=0,
                bias="none",
                use_gradient_checkpointing="unsloth",
                random_state=3407,
            )

            self._log("✅ LoRA adapters added")

            # Load dataset
            self._log("📊 Loading dataset...")
            self._update_status(message="Loading dataset...", progress=0.3)

            dataset_path = Path(config['dataset_path'])
            if dataset_path.suffix == '.json':
                dataset = load_dataset('json', data_files=str(dataset_path), split='train')
            elif dataset_path.suffix == '.jsonl':
                dataset = load_dataset('json', data_files=str(dataset_path), split='train')
            else:
                raise ValueError(f"Unsupported dataset format: {dataset_path.suffix}")

            self._log(f"✅ Dataset loaded: {len(dataset)} examples")

            # Calculate training steps
            batch_size = config.get('batch_size', 2)
            gradient_accumulation_steps = config.get('gradient_accumulation_steps', 4)
            num_epochs = config.get('num_epochs', 1)
            total_steps = (len(dataset) // (batch_size * gradient_accumulation_steps)) * num_epochs

            self.training_status["total_steps"] = total_steps
            self._log(f"📈 Total training steps: {total_steps}")

            # Setup trainer
            self._log("⚙️ Setting up trainer...")
            self._update_status(message="Setting up trainer...", progress=0.4)

            output_dir = Path(config['output_dir'])
            output_dir.mkdir(parents=True, exist_ok=True)

            trainer = SFTTrainer(
                model=model,
                tokenizer=tokenizer,
                train_dataset=dataset,
                dataset_text_field="text",  # Adjust based on your dataset
                max_seq_length=config.get('max_seq_length', 2048),
                dataset_num_proc=2,
                args=SFTConfig(
                    per_device_train_batch_size=batch_size,
                    gradient_accumulation_steps=gradient_accumulation_steps,
                    warmup_steps=5,
                    num_train_epochs=num_epochs,
                    learning_rate=config.get('learning_rate', 2e-4),
                    fp16=not torch.cuda.is_bf16_supported(),
                    bf16=torch.cuda.is_bf16_supported(),
                    logging_steps=1,
                    optim="adamw_8bit",
                    weight_decay=0.01,
                    lr_scheduler_type="linear",
                    seed=3407,
                    output_dir=str(output_dir),
                ),
            )

            # Start training
            self._log("🎯 Starting training...")
            self._update_status(message="Training in progress...", progress=0.5)

            # Note: For real progress tracking, you'd need to use callbacks
            # This is a simplified version
            trainer.train()

            if self.stop_flag:
                self._log("⚠️ Training stopped by user")
                self._update_status(message="Training stopped", progress=0.0, running=False)
                return

            self._log("✅ Training completed!")
            self._update_status(message="Saving model...", progress=0.9)

            # Save model
            model.save_pretrained(str(output_dir))
            tokenizer.save_pretrained(str(output_dir))

            self._log(f"💾 Model saved to: {output_dir}")
            self._update_status(
                message="Training completed successfully!",
                progress=1.0,
                running=False
            )

        except Exception as e:
            logger.error(f"Training error: {e}", exc_info=True)
            self._log(f"❌ Error: {str(e)}")
            self._update_status(
                message=f"Training failed: {str(e)}",
                progress=0.0,
                running=False
            )
        finally:
            self.is_training = False

    def stop_training(self):
        """Stop the current training"""
        if not self.is_training:
            return {
                "success": False,
                "message": "No training in progress"
            }

        self.stop_flag = True
        self._log("🛑 Stopping training...")

        return {
            "success": True,
            "message": "Stopping training..."
        }

    def get_status(self):
        """Get current training status"""
        return self.training_status

    def get_latest_logs(self):
        """Get latest log messages"""
        logs = []
        try:
            while True:
                logs.append(self.log_queue.get_nowait())
        except queue.Empty:
            pass

        if logs:
            return {
                "logs": logs,
                "status": self.training_status
            }
        return None

    def _log(self, message: str):
        """Add a log message"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = {
            "timestamp": timestamp,
            "message": message
        }
        self.log_queue.put(log_entry)
        logger.info(message)

    def _update_status(self, message: str = None, progress: float = None, running: bool = None):
        """Update training status"""
        if message is not None:
            self.training_status["message"] = message
        if progress is not None:
            self.training_status["progress"] = progress
        if running is not None:
            self.training_status["running"] = running
