import sqlite3
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class Database:
    """SQLite database for training history and model metadata"""

    def __init__(self, db_path: Path = None):
        if db_path is None:
            db_path = Path(__file__).parent.parent / "work" / "slothbuckler.db"

        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        """Initialize database schema"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS training_runs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    model_name TEXT NOT NULL,
                    base_model TEXT NOT NULL,
                    dataset_name TEXT NOT NULL,
                    dataset_path TEXT NOT NULL,
                    output_path TEXT NOT NULL,
                    status TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    completed_at TEXT,
                    config TEXT NOT NULL,
                    final_loss REAL,
                    total_steps INTEGER,
                    checkpoint_path TEXT,
                    error_message TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS training_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id INTEGER NOT NULL,
                    step INTEGER NOT NULL,
                    loss REAL,
                    learning_rate REAL,
                    epoch REAL,
                    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (run_id) REFERENCES training_runs(id)
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS models (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    path TEXT NOT NULL,
                    base_model TEXT NOT NULL,
                    size_bytes INTEGER,
                    training_run_id INTEGER,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT,
                    FOREIGN KEY (training_run_id) REFERENCES training_runs(id)
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS datasets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    path TEXT NOT NULL,
                    size_bytes INTEGER,
                    row_count INTEGER,
                    source TEXT,
                    fields TEXT,
                    validated BOOLEAN DEFAULT 0,
                    validation_errors TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)

            conn.commit()

    # Training Runs
    def create_training_run(self, model_name: str, base_model: str, dataset_name: str,
                           dataset_path: str, output_path: str, config: Dict[str, Any]) -> int:
        """Create a new training run record"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                INSERT INTO training_runs (
                    model_name, base_model, dataset_name, dataset_path,
                    output_path, status, started_at, config
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                model_name,
                base_model,
                dataset_name,
                dataset_path,
                output_path,
                'running',
                datetime.now().isoformat(),
                json.dumps(config)
            ))
            conn.commit()
            return cursor.lastrowid

    def update_training_run(self, run_id: int, **kwargs):
        """Update training run fields"""
        fields = []
        values = []

        for key, value in kwargs.items():
            if key in ['status', 'completed_at', 'final_loss', 'total_steps',
                      'checkpoint_path', 'error_message']:
                fields.append(f"{key} = ?")
                values.append(value)

        if fields:
            values.append(run_id)
            query = f"UPDATE training_runs SET {', '.join(fields)} WHERE id = ?"

            with sqlite3.connect(self.db_path) as conn:
                conn.execute(query, values)
                conn.commit()

    def get_training_run(self, run_id: int) -> Optional[Dict]:
        """Get training run by ID"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT * FROM training_runs WHERE id = ?", (run_id,))
            row = cursor.fetchone()

            if row:
                data = dict(row)
                data['config'] = json.loads(data['config'])
                return data
            return None

    def list_training_runs(self, limit: int = 50) -> List[Dict]:
        """List recent training runs"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT * FROM training_runs
                ORDER BY started_at DESC
                LIMIT ?
            """, (limit,))

            runs = []
            for row in cursor.fetchall():
                data = dict(row)
                data['config'] = json.loads(data['config'])
                runs.append(data)

            return runs

    # Training Metrics
    def add_training_metric(self, run_id: int, step: int, loss: Optional[float] = None,
                           learning_rate: Optional[float] = None, epoch: Optional[float] = None):
        """Add a training metric data point"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO training_metrics (run_id, step, loss, learning_rate, epoch)
                VALUES (?, ?, ?, ?, ?)
            """, (run_id, step, loss, learning_rate, epoch))
            conn.commit()

    def get_training_metrics(self, run_id: int) -> List[Dict]:
        """Get all metrics for a training run"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT * FROM training_metrics
                WHERE run_id = ?
                ORDER BY step ASC
            """, (run_id,))

            return [dict(row) for row in cursor.fetchall()]

    # Models
    def add_model(self, name: str, path: str, base_model: str, size_bytes: int,
                 training_run_id: Optional[int] = None, metadata: Optional[Dict] = None):
        """Add a model to the database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO models (name, path, base_model, size_bytes, training_run_id, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                name,
                path,
                base_model,
                size_bytes,
                training_run_id,
                json.dumps(metadata) if metadata else None
            ))
            conn.commit()

    def get_model(self, name: str) -> Optional[Dict]:
        """Get model by name"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT * FROM models WHERE name = ?", (name,))
            row = cursor.fetchone()

            if row:
                data = dict(row)
                if data['metadata']:
                    data['metadata'] = json.loads(data['metadata'])
                return data
            return None

    def list_models(self) -> List[Dict]:
        """List all models"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT * FROM models ORDER BY created_at DESC")

            models = []
            for row in cursor.fetchall():
                data = dict(row)
                if data['metadata']:
                    data['metadata'] = json.loads(data['metadata'])
                models.append(data)

            return models

    def delete_model(self, name: str):
        """Delete a model from database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("DELETE FROM models WHERE name = ?", (name,))
            conn.commit()

    # Datasets
    def add_dataset(self, name: str, path: str, size_bytes: int, row_count: Optional[int] = None,
                   source: str = 'local', fields: Optional[List[str]] = None,
                   validated: bool = False, validation_errors: Optional[str] = None):
        """Add a dataset to the database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO datasets
                (name, path, size_bytes, row_count, source, fields, validated, validation_errors)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                name,
                path,
                size_bytes,
                row_count,
                source,
                json.dumps(fields) if fields else None,
                validated,
                validation_errors
            ))
            conn.commit()

    def get_dataset(self, name: str) -> Optional[Dict]:
        """Get dataset by name"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT * FROM datasets WHERE name = ?", (name,))
            row = cursor.fetchone()

            if row:
                data = dict(row)
                if data['fields']:
                    data['fields'] = json.loads(data['fields'])
                return data
            return None

    def list_datasets(self) -> List[Dict]:
        """List all datasets"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT * FROM datasets ORDER BY created_at DESC")

            datasets = []
            for row in cursor.fetchall():
                data = dict(row)
                if data['fields']:
                    data['fields'] = json.loads(data['fields'])
                datasets.append(data)

            return datasets
