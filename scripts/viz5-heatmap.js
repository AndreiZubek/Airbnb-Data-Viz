const VIZ5_BOROUGHS = [
  "Bronx",
  "Brooklyn",
  "Manhattan",
  "Queens",
  "Staten Island",
];
const VIZ5_ROOM_TYPES = ["Entire home/apt", "Private room", "Shared room"];
const VIZ5_METRICS = {
  price: {
    key: "average",
    label: "Average price",
    format: (value) => formatViz5Currency(value),
    unit: "USD",
  },
  availability: {
    key: "availability",
    label: "Average availability",
    format: (value) => `${Math.round(value)} days`,
    unit: "days",
  },
};

function formatViz5Currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function summarizePriceHeatmap(rows) {
  const grouped = d3.rollups(
    rows.filter(
      (row) =>
        row.neighbourhood_group &&
        row.room_type &&
        Number.isFinite(row.price) &&
        row.price > 0,
    ),
    (values) => ({
      count: values.length,
      average: d3.mean(values, (row) => row.price),
    }),
    (row) => row.neighbourhood_group.trim(),
    (row) => row.room_type.trim(),
  );

  const lookup = new Map();
  grouped.forEach(([borough, roomGroups]) => {
    roomGroups.forEach(([roomType, stats]) => {
      lookup.set(`${borough}__${roomType}`, stats);
    });
  });

  return VIZ5_BOROUGHS.flatMap((borough) =>
    VIZ5_ROOM_TYPES.map((roomType) => {
      const stats = lookup.get(`${borough}__${roomType}`);
      return {
        borough,
        roomType,
        count: stats?.count ?? 0,
        average: stats?.average ?? null,
      };
    }),
  );
}

function summarizeAvailabilityHeatmap(rows) {
  const grouped = d3.rollups(
    rows.filter(
      (row) =>
        row.neighbourhood_group &&
        row.room_type &&
        Number.isFinite(row.availability),
    ),
    (values) => ({
      count: values.length,
      availability: d3.mean(values, (row) => row.availability),
    }),
    (row) => row.neighbourhood_group.trim(),
    (row) => row.room_type.trim(),
  );

  const lookup = new Map();
  grouped.forEach(([borough, roomGroups]) => {
    roomGroups.forEach(([roomType, stats]) => {
      lookup.set(`${borough}__${roomType}`, stats);
    });
  });

  return VIZ5_BOROUGHS.flatMap((borough) =>
    VIZ5_ROOM_TYPES.map((roomType) => {
      const stats = lookup.get(`${borough}__${roomType}`);
      return {
        borough,
        roomType,
        count: stats?.count ?? 0,
        availability: stats?.availability ?? null,
      };
    }),
  );
}

function renderViz5Legend(svg, colorScale, metric, width, height, margin) {
  const legendWidth = Math.min(250, width - margin.left - margin.right);
  const legendHeight = 12;
  const legendX = margin.left;
  const legendY = height - margin.bottom + 44;
  const [minValue, maxValue] = colorScale.domain();

  const defs = svg.append("defs");
  const gradientId = `viz5-${metric.key}-gradient`;
  const gradient = defs.append("linearGradient").attr("id", gradientId);

  gradient
    .selectAll("stop")
    .data(d3.range(0, 1.01, 0.1))
    .join("stop")
    .attr("offset", (d) => `${d * 100}%`)
    .attr("stop-color", (d) =>
      colorScale(minValue + d * (maxValue - minValue)),
    );

  svg
    .append("rect")
    .attr("x", legendX)
    .attr("y", legendY)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", `url(#${gradientId})`)
    .attr("rx", 4);

  const legendScale = d3
    .scaleLinear()
    .domain([minValue, maxValue])
    .range([legendX, legendX + legendWidth]);
  const axis = d3
    .axisBottom(legendScale)
    .ticks(3)
    .tickFormat((value) => metric.format(value));

  svg
    .append("g")
    .attr("class", "heatmap-legend")
    .attr("transform", `translate(0, ${legendY + legendHeight})`)
    .call(axis)
    .call((group) => group.select(".domain").remove())
    .call((group) => group.selectAll("line").remove());

  svg
    .append("text")
    .attr("class", "heatmap-legend-title")
    .attr("x", legendX)
    .attr("y", legendY - 10)
    .text(metric.label);
}

function renderViz5Heatmap(chartRoot, shell, data, metric) {
  chartRoot.innerHTML = "";
  const width = Math.max(640, Math.min(chartRoot.clientWidth || 720, 860));
  const height = 390;
  const margin = { top: 30, right: 24, bottom: 92, left: 158 };
  const svg = d3
    .select(chartRoot)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  const x = d3
    .scaleBand()
    .domain(VIZ5_BOROUGHS)
    .range([margin.left, width - margin.right])
    .paddingInner(0.08)
    .paddingOuter(0.04);
  const y = d3
    .scaleBand()
    .domain(VIZ5_ROOM_TYPES)
    .range([margin.top, height - margin.bottom])
    .paddingInner(0.12)
    .paddingOuter(0.02);
  const values = data.map((d) => d[metric.key]).filter(Number.isFinite);
  const color = d3
    .scaleSequential()
    .domain(d3.extent(values))
    .interpolator(d3.interpolateYlOrBr);

  svg
    .append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call((group) => group.select(".domain").remove())
    .call((group) =>
      group.selectAll("text").attr("class", "heatmap-axis-text"),
    );

  svg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).tickSize(0))
    .call((group) => group.select(".domain").remove())
    .call((group) =>
      group.selectAll("text").attr("class", "heatmap-axis-text"),
    );

  svg
    .append("text")
    .attr("class", "heatmap-axis-label")
    .attr("x", (margin.left + width - margin.right) / 2)
    .attr("y", height - 12)
    .attr("text-anchor", "middle")
    .text("Borough");

  svg
    .append("text")
    .attr("class", "heatmap-axis-label")
    .attr("x", -((margin.top + height - margin.bottom) / 2))
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Room type");

  renderViz5Legend(svg, color, metric, width, height, margin);

  const tooltip =
    shell.querySelector(".viz5-tooltip") || document.createElement("div");
  if (!tooltip.parentNode) {
    tooltip.className = "viz2-tooltip viz5-tooltip";
    tooltip.hidden = true;
    shell.appendChild(tooltip);
  }

  svg
    .append("g")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("class", (d) => `heatmap-cell${d.count === 0 ? " is-empty" : ""}`)
    .attr("x", (d) => x(d.borough))
    .attr("y", (d) => y(d.roomType))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 6)
    .attr("fill", (d) => (d.count === 0 ? "#f1ece3" : color(d[metric.key])))
    .on("mousemove", (event, datum) => {
      const value = datum[metric.key];
      tooltip.innerHTML = `
        <strong>${datum.borough}</strong>
        <span>${datum.roomType}</span>
        <span>Listings: ${datum.count}</span>
        <span>${metric.label}: ${value ? metric.format(value) : "No data"}</span>
      `;
      tooltip.hidden = false;
      const bounds = shell.getBoundingClientRect();
      const left = Math.min(
        Math.max(8, event.clientX - bounds.left + 16),
        bounds.width - tooltip.offsetWidth - 8,
      );
      const top = Math.min(
        Math.max(8, event.clientY - bounds.top + 16),
        bounds.height - tooltip.offsetHeight - 8,
      );
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    })
    .on("mouseleave", () => {
      tooltip.hidden = true;
    });

  svg
    .append("g")
    .selectAll("text")
    .data(data.filter((d) => d.count > 0))
    .join("text")
    .attr("class", "heatmap-cell-label")
    .attr("x", (d) => x(d.borough) + x.bandwidth() / 2)
    .attr("y", (d) => y(d.roomType) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .attr("fill", (d) => {
      const c = d3.color(color(d[metric.key]));
      const luminance = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
      return luminance < 0.58 ? "#fffdf8" : "#1f2933";
    })
    .text((d) => {
      const value = d[metric.key];
      return value
        ? metric.key === "average"
          ? `$${Math.round(value)}`
          : `${Math.round(value)}`
        : "";
    });

  svg
    .append("g")
    .selectAll("text")
    .data(data.filter((d) => d.count === 0))
    .join("text")
    .attr("class", "heatmap-empty-label")
    .attr("x", (d) => x(d.borough) + x.bandwidth() / 2)
    .attr("y", (d) => y(d.roomType) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .text("No listings");
}

async function initViz5Heatmap() {
  const chartRoot = document.getElementById("viz5-chart");
  const shell = chartRoot?.closest(".chart-shell");
  if (!chartRoot || !shell) return;

  const controlsContainer = document.createElement("div");
  controlsContainer.className = "metric-toggle";
  controlsContainer.style.marginBottom = "1rem";

  const label = document.createElement("label");
  label.setAttribute("for", "viz5-metric-select");
  label.className = "sr-only";
  label.textContent = "Select metric to display";

  const select = document.createElement("select");
  select.id = "viz5-metric-select";
  select.className = "metric-toggle__button";
  select.style.cursor = "pointer";

  Object.entries(VIZ5_METRICS).forEach(([key, metric]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = metric.label;
    select.appendChild(option);
  });

  controlsContainer.appendChild(label);
  controlsContainer.appendChild(select);
  shell.insertBefore(controlsContainer, chartRoot);

  const rows = await d3.csv("AB_NYC_2019_clean_5000.csv", (row) => ({
    neighbourhood_group: row.neighbourhood_group,
    room_type: row.room_type,
    price: Number(row.price),
    availability: Number(row.availability_365),
  }));

  const priceData = summarizePriceHeatmap(rows);
  const availabilityData = summarizeAvailabilityHeatmap(rows);

  function updateChart() {
    const selectedMetric = select.value;
    const metric = VIZ5_METRICS[selectedMetric];
    const data = selectedMetric === "price" ? priceData : availabilityData;
    renderViz5Heatmap(chartRoot, shell, data, metric);
  }

  select.addEventListener("change", updateChart);

  updateChart();
}

initViz5Heatmap().catch((error) => {
  const chartRoot = document.getElementById("viz5-chart");
  if (chartRoot) {
    chartRoot.innerHTML =
      '<p class="chart-error">Failed to load heatmap data.</p>';
  }
  console.error(error);
});
