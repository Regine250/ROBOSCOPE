import re
from pathlib import Path
import pyarrow.parquet as pq

def flatten_nested(data):
    if data is None or len(data) == 0:
        return []
    # If data is a list of lists / arrays
    first = data[0]
    if hasattr(first, "__len__") and not isinstance(first, (str, bytes)):
        n_dims = len(first)
        series = [[] for _ in range(n_dims)]
        for frame in data:
            for d in range(min(n_dims, len(frame))):
                try:
                    val = float(frame[d])
                except (ValueError, TypeError):
                    val = 0.0
                series[d].append(val)
        return series
    else:
        # 1D series
        flat = []
        for frame in data:
            try:
                flat.append(float(frame))
            except (ValueError, TypeError):
                flat.append(0.0)
        return [flat]

def find_episode_file(data_dir: Path, episode_index: int) -> Path | None:
    if not data_dir.exists():
        return None
    candidates = [
        data_dir / f"{episode_index}.parquet",
        data_dir / f"episode_{episode_index}.parquet",
        data_dir / f"episode_{episode_index:06d}.parquet",
        data_dir / f"episode_{episode_index:04d}.parquet",
        data_dir / f"{episode_index:06d}.parquet",
        data_dir / f"{episode_index:04d}.parquet",
    ]
    for cand in candidates:
        if cand.exists():
            return cand
    for pf in data_dir.glob("*.parquet"):
        m = re.search(r'(\d+)', pf.stem)
        if m and int(m.group(1)) == episode_index:
            return pf
    return None

def read_episode_trajectory(dataset_local_path: str, episode_index: int) -> dict:
    data_dir = Path(dataset_local_path) / "data"
    parquet_path = find_episode_file(data_dir, episode_index)
    if not parquet_path or not parquet_path.exists():
        raise FileNotFoundError(f"Episode file not found for index {episode_index} in {data_dir}")

    table = pq.read_table(parquet_path)
    df = table.to_pandas()

    fps = 30.0
    timestamp = df.get("timestamp", df.get("observation.timestamp", None))
    frame_index = df.get("frame_index", None)
    action = df.get("action", None)
    state = df.get("observation.state", None)

    if action is None and state is None:
        for col in df.columns:
            if "action" in col.lower() and action is None:
                action = df[col]
            if "state" in col.lower() and state is None:
                state = df[col]

    timestamps = [float(t) for t in timestamp.tolist()] if timestamp is not None else [float(i) / fps for i in range(len(df))]
    frame_indices = [int(f) for f in frame_index.tolist()] if frame_index is not None else list(range(len(df)))

    action_series = flatten_nested(action.tolist()) if action is not None else []
    state_series = flatten_nested(state.tolist()) if state is not None else []

    series = []
    for i, s in enumerate(action_series):
        series.append({"name": f"action_{i}", "data": s})
    for i, s in enumerate(state_series):
        series.append({"name": f"state_{i}", "data": s})

    return {
        "fps": fps,
        "timestamps": timestamps,
        "frame_indices": frame_indices,
        "series": series,
    }
