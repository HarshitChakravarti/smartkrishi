"""Unit checks for feature generation helpers."""

from ml.feature_generator import compute_growing_window, get_month_number


def test_month_parser():
    assert get_month_number("June") == 6
    assert get_month_number("jun") == 6
    assert get_month_number("January") == 1


def test_window_wrap():
    assert compute_growing_window("November", 5) == ["November", "December", "January", "February", "March"]
