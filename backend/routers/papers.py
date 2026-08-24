from fastapi import APIRouter, HTTPException, Query
from db import db_cursor
import json

router = APIRouter(prefix="/api/papers", tags=["papers"])

def sanitize_search_query(q: str) -> str:
    special = ['"', "'", ':', '*', '^', '(', ')', 'AND', 'OR', 'NOT', 'NEAR']
    for s in special:
        q = q.replace(s, f'"{s}"')
    return q.strip()

@router.get("")
def list_papers(
    search: str = "",
    category: str = "",
    tag: str = "",
    saved_only: bool = False,
    page: int = 1,
    page_size: int = 20,
):
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    offset = (page - 1) * page_size

    where_clauses = []
    params = []

    if category:
        where_clauses.append("p.primary_category = ?")
        params.append(category)
    if tag:
        where_clauses.append("EXISTS (SELECT 1 FROM paper_tags pt JOIN tags t ON pt.tag_id=t.id WHERE pt.paper_id=p.id AND t.name=?)")
        params.append(tag)
    if saved_only:
        where_clauses.append("EXISTS (SELECT 1 FROM saved_items s WHERE s.item_type='paper' AND s.item_id=p.base_id)")

    where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

    if search:
        sanitized = sanitize_search_query(search)
        base_query = f"""
            SELECT p.*, bm25(papers_fts) as rank
            FROM papers_fts
            JOIN papers p ON p.id = papers_fts.rowid
            WHERE papers_fts MATCH ? AND {where_sql}
            ORDER BY rank
            LIMIT ? OFFSET ?
        """
        params = [sanitized] + params + [page_size, offset]
        with db_cursor() as cur:
            rows = cur.execute(base_query, params).fetchall()
            # Correct total count using a subquery
            count_query = f"""
                SELECT COUNT(*) FROM (
                    SELECT p.id
                    FROM papers_fts
                    JOIN papers p ON p.id = papers_fts.rowid
                    WHERE papers_fts MATCH ? AND {where_sql}
                )
            """
            total = cur.execute(count_query, [sanitized] + params[:-2]).fetchone()[0]
    else:
        base_query = f"""
            SELECT p.* FROM papers p
            WHERE {where_sql}
            ORDER BY p.updated DESC
            LIMIT ? OFFSET ?
        """
        params = params + [page_size, offset]
        with db_cursor() as cur:
            rows = cur.execute(base_query, params).fetchall()
            total = cur.execute(f"SELECT COUNT(*) FROM papers p WHERE {where_sql}", params[:-2]).fetchone()[0]

    papers = []
    for row in rows:
        p = dict(row)
        p["authors"] = json.loads(p["authors_json"])
        p["categories"] = json.loads(p["categories_json"])
        p["referenced_datasets"] = json.loads(p["referenced_datasets_json"])
        for k in ["authors_json", "categories_json", "referenced_datasets_json"]:
            p.pop(k, None)
        papers.append(p)

    return {
        "papers": papers,
        "total": total,
        "page": page,
        "page_size": page_size,
    }

@router.get("/{paper_id}")
def get_paper(paper_id: str):
    with db_cursor() as cur:
        row = cur.execute("SELECT * FROM papers WHERE base_id=?", (paper_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Paper not found")
        p = dict(row)
        p["authors"] = json.loads(p["authors_json"])
        p["categories"] = json.loads(p["categories_json"])
        p["referenced_datasets"] = json.loads(p["referenced_datasets_json"])
        for k in ["authors_json", "categories_json", "referenced_datasets_json"]:
            p.pop(k, None)
        tags = cur.execute("""
            SELECT t.name FROM tags t
            JOIN paper_tags pt ON pt.tag_id = t.id
            WHERE pt.paper_id = ?
        """, (row["id"],)).fetchall()
        p["tags"] = [t["name"] for t in tags]
    return p

@router.post("/{paper_id}/tags/{tag_name}")
def add_tag(paper_id: str, tag_name: str):
    with db_cursor() as cur:
        paper = cur.execute("SELECT id FROM papers WHERE base_id=?", (paper_id,)).fetchone()
        if not paper:
            raise HTTPException(404, "Paper not found")
        tag = cur.execute("SELECT id FROM tags WHERE name=?", (tag_name,)).fetchone()
        if not tag:
            cur.execute("INSERT INTO tags (name) VALUES (?)", (tag_name,))
            tag_id = cur.lastrowid
        else:
            tag_id = tag["id"]
        cur.execute("INSERT OR IGNORE INTO paper_tags (paper_id, tag_id) VALUES (?, ?)", (paper["id"], tag_id))
    return {"ok": True}

@router.delete("/{paper_id}/tags/{tag_name}")
def remove_tag(paper_id: str, tag_name: str):
    with db_cursor() as cur:
        paper = cur.execute("SELECT id FROM papers WHERE base_id=?", (paper_id,)).fetchone()
        if not paper:
            raise HTTPException(404, "Paper not found")
        tag = cur.execute("SELECT id FROM tags WHERE name=?", (tag_name,)).fetchone()
        if tag:
            cur.execute("DELETE FROM paper_tags WHERE paper_id=? AND tag_id=?", (paper["id"], tag["id"]))
    return {"ok": True}
