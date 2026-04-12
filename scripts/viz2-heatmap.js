const BOROUGHS = ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"];
const ROOM_TYPES = ["Entire home/apt", "Private room", "Shared room"];
const METRICS = [
  { key: "average", label: "Average price" },
  { key: "median", label: "Median price" },
];

function buildHeatmapData(rows) {
  const filteredRows = rows.filter((row) => {
    const borough = row.neighbourhood_group?.trim();
    const roomType = row.room_type?.trim();
    return borough && roomType && Number.isFinite(row.price) && row.price > 0;
  });

  const grouped = d3.rollups(
    filteredRows,
    (values) => {
      const prices = values.map((row) => row.price);
      return {
        count: prices.length,
        average: d3.mean(prices),
        median: d3.median(prices),
      };
    },
    (row) => row.neighbourhood_group.trim(),
    (row) => row.room_type.trim(),
  );

  const lookup = new Map();

  grouped.forEach(([borough, roomGroups]) => {
    roomGroups.forEach(([roomType, stats]) => {
      lookup.set(`${borough}__${roomType}`, stats);
    });
  });

  return BOROUGHS.flatMap((borough) =>
    ROOM_TYPES.map((roomType) => {
      const stats = lookup.get(`${borough}__${roomType}`);

      return {
        borough,
        roomType,
        count: stats?.count ?? 0,
        average: stats?.average ?? null,
        median: stats?.median ?? null,
      };
    }),
  );
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) {
    return "No data";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getCellFill(datum, metric, colorScale) {
  if (datum.count === 0) {
    return "#f1ece3";
  }

  return colorScale(datum[metric]);
}

function getLabelColor(fill) {
  const color = d3.color(fill);

  if (!color) {
    return "#1f2933";
  }

  const luminance = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
  return luminance < 0.58 ? "#fffdf8" : "#1f2933";
}

function renderControls(root, selectedMetric, onChange) {
  root.innerHTML = "";

  const group = document.createElement("div");
  group.className = "metric-toggle";
  group.setAttribute("aria-label", "Select the price statistic shown in the heatmap");

  METRICS.forEach((metric) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "metric-toggle__button";
    button.textContent = metric.label;
    button.dataset.metric = metric.key;
    button.setAttribute("aria-pressed", metric.key === selectedMetric ? "true" : "false");

    if (metric.key === selectedMetric) {
      button.classList.add("is-active");
    }

    button.addEventListener("click", () => onChange(metric.key));
    group.appendChild(button);
  });

  root.appendChild(group);
}

function getTooltip(root) {
  let tooltip = root.querySelector(".viz2-tooltip");

  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "viz2-tooltip";
    tooltip.hidden = true;
    root.appendChild(tooltip);
  }

  return tooltip;
}

function installTooltipDismissal(chartShell, tooltip) {
  if (chartShell.dataset.tooltipDismissalInstalled === "true") {
    return;
  }

  chartShell.addEventListener("mouseleave", () => hideTooltip(tooltip));
  chartShell.addEventListener("touchend", () => hideTooltip(tooltip), { passive: true });
  window.addEventListener("scroll", () => hideTooltip(tooltip), { passive: true });

  chartShell.dataset.tooltipDismissalInstalled = "true";
}

function updateTooltipPosition(tooltip, containerBounds, event) {
  const offsetX = 16;
  const offsetY = 16;
  const maxLeft = containerBounds.width - tooltip.offsetWidth - 8;
  const maxTop = containerBounds.height - tooltip.offsetHeight - 8;

  const left = Math.max(8, Math.min(event.clientX - containerBounds.left + offsetX, maxLeft));
  const top = Math.max(8, Math.min(event.clientY - containerBounds.top + offsetY, maxTop));

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function showTooltip(tooltip, container, event, datum) {
  tooltip.innerHTML = `
    <strong>${datum.borough}</strong>
    <span>${datum.roomType}</span>
    <span>Listings: ${datum.count}</span>
    <span>Average: ${formatCurrency(datum.average)}</span>
    <span>Median: ${formatCurrency(datum.median)}</span>
  `;
  tooltip.hidden = false;
  updateTooltipPosition(tooltip, container.getBoundingClientRect(), event);
}

function hideTooltip(tooltip) {
  tooltip.hidden = true;
}

function renderLegend(svg, colorScale, metric, width, height, margin) {
  const legendWidth = Math.min(240, width - margin.left - margin.right);
  const legendHeight = 12;
  const legendX = margin.left;
  const legendY = height - margin.bottom + 44;

  const defs = svg.append("defs");
  const gradientId = `heatmap-gradient-${metric}`;
  const gradient = defs.append("linearGradient").attr("id", gradientId);

  gradient
    .selectAll("stop")
    .data(d3.range(0, 1.01, 0.1))
    .join("stop")
    .attr("offset", (d) => `${d * 100}%`)
    .attr("stop-color", (d) => colorScale(colorScale.domain()[0] + d * (colorScale.domain()[1] - colorScale.domain()[0])));

  svg
    .append("rect")
    .attr("x", legendX)
    .attr("y", legendY)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", `url(#${gradientId})`)
    .attr("rx", 4);

  const domain = colorScale.domain();
  const legendScale = d3.scaleLinear().domain(domain).range([legendX, legendX + legendWidth]);

  const axis = d3
    .axisBottom(legendScale)
    .tickValues(domain)
    .tickFormat((value) => formatCurrency(value));

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
    .text(metric === "average" ? "Average price" : "Median price");
}

function renderHeatmap(chartRoot, chartShell, data, metric) {
  chartRoot.innerHTML = "";

  const width = Math.max(640, Math.min(chartRoot.clientWidth || 720, 860));
  const height = 360;
  const margin = { top: 30, right: 24, bottom: 92, left: 158 };

  const svg = d3
    .select(chartRoot)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", "Heatmap comparing Airbnb price statistics by borough and room type");

  const xScale = d3
    .scaleBand()
    .domain(BOROUGHS)
    .range([margin.left, width - margin.right])
    .paddingInner(0.08)
    .paddingOuter(0.04);

  const yScale = d3
    .scaleBand()
    .domain(ROOM_TYPES)
    .range([margin.top, height - margin.bottom])
    .paddingInner(0.12)
    .paddingOuter(0.02);

  const metricValues = data
    .map((datum) => datum[metric])
    .filter((value) => Number.isFinite(value));

  const colorScale = d3
    .scaleSequential()
    .domain(d3.extent(metricValues))
    .interpolator(d3.interpolateYlOrBr);

  const enrichedData = data.map((datum) => {
    const fill = getCellFill(datum, metric, colorScale);
    return {
      ...datum,
      fill,
      labelColor: getLabelColor(fill),
    };
  });

  const defs = svg.append("defs");
  const emptyPattern = defs
    .append("pattern")
    .attr("id", "heatmap-empty-pattern")
    .attr("patternUnits", "userSpaceOnUse")
    .attr("width", 8)
    .attr("height", 8)
    .attr("patternTransform", "rotate(45)");

  emptyPattern.append("rect").attr("width", 8).attr("height", 8).attr("fill", "#f8f4ed");
  emptyPattern
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 0)
    .attr("y2", 8)
    .attr("stroke", "#d9cdbd")
    .attr("stroke-width", 2);

  svg
    .append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).tickSize(0))
    .call((group) => group.select(".domain").remove())
    .call((group) => group.selectAll("text").attr("class", "heatmap-axis-text"));

  svg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale).tickSize(0))
    .call((group) => group.select(".domain").remove())
    .call((group) => group.selectAll("text").attr("class", "heatmap-axis-text"));

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

  const tooltip = getTooltip(chartShell);
  installTooltipDismissal(chartShell, tooltip);

  svg
    .append("g")
    .selectAll("rect")
    .data(enrichedData)
    .join("rect")
    .attr("class", (datum) => `heatmap-cell${datum.count === 0 ? " is-empty" : ""}`)
    .attr("x", (datum) => xScale(datum.borough))
    .attr("y", (datum) => yScale(datum.roomType))
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("rx", 6)
    .attr("fill", (datum) => (datum.count === 0 ? "url(#heatmap-empty-pattern)" : datum.fill))
    .on("mousemove", (event, datum) => showTooltip(tooltip, chartShell, event, datum))
    .on("mouseleave", () => hideTooltip(tooltip));

  svg.on("mousemove", (event) => {
    const target = event.target;
    if (!(target instanceof SVGRectElement) || !target.classList.contains("heatmap-cell")) {
      hideTooltip(tooltip);
    }
  });

  svg.on("mouseleave", () => hideTooltip(tooltip));

  svg
    .append("g")
    .selectAll("text")
    .data(enrichedData.filter((datum) => datum.count > 0))
    .join("text")
    .attr("class", "heatmap-cell-label")
    .attr("x", (datum) => xScale(datum.borough) + xScale.bandwidth() / 2)
    .attr("y", (datum) => yScale(datum.roomType) + yScale.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .style("fill", (datum) => datum.labelColor)
    .text((datum) => formatCurrency(datum[metric]));

  svg
    .append("g")
    .selectAll("text")
    .data(enrichedData.filter((datum) => datum.count === 0))
    .join("text")
    .attr("class", "heatmap-empty-label")
    .attr("x", (datum) => xScale(datum.borough) + xScale.bandwidth() / 2)
    .attr("y", (datum) => yScale(datum.roomType) + yScale.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .text("No listings");

  renderLegend(svg, colorScale, metric, width, height, margin);
}

function showErrorMessage(chartRoot, message) {
  chartRoot.innerHTML = `<p class="chart-error">${message}</p>`;
}

async function initViz2Heatmap() {
  const controlsRoot = document.getElementById("viz2-controls");
  const chartRoot = document.getElementById("viz2-chart");
  const chartShell = chartRoot?.closest(".chart-shell");

  if (!controlsRoot || !chartRoot || !chartShell) {
    return;
  }

  const rows = await d3.csv("AB_NYC_2019_clean_5000.csv", (row) => ({
    neighbourhood_group: row.neighbourhood_group,
    room_type: row.room_type,
    price: Number(row.price),
  }));

  const data = buildHeatmapData(rows);
  let selectedMetric = "average";

  const syncView = () => {
    renderControls(controlsRoot, selectedMetric, (nextMetric) => {
      selectedMetric = nextMetric;
      syncView();
    });
    renderHeatmap(chartRoot, chartShell, data, selectedMetric);
  };

  syncView();
}

initViz2Heatmap().catch((error) => {
  const chartRoot = document.getElementById("viz2-chart");

  if (chartRoot) {
    showErrorMessage(chartRoot, "Failed to load chart data.");
  }

  console.error(error);
});
