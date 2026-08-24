import re
import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
import pyarrow.parquet as pq

from db import db_cursor
from datasets.download import download_dataset as run_download_dataset
from datasets.trajectory import read_episode_trajectory

router = APIRouter(prefix="/api/datasets", tags=["datasets"])

class DownloadRequest(BaseModel):
    repo_id: str

def extract_episode_index(filename: Path) -> Optional[int]:
    m = re.search(r'(\d+)', filename.stem)
    return int(m.group(1)) if m else None

@router.get("")
def list_datasets():
    with db_cursor() as cur:
        rows = cur.execute("SELECT * FROM datasets ORDER BY created_at DESC").fetchall()
    datasets = []
    for r in rows:
        d = dict(r)
        d["schema"] = json.loads(d["schema_json"]) if d["schema_json"] else {}
        d["video_keys"] = json.loads(d["video_keys_json"]) if d["video_keys_json"] else []
        d.pop("schema_json", None)
        d.pop("video_keys_json", None)
        datasets.append(d)
    return {"datasets": datasets}

@router.post("/download")
def download_dataset_endpoint(
    background_tasks: BackgroundTasks,
    payload: Optional[DownloadRequest] = None,
    repo_id: Optional[str] = Query(None),
):
    target_repo = None
    if payload and payload.repo_id:
        target_repo = payload.repo_id.strip()
    elif repo_id:
        target_repo = repo_id.strip()

    if not target_repo:
        raise HTTPException(status_code=400, detail="Missing repo_id")

    # Mark as downloading in DB immediately
    with db_cursor() as cur:
        cur.execute("""
            INSERT INTO datasets (repo_id, display_name, status) VALUES (?, ?, 'downloading')
            ON CONFLICT(repo_id) DO UPDATE SET status='downloading', updated_at=CURRENT_TIMESTAMP
        """, (target_repo, target_repo.split("/")[-1]))

    # Queue background task
    background_tasks.add_task(run_download_dataset, target_repo)
    return {"status": "downloading", "repo_id": target_repo}

@router.get("/{repo_id:path}/episodes/{episode_index}/trajectory")
def get_trajectory(repo_id: str, episode_index: int):
    with db_cursor() as cur:
        ds = cur.execute("SELECT * FROM datasets WHERE repo_id=?", (repo_id,)).fetchone()
    if not ds or ds["status"] != "ready":
        raise HTTPException(404, "Dataset not ready or not found")
    local_path = ds["local_path"]
    try:
        traj = read_episode_trajectory(local_path, episode_index)
        traj["fps"] = ds["fps"] if ds["fps"] else traj["fps"]
        return traj
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error reading trajectory: {e}")

@router.get("/{repo_id:path}/episodes/{episode_index}/video")
def stream_video(
    repo_id: str,
    episode_index: int,
    camera: Optional[str] = None,
    key: Optional[str] = None,
):
    video_key = key or camera or "observation.images.front"
    with db_cursor() as cur:
        ds = cur.execute("SELECT * FROM datasets WHERE repo_id=?", (repo_id,)).fetchone()
    if not ds or ds["status"] != "ready":
        raise HTTPException(404, "Dataset not ready or not found")
    
    local_path = Path(ds["local_path"])
    # Look for video in local_path / videos / episode / video_key.mp4 or local_path / videos / ...
    candidates = [
        local_path / "videos" / str(episode_index) / f"{video_key}.mp4",
        local_path / "videos" / f"episode_{episode_index}" / f"{video_key}.mp4",
        local_path / "videos" / f"episode_{episode_index:06d}" / f"{video_key}.mp4",
        local_path / "videos" / str(episode_index) / "video.mp4",
    ]
    video_path = None
    for cand in candidates:
        if cand.exists():
            video_path = cand
            break

    if not video_path or not video_path.exists():
        # Search inside episode folder if exists
        ep_dir = local_path / "videos" / str(episode_index)
        if ep_dir.exists():
            mp4s = list(ep_dir.glob("*.mp4"))
            if mp4s:
                video_path = mp4s[0]

    if not video_path or not video_path.exists():
        raise HTTPException(404, f"Video file not found for episode {episode_index} with key {video_key}")

    return FileResponse(video_path, media_type="video/mp4", filename=video_path.name)

@router.get("/{repo_id:path}/episodes")
def list_episodes(repo_id: str):
    with db_cursor() as cur:
        ds = cur.execute("SELECT * FROM datasets WHERE repo_id=?", (repo_id,)).fetchone()
    if not ds or ds["status"] != "ready":
        raise HTTPException(404, "Dataset not ready or not found")
    
    local_path = Path(ds["local_path"])
    data_dir = local_path / "data"
    if not data_dir.exists():
        return {"episodes": []}

    episodes = []
    parquet_files = sorted(
        data_dir.glob("*.parquet"),
        key=lambda f: extract_episode_index(f) if extract_episode_index(f) is not None else 999999
    )
    for pf in parquet_files:
        idx = extract_episode_index(pf)
        if idx is None:
            continue
        try:
            parquet_file = pq.ParquetFile(pf)
            num_rows = parquet_file.metadata.num_rows
        except Exception:
            num_rows = 0
        episodes.append({
            "episode_index": idx,
            "length": num_rows,
            "task": f"Episode {idx}",
            "video_keys": json.loads(ds["video_keys_json"]) if ds["video_keys_json"] else ["observation.images.front"],
        })
    return {"episodes": episodes}

@router.get("/{repo_id:path}")
def get_dataset(repo_id: str):
    with db_cursor() as cur:
        row = cur.execute("SELECT * FROM datasets WHERE repo_id=?", (repo_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Dataset not found")
    d = dict(row)
    d["schema"] = json.loads(d["schema_json"]) if d["schema_json"] else {}
    d["video_keys"] = json.loads(d["video_keys_json"]) if d["video_keys_json"] else []
    d.pop("schema_json", None)
    d.pop("video_keys_json", None)
    return d
