import json
from db import db_cursor
from config import DATASET_KEYWORDS

def link_datasets_in_abstract(abstract: str) -> list[dict]:
    found = []
    for name, repo_id in DATASET_KEYWORDS.items():
        if name.lower() in abstract.lower():
            found.append({"name": name, "repo_id": repo_id})
    return found

def run_dataset_linker():
    with db_cursor() as cur:
        cur.execute("SELECT id, abstract FROM papers")
        rows = cur.fetchall()
        for row in rows:
            datasets = link_datasets_in_abstract(row["abstract"])
            cur.execute("UPDATE papers SET referenced_datasets_json=? WHERE id=?",
                        (json.dumps(datasets), row["id"]))
    return {"linked_papers": len(rows)}
