const MAP_PRICE_COLORS = ["#fef3c7", "#fbbf24", "#f97316", "#c2410c"];
const MAP_PRICE_LABELS = ["Budget", "Standard", "Premium", "Luxury"];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char];
  });
}

function formatMapCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getMapPriceBuckets(rows) {
  const values = rows.map((row) => row.price).filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  return [
    d3.quantileSorted(values, 0.25) ?? 0,
    d3.quantileSorted(values, 0.5) ?? 0,
    d3.quantileSorted(values, 0.75) ?? 0,
  ];
}

function getMapBucketIndex(price, buckets) {
  if (!Number.isFinite(price)) return 0;
  if (price <= buckets[0]) return 0;
  if (price <= buckets[1]) return 1;
  if (price <= buckets[2]) return 2;
  return 3;
}

function renderMapLegend(root, buckets, minPrice, maxPrice) {
  const ranges = [
    `${formatMapCurrency(minPrice)} - ${formatMapCurrency(Math.floor(buckets[0]))}`,
    `${formatMapCurrency(Math.ceil(buckets[0]))} - ${formatMapCurrency(Math.floor(buckets[1]))}`,
    `${formatMapCurrency(Math.ceil(buckets[1]))} - ${formatMapCurrency(Math.floor(buckets[2]))}`,
    `${formatMapCurrency(Math.ceil(buckets[2]))} - ${formatMapCurrency(maxPrice)}`,
  ];

  root.innerHTML = `
    <div class="map-legend__title">Price categories</div>
    <div class="map-legend__items">
      ${MAP_PRICE_LABELS.map((label, index) => `
        <div class="map-legend__item">
          <span class="map-legend__swatch" style="background:${MAP_PRICE_COLORS[index]}"></span>
          <span class="map-legend__text">${label}: ${ranges[index]}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderAirbnbMap(container, legendRoot, rows) {
  const validRows = rows.filter((row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude) && Number.isFinite(row.price) && row.price > 0);

  if (!window.L) {
    container.innerHTML = '<p class="chart-error">Leaflet failed to load.</p>';
    return;
  }

  if (validRows.length === 0) {
    container.innerHTML = '<p class="chart-error">No map data available.</p>';
    return;
  }

  const prices = validRows.map((row) => row.price).sort((a, b) => a - b);
  const buckets = getMapPriceBuckets(validRows);
  const minPrice = prices[0];
  const maxPrice = prices[prices.length - 1];

  renderMapLegend(legendRoot, buckets, minPrice, maxPrice);

  const map = L.map(container, {
    scrollWheelZoom: false,
    zoomControl: true,
    preferCanvas: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(map);

  const canvasRenderer = L.canvas({ padding: 0.4 });
  const bounds = [];

  validRows.forEach((row) => {
    const bucketIndex = getMapBucketIndex(row.price, buckets);
    const marker = L.circleMarker([row.latitude, row.longitude], {
      radius: 4,
      renderer: canvasRenderer,
      color: "#ffffff",
      weight: 0.8,
      fillColor: MAP_PRICE_COLORS[bucketIndex],
      fillOpacity: 0.78,
      opacity: 0.95,
    });

    marker.bindTooltip(
      `
      <div class="map-tooltip">
        <strong>${escapeHtml(row.name || "Listing")}</strong>
        <span>${escapeHtml(row.neighbourhood_group)} · ${escapeHtml(row.room_type)}</span>
        <span>Price: ${formatMapCurrency(row.price)}</span>
        <span>Reviews: ${Number.isFinite(row.number_of_reviews) ? row.number_of_reviews : "No data"}</span>
      </div>
      `,
      {
        direction: "top",
        sticky: true,
        opacity: 0.98,
        className: "map-tooltip-leaflet",
      },
    );

    marker.addTo(map);
    bounds.push([row.latitude, row.longitude]);
  });

  map.fitBounds(bounds, { padding: [24, 24] });

  setTimeout(() => {
    map.invalidateSize();
  }, 0);
}

async function initViz1Map() {
  const container = document.getElementById("viz1-map");
  const legendRoot = document.getElementById("viz1-legend");

  if (!container || !legendRoot) return;

  const rows = await d3.csv("AB_NYC_2019_clean_5000.csv", (row) => ({
    name: row.name,
    neighbourhood_group: row.neighbourhood_group,
    room_type: row.room_type,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    price: Number(row.price),
    number_of_reviews: Number(row.number_of_reviews),
  }));

  renderAirbnbMap(container, legendRoot, rows);
}

initViz1Map().catch((error) => {
  const container = document.getElementById("viz1-map");
  if (container) {
    container.innerHTML = '<p class="chart-error">Failed to load map data.</p>';
  }
  console.error(error);
});
