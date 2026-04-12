from pathlib import Path


def test_viz3_and_viz4_mounts_present() -> None:
    html = Path("index.html").read_text(encoding="utf-8")
    normalized = " ".join(html.split())

    assert "Visualization 3: Price Distribution by Room Type" in html
    assert "Visualization 4: Availability by Borough and Room Type" in html
    assert 'id="viz3-chart"' in html
    assert 'id="viz4-chart"' in html
    assert "Hover over each room type to see its quartiles, median price, and listing count" in normalized
    assert "The legend above the chart shows how to read the box plot" in normalized
    assert "Hover over a cell to see the borough, room type, listing count, and average availability" in normalized
    assert "The legend below the chart explains what the colors mean" in normalized
    assert "scripts/viz3-distribution.js" in html
    assert "scripts/viz4-availability.js" in html


def test_viz3_and_viz4_scripts_present() -> None:
    viz3 = Path("scripts/viz3-distribution.js")
    viz4 = Path("scripts/viz4-availability.js")

    assert viz3.exists()
    assert viz4.exists()

    viz3_text = viz3.read_text(encoding="utf-8")
    viz4_text = viz4.read_text(encoding="utf-8")

    assert "renderViz3Distribution" in viz3_text
    assert "tooltip" in viz3_text
    assert "quartile" in viz3_text or "q1" in viz3_text.lower()
    assert "Middle 50% of prices" in viz3_text
    assert "Typical range" in viz3_text
    assert 'attr("class", "viz3-label")' not in viz3_text

    assert "renderViz4Availability" in viz4_text
    assert "tooltip" in viz4_text
    assert "availability" in viz4_text.lower()
    assert "Average availability (days)" in viz4_text
    assert "heatmap-legend-title" in viz4_text


if __name__ == "__main__":
    test_viz3_and_viz4_mounts_present()
    test_viz3_and_viz4_scripts_present()
    print("viz34_page_smoke.py: PASS")
