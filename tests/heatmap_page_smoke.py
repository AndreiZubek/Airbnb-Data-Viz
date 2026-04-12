from pathlib import Path


def test_five_visuals_present() -> None:
    html = Path("index.html").read_text(encoding="utf-8")
    normalized = " ".join(html.split())

    assert "Visualization 1: Geographic Map of Listings" in html
    assert "Visualization 2: Price Distribution by Room Type" in html
    assert "Visualization 3: Average Price by Neighborhood" in html
    assert "Visualization 4: Price vs Number of Reviews" in html
    assert "Visualization 5: Average Price by Borough and Room Type" in html

    assert 'id="viz1-map"' in html
    assert 'id="viz2-chart"' in html
    assert 'id="viz3-chart"' in html
    assert 'id="viz4-chart"' in html
    assert 'id="viz5-chart"' in html

    assert "Hover over a point to see the listing name" in normalized
    assert "Hover over each room type to see the quartiles" in normalized
    assert "Hover over a bar to see the neighborhood" in normalized
    assert "Hover over a dot to see the listing details" in normalized
    assert "Hover over a cell to see the borough, room type" in normalized

    assert "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" in html
    assert "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" in html
    assert "scripts/viz1-map.js" in html
    assert "scripts/viz2-boxplot.js" in html
    assert "scripts/viz3-neighborhood-bars.js" in html
    assert "scripts/viz4-scatter.js" in html
    assert "scripts/viz5-heatmap.js" in html


if __name__ == "__main__":
    test_five_visuals_present()
    print("heatmap_page_smoke.py: PASS")
