"""Legacy compatibility wrapper around the new pipeline."""

from __future__ import annotations

try:
    from .pipeline import get_recommendations
except ImportError:  # pragma: no cover
    from pipeline import get_recommendations  # type: ignore


def predict_recommendation(payload: dict) -> dict:
    """Backward-compatible helper for internal callers."""
    return get_recommendations(payload)
