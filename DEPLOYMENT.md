# RoboScope Complete Deployment & Operations Guide

RoboScope is a full-stack robotics intelligence platform featuring:
- **FastAPI Backend**: User authentication (JWT + SHA256 PBKDF2), SQLite database, automated arXiv paper ingestion, Hugging Face dataset downloads, Parquet trajectory analysis, and MP4 video streaming.
- **React Frontend**: Built with Vite, React 18, `uPlot` trajectory visualizer, responsive multi-camera video synchronizer, and custom tag/bookmark management.

---

## 🔐 Authentication & Configuration

RoboScope uses signed JSON Web Tokens (JWT) for user authentication. Configure the following environment variables:

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `JWT_SECRET_KEY` | *(built-in dev key)* | 32+ character secret string used to sign user access tokens. |
| `JWT_EXPIRY_HOURS` | `168` (7 days) | Token lifespan before requiring re-login. |
| `CORS_ORIGINS` | `*` | Allowed client origins (comma-separated). |
| `INGESTION_INTERVAL_HOURS` | `6` | Hours between automatic arXiv paper crawls. |
| `VITE_API_URL` | *(blank / `/api`)* | Optional direct backend URL override. |

---

## 🚀 Option 1: Docker Compose Deployment (Recommended)

The fastest and most reliable way to run RoboScope in production with automated Nginx reverse proxying and persistent SQLite storage.

### 1. Prerequisites
- [Docker Engine & Docker Compose](https://docs.docker.com/get-docker/)

### 2. Configure Environment
Create a `.env` file from the template:
```bash
cp .env.example .env
```
*(Optionally change `JWT_SECRET_KEY` to a random secret).*

### 3. Build & Start Containers
```bash
docker-compose up -d --build
```

### 4. Verify & Access
- **Frontend Web App**: [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 5. Managing the Service
```bash
# View live logs
docker-compose logs -f

# Restart containers
docker-compose restart

# Stop containers (database remains saved in volume)
docker-compose down
```

---

## ☁️ Option 2: Cloud Platform Deployment

### A. Render (Free / Paid)
1. **Backend Web Service**:
   - Create a **Web Service** on [Render](https://render.com).
   - Environment: `Docker` (Dockerfile: `Dockerfile.backend`).
   - Port: `8000`.
   - Add Environment Variable: `JWT_SECRET_KEY=your-secure-random-secret`.
   - Attach a persistent disk to `/app/data` (for SQLite and datasets).
2. **Frontend Static Site**:
   - Create a **Static Site** on Render.
   - Build Command: `npm install && npm run build` (inside `frontend`).
   - Publish Directory: `frontend/dist`.
   - Add Environment Variable: `VITE_API_URL=https://your-backend.onrender.com/api`.

### B. Railway
1. Connect your GitHub repository to [Railway](https://railway.app).
2. Deploy using `docker-compose.yml` or add two services (`Dockerfile.backend` and `Dockerfile.frontend`).
3. Add a persistent volume mounted at `/app/data`.

### C. Hugging Face Spaces (Docker SDK)
1. Create a new Space on [Hugging Face Spaces](https://huggingface.co/spaces) with SDK: `Docker`.
2. Push the repository and expose port `7860`.

---

## 🖥️ Option 3: Ubuntu Linux VPS Deployment

### 1. Install System Prerequisites
```bash
sudo apt update && sudo apt install -y python3 python3-pip python3-venv nodejs npm nginx ffmpeg git
```

### 2. Set Up Backend (Systemd)
```bash
sudo mkdir -p /opt/robscope
sudo chown -R $USER:$USER /opt/robscope
cp -r * /opt/robscope/
cd /opt/robscope

python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

Create `/etc/systemd/system/roboscope-backend.service`:
```ini
[Unit]
Description=RoboScope FastAPI Service
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/robscope/backend
Environment="PATH=/opt/robscope/venv/bin"
Environment="JWT_SECRET_KEY=your-production-secret-key"
ExecStart=/opt/robscope/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now roboscope-backend
```

### 3. Build Frontend
```bash
cd /opt/robscope/frontend
npm install
npm run build
```

### 4. Configure Nginx
Create `/etc/nginx/sites-available/robscope`:
```nginx
server {
    listen 80;
    server_name your-domain.com; # or VPS IP

    root /opt/robscope/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        client_max_body_size 500M;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/robscope /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 💻 Option 4: Local Development Quickstart

### Running in Windows:
**Terminal 1 (Backend):**
```powershell
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2 (Frontend):**
```powershell
cd frontend
npm install
npm run dev
```

### Running in WSL / Linux:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```
Open **http://localhost:5173** to test Login, Signup, arXiv sync, and dataset trajectory viewing!
