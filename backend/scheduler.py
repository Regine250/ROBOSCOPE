from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from ingest.arxiv import run_ingestion
from ingest.linker import run_dataset_linker
from config import INGESTION_INTERVAL_HOURS

scheduler = BackgroundScheduler()

def scheduled_ingestion_job():
    print("Running scheduled arXiv ingestion...")
    results = run_ingestion()
    print(f"Ingestion results: {results}")
    link_results = run_dataset_linker()
    print(f"Dataset linker results: {link_results}")

def start_scheduler():
    scheduler.add_job(
        scheduled_ingestion_job,
        trigger=IntervalTrigger(hours=INGESTION_INTERVAL_HOURS),
        id="arxiv_ingestion",
        replace_existing=True,
    )
    scheduler.start()
    # Run once on startup in background (APScheduler already runs jobs in its own thread pool)
    scheduler.add_job(
        scheduled_ingestion_job,
        id="arxiv_ingestion_startup",
        replace_existing=True,
    )

def shutdown_scheduler():
    scheduler.shutdown()
