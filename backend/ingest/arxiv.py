import time
import re
import json
import feedparser
import requests
from datetime import datetime, timezone
from db import db_cursor
from config import ARXIV_CATEGORIES, ARXIV_PAGE_SIZE, ARXIV_SLEEP_SECONDS, ARXIV_USER_AGENT

ARXIV_API_URL = "http://export.arxiv.org/api/query"

def fetch_arxiv_page(start, max_results):
    params = {
        "search_query": " OR ".join(f"cat:{cat}" for cat in ARXIV_CATEGORIES),
        "sortBy": "submittedDate",
        "sortOrder": "descending",
        "start": start,
        "max_results": max_results,
    }
    headers = {"User-Agent": ARXIV_USER_AGENT}
    for attempt in range(3):
        try:
            resp = requests.get(ARXIV_API_URL, params=params, headers=headers, timeout=30)
            if resp.status_code == 200:
                return feedparser.parse(resp.content)
            else:
                print(f"arXiv API returned status {resp.status_code}, retrying...")
        except requests.RequestException as e:
            print(f"Request failed: {e}, retrying...")
        time.sleep(ARXIV_SLEEP_SECONDS * (attempt + 1))
    return None

def extract_arxiv_id(entry_id: str) -> tuple[str, int]:
    m = re.search(r"(\d{4}\.\d{4,5})(v(\d+))?", entry_id)
    if not m:
        base = entry_id.split("/abs/")[-1]
        parts = base.split("v")
        base_id = parts[0]
        version = int(parts[1]) if len(parts) > 1 else 1
        return base_id, version
    base_id = m.group(1)
    version = int(m.group(3)) if m.group(3) else 1
    return base_id, version

def normalize_entry(entry):
    base_id, version = extract_arxiv_id(entry.id)
    authors = [a.name for a in entry.get("authors", [])]
    categories = [t.term for t in entry.get("tags", []) if t.term.startswith("cs.") or t.term.startswith("stat.")]
    primary = entry.get("arxiv_primary_category", {}).get("term", categories[0] if categories else "")
    return {
        "base_id": base_id,
        "version": version,
        "title": entry.title.strip(),
        "abstract": entry.summary.strip(),
        "authors_json": json.dumps(authors),
        "categories_json": json.dumps(categories),
        "primary_category": primary,
        "published": entry.published,
        "updated": entry.updated,
        "abs_url": entry.link,
        "pdf_url": entry.link.replace("/abs/", "/pdf/") + ".pdf",
        "referenced_datasets_json": "[]",
    }

def store_paper(paper):
    with db_cursor() as cur:
        cur.execute("SELECT id, version FROM papers WHERE base_id = ?", (paper["base_id"],))
        row = cur.fetchone()
        if row is None:
            cur.execute("""
                INSERT INTO papers (base_id, version, title, abstract, authors_json,
                                    categories_json, primary_category, published, updated,
                                    abs_url, pdf_url, referenced_datasets_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                paper["base_id"], paper["version"], paper["title"], paper["abstract"],
                paper["authors_json"], paper["categories_json"], paper["primary_category"],
                paper["published"], paper["updated"], paper["abs_url"], paper["pdf_url"],
                paper["referenced_datasets_json"]
            ))
            return "inserted"
        elif row["version"] < paper["version"]:
            cur.execute("""
                UPDATE papers SET version=?, title=?, abstract=?, authors_json=?,
                       categories_json=?, primary_category=?, published=?, updated=?,
                       abs_url=?, pdf_url=?
                WHERE base_id=?
            """, (
                paper["version"], paper["title"], paper["abstract"], paper["authors_json"],
                paper["categories_json"], paper["primary_category"], paper["published"],
                paper["updated"], paper["abs_url"], paper["pdf_url"], paper["base_id"]
            ))
            return "updated"
        return "skipped"

def run_ingestion(max_pages=None):
    results = {"inserted": 0, "updated": 0, "skipped": 0, "errors": 0}
    start = 0
    total_results = None
    pages_fetched = 0

    while True:
        if max_pages is not None and pages_fetched >= max_pages:
            break

        feed = fetch_arxiv_page(start, ARXIV_PAGE_SIZE)
        pages_fetched += 1

        if feed is None:
            print("Failed to fetch arXiv feed, stopping.")
            break

        try:
            total_results = int(feed.feed.opensearch_totalresults)
        except (AttributeError, ValueError):
            total_results = None

        entries = feed.entries
        if not entries:
            if total_results is not None and start >= total_results:
                break
            time.sleep(ARXIV_SLEEP_SECONDS * 2)
            continue

        for entry in entries:
            try:
                paper = normalize_entry(entry)
                status = store_paper(paper)
                results[status] += 1
            except Exception as e:
                print(f"Error processing entry: {e}")
                results["errors"] += 1

        if total_results is not None and start + len(entries) >= total_results:
            break

        start += ARXIV_PAGE_SIZE
        time.sleep(ARXIV_SLEEP_SECONDS)

    with db_cursor() as cur:
        cur.execute("""
            INSERT INTO meta (key, value) VALUES ('last_ingestion', ?)
            ON CONFLICT(key) DO UPDATE SET value=?
        """, (datetime.now(timezone.utc).isoformat(), datetime.now(timezone.utc).isoformat()))
        cur.execute("""
            INSERT INTO meta (key, value) VALUES ('last_ingestion_result', ?)
            ON CONFLICT(key) DO UPDATE SET value=?
        """, (json.dumps(results), json.dumps(results)))
    return results
