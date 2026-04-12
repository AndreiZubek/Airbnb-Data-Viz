function formatViz4Currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function linearRegression(points) {
  const n = points.length;
  const sumX = d3.sum(points, (d) => d.reviews);
  const sumY = d3.sum(points, (d) => d.price);
  const sumXY = d3.sum(points, (d) => d.reviews * d.price);
  const sumXX = d3.sum(points, (d) => d.reviews * d.reviews);
  const denominator = n * sumXX - sumX * sumX;

  if (!denominator) {
    return { slope: 0, intercept: d3.mean(points, (d) => d.price) || 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function renderViz4Scatter(chartRoot, shell, points) {
  chartRoot.innerHTML = "";

  const width = Math.max(740, Math.min(chartRoot.clientWidth || 860, 980));
  const height = 460;
  const margin = { top: 26, right: 28, bottom: 58, left: 76 };
  const svg = d3.select(chartRoot).append("svg").attr("viewBox", `0 0 ${width} ${height}`);

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(points, (d) => d.reviews) * 1.05])
    .nice()
    .range([margin.left, width - margin.right]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(points, (d) => d.price) * 1.08])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const tooltip = shell.querySelector(".scatter-tooltip") || document.createElement("div");
  if (!tooltip.parentNode) {
    tooltip.className = "viz2-tooltip scatter-tooltip";
    tooltip.hidden = true;
    shell.appendChild(tooltip);
  }

  svg
    .append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6))
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
    .text("Number of reviews");

  svg
    .append("text")
    .attr("class", "heatmap-axis-label")
    .attr("x", -((margin.top + height - margin.bottom) / 2))
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Price (USD)");

  svg
    .append("g")
    .selectAll("circle")
    .data(points)
    .join("circle")
    .attr("class", "scatter-point")
    .attr("cx", (d) => x(d.reviews))
    .attr("cy", (d) => y(d.price))
    .attr("r", 3.4)
    .attr("fill", "#d97706")
    .attr("fill-opacity", 0.38)
    .attr("stroke", "#9a3412")
    .attr("stroke-opacity", 0.25)
    .on("mousemove", (event, datum) => {
      tooltip.innerHTML = `
        <strong>${datum.name || "Listing"}</strong>
        <span>${datum.neighbourhood_group} · ${datum.room_type}</span>
        <span>Price: ${formatViz4Currency(datum.price)}</span>
        <span>Reviews: ${datum.reviews}</span>
      `;
      tooltip.hidden = false;
      const bounds = shell.getBoundingClientRect();
      const left = Math.min(Math.max(8, event.clientX - bounds.left + 16), bounds.width - tooltip.offsetWidth - 8);
      const top = Math.min(Math.max(8, event.clientY - bounds.top + 16), bounds.height - tooltip.offsetHeight - 8);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    })
    .on("mouseleave", () => {
      tooltip.hidden = true;
    });

  const regression = linearRegression(points);
  const xDomain = x.domain();
  const lineData = xDomain.map((xValue) => ({
    x: xValue,
    y: regression.slope * xValue + regression.intercept,
  }));

  svg
    .append("path")
    .datum(lineData)
    .attr("class", "scatter-trendline")
    .attr(
      "d",
      d3
        .line()
        .x((d) => x(d.x))
        .y((d) => y(d.y))
        .curve(d3.curveMonotoneX),
    );

  const note = document.getElementById("viz4-note");
  if (note) {
    note.textContent = "The trendline is slightly downward, so the relationship between price and review count is weak.";
  }
}

async function initViz4Scatter() {
  const chartRoot = document.getElementById("viz4-chart");
  const shell = chartRoot?.closest(".chart-shell");
  if (!chartRoot || !shell) return;

  const rows = await d3.csv("AB_NYC_2019_clean_5000.csv", (row) => ({
    name: row.name,
    neighbourhood_group: row.neighbourhood_group,
    room_type: row.room_type,
    price: Number(row.price),
    reviews: Number(row.number_of_reviews),
  }));

  const points = rows.filter((row) => Number.isFinite(row.price) && row.price > 0 && Number.isFinite(row.reviews) && row.reviews >= 0);
  renderViz4Scatter(chartRoot, shell, points);
}

initViz4Scatter().catch((error) => {
  const chartRoot = document.getElementById("viz4-chart");
  if (chartRoot) {
    chartRoot.innerHTML = '<p class="chart-error">Failed to load scatter plot data.</p>';
  }
  console.error(error);
});
