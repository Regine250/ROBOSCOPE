from fastapi import APIRouter
from db import db_cursor

router = APIRouter(prefix="/api/tags", tags=["tags"])

@router.get("")
def list_tags():
    with db_cursor() as cur:
        rows = cur.execute("SELECT name FROM tags ORDER BY name").fetchall()
    return {"tags": [r["name"] for r in rows]}

@router.post("")
def create_tag(name: str):
    with db_cursor() as cur:
        cur.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (name,))
    return {"ok": True}

@router.delete("/{name}")
def delete_tag(name: str):
    with db_cursor() as cur:
        cur.execute("DELETE FROM tags WHERE name=?", (name,))
    return {"ok": True}
