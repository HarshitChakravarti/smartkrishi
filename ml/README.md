# Crop Recommendation ML Pipeline

This module is now full-stack ready and powers the frontend via `ml/recommend_crop.py`.

## Architecture

1. Base ML prediction (trained classifier):
- Inputs: `N, P, K, temperature, humidity, ph, rainfall`
- Output: crop probabilities

2. Advisory personalization (post-processing):
- Inputs: `farm_size, previous_crop, season`
- Applies season/rotation/farm-size weights to re-rank base probabilities

## Files

- `ml/train_crop_model.py`: train + evaluate model and save artifacts
- `ml/recommend_crop.py`: reusable inference engine + CLI
- `ml/api_server.py`: Flask API that exposes recommendation endpoint
- `ml/requirements.txt`: Python dependencies

## Train

```bash
python3 ml/train_crop_model.py \
  --data "dataset/Crop_recommendation 2.csv" \
  --model-out models/crop_model.joblib \
  --metrics-out models/crop_model_metrics.json
```

## Predict from CLI

```bash
python3 ml/recommend_crop.py \
  --model models/crop_model.joblib \
  --input-json '{
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
  }' \
  --top-k 5
```

You can also pass payload from file:

```bash
python3 ml/recommend_crop.py --input-file ml/sample_input.json
```

## Run API

Install dependencies (if needed):

```bash
pip3 install -r ml/requirements.txt
```

If your shell has multiple Python versions, prefer:

```bash
python3 -m pip install -r ml/requirements.txt
```

Start API:

```bash
python3 ml/api_server.py
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

Recommendation request:

```bash
curl -X POST "http://127.0.0.1:8000/api/recommend?top_k=5" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

## Environment variables

- `CROP_MODEL_PATH` (default: `models/crop_model.joblib`)
- `CROP_TOP_K` (default: `5`)
- `CROP_API_HOST` (default: `127.0.0.1`)
- `CROP_API_PORT` (default: `8000`)
- `CROP_API_DEBUG` (`true|false`, default: `false`)

## Troubleshooting

- Error: `No module named 'numpy._core'`
  - This means model artifact and runtime libraries are mismatched.
  - Rebuild model in same environment as API:
    1. `npm run train:model`
    2. `npm run api`
    3. `curl http://127.0.0.1:8000/health`

- Error: `Could not find a version that satisfies the requirement numpy>=1.26.0`
  - You are likely installing with an older Python interpreter.
  - Use interpreter-bound pip:
    1. `python3 --version`
    2. `python3 -m pip install -r ml/requirements.txt`
