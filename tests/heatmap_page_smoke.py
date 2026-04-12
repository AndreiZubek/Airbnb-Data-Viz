from pathlib import Path


def test_viz2_mount_and_copy_present() -> None:
    html = Path("index.html").read_text(encoding="utf-8")
    normalized = " ".join(html.split())

    assert "Visualization 2: Price Patterns by Borough and Room Type" in html
    assert 'id="viz2-controls"' in html
    assert 'id="viz2-chart"' in html
    assert "Hover over a cell" in html
    assert "average price and median price" in normalized


def test_viz2_scripts_are_wired() -> None:
    html = Path("index.html").read_text(encoding="utf-8")

    assert "https://cdn.jsdelivr.net/npm/d3@7" in html
    assert "scripts/viz2-heatmap.js" in html
    assert Path("scripts/viz2-heatmap.js").exists()


def test_viz2_interaction_hooks_present() -> None:
    js = Path("scripts/viz2-heatmap.js").read_text(encoding="utf-8")
    css = Path("styles.css").read_text(encoding="utf-8")

    assert "Average price" in js
    assert "Median price" in js
    assert "Failed to load chart data" in js
    assert "tooltip" in js
    assert "renderHeatmap" in js
    assert 'chartShell.addEventListener("mouseleave"' in js
    assert '.style("fill", (datum) => datum.labelColor)' in js
    assert '.on("mousemove", (event) => {' in js
    assert "text-shadow" in css
    assert ".heatmap-cell-label,\n.heatmap-empty-label {\n  font-size:" in css


if __name__ == "__main__":
    test_viz2_mount_and_copy_present()
    test_viz2_scripts_are_wired()
    test_viz2_interaction_hooks_present()
    print("heatmap_page_smoke.py: PASS")
