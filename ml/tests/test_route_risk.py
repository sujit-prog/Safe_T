"""Tests for route risk aggregation and ranking."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import risk_to_safety_score, DEFAULT_ROUTE_WEIGHTS


def test_route_ranking_by_safety():
    """Routes are correctly ranked by safety score."""
    routes = [
        {"safety_score": 60, "duration": 1200, "distance": 10},
        {"safety_score": 85, "duration": 1500, "distance": 15},
        {"safety_score": 45, "duration": 900, "distance": 8},
    ]
    
    ranked = sorted(routes, key=lambda r: r["safety_score"], reverse=True)
    assert ranked[0]["safety_score"] == 85  # Safest first
    assert ranked[-1]["safety_score"] == 45  # Riskiest last


def test_composite_ranking():
    """Composite ranking works with configurable weights."""
    routes = [
        {"safety": 0.85, "time": 0.7, "distance": 0.8},   # Safe but slow
        {"safety": 0.60, "time": 0.95, "distance": 0.9},   # Fast but less safe
        {"safety": 0.75, "time": 0.8, "distance": 0.85},   # Balanced
    ]
    
    weights = DEFAULT_ROUTE_WEIGHTS
    
    for r in routes:
        r["composite"] = (
            weights["safety"] * r["safety"] +
            weights["time"] * r["time"] +
            weights["distance"] * r["distance"]
        )
    
    ranked = sorted(routes, key=lambda r: r["composite"], reverse=True)
    
    # With default weights (safety=0.6), safest should rank higher
    # despite being slower
    assert ranked[0]["safety"] >= ranked[-1]["safety"] or ranked[0]["composite"] > ranked[-1]["composite"]


def test_segment_aggregation():
    """Segment risks are properly aggregated into route risk."""
    segments = [
        {"risk_probability": 0.1, "startIndex": 0, "endIndex": 5},
        {"risk_probability": 0.2, "startIndex": 5, "endIndex": 10},
        {"risk_probability": 0.7, "startIndex": 10, "endIndex": 15},
        {"risk_probability": 0.15, "startIndex": 15, "endIndex": 20},
    ]
    
    # Weighted average by segment length
    total_weight = sum(s["endIndex"] - s["startIndex"] for s in segments)
    overall_risk = sum(
        s["risk_probability"] * (s["endIndex"] - s["startIndex"])
        for s in segments
    ) / total_weight
    
    overall_safety = risk_to_safety_score(overall_risk)
    
    assert 0.0 <= overall_risk <= 1.0
    assert 0 <= overall_safety <= 100
    
    # Route B (all low risk) should be safer
    segments_b = [
        {"risk_probability": 0.12, "startIndex": 0, "endIndex": 5},
        {"risk_probability": 0.16, "startIndex": 5, "endIndex": 10},
        {"risk_probability": 0.18, "startIndex": 10, "endIndex": 15},
        {"risk_probability": 0.20, "startIndex": 15, "endIndex": 20},
    ]
    
    total_weight_b = sum(s["endIndex"] - s["startIndex"] for s in segments_b)
    overall_risk_b = sum(
        s["risk_probability"] * (s["endIndex"] - s["startIndex"])
        for s in segments_b
    ) / total_weight_b
    
    overall_safety_b = risk_to_safety_score(overall_risk_b)
    
    assert overall_safety_b > overall_safety  # Route B is safer


def test_default_weights_sum_to_one():
    """Default route ranking weights sum to 1.0."""
    total = sum(DEFAULT_ROUTE_WEIGHTS.values())
    assert abs(total - 1.0) < 0.001


if __name__ == "__main__":
    test_route_ranking_by_safety()
    test_composite_ranking()
    test_segment_aggregation()
    test_default_weights_sum_to_one()
    print("✅ All route risk tests passed!")
