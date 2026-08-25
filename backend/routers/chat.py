import os
import json
import re
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Body
from pydantic import BaseModel
from db import db_cursor
from auth import get_optional_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatMessage(BaseModel):
    role: str  # 'user' | 'assistant' | 'system'
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

def search_relevant_papers(query: str, limit: int = 4) -> List[Dict[str, Any]]:
    # Extract keywords from query
    words = [w.lower() for w in re.findall(r'\b[a-zA-Z0-9_\-\.]{3,}\b', query)]
    stopwords = {"what", "when", "where", "which", "who", "whom", "this", "that", "these", "those",
                 "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
                 "having", "do", "does", "did", "doing", "would", "should", "could", "ought",
                 "tell", "show", "find", "list", "about", "latest", "papers", "paper", "research", "robot", "robotics"}
    keywords = [w for w in words if w not in stopwords]
    
    with db_cursor() as cur:
        if keywords:
            search_clause = " OR ".join(["title LIKE ? OR abstract LIKE ? OR primary_category LIKE ?" for _ in keywords])
            params = []
            for kw in keywords:
                params.extend([f"%{kw}%", f"%{kw}%", f"%{kw}%"])
            
            sql = f"""
                SELECT id, base_id, title, abstract, authors_json, primary_category, published, abs_url, pdf_url, referenced_datasets_json
                FROM papers
                WHERE {search_clause}
                ORDER BY published DESC
                LIMIT ?
            """
            params.append(limit)
            rows = cur.execute(sql, tuple(params)).fetchall()
        else:
            # Fallback to recent papers
            rows = cur.execute("""
                SELECT id, base_id, title, abstract, authors_json, primary_category, published, abs_url, pdf_url, referenced_datasets_json
                FROM papers
                ORDER BY published DESC
                LIMIT ?
            """, (limit,)).fetchall()

        results = []
        for r in rows:
            item = dict(r)
            item["authors"] = json.loads(item["authors_json"]) if item.get("authors_json") else []
            item["referenced_datasets"] = json.loads(item["referenced_datasets_json"]) if item.get("referenced_datasets_json") else []
            item.pop("authors_json", None)
            item.pop("referenced_datasets_json", None)
            results.append(item)
        return results

def get_datasets_context() -> List[Dict[str, Any]]:
    with db_cursor() as cur:
        rows = cur.execute("""
            SELECT repo_id, display_name, status, fps, episode_count, size_bytes
            FROM datasets
            ORDER BY updated_at DESC
        """).fetchall()
        return [dict(r) for r in rows]

def generate_intelligent_response(user_msg: str, papers: List[Dict[str, Any]], datasets: List[Dict[str, Any]], user: Optional[dict] = None) -> str:
    msg_lower = user_msg.lower()
    
    # 1. Greetings & Help
    if any(greet in msg_lower for greet in ["hello", "hi", "hey", "who are you", "what can you do", "help me"]):
        username_greeting = f", **{user['username']}**" if user else ""
        return (
            f"Hello{username_greeting}! 👋 I am **RoboChat**, your AI Research Assistant for **RoboScope**.\n\n"
            f"Here is how I can assist you today:\n"
            f"- 📑 **arXiv Robotics Research**: Ask me to search or explain papers on *Diffusion Policy, Imitation Learning, Actuators, VLA models, or Manipulation*.\n"
            f"- 🤖 **Embodied AI Datasets**: Ask about available datasets (e.g. `lerobot/pusht`, `aloha_mobile`), episode frame counts, and FPS.\n"
            f"- 🎬 **Trajectory Visualizer**: Ask how to inspect multi-camera video feeds synchronized with robotic action/state timelines.\n"
            f"- 📊 **Personal Research Dashboard**: Ask about your bookmarked research and taxonomy tags.\n\n"
            f"💡 *Try asking: \"What are the latest robotics papers?\" or \"Explain the PushT dataset.\"*"
        )

    # 2. Dataset Specific Queries
    if any(term in msg_lower for term in ["dataset", "datasets", "pusht", "aloha", "lerobot", "episodes", "telemetry"]):
        matching_ds = [d for d in datasets if any(k in d["repo_id"].lower() or k in (d.get("display_name") or "").lower() for k in msg_lower.split())]
        if not matching_ds:
            matching_ds = datasets[:3]
        
        response = "🤖 **Embodied AI Datasets in RoboScope:**\n\n"
        for ds in matching_ds:
            status_emoji = "✅ Ready" if ds["status"] == "ready" else f"⏳ {ds['status'].capitalize()}"
            response += (
                f"- **{ds['display_name'] or ds['repo_id']}** (`{ds['repo_id']}`)\n"
                f"  - **Status**: {status_emoji}\n"
                f"  - **Episodes**: {ds.get('episode_count') or 'N/A'} recordings @ {ds.get('fps') or 30} FPS\n"
                f"  - **Interactive Viewer**: [Open Dataset Viewer](/datasets/{ds['repo_id']})\n\n"
            )
        response += (
            "💡 *Tip: Click any dataset in the [Dataset Catalog](/datasets) to view synchronized multi-camera MP4 streams and uPlot state scrubbers!*"
        )
        return response

    # 3. How to use / trajectory synchronization query
    if any(term in msg_lower for term in ["how to use", "trajectory", "scrubber", "sync", "video player", "how it works"]):
        return (
            "⚡ **How RoboScope's Synced Trajectory Explorer Works:**\n\n"
            "1. **Multi-Camera Playback**: We stream synchronized MP4 video recordings from multiple robot vantage points (e.g. *front*, *wrist*, *overhead*).\n"
            "2. **Real-time Telemetry Scrubbing**: As the video plays, `uPlot` draws a dynamic vertical cursor across high-frequency sensor readings (joint positions, velocities, actions).\n"
            "3. **Frame-by-Frame Stepping**: Use the **`-1 Frame`** / **`+1 Frame`** buttons to inspect individual sub-millisecond robot motions.\n"
            "4. **Playback Speed**: Adjust speed from `0.5x` up to `2.0x` for fast scanning or precision motion inspection.\n\n"
            "👉 Try it now on the [PushT Dataset Viewer](/datasets/lerobot/pusht)!"
        )

    # 4. Research Papers Search Results
    if papers:
        response = f"📑 Here are the most relevant **Robotics & AI research papers** matching your query:\n\n"
        for idx, p in enumerate(papers, 1):
            authors_str = ", ".join(p["authors"][:3]) + (f" +{len(p['authors']) - 3} more" if len(p["authors"]) > 3 else "")
            abstract_snippet = p["abstract"][:180].strip().replace("\n", " ") + "..."
            cat_badge = f"`{p['primary_category']}`" if p.get('primary_category') else ""
            
            response += f"**{idx}. [{p['title']}]({p.get('abs_url') or 'https://arxiv.org/abs/' + p['base_id']})** {cat_badge}\n"
            if authors_str:
                response += f"   *Authors:* {authors_str}\n"
            response += f"   *Summary:* {abstract_snippet}\n"
            if p.get("pdf_url"):
                response += f"   🔗 [Read PDF]({p['pdf_url']}) | [arXiv Abs]({p.get('abs_url') or 'https://arxiv.org/abs/' + p['base_id']})\n"
            response += "\n"
            
        response += "💡 *You can bookmark any of these papers directly in the [Paper Feed](/) to save them to your [Personal Dashboard](/dashboard)!*"
        return response

    # 5. Default Fallback
    return (
        f"🤖 I searched the RoboScope database for: *\"{user_msg}\"*.\n\n"
        f"I specialize in:\n"
        f"1. **arXiv Robotics Papers** (e.g. search for *'imitation learning'*, *'diffusion policy'*, or *'manipulation'*).\n"
        f"2. **Embodied AI Datasets** (e.g. *'show PushT dataset'*, *'list all episodes'*).\n"
        f"3. **Trajectory & Telemetry Analysis**.\n\n"
        f"Would you like me to show you the latest research from arXiv or explore downloaded datasets?"
    )

@router.post("")
def chat_endpoint(
    req: ChatRequest,
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    user_message = req.message.strip()
    if not user_message:
        return {"response": "Please enter a question or topic to research!"}

    # Context retrieval
    matched_papers = search_relevant_papers(user_message, limit=3)
    datasets = get_datasets_context()

    # Generate response
    reply = generate_intelligent_response(user_message, matched_papers, datasets, user=current_user)

    return {
        "status": "success",
        "response": reply,
        "matched_papers": matched_papers,
        "datasets": datasets[:3],
    }
