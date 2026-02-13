# 🌱 Smartकृषि - AI-Powered Crop Recommendation

Smartकृषि recommends crops using a trained ML model and then personalizes advisory output based on farm context.

## Features

- Crop recommendation using ML (`N, P, K, temperature, humidity, ph, rainfall`)
- Personalized advisory re-ranking (`farm_size, previous_crop, season`)
- Live weather inputs from Open-Meteo (temperature, humidity, rainfall)
- Farming guidance cards (irrigation, fertilizer, pest, weather tips)
- Disease detection demo page

## Tech Stack

- Frontend: React 18 + Vite + Tailwind CSS
- ML: Python + scikit-learn
- API: Flask + Flask-CORS

## Project Structure

```text
src/
  pages/
  hooks/
  components/
  lib/
ml/
  train_crop_model.py
  recommend_crop.py
  api_server.py
  requirements.txt
dataset/
models/
```

## Setup

### 1) Install frontend deps

```bash
npm install
```

### 2) Train model (if not already trained)

```bash
npm run train:model
```

### 3) Install Python deps for API

```bash
pip3 install -r ml/requirements.txt
```

## Run

Start API server:

```bash
npm run api
```

Start frontend (new terminal):

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`
API runs on `http://127.0.0.1:8000`

Vite proxies `/api/*` to the API server in development.

## Troubleshooting

- Error: `No module named 'numpy._core'`
  - Cause: model artifact was created with a different Python/NumPy build.
  - Fix:
    1. Stop API server.
    2. Rebuild model in current environment: `npm run train:model`
    3. Restart API: `npm run api`
    4. Verify: `curl http://127.0.0.1:8000/health`

- Error: `Could not find a version that satisfies the requirement numpy>=1.26.0`
  - Cause: pip is tied to an older Python interpreter.
  - Fix:
    1. Check: `python3 --version`
    2. Install with interpreter-bound pip: `python3 -m pip install -r ml/requirements.txt`

## API

- `GET /health`
- `POST /api/recommend?top_k=5`

Sample body:

```json
{
  "N": 90,
  "P": 42,
  "K": 43,
  "temperature": 24,
  "humidity": 80,
  "ph": 6.5,
  "rainfall": 210,
  "farm_size": 2.5,
  "previous_crop": "rice",
  "season": "kharif"
}
```
