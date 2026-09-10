"""Tests for DBSCAN hotspot detection."""

import sys
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def test_dbscan_finds_clusters():
    """DBSCAN correctly identifies clusters in synthetic data."""
    from hotspot import run_dbscan
    
    # Create 2 obvious clusters + noise
    cluster1 = [(20.35 + np.random.normal(0, 0.002), 85.82 + np.random.normal(0, 0.002), "Theft", 3)
                 for _ in range(20)]
    cluster2 = [(20.50 + np.random.normal(0, 0.002), 85.90 + np.random.normal(0, 0.002), "Mugging", 5)
                 for _ in range(15)]
    noise = [(21.0 + i * 0.1, 84.0 + i * 0.1, "Accident", 2) for i in range(5)]
    
    all_coords = cluster1 + cluster2 + noise
    hotspots = run_dbscan(all_coords, eps=0.005, min_samples=5)
    
    assert len(hotspots) >= 2, f"Expected ≥2 clusters, got {len(hotspots)}"


def test_hotspot_has_required_fields():
    """Each hotspot has all required fields."""
    from hotspot import run_dbscan
    
    coords = [(20.35 + np.random.normal(0, 0.002), 85.82 + np.random.normal(0, 0.002), "Theft", 4)
               for _ in range(30)]
    
    hotspots = run_dbscan(coords, eps=0.01, min_samples=5)
    
    if len(hotspots) > 0:
        h = hotspots[0]
        assert "cluster_id" in h
        assert "centroid" in h
        assert "incident_count" in h
        assert "intensity" in h
        assert "risk_level" in h
        assert "dominant_crime_type" in h


def test_empty_input():
    """DBSCAN handles empty input gracefully."""
    from hotspot import run_dbscan
    
    hotspots = run_dbscan([], eps=0.005, min_samples=5)
    assert hotspots == []


def test_hotspot_intensity_range():
    """Hotspot intensity is between 0 and 100."""
    from hotspot import run_dbscan
    
    coords = [(20.35 + np.random.normal(0, 0.001), 85.82 + np.random.normal(0, 0.001), "Theft", 3)
               for _ in range(50)]
    
    hotspots = run_dbscan(coords, eps=0.01, min_samples=5)
    
    for h in hotspots:
        assert 0 <= h["intensity"] <= 100


if __name__ == "__main__":
    np.random.seed(42)
    test_dbscan_finds_clusters()
    test_hotspot_has_required_fields()
    test_empty_input()
    test_hotspot_intensity_range()
    print("✅ All hotspot tests passed!")
