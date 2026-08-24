from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "roboscope.db"
DATASETS_DIR = DATA_DIR / "datasets"
DATASETS_DIR.mkdir(exist_ok=True)

# arXiv
ARXIV_CATEGORIES = ["cs.RO", "cs.LG"]
ARXIV_PAGE_SIZE = 100
ARXIV_SLEEP_SECONDS = 3
ARXIV_USER_AGENT = "RoboScope/1.0 (contact: your@email.com)"

# Scheduler
INGESTION_INTERVAL_HOURS = 6

# Dataset keyword → HF repo id mapping
DATASET_KEYWORDS = {
    "Open X-Embodiment": "lerobot/open_x_embodiment",
    "DROID": "droid/droid",
    "RoboMimic": "amandlek/robomimic",
    "ALOHA": "tony-zhao/aloha",
    "Bridge": "rail-berkeley/bridge_data_v2",
    "RT-1": "google-research/rt_1",
    "RT-2": "google-research/rt_2",
    "LeRobot": "lerobot/lerobot",
    "Gym": "lerobot/gym",
}
