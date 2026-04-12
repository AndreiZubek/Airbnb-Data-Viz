const VIZ3_BOROUGH_COLORS = {
  Bronx: "#7c3aed",
  Brooklyn: "#d97706",
  Manhattan: "#0f766e",
  Queens: "#2563eb",
  "Staten Island": "#ca8a04",
};

const VIZ3_TOP_NEIGHBORHOODS = 20;

function formatViz3BarCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildNeighborhoodAverages(rows) {
  const grouped = d3.rollups(
    rows.filter((row) => row.neighbourhood && row.neighbourhood_group && Number.isFinite(row.price) && row.price > 0),
    (values) => ({
      count: values.length,
      average: d3.mean(values, (row) => row.price),
    }),
    (row) => row.neighbourhood.trim(),
    (row) => row.neighbourhood_group.trim(),
  );

  const items = [];

  grouped.forEach(([neighborhood, boroughGroups]) => {
    boroughGroups.forEach(([borough, stats]) => {
      items.push({
        neighborhood,
        borough,
        label: `${neighborhood} (${borough})`,
        count: stats.count,
        average: stats.average,
      });
    });
  });

  return items
    .sort((a, b) => d3.descending(a.average, b.average) || d3.descending(a.count, b.count))
    .slice(0, VIZ3_TOP_NEIGHBORHOODS);
}

function renderViz3Legend(root) {
  root.innerHTML = `
    <div class="bar-legend">
      ${Object.entries(VIZ3_BOROUGH_COLORS)
        .map(
          ([borough, color]) => `
            <div class="bar-legend__item">
              <span class="bar-legend__swatch" style="background:${color}"></span>
              <span>${borough}</span>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderViz3NeighborhoodBars(chartRoot, shell, summary) {
  chartRoot.innerHTML = "";

  const barHeight = 26;
  const width = Math.max(760, Math.min(chartRoot.clientWidth || 900, 1100));
  const height = Math.max(480, summary.length * barHeight + 140);
  const margin = { top: 24, right: 32, bottom: 48, left: 250 };
  const svg = d3.select(chartRoot).append("svg").attr("viewBox", `0 0 ${width} ${height}`);

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(summary, (d) => d.average) * 1.08])
    .nice()
    .range([margin.left, width - margin.right]);

  const y = d3
    .scaleBand()
    .domain(summary.map((d) => d.label))
    .range([margin.top, height - margin.bottom])
    .padding(0.22);

  const tooltip = shell.querySelector(".bar-tooltip") || document.createElement("div");
  if (!tooltip.parentNode) {
    tooltip.className = "viz2-tooltip bar-tooltip";
    tooltip.hidden = true;
    shell.appendChild(tooltip);
  }

  const legendRoot = document.getElementById("viz3-legend");
  if (legendRoot) {
    renderViz3Legend(legendRoot);
  }

  svg
    .append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat((d) => `$${d}`))
    .call((group) => group.select(".domain").remove())
    .call((group) => group.selectAll("text").attr("class", "bar-axis-text"));

  svg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).tickSize(0))
    .call((group) => group.select(".domain").remove())
    .call((group) => group.selectAll("text").attr("class", "bar-axis-text"));

  svg
    .append("text")
    .attr("class", "heatmap-axis-label")
    .attr("x", (margin.left + width - margin.right) / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .text("Average price");

  svg
    .append("text")
    .attr("class", "heatmap-axis-label")
    .attr("x", -((margin.top + height - margin.bottom) / 2))
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Neighborhood");

  svg
    .append("g")
    .selectAll("rect")
    .data(summary)
    .join("rect")
    .attr("class", "bar-rect")
    .attr("x", x(0))
    .attr("y", (d) => y(d.label))
    .attr("width", (d) => Math.max(1, x(d.average) - x(0)))
    .attr("height", y.bandwidth())
    .attr("rx", 5)
    .attr("fill", (d) => VIZ3_BOROUGH_COLORS[d.borough] || "#d97706")
    .on("mousemove", (event, datum) => {
      tooltip.innerHTML = `
        <strong>${datum.neighborhood}</strong>
        <span>${datum.borough}</span>
        <span>Listings: ${datum.count}</span>
        <span>Average price: ${formatViz3BarCurrency(datum.average)}</span>
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
}

async function initViz3NeighborhoodBars() {
  const chartRoot = document.getElementById("viz3-chart");
  const shell = chartRoot?.closest(".chart-shell");
  if (!chartRoot || !shell) return;

  const rows = await d3.csv("AB_NYC_2019_clean_5000.csv", (row) => ({
    neighbourhood: row.neighbourhood,
    neighbourhood_group: row.neighbourhood_group,
    price: Number(row.price),
  }));

  renderViz3NeighborhoodBars(chartRoot, shell, buildNeighborhoodAverages(rows));
}

initViz3NeighborhoodBars().catch((error) => {
  const chartRoot = document.getElementById("viz3-chart");
  if (chartRoot) {
    chartRoot.innerHTML = '<p class="chart-error">Failed to load bar chart data.</p>';
  }
  console.error(error);
});
