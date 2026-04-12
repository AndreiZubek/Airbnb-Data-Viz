(() => {
const VIZ5_BOROUGHS = ["All boroughs", "Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"];

function getViz5Tooltip(root) {
  let tooltip = root.querySelector(".viz5-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "viz2-tooltip viz5-tooltip";
    tooltip.hidden = true;
    root.appendChild(tooltip);
  }
  return tooltip;
}

function positionViz5Tooltip(tooltip, root, event) {
  const bounds = root.getBoundingClientRect();
  tooltip.style.left = `${Math.min(Math.max(8, event.clientX - bounds.left + 16), bounds.width - tooltip.offsetWidth - 8)}px`;
  tooltip.style.top = `${Math.min(Math.max(8, event.clientY - bounds.top + 16), bounds.height - tooltip.offsetHeight - 8)}px`;
}

function renderViz5Controls(controlsRoot, onBoroughChange) {
  controlsRoot.innerHTML = "";

  const label = document.createElement("label");
  label.setAttribute("for", "viz5-borough-select");
  label.className = "sr-only";
  label.textContent = "Filter by borough";

  const select = document.createElement("select");
  select.id = "viz5-borough-select";
  select.className = "metric-toggle__button";
  select.style.cursor = "pointer";

  VIZ5_BOROUGHS.forEach((borough) => {
    const option = document.createElement("option");
    option.value = borough;
    option.textContent = borough;
    select.appendChild(option);
  });

  select.addEventListener("change", () => onBoroughChange(select.value));
  controlsRoot.appendChild(label);
  controlsRoot.appendChild(select);
}

function renderViz5Legend(svg, colorScale, priceExtent, width, height, margin) {
  const legendWidth = Math.min(220, width - margin.left - margin.right);
  const legendHeight = 11;
  const legendX = margin.left;
  const legendY = height - margin.bottom + 32;

  const defs = svg.select("defs").empty() ? svg.append("defs") : svg.select("defs");
  const gradient = defs.append("linearGradient").attr("id", "viz5-price-gradient");

  gradient
    .selectAll("stop")
    .data(d3.range(0, 1.01, 0.1))
    .join("stop")
    .attr("offset", (d) => `${d * 100}%`)
    .attr("stop-color", (d) => colorScale(priceExtent[0] + d * (priceExtent[1] - priceExtent[0])));

  svg.append("rect")
    .attr("x", legendX).attr("y", legendY)
    .attr("width", legendWidth).attr("height", legendHeight)
    .attr("fill", "url(#viz5-price-gradient)").attr("rx", 4);

  const axis = d3.axisBottom(d3.scaleLinear().domain(priceExtent).range([legendX, legendX + legendWidth]))
    .ticks(5)
    .tickFormat((v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v));

  svg.append("g").attr("class", "heatmap-legend")
    .attr("transform", `translate(0, ${legendY + legendHeight})`)
    .call(axis)
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("line").remove());

  svg.append("text").attr("class", "heatmap-legend-title")
    .attr("x", legendX).attr("y", legendY - 8)
    .text("Nightly price");
}

function renderViz5Map(chartRoot, shell, allRows, selectedBorough) {
  chartRoot.innerHTML = "";

  const filtered = selectedBorough === "All boroughs"
    ? allRows
    : allRows.filter((r) => r.borough === selectedBorough);

  const width = Math.max(640, Math.min(chartRoot.clientWidth || 760, 900));
  const margin = { top: 18, right: 24, bottom: 72, left: 24 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = 420;
  const height = innerHeight + margin.top + margin.bottom;

  const svg = d3.select(chartRoot).append("svg").attr("viewBox", `0 0 ${width} ${height}`);

  const xScale = d3.scaleLinear().domain(d3.extent(allRows, (d) => d.lng)).range([margin.left, margin.left + innerWidth]);
  const yScale = d3.scaleLinear().domain(d3.extent(allRows, (d) => d.lat)).range([margin.top + innerHeight, margin.top]);

  const priceExtent = d3.extent(allRows, (d) => d.price);
  const colorScale = d3.scaleSequential().domain(priceExtent).interpolator(d3.interpolateYlOrRd);

  svg.append("rect")
    .attr("x", margin.left).attr("y", margin.top)
    .attr("width", innerWidth).attr("height", innerHeight)
    .attr("fill", "#e8f0f7").attr("rx", 6);

  const tooltip = getViz5Tooltip(shell);

  svg.append("g").selectAll("circle")
    .data(filtered)
    .join("circle")
    .attr("cx", (d) => xScale(d.lng))
    .attr("cy", (d) => yScale(d.lat))
    .attr("r", 3)
    .attr("fill", (d) => colorScale(d.price))
    .attr("stroke", "rgba(0,0,0,0.15)")
    .attr("stroke-width", 0.4)
    .attr("opacity", 0.72)
    .on("mousemove", (event, d) => {
      tooltip.innerHTML = `
        <strong>${d.name || "Listing"}</strong>
        <span>${d.neighbourhood} · ${d.borough}</span>
        <span>${d.roomType}</span>
        <span>$${d.price}/night</span>
      `;
      tooltip.hidden = false;
      positionViz5Tooltip(tooltip, shell, event);
    })
    .on("mouseleave", () => { tooltip.hidden = true; });

  svg.append("text").attr("class", "heatmap-legend-title")
    .attr("x", margin.left + innerWidth).attr("y", margin.top - 4)
    .attr("text-anchor", "end")
    .text(`${filtered.length.toLocaleString()} listings shown`);

  renderViz5Legend(svg, colorScale, priceExtent, width, height, margin);
}

async function initViz5Map() {
  const chartRoot = document.getElementById("viz1-chart");
  const controlsRoot = document.getElementById("viz1-controls");
  const shell = chartRoot?.closest(".chart-shell");
  if (!chartRoot || !shell) return;

  const rows = await d3.csv("AB_NYC_2019_clean_5000.csv", (row) => {
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);
    const price = Number(row.price);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(price) || price <= 0) {
      return null;
    }
    return {
      name: row.name,
      borough: row.neighbourhood_group?.trim(),
      neighbourhood: row.neighbourhood?.trim(),
      roomType: row.room_type?.trim(),
      lat,
      lng,
      price,
    };
  });

  const validRows = rows.filter(Boolean);
  let selectedBorough = "All boroughs";

  if (controlsRoot) {
    renderViz5Controls(controlsRoot, (borough) => {
      selectedBorough = borough;
      renderViz5Map(chartRoot, shell, validRows, selectedBorough);
    });
  }

  renderViz5Map(chartRoot, shell, validRows, selectedBorough);
}

initViz5Map().catch((error) => {
  const chartRoot = document.getElementById("viz1-chart");
  if (chartRoot) {
    chartRoot.innerHTML = '<p class="chart-error">Failed to load chart data.</p>';
  }
  console.error(error);
});

})();
