import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class DatasetValidator:
    """Validates datasets for training"""

    COMMON_TEXT_FIELDS = ['text', 'prompt', 'instruction', 'input', 'question', 'content', 'message']

    @staticmethod
    def validate_dataset(file_path: Path) -> Dict:
        """
        Validate a dataset file

        Returns:
            {
                "valid": bool,
                "errors": List[str],
                "warnings": List[str],
                "stats": {
                    "row_count": int,
                    "fields": List[str],
                    "detected_text_field": str,
                    "avg_text_length": float,
                    "min_text_length": int,
                    "max_text_length": int
                },
                "preview": List[Dict]  # First 5 rows
            }
        """
        result = {
            "valid": False,
            "errors": [],
            "warnings": [],
            "stats": {},
            "preview": []
        }

        try:
            # Check file exists
            if not file_path.exists():
                result["errors"].append(f"File not found: {file_path}")
                return result

            # Check file size
            size_mb = file_path.stat().st_size / (1024 * 1024)
            if size_mb > 1000:  # 1GB limit
                result["warnings"].append(f"Large file ({size_mb:.1f}MB) - training may be slow")

            # Parse file based on extension
            if file_path.suffix == '.jsonl':
                return DatasetValidator._validate_jsonl(file_path, result)
            elif file_path.suffix == '.json':
                return DatasetValidator._validate_json(file_path, result)
            elif file_path.suffix == '.csv':
                return DatasetValidator._validate_csv(file_path, result)
            else:
                result["errors"].append(f"Unsupported file format: {file_path.suffix}")
                return result

        except Exception as e:
            logger.error(f"Dataset validation error: {e}", exc_info=True)
            result["errors"].append(f"Validation error: {str(e)}")
            return result

    @staticmethod
    def _validate_jsonl(file_path: Path, result: Dict) -> Dict:
        """Validate JSONL format"""
        rows = []
        text_lengths = []
        fields_set = set()

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for i, line in enumerate(f):
                    if i >= 5:  # Preview first 5 rows
                        # Keep counting for stats
                        try:
                            row = json.loads(line.strip())
                            fields_set.update(row.keys())

                            # Find text field
                            text_field = DatasetValidator._detect_text_field(row)
                            if text_field and isinstance(row[text_field], str):
                                text_lengths.append(len(row[text_field]))
                        except:
                            pass
                        continue

                    # Parse row
                    try:
                        row = json.loads(line.strip())
                    except json.JSONDecodeError as e:
                        result["errors"].append(f"Invalid JSON on line {i+1}: {str(e)}")
                        continue

                    if not isinstance(row, dict):
                        result["errors"].append(f"Line {i+1} is not a JSON object")
                        continue

                    fields_set.update(row.keys())
                    rows.append(row)

                    # Check for text field
                    text_field = DatasetValidator._detect_text_field(row)
                    if text_field and isinstance(row[text_field], str):
                        text_lengths.append(len(row[text_field]))

            row_count = i + 1 if 'i' in locals() else 0

            # Validation checks
            if row_count == 0:
                result["errors"].append("Dataset is empty")
                return result

            if row_count < 10:
                result["warnings"].append(f"Very small dataset ({row_count} examples) - may not train well")

            # Detect text field
            fields = list(fields_set)
            detected_field = DatasetValidator._detect_text_field_from_list(fields)

            if not detected_field:
                result["errors"].append(f"No text field found. Expected one of: {', '.join(DatasetValidator.COMMON_TEXT_FIELDS)}")
                result["errors"].append(f"Found fields: {', '.join(fields)}")
                return result

            # Check text lengths
            if text_lengths:
                avg_length = sum(text_lengths) / len(text_lengths)
                min_length = min(text_lengths)
                max_length = max(text_lengths)

                if avg_length < 10:
                    result["warnings"].append(f"Very short texts (avg {avg_length:.0f} chars) - may not train well")

                if max_length > 4096:
                    result["warnings"].append(f"Some texts very long (max {max_length} chars) - may be truncated")

                result["stats"] = {
                    "row_count": row_count,
                    "fields": fields,
                    "detected_text_field": detected_field,
                    "avg_text_length": round(avg_length, 1),
                    "min_text_length": min_length,
                    "max_text_length": max_length
                }

            result["preview"] = rows
            result["valid"] = len(result["errors"]) == 0

            return result

        except Exception as e:
            result["errors"].append(f"Error reading JSONL file: {str(e)}")
            return result

    @staticmethod
    def _validate_json(file_path: Path, result: Dict) -> Dict:
        """Validate JSON format"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Should be a list of objects
            if not isinstance(data, list):
                result["errors"].append("JSON file must contain an array of objects")
                return result

            if len(data) == 0:
                result["errors"].append("Dataset is empty")
                return result

            # Validate first few items
            fields_set = set()
            text_lengths = []

            for i, item in enumerate(data):
                if not isinstance(item, dict):
                    result["errors"].append(f"Item {i} is not a JSON object")
                    continue

                fields_set.update(item.keys())

                # Find text field
                text_field = DatasetValidator._detect_text_field(item)
                if text_field and isinstance(item[text_field], str):
                    text_lengths.append(len(item[text_field]))

            fields = list(fields_set)
            detected_field = DatasetValidator._detect_text_field_from_list(fields)

            if not detected_field:
                result["errors"].append(f"No text field found. Expected one of: {', '.join(DatasetValidator.COMMON_TEXT_FIELDS)}")
                result["errors"].append(f"Found fields: {', '.join(fields)}")
                return result

            # Stats
            if text_lengths:
                result["stats"] = {
                    "row_count": len(data),
                    "fields": fields,
                    "detected_text_field": detected_field,
                    "avg_text_length": round(sum(text_lengths) / len(text_lengths), 1),
                    "min_text_length": min(text_lengths),
                    "max_text_length": max(text_lengths)
                }

            result["preview"] = data[:5]
            result["valid"] = len(result["errors"]) == 0

            return result

        except json.JSONDecodeError as e:
            result["errors"].append(f"Invalid JSON: {str(e)}")
            return result
        except Exception as e:
            result["errors"].append(f"Error reading JSON file: {str(e)}")
            return result

    @staticmethod
    def _validate_csv(file_path: Path, result: Dict) -> Dict:
        """Validate CSV format"""
        import csv

        try:
            rows = []
            text_lengths = []

            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                fields = reader.fieldnames

                if not fields:
                    result["errors"].append("CSV has no header row")
                    return result

                for i, row in enumerate(reader):
                    if i >= 5:
                        # Continue counting
                        text_field = DatasetValidator._detect_text_field(row)
                        if text_field and isinstance(row[text_field], str):
                            text_lengths.append(len(row[text_field]))
                        continue

                    rows.append(row)
                    text_field = DatasetValidator._detect_text_field(row)
                    if text_field and isinstance(row[text_field], str):
                        text_lengths.append(len(row[text_field]))

                row_count = i + 1 if 'i' in locals() else 0

            detected_field = DatasetValidator._detect_text_field_from_list(fields)

            if not detected_field:
                result["errors"].append(f"No text field found. Expected one of: {', '.join(DatasetValidator.COMMON_TEXT_FIELDS)}")
                result["errors"].append(f"Found fields: {', '.join(fields)}")
                return result

            if text_lengths:
                result["stats"] = {
                    "row_count": row_count,
                    "fields": list(fields),
                    "detected_text_field": detected_field,
                    "avg_text_length": round(sum(text_lengths) / len(text_lengths), 1),
                    "min_text_length": min(text_lengths),
                    "max_text_length": max(text_lengths)
                }

            result["preview"] = rows
            result["valid"] = len(result["errors"]) == 0

            return result

        except Exception as e:
            result["errors"].append(f"Error reading CSV file: {str(e)}")
            return result

    @staticmethod
    def _detect_text_field(row: Dict) -> Optional[str]:
        """Detect which field contains the training text"""
        for field in DatasetValidator.COMMON_TEXT_FIELDS:
            if field in row:
                return field
        return None

    @staticmethod
    def _detect_text_field_from_list(fields: List[str]) -> Optional[str]:
        """Detect text field from list of field names"""
        for field in DatasetValidator.COMMON_TEXT_FIELDS:
            if field in fields:
                return field
        return None
