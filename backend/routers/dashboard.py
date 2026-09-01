import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from db import db_cursor
from auth import get_optional_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("")
def get_dashboard_summary(current_user: Optional[dict] = Depends(get_optional_current_user)):
    user_id = current_user["id"] if current_user else None

    with db_cursor() as cur:
        # 1. Saved papers (all saved papers for public access, or filtered by user if authenticated)
        if user_id:
            saved_rows = cur.execute("""
                SELECT s.id as saved_id, s.item_type, s.item_id, s.note, s.created_at as saved_at,
                       p.id as paper_db_id, p.base_id, p.title, p.abstract, p.authors_json,
                       p.categories_json, p.primary_category, p.published, p.abs_url, p.pdf_url,
                       p.referenced_datasets_json
                FROM saved_items s
                JOIN papers p ON s.item_type = 'paper' AND s.item_id = p.base_id
                WHERE s.user_id = ?
                ORDER BY s.created_at DESC
            """, (user_id,)).fetchall()
        else:
            saved_rows = cur.execute("""
                SELECT s.id as saved_id, s.item_type, s.item_id, s.note, s.created_at as saved_at,
                       p.id as paper_db_id, p.base_id, p.title, p.abstract, p.authors_json,
                       p.categories_json, p.primary_category, p.published, p.abs_url, p.pdf_url,
                       p.referenced_datasets_json
                FROM saved_items s
                JOIN papers p ON s.item_type = 'paper' AND s.item_id = p.base_id
                ORDER BY s.created_at DESC
            """).fetchall()

        saved_papers = []
        for r in saved_rows:
            p = dict(r)
            p["authors"] = json.loads(p["authors_json"]) if p.get("authors_json") else []
            p["categories"] = json.loads(p["categories_json"]) if p.get("categories_json") else []
            p["referenced_datasets"] = json.loads(p["referenced_datasets_json"]) if p.get("referenced_datasets_json") else []
            for k in ["authors_json", "categories_json", "referenced_datasets_json"]:
                p.pop(k, None)
            
            # Fetch tags for this paper
            tags_rows = cur.execute("""
                SELECT t.name FROM tags t
                JOIN paper_tags pt ON pt.tag_id = t.id
                WHERE pt.paper_id = ?
            """, (p["paper_db_id"],)).fetchall()
            p["tags"] = [t["name"] for t in tags_rows]
            saved_papers.append(p)

        # 2. Datasets summary
        dataset_rows = cur.execute("""
            SELECT repo_id, display_name, status, fps, episode_count, size_bytes, video_keys_json, updated_at
            FROM datasets
            ORDER BY updated_at DESC
        """).fetchall()

        datasets = []
        ready_count = 0
        total_episodes = 0
        for d in dataset_rows:
            item = dict(d)
            item["video_keys"] = json.loads(item["video_keys_json"]) if item.get("video_keys_json") else []
            item.pop("video_keys_json", None)
            if item["status"] == "ready":
                ready_count += 1
                total_episodes += (item["episode_count"] or 0)
            datasets.append(item)

        # 3. Tags with usage count
        tags_rows = cur.execute("""
            SELECT t.name, COUNT(pt.paper_id) as usage_count
            FROM tags t
            LEFT JOIN paper_tags pt ON pt.tag_id = t.id
            GROUP BY t.id, t.name
            ORDER BY usage_count DESC, t.name ASC
        """).fetchall()
        tags = [dict(t) for t in tags_rows]

        # 4. Total papers indexed & category breakdown
        total_papers = cur.execute("SELECT COUNT(*) FROM papers").fetchone()[0]
        category_rows = cur.execute("""
            SELECT primary_category, COUNT(*) as count
            FROM papers
            WHERE primary_category IS NOT NULL AND primary_category != ''
            GROUP BY primary_category
            ORDER BY count DESC
            LIMIT 6
        """).fetchall()
        category_breakdown = [dict(c) for c in category_rows]

        # 5. Ingestion metadata
        last_ingest = cur.execute("SELECT value FROM meta WHERE key='last_ingestion'").fetchone()
        last_result = cur.execute("SELECT value FROM meta WHERE key='last_ingestion_result'").fetchone()

    return {
        "status": "success",
        "user": current_user,
        "kpis": {
            "saved_papers_count": len(saved_papers),
            "ready_datasets_count": ready_count,
            "total_datasets_count": len(datasets),
            "total_episodes_available": total_episodes,
            "tags_count": len(tags),
            "total_papers_indexed": total_papers,
        },
        "saved_papers": saved_papers,
        "datasets": datasets,
        "tags": tags,
        "category_breakdown": category_breakdown,
        "sync_info": {
            "last_ingestion": last_ingest["value"] if last_ingest else None,
            "last_result": json.loads(last_result["value"]) if last_result and last_result["value"] else None,
        }
    }
