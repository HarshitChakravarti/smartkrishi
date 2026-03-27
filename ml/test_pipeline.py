"""Smoke tests for exact frontend payloads."""

from ml.pipeline import get_recommendations


def test_current_payload_shape():
    payload = {
        "activeTab": "current",
        "state": "Maharashtra",
        "district": "Pune",
        "landArea": "2.5",
        "temperature": 28.5,
        "humidity": 72,
        "rainfall": 145.2,
        "N": 80,
        "P": 40,
        "K": 40,
        "pH": 6.5,
    }
    result = get_recommendations(payload)
    assert result["success"] is True
    assert len(result["recommendations"]) == 3
    assert result["climate_used"]["source"] == "live_weather"


def test_planning_payload_shape():
    payload = {
        "activeTab": "planning",
        "state": "Punjab",
        "district": "Ludhiana",
        "landArea": "5",
        "farmingMonth": "November",
        "previousCrop": "rice",
        "previousCropMonth": "October",
        "temperature": 25.0,
        "humidity": 60,
        "rainfall": 10,
        "N": 60,
        "P": 50,
        "K": 45,
        "pH": 7.0,
    }
    result = get_recommendations(payload)
    assert result["success"] is True
    assert len(result["recommendations"]) == 3
    assert result["climate_used"]["source"] == "historical_average"
    assert result["climate_used"]["months_covered"]


def test_edge_small_farm_zaid():
    payload = {
        "activeTab": "planning",
        "state": "Rajasthan",
        "district": "Jaipur",
        "landArea": "1.2",
        "farmingMonth": "March",
        "previousCrop": "wheat",
        "previousCropMonth": "February",
        "temperature": 30,
        "humidity": 40,
        "rainfall": 5,
        "N": 30,
        "P": 20,
        "K": 25,
        "pH": 8.0,
    }
    result = get_recommendations(payload)
    assert result["success"] is True
    assert len(result["recommendations"]) == 3
    assert result["recommendations"][0]["reason"]
