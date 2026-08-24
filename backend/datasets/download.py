import json
from pathlib import Path
from huggingface_hub import snapshot_download
from config import DATASETS_DIR
from db import db_cursor

def download_dataset(repo_id: str):
    repo_id = repo_id.strip()
    with db_cursor() as cur:
        cur.execute("""
            INSERT INTO datasets (repo_id, display_name, status) VALUES (?, ?, 'downloading')
            ON CONFLICT(repo_id) DO UPDATE SET status='downloading', updated_at=CURRENT_TIMESTAMP
        """, (repo_id, repo_id.split("/")[-1]))

    local_dir = DATASETS_DIR / repo_id.replace("/", "_")
    local_dir.mkdir(parents=True, exist_ok=True)

    try:
        snapshot_download(
            repo_id=repo_id,
            repo_type="dataset",
            local_dir=str(local_dir),
        )
        metadata = parse_metadata(local_dir)
        total_size = 0
        try:
            total_size = sum(f.stat().st_size for f in local_dir.rglob("*") if f.is_file())
        except Exception:
            pass

        with db_cursor() as cur:
            cur.execute("""
                UPDATE datasets SET status='ready', local_path=?, display_name=?, fps=?, episode_count=?,
                       schema_json=?, video_keys_json=?, size_bytes=?, updated_at=CURRENT_TIMESTAMP
                WHERE repo_id=?
            """, (
                str(local_dir),
                metadata.get("display_name", repo_id.split("/")[-1]),
                metadata.get("fps", 30),
                metadata.get("episode_count", 0),
                json.dumps(metadata.get("schema", {})),
                json.dumps(metadata.get("video_keys", [])),
                total_size,
                repo_id,
            ))
    except Exception as e:
        print(f"Error downloading dataset {repo_id}: {e}")
        with db_cursor() as cur:
            cur.execute("UPDATE datasets SET status='error', updated_at=CURRENT_TIMESTAMP WHERE repo_id=?", (repo_id,))
        raise

def parse_metadata(local_dir: Path) -> dict:
    meta = {}
    info_candidates = [
        local_dir / "meta" / "info.json",
        local_dir / "meta_data" / "info.json",
        local_dir / "info.json",
        local_dir / "meta" / "info_v2.json",
    ]
    for cand in info_candidates:
        if cand.exists():
            try:
                with open(cand, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                break
            except Exception:
                pass

    if not meta:
        data_dir = local_dir / "data"
        videos_dir = local_dir / "videos"
        meta = {}
        if data_dir.exists():
            meta["episode_count"] = len(list(data_dir.glob("*.parquet")))
        else:
            meta["episode_count"] = 0
        video_keys = []
        if videos_dir.exists():
            for ep_dir in videos_dir.iterdir():
                if ep_dir.is_dir():
                    for video_file in ep_dir.glob("*.mp4"):
                        video_keys.append(video_file.stem)
                        break
                    if video_keys:
                        break
        meta["video_keys"] = list(set(video_keys)) if video_keys else ["observation.images.front"]
        meta["fps"] = 30
        meta["schema"] = {}
        return meta

    meta.setdefault("fps", 30)
    meta.setdefault("schema", {})
    meta.setdefault("video_keys", [])

    if "features" in meta and isinstance(meta["features"], list):
        video_keys = []
        for feat in meta["features"]:
            if isinstance(feat, dict) and feat.get("dtype") == "video":
                video_keys.append(feat["name"])
        if video_keys:
            meta["video_keys"] = video_keys

    if not meta["video_keys"]:
        videos_dir = local_dir / "videos"
        if videos_dir.exists():
            found = set()
            for ep_dir in videos_dir.iterdir():
                if ep_dir.is_dir():
                    for video_file in ep_dir.glob("*.mp4"):
                        found.add(video_file.stem)
                        break
            meta["video_keys"] = list(found) if found else ["observation.images.front"]

    data_dir = local_dir / "data"
    if data_dir.exists():
        meta["episode_count"] = len(list(data_dir.glob("*.parquet")))
    elif "episode_count" not in meta:
        meta["episode_count"] = 0

    return meta
