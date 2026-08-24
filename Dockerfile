# Stage 1: Build the React frontend with Node
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend with FastAPI
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (ffmpeg for robotics video streams)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    ffmpeg \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend source code
COPY backend/ /app/backend/

# Copy built frontend assets into the app for static serving
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Create data directories for SQLite database & Hugging Face dataset caches
RUN mkdir -p /app/data/datasets

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/backend
ENV PORT=7860

# Port 7860 is default for Hugging Face Spaces; also works with Render/Railway ($PORT)
EXPOSE 7860

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860} --app-dir /app/backend"]
