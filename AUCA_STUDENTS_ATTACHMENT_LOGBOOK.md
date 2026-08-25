# ADVENTIST UNIVERSITY OF CENTRAL AFRICA (AUCA)
## Faculty of Information Technology
### STUDENTS' ATTACHMENT LOGBOOK & REPORT

---

## FORM I: ATTACHMENT PLACEMENT & PERSONAL DETAILS

* **Student Name:** Regine PACIS
* **Student ID:** ______________________
* **Faculty:** Faculty of Information Technology
* **Department:** Software Engineering / Information Technology
* **Academic Year:** 2025 / 2026
* **Course Code:** INAT 353 Industrial Attachment

### HOST ORGANIZATION / PROJECT DETAILS
* **Host Organization / Project:** RoboScope Engineering Team
* **Project Title:** RoboScope — Robotics Research & Embodied AI Trajectory Explorer
* **Department / Unit:** Full-Stack & Cloud Systems Engineering
* **Location / Address:** Kigali, Rwanda
* **Industry Supervisor:** Lead Software Engineer
* **Supervisor Contact / Title:** Senior Systems Architect

---

## LOG FORM III: DAILY SUMMARY REPORT (WEEKLY OVERVIEW)

### **Week 1: System Auditing, Backend Engineering, Trajectory Pipelines & Frontend Sync**

| Day | Brief Description of Work / Activity Performed | Time In | Time Out | Total Hours | Lessons Learnt | Challenges Faced |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **Mon** | **Codebase Architecture Audit & Core Diagnostics**: Audited full-stack architecture; identified and resolved malformed Python package structures (`_init_.py` to `__init__.py`), fixed missing runtime dependencies (`pandas`, `pydantic`), and analyzed database schemas in SQLite. | 08:00 | 17:00 | 8 hrs | Importance of PEP-8 compliance and modular package isolation in enterprise Python applications. | Package import failures and syntax breakages due to improper namespace declarations. |
| **Tue** | **Dataset Pipeline Engineering & Asynchronous I/O**: Refactored Hugging Face robotics dataset ingestion; implemented non-blocking `BackgroundTasks` in FastAPI; built flexible Parquet trajectory parser (`trajectory.py`) with dynamic regex discovery. | 08:00 | 17:00 | 8 hrs | Non-blocking asynchronous job queuing prevents thread starvation during heavy dataset downloads. | Arbitrary file naming schemes in Parquet episodes causing file-not-found exceptions. |
| **Wed** | **Video Streaming Endpoints & Frontend API Consolidation**: Configured MP4 streaming supporting multi-camera feeds; consolidated duplicate API clients into a unified `api.js` client; repaired React hook reference errors in `useVideoSync.js`. | 08:00 | 17:00 | 8 hrs | Synchronizing high-frequency robotic time-series data with video streams using `requestVideoFrameCallback`. | API route parameter mismatches (`camera` vs `key`) and duplicate endpoint handlers. |
| **Thu** | **Interactive Visualization & Trajectory Scrubber**: Enhanced `TrajectoryPlot.jsx` using `uPlot` with responsive `ResizeObserver`; implemented custom canvas cursor drawing synchronized with real-time video playback and frame stepping controls. | 08:00 | 17:00 | 8 hrs | Canvas-level rendering optimization for low-latency rendering of multi-dimensional state trajectories. | Canvas resizing and coordinate-to-time mapping synchronization under dynamic window sizes. |
| **Fri** | **Feed & Catalog Enhancement**: Integrated live arXiv crawling triggers; added taxonomy tag management (`TagPicker.jsx`); connected real Hugging Face snapshot downloads with status polling in `DatasetCatalog.jsx`. | 08:00 | 17:00 | 8 hrs | Reactive UI polling patterns for monitoring long-running asynchronous background operations. | Race conditions in polling states during active dataset snapshot downloads. |
| **Total**| **Week 1 Total Hours Worked** | | | **40 hrs** | | |

---

### **Week 2: Security Engineering, User Dashboard, Containerization & Cloud Deployment**

| Day | Brief Description of Work / Activity Performed | Time In | Time Out | Total Hours | Lessons Learnt | Challenges Faced |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **Mon** | **Authentication Security Architecture**: Designed user database schema (`users` & user-scoped `saved_items`); built cryptographic module using PBKDF2-HMAC-SHA256 password hashing and signed JWT token issuance in `backend/auth.py`. | 08:00 | 17:00 | 8 hrs | Implementing cross-platform cryptographic security using standard libraries without external C-compilers. | Ensuring zero-compilation cross-platform portability across Windows, WSL, and Linux containers. |
| **Tue** | **Auth Router & Session Management**: Built `/api/auth/register`, `/login`, and `/me` endpoints; created React `AuthContext.jsx` for persistent JWT sessions; created glassmorphic `AuthPage.jsx` with input validation and password toggles. | 08:00 | 17:00 | 8 hrs | Token lifecycle management, HTTP Authorization header injection, and client-side route protection. | Handling session expiration gracefully and maintaining synchronized state on page refresh. |
| **Wed** | **Personalized User Dashboard Development**: Engineered `GET /api/dashboard` analytics endpoint; built `Dashboard.jsx` with KPI cards (Saved Papers, Ready Datasets, Active Tags, Database Corpus), category meters (`cs.RO`/`cs.LG`), and bookmark manager. | 08:00 | 17:00 | 8 hrs | Designing data-dense analytical dashboards with clear visual hierarchies and responsive component grids. | Aggregating real-time SQLite database metrics efficiently across multiple relational tables. |
| **Thu** | **UI/UX Polishing & Dark Theme Design System**: Upgraded `App.css` to a modern cybernetic dark aesthetic; integrated user profile avatars and dropdown navigation; verified complete Vite production build (`npm run build` in 3.56s). | 08:00 | 17:00 | 8 hrs | Modern design token architectures, CSS micro-animations, and production asset minification. | Cross-platform binary mismatches between Windows and WSL rollup packages. |
| **Fri** | **Containerization & Production Deployment on Render**: Created multi-stage Dockerfiles, `nginx.conf`, and automated `build.sh` script; initialized Git repository, resolved nested submodule issues, and deployed to Render cloud hosting. | 08:00 | 17:00 | 8 hrs | Production deployment workflows, Single Page Application (SPA) static routing fallbacks, and Cloud PaaS configuration. | Nested `.git` directory preventing root staging; configuring GitHub Personal Access Tokens (PAT). |
| **Total**| **Week 2 Total Hours Worked** | | | **40 hrs** | | |

**Cumulative Attachment Hours:** 80 Hours

---

## LOG FORM II: DAILY DETAILED DESCRIPTION OF WORK (SAMPLE ENTRY)

* **Date:** Week 2, Wednesday
* **Module / Feature:** Personalized User Dashboard & Research Analytics

### Sequence of Operation for Job
1. Formulated REST endpoint specifications for user dashboard aggregation in FastAPI.
2. Built relational SQL queries in SQLite computing user bookmarked papers, ready datasets, taxonomy tags, and category breakdown.
3. Constructed React `Dashboard.jsx` page with responsive 4-column KPI cards and interactive list views.
4. Implemented real-time progress bars visualizing paper distribution across `cs.RO` (Robotics) and `cs.LG` (Machine Learning).
5. Integrated route protection redirecting unauthenticated visitors to `/login`.

* **Tools & Equipment Used:** Python 3.11, FastAPI, SQLite3, React 18, React Router v7, Visual Studio Code / Antigravity IDE, Git.
* **Tasks Completed:**
  - Completed `backend/routers/dashboard.py` with `GET /api/dashboard`.
  - Completed `frontend/src/pages/Dashboard.jsx` with KPI cards and dataset quick-launcher.
  - Connected optimistic UI bookmark removal and manual arXiv sync trigger.
* **Tasks in Progress:** End-to-end production build testing and cross-platform native binary packaging.
* **Next Day's Tasks:** Overhaul global CSS design system and execute multi-platform build verification.
* **Problems / Challenges:** Structuring responsive CSS Grid layouts that dynamically adapt multi-series progress bars across mobile and high-resolution desktop viewports.
* **Student's Recommendations:** Use dedicated analytics aggregation endpoints rather than multiple round-trip client requests to optimize frontend render latency.

---

## SECTION XX: SELF EVALUATION REPORT (SWOT ANALYSIS)

### A. Strengths
* **Full-Stack Integration Competence:** Successfully connected a reactive React 18 frontend with an asynchronous Python FastAPI backend, managing data flow through REST APIs and JWT security.
* **Problem Solving & Debugging:** Rapidly isolated and resolved complex bugs, including shadowed route handlers, Python package misconfigurations, and video-telemetry synchronization drift.
* **Cross-Platform DevOps Knowledge:** Gained hands-on mastery of containerization (Docker, Docker Compose), web servers (Nginx), and automated cloud PaaS deployment (Render).

### B. Weaknesses
* **Initial Cross-Platform Tooling Familiarity:** Encountered platform-specific native binary conflicts between Windows and WSL Linux environments during early build attempts.

### C. Opportunities
* **Embodied AI & Robotics Intelligence:** Hands-on exposure to Hugging Face LeRobot datasets and PyArrow Parquet formats opened avenues for future work in AI data engineering.
* **Cloud Architecture & Microservices:** Practical experience in zero-cost cloud deployments provides high career readiness for software engineering roles.

### D. Threats & Challenges Overcome
* **Git Submodule & Authentication Roadblocks:** Overcame nested repository blockers and GitHub token authentication requirements to successfully deploy the production codebase.

---

## CONCLUSION
The industrial attachment provided intensive, real-world full-stack development and DevOps experience. Beyond writing clean code, the exercise reinforced the necessity of structured software architecture, database indexing, user security engineering, and cloud deployment automation. The completed **RoboScope** platform stands as a production-grade, highly responsive system ready for academic and industrial research use.
