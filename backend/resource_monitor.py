import docker
import psutil
import logging
from typing import Dict, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class ResourceMonitor:
    """Monitor system resources (GPU, RAM, disk)"""

    def __init__(self, docker_client=None):
        self.docker_client = docker_client or docker.from_env()

    def get_system_resources(self) -> Dict:
        """Get current system resource usage"""
        try:
            return {
                "cpu": self._get_cpu_usage(),
                "ram": self._get_ram_usage(),
                "disk": self._get_disk_usage(),
                "gpu": self._get_gpu_usage()
            }
        except Exception as e:
            logger.error(f"Error getting system resources: {e}")
            return {
                "cpu": {"error": str(e)},
                "ram": {"error": str(e)},
                "disk": {"error": str(e)},
                "gpu": {"error": str(e)}
            }

    def _get_cpu_usage(self) -> Dict:
        """Get CPU usage"""
        try:
            return {
                "percent": psutil.cpu_percent(interval=1),
                "count": psutil.cpu_count(),
                "per_cpu": psutil.cpu_percent(interval=1, percpu=True)
            }
        except Exception as e:
            return {"error": str(e)}

    def _get_ram_usage(self) -> Dict:
        """Get RAM usage"""
        try:
            mem = psutil.virtual_memory()
            return {
                "total_gb": round(mem.total / (1024**3), 2),
                "used_gb": round(mem.used / (1024**3), 2),
                "available_gb": round(mem.available / (1024**3), 2),
                "percent": mem.percent
            }
        except Exception as e:
            return {"error": str(e)}

    def _get_disk_usage(self) -> Dict:
        """Get disk usage for work directory"""
        try:
            work_dir = Path(__file__).parent.parent / "work"
            disk = psutil.disk_usage(str(work_dir))

            return {
                "total_gb": round(disk.total / (1024**3), 2),
                "used_gb": round(disk.used / (1024**3), 2),
                "free_gb": round(disk.free / (1024**3), 2),
                "percent": disk.percent
            }
        except Exception as e:
            return {"error": str(e)}

    def _get_gpu_usage(self) -> Dict:
        """Get GPU usage from Docker container"""
        try:
            # Find running Unsloth container
            containers = self.docker_client.containers.list(
                filters={"ancestor": "unsloth/unsloth", "status": "running"}
            )

            if not containers:
                return {
                    "available": False,
                    "message": "No running container"
                }

            container = containers[0]

            # Run nvidia-smi inside container to get GPU stats
            result = container.exec_run([
                "nvidia-smi",
                "--query-gpu=index,name,temperature.gpu,utilization.gpu,utilization.memory,memory.total,memory.used,memory.free",
                "--format=csv,noheader,nounits"
            ])

            if result.exit_code != 0:
                return {
                    "available": False,
                    "message": "GPU not available or nvidia-smi failed"
                }

            # Parse output
            output = result.output.decode('utf-8').strip()
            if not output:
                return {
                    "available": False,
                    "message": "No GPU data"
                }

            # Parse CSV: index,name,temp,util,mem_util,mem_total,mem_used,mem_free
            parts = output.split(',')
            if len(parts) >= 8:
                return {
                    "available": True,
                    "index": int(parts[0].strip()),
                    "name": parts[1].strip(),
                    "temperature_c": int(parts[2].strip()) if parts[2].strip() else 0,
                    "utilization_percent": int(parts[3].strip()) if parts[3].strip() else 0,
                    "memory_utilization_percent": int(parts[4].strip()) if parts[4].strip() else 0,
                    "memory_total_mb": int(parts[5].strip()) if parts[5].strip() else 0,
                    "memory_used_mb": int(parts[6].strip()) if parts[6].strip() else 0,
                    "memory_free_mb": int(parts[7].strip()) if parts[7].strip() else 0
                }

            return {
                "available": False,
                "message": "Failed to parse GPU data"
            }

        except Exception as e:
            logger.error(f"Error getting GPU usage: {e}")
            return {
                "available": False,
                "error": str(e)
            }

    def get_container_stats(self) -> Optional[Dict]:
        """Get Docker container resource usage"""
        try:
            containers = self.docker_client.containers.list(
                filters={"ancestor": "unsloth/unsloth", "status": "running"}
            )

            if not containers:
                return None

            container = containers[0]
            stats = container.stats(stream=False)

            # Parse Docker stats
            cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                       stats['precpu_stats']['cpu_usage']['total_usage']
            system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                          stats['precpu_stats']['system_cpu_usage']
            cpu_percent = 0.0
            if system_delta > 0:
                cpu_percent = (cpu_delta / system_delta) * 100.0

            memory_usage = stats['memory_stats'].get('usage', 0)
            memory_limit = stats['memory_stats'].get('limit', 1)
            memory_percent = (memory_usage / memory_limit) * 100.0

            return {
                "container_id": container.short_id,
                "container_name": container.name,
                "cpu_percent": round(cpu_percent, 2),
                "memory_usage_mb": round(memory_usage / (1024**2), 2),
                "memory_limit_mb": round(memory_limit / (1024**2), 2),
                "memory_percent": round(memory_percent, 2)
            }

        except Exception as e:
            logger.error(f"Error getting container stats: {e}")
            return None

    def check_resources_adequate(self, dataset_size_mb: float, model_size_gb: float = 8.0) -> Dict:
        """
        Check if system has adequate resources for training

        Returns:
            {
                "adequate": bool,
                "warnings": List[str],
                "recommendations": List[str]
            }
        """
        warnings = []
        recommendations = []

        # Check RAM
        ram = self._get_ram_usage()
        if not isinstance(ram, dict) or 'available_gb' not in ram:
            warnings.append("Could not check RAM availability")
        elif ram['available_gb'] < model_size_gb:
            warnings.append(f"Low RAM: {ram['available_gb']:.1f}GB available, {model_size_gb}GB recommended")
            recommendations.append("Close other applications to free up RAM")

        # Check disk space
        disk = self._get_disk_usage()
        required_disk_gb = (dataset_size_mb / 1024) + model_size_gb * 2  # Dataset + model + output

        if not isinstance(disk, dict) or 'free_gb' not in disk:
            warnings.append("Could not check disk space")
        elif disk['free_gb'] < required_disk_gb:
            warnings.append(f"Low disk space: {disk['free_gb']:.1f}GB available, {required_disk_gb:.1f}GB recommended")
            recommendations.append("Free up disk space before training")

        # Check GPU
        gpu = self._get_gpu_usage()
        if not isinstance(gpu, dict) or not gpu.get('available'):
            warnings.append("GPU not available - training will be very slow on CPU")
            recommendations.append("Install NVIDIA drivers and enable GPU support in Docker")
        elif gpu.get('memory_free_mb', 0) < model_size_gb * 1024:
            warnings.append(f"Low GPU memory: {gpu.get('memory_free_mb', 0)/1024:.1f}GB available")
            recommendations.append("Close other GPU applications or use a smaller model")

        return {
            "adequate": len(warnings) == 0,
            "warnings": warnings,
            "recommendations": recommendations
        }
