from pathlib import Path


def test_secondary_visuals_and_helpers_present() -> None:
    html = Path("index.html").read_text(encoding="utf-8")
    js_map = Path("scripts/viz1-map.js").read_text(encoding="utf-8")
    js_bar = Path("scripts/viz3-neighborhood-bars.js").read_text(encoding="utf-8")
    js_scatter = Path("scripts/viz4-scatter.js").read_text(encoding="utf-8")
    js_heatmap = Path("scripts/viz5-heatmap.js").read_text(encoding="utf-8")

    assert 'id="viz1-legend"' in html
    assert 'id="viz3-legend"' in html
    assert 'id="viz4-note"' in html

    assert "Price categories" in js_map
    assert "circleMarker" in js_map
    assert "Neighborhood" in js_bar
    assert "Average price" in js_bar
    assert "trendline" in js_scatter.lower()
    assert "linearRegression" in js_scatter
    assert "Average price" in js_heatmap
    assert "heatmap-legend-title" in js_heatmap


if __name__ == "__main__":
    test_secondary_visuals_and_helpers_present()
    print("viz34_page_smoke.py: PASS")
