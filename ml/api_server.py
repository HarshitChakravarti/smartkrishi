#!/usr/bin/env python3
"""HTTP API for crop recommendation using ml/recommend_crop.py inference logic."""

from __future__ import annotations

import os
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

try:
    from .recommend_crop import (
        DEFAULT_MODEL_PATH,
        DEFAULT_TOP_K,
        RecommendationInputError,
        load_model_bundle,
        predict_recommendation,
    )
except ImportError:  # Allows `python3 ml/api_server.py`
    from recommend_crop import (  # type: ignore
        DEFAULT_MODEL_PATH,
        DEFAULT_TOP_K,
        RecommendationInputError,
        load_model_bundle,
        predict_recommendation,
    )

MODEL_PATH = Path(os.getenv("CROP_MODEL_PATH", str(DEFAULT_MODEL_PATH)))
DEFAULT_API_TOP_K = int(os.getenv("CROP_TOP_K", str(DEFAULT_TOP_K)))
HOST = os.getenv("CROP_API_HOST", "127.0.0.1")
PORT = int(os.getenv("CROP_API_PORT", "8000"))
DEBUG = os.getenv("CROP_API_DEBUG", "false").lower() == "true"

app = Flask(__name__)
CORS(app)


@app.get("/health")
def health() -> tuple[object, int]:
    if not MODEL_PATH.exists():
        return (
            jsonify(
                {
                    "status": "error",
                    "model_path": str(MODEL_PATH),
                    "error": "Model file is missing. Run: npm run train:model",
                }
            ),
            500,
        )

    try:
        load_model_bundle(str(MODEL_PATH))
    except Exception as exc:
        return (
            jsonify(
                {
                    "status": "error",
                    "model_path": str(MODEL_PATH),
                    "error": str(exc),
                }
            ),
            500,
        )

    return (
        jsonify(
            {
                "status": "ok",
                "model_path": str(MODEL_PATH),
                "model_ready": True,
            }
        ),
        200,
    )


@app.post("/api/recommend")
def recommend() -> tuple[object, int]:
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400

    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Invalid JSON body"}), 400

    top_k_raw = request.args.get("top_k", str(DEFAULT_API_TOP_K))
    try:
        top_k = int(top_k_raw)
    except ValueError:
        return jsonify({"error": "top_k must be an integer"}), 400

    try:
        result = predict_recommendation(payload=payload, model_path=MODEL_PATH, top_k=top_k)
    except RecommendationInputError as exc:
        return jsonify({"error": str(exc)}), 400
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 500
    except Exception as exc:  # pragma: no cover
        return jsonify({"error": f"Unexpected error: {exc}"}), 500

    return jsonify(result), 200


if __name__ == "__main__":
    app.run(host=HOST, port=PORT, debug=DEBUG)
