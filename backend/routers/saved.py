from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from db import db_cursor
from auth import get_optional_current_user

router = APIRouter(prefix="/api/saved", tags=["saved"])

@router.get("")
def list_saved(current_user: Optional[dict] = Depends(get_optional_current_user)):
    user_id = current_user["id"] if current_user else None

    where_clause = "WHERE s.user_id = ?" if user_id else ""
    params = [user_id] if user_id else []

    with db_cursor() as cur:
        rows = cur.execute(f"""
            SELECT s.id, s.item_type, s.item_id, s.note, s.created_at,
                   CASE 
                       WHEN s.item_type='paper' THEN p.title
                       WHEN s.item_type='dataset' THEN d.display_name
                       WHEN s.item_type='episode' THEN d2.display_name || ' Episode ' || substr(s.item_id, instr(s.item_id, '/')+1)
                   END as display_title,
                   CASE 
                       WHEN s.item_type='paper' THEN p.abs_url
                       ELSE NULL
                   END as url
            FROM saved_items s
            LEFT JOIN papers p ON s.item_type='paper' AND s.item_id = p.base_id
            LEFT JOIN datasets d ON s.item_type='dataset' AND s.item_id = d.repo_id
            LEFT JOIN datasets d2 ON s.item_type='episode' AND s.item_id LIKE d2.repo_id || '/%'
            {where_clause}
            ORDER BY s.created_at DESC
        """, params).fetchall()
    saved = [dict(r) for r in rows]
    return {"saved": saved}

@router.post("")
def add_saved(
    item_type: str,
    item_id: str,
    note: str = "",
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    if item_type not in ("paper", "dataset", "episode"):
        raise HTTPException(400, "Invalid item_type")

    user_id = current_user["id"] if current_user else None

    with db_cursor() as cur:
        # Check if already saved by this user
        if user_id:
            existing = cur.execute(
                "SELECT id FROM saved_items WHERE user_id = ? AND item_type = ? AND item_id = ?",
                (user_id, item_type, item_id)
            ).fetchone()
            if existing:
                cur.execute(
                    "UPDATE saved_items SET note = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (note, existing["id"])
                )
            else:
                cur.execute(
                    "INSERT INTO saved_items (user_id, item_type, item_id, note) VALUES (?, ?, ?, ?)",
                    (user_id, item_type, item_id, note)
                )
        else:
            existing = cur.execute(
                "SELECT id FROM saved_items WHERE user_id IS NULL AND item_type = ? AND item_id = ?",
                (item_type, item_id)
            ).fetchone()
            if existing:
                cur.execute(
                    "UPDATE saved_items SET note = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (note, existing["id"])
                )
            else:
                cur.execute(
                    "INSERT INTO saved_items (user_id, item_type, item_id, note) VALUES (NULL, ?, ?, ?)",
                    (item_type, item_id, note)
                )

    return {"ok": True}

@router.delete("/{item_type}/{item_id}")
def remove_saved(
    item_type: str,
    item_id: str,
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    user_id = current_user["id"] if current_user else None
    with db_cursor() as cur:
        if user_id:
            cur.execute(
                "DELETE FROM saved_items WHERE user_id = ? AND item_type = ? AND item_id = ?",
                (user_id, item_type, item_id)
            )
        else:
            cur.execute(
                "DELETE FROM saved_items WHERE item_type = ? AND item_id = ?",
                (item_type, item_id)
            )
    return {"ok": True}
