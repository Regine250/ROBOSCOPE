from fastapi import APIRouter, BackgroundTasks
from ingest.arxiv import run_ingestion
from ingest.linker import run_dataset_linker
from db import db_cursor
import json

router = APIRouter(prefix="/api/ingest", tags=["ingest"])

@router.post("/run")
def run_ingestion_now(background_tasks: BackgroundTasks):
    def job():
        results = run_ingestion()
        link_results = run_dataset_linker()
        print(f"Ingestion results: {results}, Linker results: {link_results}")
        with db_cursor() as cur:
            cur.execute("""
                INSERT INTO meta (key, value) VALUES ('last_manual_ingestion_result', ?)
                ON CONFLICT(key) DO UPDATE SET value=?
            """, (json.dumps({"ingestion": results, "linker": link_results}),
                  json.dumps({"ingestion": results, "linker": link_results})))
    background_tasks.add_task(job)
    return {"status": "started"}

@router.get("/status")
def ingestion_status():
    with db_cursor() as cur:
        last = cur.execute("SELECT value FROM meta WHERE key='last_ingestion'").fetchone()
        result = cur.execute("SELECT value FROM meta WHERE key='last_ingestion_result'").fetchone()
        manual = cur.execute("SELECT value FROM meta WHERE key='last_manual_ingestion_result'").fetchone()
        count = cur.execute("SELECT COUNT(*) FROM papers").fetchone()[0]
    return {
        "last_ingestion": last["value"] if last else None,
        "last_result": json.loads(result["value"]) if result and result["value"] else None,
        "last_manual_result": json.loads(manual["value"]) if manual and manual["value"] else None,
        "paper_count": count,
    }
