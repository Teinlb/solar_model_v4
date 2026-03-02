from __future__ import annotations

import csv
from pathlib import Path
from typing import List, Tuple


def load_drive_cycle(ref: str) -> List[Tuple[float, float, float]]:
    """Load a drive-cycle CSV from the default_data directory.

    The CSV is expected to have at least two columns:
    1. time (seconds)
    2. speed (m/s)
    3. acceleration (m/s^2) - optional, defaults to 0.0 if missing

    The reference path is resolved relative to ``default_data`` so callers
    can simply pass paths like ``"drivecycles/WLTP.csv"`` as appears in the
    configuration presets.  An exception is raised if the file cannot be
    found or parsed.
    """

    base_dir = Path(__file__).parent.parent.parent / "default_data"
    csv_path = (base_dir / ref).resolve()

    if not csv_path.exists():
        raise FileNotFoundError(f"Drive cycle file '{ref}' not found at {csv_path}")

    data: List[Tuple[float, float, float]] = []
    with csv_path.open(newline="") as f:
        reader = csv.reader(f)
        for row in reader:
            if not row or row[0].startswith("#"):
                continue
            # allow rows with or without acceleration column
            time = float(row[0])
            speed = float(row[1])
            accel = float(row[2]) if len(row) > 2 and row[2] != "" else 0.0
            data.append((time, speed, accel))

    if not data:
        raise ValueError(f"Drive cycle file '{ref}' appears to be empty")

    return data
