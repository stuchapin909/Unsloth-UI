import docker
from docker.errors import DockerException, NotFound, APIError
import logging
import threading

logger = logging.getLogger(__name__)

class DockerManager:
    """Manages Unsloth Docker container lifecycle"""

    def __init__(self):
        self.container_name = "slothbuckler-container"
        self.image_name = "unsloth/unsloth"
        self.client = None
        self.container = None
        self.pull_progress = {}
        self.pull_status = "idle"  # idle, pulling, complete, error
        self.start_thread = None
        self.start_error = None
        self._client_initialized = False

    def _get_client(self):
        """Lazy initialize Docker client"""
        if not self._client_initialized:
            try:
                self.client = docker.from_env()
                self._client_initialized = True
            except DockerException as e:
                logger.error(f"Docker not available: {e}")
                self._client_initialized = True  # Mark as initialized to avoid retrying
        return self.client

    def list_containers(self):
        """List all Unsloth containers (running and stopped)"""
        client = self._get_client()
        if not client:
            return {"containers": []}

        try:
            all_containers = client.containers.list(
                all=True,
                filters={"ancestor": self.image_name}
            )

            containers = []
            for container in all_containers:
                containers.append({
                    "id": container.short_id,
                    "name": container.name,
                    "status": container.status,
                    "created": container.attrs['Created'],
                    "image": self.image_name
                })

            return {"containers": containers}
        except Exception as e:
            logger.error(f"Error listing containers: {e}")
            return {"containers": []}

    def get_status(self):
        """Check Docker installation and detect any running Unsloth container"""
        client = self._get_client()
        if not client:
            return {
                "docker_installed": False,
                "image_pulled": False,
                "container_running": False,
                "container_id": None,
                "container_name": None,
                "message": "Docker is not installed or not running"
            }

        try:
            # Check if Unsloth image exists
            image_exists = False
            try:
                client.images.get(self.image_name)
                image_exists = True
            except NotFound:
                pass

            # Search for ANY running container using the unsloth/unsloth image
            running_containers = client.containers.list(
                filters={"ancestor": self.image_name, "status": "running"}
            )

            if running_containers:
                container = running_containers[0]
                return {
                    "docker_installed": True,
                    "image_pulled": True,
                    "container_running": True,
                    "container_id": container.short_id,
                    "container_name": container.name,
                    "message": f"Connected to container: {container.name}"
                }

            # Check for stopped containers
            stopped_containers = client.containers.list(
                all=True,
                filters={"ancestor": self.image_name, "status": "exited"}
            )

            if stopped_containers:
                container = stopped_containers[0]
                return {
                    "docker_installed": True,
                    "image_pulled": True,
                    "container_running": False,
                    "container_id": container.short_id,
                    "container_name": container.name,
                    "message": f"Container exists but not running: {container.name}"
                }

            # Image exists but no containers
            if image_exists:
                return {
                    "docker_installed": True,
                    "image_pulled": True,
                    "container_running": False,
                    "container_id": None,
                    "container_name": None,
                    "message": "Unsloth image found, but no container created"
                }

            # Docker running but image not pulled
            return {
                "docker_installed": True,
                "image_pulled": False,
                "container_running": False,
                "container_id": None,
                "container_name": None,
                "message": "Docker running, but Unsloth image not pulled"
            }

        except Exception as e:
            logger.error(f"Error checking Docker status: {e}")
            return {
                "installed": True,
                "running": False,
                "container_id": None,
                "message": f"Error: {str(e)}"
            }

    def start_container(self):
        """Start or create the Unsloth Docker container (non-blocking)"""
        logger.info("=== START CONTAINER CALLED ===")

        client = self._get_client()
        if not client:
            logger.error("Docker client is None")
            raise Exception("Docker is not available")

        # Check if already starting
        if self.start_thread and self.start_thread.is_alive():
            logger.info("Container start already in progress")
            return {
                "success": True,
                "message": "Container start in progress..."
            }

        # Start container in background thread
        logger.info("Starting container in background thread")
        self.pull_status = "idle"
        self.start_error = None
        self.start_thread = threading.Thread(target=self._start_container_worker, daemon=True)
        self.start_thread.start()

        return {
            "success": True,
            "message": "Container start initiated"
        }

    def _start_container_worker(self):
        """Background worker to start/create container"""
        logger.info("=== CONTAINER START WORKER RUNNING ===")
        try:
            # Check if container already exists
            try:
                logger.info(f"Looking for container: {self.container_name}")
                container = self.client.containers.get(self.container_name)
                logger.info(f"Container found with status: {container.status}")

                if container.status == "running":
                    logger.info("Container already running, returning success")
                    return {
                        "success": True,
                        "message": "Container already running",
                        "container_id": container.short_id
                    }
                else:
                    # Start existing container
                    logger.info("Starting existing container")
                    container.start()
                    return {
                        "success": True,
                        "message": "Container started",
                        "container_id": container.short_id
                    }
            except NotFound:
                logger.info("Container not found, will create new one")
                # Create new container
                logger.info(f"Creating new container from image {self.image_name}")

                # Pull image if not exists
                try:
                    self.client.images.get(self.image_name)
                    logger.info(f"Image {self.image_name} already exists")
                except NotFound:
                    logger.info(f"Pulling image {self.image_name} (this may take 10-15 minutes for first time)...")
                    self.pull_status = "pulling"
                    self.pull_progress = {}

                    # Pull in streaming mode to avoid timeout
                    for line in self.client.api.pull(self.image_name, stream=True, decode=True):
                        if 'error' in line:
                            self.pull_status = "error"
                            raise Exception(f"Pull failed: {line['error']}")

                        # Track progress for each layer
                        if 'id' in line and 'status' in line:
                            layer_id = line['id']
                            self.pull_progress[layer_id] = {
                                'status': line.get('status', ''),
                                'progress': line.get('progress', ''),
                                'current': line.get('progressDetail', {}).get('current', 0),
                                'total': line.get('progressDetail', {}).get('total', 0)
                            }

                    self.pull_status = "complete"
                    logger.info("Image pull completed successfully")

                # Create and start container
                # Try with GPU first, fallback to CPU if GPU fails
                try:
                    logger.info("Attempting to create container with GPU support")
                    container = self.client.containers.run(
                        self.image_name,
                        name=self.container_name,
                        detach=True,
                        environment={
                            "JUPYTER_PASSWORD": "unsloth"
                        },
                        ports={
                            "8888/tcp": 8888,
                            "22/tcp": 2222
                        },
                        volumes={
                            str(self._get_work_dir()): {
                                "bind": "/workspace/work",
                                "mode": "rw"
                            }
                        },
                        device_requests=[
                            docker.types.DeviceRequest(count=-1, capabilities=[["gpu"]])
                        ]
                    )
                    logger.info("Container created successfully with GPU")
                except Exception as gpu_error:
                    logger.warning(f"GPU container creation failed: {gpu_error}")
                    logger.info("Retrying without GPU support...")

                    # Clean up failed container if it exists
                    try:
                        failed_container = self.client.containers.get(self.container_name)
                        failed_container.remove(force=True)
                    except:
                        pass

                    container = self.client.containers.run(
                        self.image_name,
                        name=self.container_name,
                        detach=True,
                        environment={
                            "JUPYTER_PASSWORD": "unsloth"
                        },
                        ports={
                            "8888/tcp": 8888,
                            "22/tcp": 2222
                        },
                        volumes={
                            str(self._get_work_dir()): {
                                "bind": "/workspace/work",
                                "mode": "rw"
                            }
                        }
                    )
                    logger.info("Container created successfully without GPU (CPU mode)")

                return {
                    "success": True,
                    "message": "Container created and started",
                    "container_id": container.short_id
                }

        except APIError as e:
            logger.error(f"Docker API error: {e}")
            self.pull_status = "error"
            self.start_error = f"Docker API error: {str(e)}"
        except Exception as e:
            logger.error(f"Error starting container: {e}")
            self.pull_status = "error"
            self.start_error = f"Error starting container: {str(e)}"

    def stop_container(self):
        """Stop the Unsloth Docker container"""
        client = self._get_client()
        if not client:
            raise Exception("Docker is not available")

        try:
            container = client.containers.get(self.container_name)
            container.stop(timeout=10)
            return {
                "success": True,
                "message": "Container stopped"
            }
        except NotFound:
            return {
                "success": False,
                "message": "Container not found"
            }
        except Exception as e:
            logger.error(f"Error stopping container: {e}")
            raise Exception(f"Error stopping container: {str(e)}")

    def _has_gpu(self):
        """Check if NVIDIA GPU is available"""
        try:
            client = self._get_client()
            if not client:
                return False
            # Try to get Docker info and check for nvidia runtime
            info = client.info()
            runtimes = info.get("Runtimes", {})
            return "nvidia" in runtimes
        except Exception:
            return False

    def _get_work_dir(self):
        """Get the work directory path"""
        from pathlib import Path
        return Path(__file__).parent.parent / "work"

    def get_pull_progress(self):
        """Get current pull progress"""
        total_layers = len(self.pull_progress)
        if total_layers == 0:
            return {
                "status": self.pull_status,
                "progress": 0,
                "message": "Initializing..."
            }

        # Calculate overall progress
        completed = sum(1 for p in self.pull_progress.values()
                       if p['status'] in ['Pull complete', 'Already exists'])
        downloading = sum(1 for p in self.pull_progress.values()
                         if p['status'] == 'Downloading')

        progress_pct = (completed / total_layers * 100) if total_layers > 0 else 0

        return {
            "status": self.pull_status,
            "progress": progress_pct,
            "total_layers": total_layers,
            "completed_layers": completed,
            "downloading_layers": downloading,
            "message": f"Downloading Docker image: {completed}/{total_layers} layers complete"
        }

    def get_available_models(self):
        """Get list of available Unsloth models from any running container"""
        client = self._get_client()
        if not client:
            raise Exception("Docker is not available")

        try:
            # Find ANY running Unsloth container
            running_containers = client.containers.list(
                filters={"ancestor": self.image_name, "status": "running"}
            )

            if not running_containers:
                # Return default models if no container is running
                return self._get_default_models()

            container = running_containers[0]

            # Execute command to parse the mapper.py file from Unsloth package
            # This extracts all model names directly from Unsloth's source code
            exec_result = container.exec_run([
                "bash", "-c",
                'python -c \'import re, json; content = open("/opt/conda/lib/python3.11/site-packages/unsloth/models/mapper.py").read(); models = sorted(set(re.findall(r"\\\"(unsloth/[^\\\"]+)\\\"", content))); print(json.dumps(models))\''
            ], stdout=True, stderr=True)

            if exec_result.exit_code == 0:
                import json
                models = json.loads(exec_result.output.decode('utf-8').strip())
                if models and len(models) > 0:
                    logger.info(f"Found {len(models)} models from Unsloth package")
                    return {"models": models}
                else:
                    logger.warning("No models found in mapper.py, using defaults")
                    return self._get_default_models()
            else:
                logger.warning(f"Failed to get models from container: {exec_result.output.decode('utf-8')}")
                return self._get_default_models()

        except Exception as e:
            logger.error(f"Error getting available models: {e}")
            return self._get_default_models()

    def _get_default_models(self):
        """Return default list of popular Unsloth models"""
        return {
            "models": [
                "unsloth/llama-3.1-8b-bnb-4bit",
                "unsloth/mistral-7b-v0.3-bnb-4bit",
                "unsloth/Qwen2.5-7B-bnb-4bit",
                "unsloth/gemma-2-9b-bnb-4bit",
                "unsloth/Phi-3.5-mini-instruct",
                "unsloth/llama-3.2-1b-instruct-bnb-4bit",
                "unsloth/llama-3.2-3b-instruct-bnb-4bit",
            ]
        }
