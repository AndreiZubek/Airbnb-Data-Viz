const VIZ3_ROOM_TYPES = ["Entire home/apt", "Private room", "Shared room"];

function summarizeRoomTypePrices(rows) {
  const grouped = d3.group(
    rows.filter((row) => row.room_type && Number.isFinite(row.price) && row.price > 0),
    (row) => row.room_type.trim(),
  );

  return VIZ3_ROOM_TYPES.map((roomType) => {
    const prices = (grouped.get(roomType) || [])
      .map((row) => row.price)
      .sort((a, b) => a - b);

    const q1 = d3.quantileSorted(prices, 0.25);
    const median = d3.quantileSorted(prices, 0.5);
    const q3 = d3.quantileSorted(prices, 0.75);
    const iqr = q3 - q1;
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;
    const whiskerLow = d3.min(prices.filter((price) => price >= lowerFence));
    const whiskerHigh = d3.max(prices.filter((price) => price <= upperFence));

    return {
      roomType,
      count: prices.length,
      q1,
      median,
      q3,
      whiskerLow,
      whiskerHigh,
      mean: d3.mean(prices),
    };
  });
}

function formatViz3Currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getViz3Tooltip(root) {
  let tooltip = root.querySelector(".viz3-tooltip");

  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "viz2-tooltip viz3-tooltip";
    tooltip.hidden = true;
    root.appendChild(tooltip);
  }

  return tooltip;
}

function positionViz3Tooltip(tooltip, root, event) {
  const bounds = root.getBoundingClientRect();
  const left = Math.min(Math.max(8, event.clientX - bounds.left + 16), bounds.width - tooltip.offsetWidth - 8);
  const top = Math.min(Math.max(8, event.clientY - bounds.top + 16), bounds.height - tooltip.offsetHeight - 8);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function renderViz3Legend(svg, width, margin) {
  const legendX = Math.max(margin.left + 8, width - margin.right - 210);
  const legendY = 16;
  const legend = svg.append("g").attr("class", "viz3-legend").attr("transform", `translate(${legendX}, ${legendY})`);

  legend.append("text").attr("class", "viz3-legend-title").attr("x", 0).attr("y", 0).text("How to read this chart");

  const boxRowY = 24;
  legend
    .append("rect")
    .attr("class", "viz3-box")
    .attr("x", 0)
    .attr("y", boxRowY - 10)
    .attr("width", 22)
    .attr("height", 12)
    .attr("rx", 4);

  legend
    .append("text")
    .attr("class", "viz3-legend-label")
    .attr("x", 32)
    .attr("y", boxRowY)
    .text("Middle 50% of prices");

  const medianRowY = 46;
  legend
    .append("line")
    .attr("class", "viz3-median")
    .attr("x1", 0)
    .attr("x2", 22)
    .attr("y1", medianRowY - 4)
    .attr("y2", medianRowY - 4);

  legend
    .append("text")
    .attr("class", "viz3-legend-label")
    .attr("x", 32)
    .attr("y", medianRowY)
    .text("Median price");

  const whiskerRowY = 68;
  legend
    .append("line")
    .attr("class", "viz3-whisker")
    .attr("x1", 11)
    .attr("x2", 11)
    .attr("y1", whiskerRowY - 12)
    .attr("y2", whiskerRowY + 2);

  legend
    .append("line")
    .attr("class", "viz3-whisker-cap")
    .attr("x1", 4)
    .attr("x2", 18)
    .attr("y1", whiskerRowY - 12)
    .attr("y2", whiskerRowY - 12);

  legend
    .append("line")
    .attr("class", "viz3-whisker-cap")
    .attr("x1", 4)
    .attr("x2", 18)
    .attr("y1", whiskerRowY + 2)
    .attr("y2", whiskerRowY + 2);

  legend
    .append("text")
    .attr("class", "viz3-legend-label")
    .attr("x", 32)
    .attr("y", whiskerRowY)
    .text("Typical range");
}

function renderViz3Distribution(chartRoot, shell, summary) {
  chartRoot.innerHTML = "";

  const width = Math.max(640, Math.min(chartRoot.clientWidth || 720, 860));
  const height = 390;
  const margin = { top: 90, right: 24, bottom: 62, left: 76 };
  const svg = d3.select(chartRoot).append("svg").attr("viewBox", `0 0 ${width} ${height}`);

  const x = d3
    .scaleBand()
    .domain(VIZ3_ROOM_TYPES)
    .range([margin.left, width - margin.right])
    .padding(0.35);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(summary, (d) => d.whiskerHigh) * 1.05])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call((group) => group.select(".domain").remove())
    .call((group) => group.selectAll("text").attr("class", "heatmap-axis-text"));

  svg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat((d) => `$${d}`))
    .call((group) => group.select(".domain").remove())
    .call((group) => group.selectAll("text").attr("class", "heatmap-axis-text"));

  svg
    .append("text")
    .attr("class", "heatmap-axis-label")
    .attr("x", (margin.left + width - margin.right) / 2)
    .attr("y", height - 12)
    .attr("text-anchor", "middle")
    .text("Room type");

  svg
    .append("text")
    .attr("class", "heatmap-axis-label")
    .attr("x", -((margin.top + height - margin.bottom) / 2))
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Nightly price (USD)");

  renderViz3Legend(svg, width, margin);

  const tooltip = getViz3Tooltip(shell);
  const groups = svg
    .append("g")
    .selectAll("g")
    .data(summary)
    .join("g")
    .attr("transform", (d) => `translate(${x(d.roomType)}, 0)`)
    .on("mousemove", (event, datum) => {
      tooltip.innerHTML = `
        <strong>${datum.roomType}</strong>
        <span>Listings: ${datum.count}</span>
        <span>Q1: ${formatViz3Currency(datum.q1)}</span>
        <span>Median: ${formatViz3Currency(datum.median)}</span>
        <span>Q3: ${formatViz3Currency(datum.q3)}</span>
      `;
      tooltip.hidden = false;
      positionViz3Tooltip(tooltip, shell, event);
    })
    .on("mouseleave", () => {
      tooltip.hidden = true;
    });

  groups
    .append("line")
    .attr("class", "viz3-whisker")
    .attr("x1", x.bandwidth() / 2)
    .attr("x2", x.bandwidth() / 2)
    .attr("y1", (d) => y(d.whiskerLow))
    .attr("y2", (d) => y(d.whiskerHigh));

  groups
    .append("line")
    .attr("class", "viz3-whisker-cap")
    .attr("x1", x.bandwidth() * 0.25)
    .attr("x2", x.bandwidth() * 0.75)
    .attr("y1", (d) => y(d.whiskerLow))
    .attr("y2", (d) => y(d.whiskerLow));

  groups
    .append("line")
    .attr("class", "viz3-whisker-cap")
    .attr("x1", x.bandwidth() * 0.25)
    .attr("x2", x.bandwidth() * 0.75)
    .attr("y1", (d) => y(d.whiskerHigh))
    .attr("y2", (d) => y(d.whiskerHigh));

  groups
    .append("rect")
    .attr("class", "viz3-box")
    .attr("x", 0)
    .attr("width", x.bandwidth())
    .attr("y", (d) => y(d.q3))
    .attr("height", (d) => Math.max(1, y(d.q1) - y(d.q3)))
    .attr("rx", 6);

  groups
    .append("line")
    .attr("class", "viz3-median")
    .attr("x1", 0)
    .attr("x2", x.bandwidth())
    .attr("y1", (d) => y(d.median))
    .attr("y2", (d) => y(d.median));
}

async function initViz3Distribution() {
  const chartRoot = document.getElementById("viz3-chart");
  const shell = chartRoot?.closest(".chart-shell");
  if (!chartRoot || !shell) return;

  const rows = await d3.csv("AB_NYC_2019_clean_5000.csv", (row) => ({
    room_type: row.room_type,
    price: Number(row.price),
  }));

  const summary = summarizeRoomTypePrices(rows);
  renderViz3Distribution(chartRoot, shell, summary);
}

initViz3Distribution().catch((error) => {
  const chartRoot = document.getElementById("viz3-chart");
  if (chartRoot) {
    chartRoot.innerHTML = '<p class="chart-error">Failed to load chart data.</p>';
  }
  console.error(error);
});
