"""Unit checks for rule utilities."""

from ml.rules import compute_rotation_gap_months, detect_season


def test_detect_season():
    assert detect_season("June") == "Kharif"
    assert detect_season("November") == "Rabi"
    assert detect_season("March") == "Zaid"


def test_rotation_gap_wraparound():
    assert compute_rotation_gap_months("November", "February") == 3
    assert compute_rotation_gap_months("February", "February") == 0
