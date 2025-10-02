import threading
import queue
import logging
import docker
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any
from database import Database

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
        self.docker_client = None
        self.db = Database()
        self.current_run_id = None
        self._init_docker()

    def _init_docker(self):
        """Initialize Docker client"""
        try:
            self.docker_client = docker.from_env()
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {e}")

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
        """Background worker that sends training commands to Docker container"""
        try:
            self._log("🚀 Initializing training...")
            self._log(f"Model: {config['model_name']}")
            self._log(f"Dataset: {config['dataset_path']}")

            # Create database entry for this training run
            model_name = Path(config['output_dir']).name
            dataset_name = Path(config['dataset_path']).name
            self.current_run_id = self.db.create_training_run(
                model_name=model_name,
                base_model=config['model_name'],
                dataset_name=dataset_name,
                dataset_path=config['dataset_path'],
                output_path=config['output_dir'],
                config=config
            )
            self._log(f"📝 Training run ID: {self.current_run_id}")

            # Get the Docker container
            if not self.docker_client:
                raise Exception("Docker client not initialized")

            # Find running Unsloth container
            containers = self.docker_client.containers.list(
                filters={"ancestor": "unsloth/unsloth", "status": "running"}
            )

            if not containers:
                self._log("❌ No running Unsloth container found!")
                self._update_status(
                    message="No container running. Please start Docker container first.",
                    progress=0.0,
                    running=False
                )
                # Update database entry
                if self.current_run_id:
                    self.db.update_training_run(
                        self.current_run_id,
                        status='failed',
                        completed_at=datetime.now().isoformat(),
                        error_message="No running container found"
                    )
                return

            container = containers[0]
            self._log(f"✅ Found container: {container.name}")

            # Generate the training script as a string
            training_script = self._generate_training_script(config)

            # Save script to a file that container can access
            script_path = Path(__file__).parent.parent / "work" / "train_script.py"
            script_path.write_text(training_script)
            self._log(f"📝 Training script saved to: {script_path}")

            # Execute the training script inside the container
            self._log("🐳 Executing training in Docker container...")
            self._update_status(message="Starting training in container...", progress=0.1)

            # Run Python script inside container
            exec_result = container.exec_run(
                ["python", "/workspace/work/train_script.py"],
                stream=True,
                demux=True  # Separate stdout and stderr
            )

            # Stream output from container
            for stdout_chunk, stderr_chunk in exec_result.output:
                if self.stop_flag:
                    self._log("⚠️ Training stopped by user")
                    self._update_status(message="Training stopped", progress=0.0, running=False)
                    # TODO: Kill the training process in container
                    return

                if stdout_chunk:
                    line = stdout_chunk.decode('utf-8').strip()
                    if line:
                        self._log(line)
                        self._parse_training_output(line)

                if stderr_chunk:
                    error = stderr_chunk.decode('utf-8').strip()
                    if error:
                        self._log(f"⚠️ {error}")

            # Check exit code
            exit_code = exec_result.exit_code
            if exit_code == 0:
                self._log("✅ Training completed successfully!")
                self._update_status(
                    message="Training completed successfully!",
                    progress=1.0,
                    running=False
                )

                # Update database entry
                if self.current_run_id:
                    self.db.update_training_run(
                        self.current_run_id,
                        status='completed',
                        completed_at=datetime.now().isoformat(),
                        final_loss=self.training_status.get('loss')
                    )

                    # Save model to database
                    output_path = config['output_dir']
                    if Path(output_path).exists():
                        self.db.save_model(
                            model_name=Path(output_path).name,
                            path=output_path,
                            base_model=config['model_name'],
                            training_run_id=self.current_run_id,
                            config=config
                        )
            else:
                self._log(f"❌ Training failed with exit code: {exit_code}")
                self._update_status(
                    message=f"Training failed with exit code: {exit_code}",
                    progress=0.0,
                    running=False
                )

                # Update database entry
                if self.current_run_id:
                    self.db.update_training_run(
                        self.current_run_id,
                        status='failed',
                        completed_at=datetime.now().isoformat(),
                        error_message=f"Exit code: {exit_code}"
                    )

        except Exception as e:
            logger.error(f"Training error: {e}", exc_info=True)
            self._log(f"❌ Error: {str(e)}")
            self._update_status(
                message=f"Training failed: {str(e)}",
                progress=0.0,
                running=False
            )

            # Update database entry
            if self.current_run_id:
                self.db.update_training_run(
                    self.current_run_id,
                    status='failed',
                    completed_at=datetime.now().isoformat(),
                    error_message=str(e)
                )
        finally:
            self.is_training = False

    def _generate_training_script(self, config: Dict[str, Any]) -> str:
        """Generate the Python training script to run inside Docker"""

        # Extract config values
        model_name = config['model_name']
        dataset_path = config['dataset_path']
        max_seq_length = config.get('max_seq_length', 2048)
        learning_rate = config.get('learning_rate', 2e-4)
        num_epochs = config.get('num_epochs', 1)
        batch_size = config.get('batch_size', 2)
        gradient_accumulation_steps = config.get('gradient_accumulation_steps', 4)
        lora_r = config.get('lora_r', 16)
        lora_alpha = config.get('lora_alpha', 16)
        output_dir = config['output_dir']
        checkpoint_steps = config.get('checkpoint_steps', 100)  # Save checkpoint every N steps

        # Build the script
        script = f'''
import sys
import os
import torch
from unsloth import FastLanguageModel
from datasets import load_dataset
from trl import SFTTrainer, SFTConfig

print("=" * 60)
print("SLOTHBUCKLER TRAINING")
print("=" * 60)

try:
    # Check for existing checkpoints
    checkpoint_dir = None
    if os.path.exists("{output_dir}"):
        checkpoints = [d for d in os.listdir("{output_dir}") if d.startswith("checkpoint-")]
        if checkpoints:
            # Sort by step number and get the latest
            checkpoints.sort(key=lambda x: int(x.split("-")[1]))
            checkpoint_dir = os.path.join("{output_dir}", checkpoints[-1])
            print(f"🔄 Found checkpoint: {{checkpoint_dir}}")

    # Load model (from checkpoint if available)
    if checkpoint_dir:
        print(f"📦 Resuming from checkpoint: {{checkpoint_dir}}")
        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name=checkpoint_dir,
            max_seq_length={max_seq_length},
            dtype=None,
            load_in_4bit=True,
        )
        print("✅ Model loaded from checkpoint")
    else:
        print("📦 Loading model: {model_name}")
        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name="{model_name}",
            max_seq_length={max_seq_length},
            dtype=None,
            load_in_4bit=True,
        )
        print("✅ Model loaded successfully")

    # Add LoRA adapters
    print("🔧 Adding LoRA adapters...")
    model = FastLanguageModel.get_peft_model(
        model,
        r={lora_r},
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                       "gate_proj", "up_proj", "down_proj"],
        lora_alpha={lora_alpha},
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=3407,
    )
    print("✅ LoRA adapters added")

    # Load dataset
    print("📊 Loading dataset: {dataset_path}")
    dataset = load_dataset('json', data_files='{dataset_path}', split='train')
    print(f"✅ Dataset loaded: {{len(dataset)}} examples")

    # Setup trainer
    print("⚙️ Setting up trainer...")
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length={max_seq_length},
        dataset_num_proc=2,
        args=SFTConfig(
            per_device_train_batch_size={batch_size},
            gradient_accumulation_steps={gradient_accumulation_steps},
            warmup_steps=5,
            num_train_epochs={num_epochs},
            learning_rate={learning_rate},
            fp16=not torch.cuda.is_bf16_supported(),
            bf16=torch.cuda.is_bf16_supported(),
            logging_steps=1,
            optim="adamw_8bit",
            weight_decay=0.01,
            lr_scheduler_type="linear",
            seed=3407,
            output_dir="{output_dir}",
            save_strategy="steps",
            save_steps={checkpoint_steps},
            save_total_limit=3,  # Keep only last 3 checkpoints
        ),
    )
    print("✅ Trainer ready")

    # Start training
    print("🎯 Starting training...")
    print("-" * 60)
    trainer.train()
    print("-" * 60)
    print("✅ Training completed!")

    # Save model
    print("💾 Saving model...")
    model.save_pretrained("{output_dir}")
    tokenizer.save_pretrained("{output_dir}")
    print(f"✅ Model saved to: {output_dir}")

    print("=" * 60)
    print("TRAINING COMPLETE!")
    print("=" * 60)

except Exception as e:
    print(f"❌ ERROR: {{str(e)}}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
'''
        return script

    def _parse_training_output(self, line: str):
        """Parse training output to update progress and extract metrics"""
        import re

        # Update progress based on keywords
        if "Loading model" in line:
            self._update_status(message="Loading model...", progress=0.1)
        elif "LoRA adapters" in line:
            self._update_status(message="Adding LoRA adapters...", progress=0.2)
        elif "Loading dataset" in line:
            self._update_status(message="Loading dataset...", progress=0.3)
        elif "Setting up trainer" in line:
            self._update_status(message="Setting up trainer...", progress=0.4)
        elif "Starting training" in line:
            self._update_status(message="Training in progress...", progress=0.5)
        elif "Saving model" in line:
            self._update_status(message="Saving model...", progress=0.9)

        # Parse training metrics from Hugging Face trainer output
        # Format: {'loss': 0.5, 'learning_rate': 2e-4, 'epoch': 0.5}
        # or Step X/Y: {'loss': 0.5}
        try:
            # Extract step information
            step_match = re.search(r"step[:\s]+(\d+)[/\s]+(\d+)", line, re.IGNORECASE)
            if step_match:
                current_step = int(step_match.group(1))
                total_steps = int(step_match.group(2))
                self.training_status["current_step"] = current_step
                self.training_status["total_steps"] = total_steps
                # Calculate progress based on steps
                if total_steps > 0:
                    step_progress = 0.5 + (current_step / total_steps) * 0.4  # 50-90%
                    self._update_status(progress=step_progress)

            # Extract loss value
            loss_match = re.search(r"['\"]loss['\"]:\s*([0-9.]+)", line)
            if loss_match:
                loss = float(loss_match.group(1))
                self.training_status["loss"] = loss

                # Save metric to database
                if self.current_run_id:
                    self.db.save_training_metric(
                        training_run_id=self.current_run_id,
                        step=self.training_status.get("current_step", 0),
                        loss=loss,
                        learning_rate=None  # Could extract this too if needed
                    )

            # Extract epoch information
            epoch_match = re.search(r"['\"]epoch['\"]:\s*([0-9.]+)", line)
            if epoch_match:
                epoch = float(epoch_match.group(1))
                # Could store this in status if needed

        except Exception as e:
            logger.debug(f"Error parsing training output: {e}")

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
