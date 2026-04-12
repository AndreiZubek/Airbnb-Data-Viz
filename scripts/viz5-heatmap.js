const VIZ5_BOROUGHS = ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"];
const VIZ5_ROOM_TYPES = ["Entire home/apt", "Private room", "Shared room"];

function formatViz5Currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function summarizePriceHeatmap(rows) {
  const grouped = d3.rollups(
    rows.filter((row) => row.neighbourhood_group && row.room_type && Number.isFinite(row.price) && row.price > 0),
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

function renderViz5Legend(svg, colorScale, width, height, margin) {
  const legendWidth = Math.min(250, width - margin.left - margin.right);
  const legendHeight = 12;
  const legendX = margin.left;
  const legendY = height - margin.bottom + 44;
  const [minValue, maxValue] = colorScale.domain();

  const defs = svg.append("defs");
  const gradientId = "viz5-price-gradient";
  const gradient = defs.append("linearGradient").attr("id", gradientId);

  gradient
    .selectAll("stop")
    .data(d3.range(0, 1.01, 0.1))
    .join("stop")
    .attr("offset", (d) => `${d * 100}%`)
    .attr("stop-color", (d) => colorScale(minValue + d * (maxValue - minValue)));

  svg
    .append("rect")
    .attr("x", legendX)
    .attr("y", legendY)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", `url(#${gradientId})`)
    .attr("rx", 4);

  const legendScale = d3.scaleLinear().domain([minValue, maxValue]).range([legendX, legendX + legendWidth]);
  const axis = d3.axisBottom(legendScale).ticks(3).tickFormat((value) => formatViz5Currency(value));

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
    .text("Average price");
}

function renderViz5Heatmap(chartRoot, shell, data) {
  chartRoot.innerHTML = "";
  const width = Math.max(640, Math.min(chartRoot.clientWidth || 720, 860));
  const height = 390;
  const margin = { top: 30, right: 24, bottom: 92, left: 158 };
  const svg = d3.select(chartRoot).append("svg").attr("viewBox", `0 0 ${width} ${height}`);

  const x = d3.scaleBand().domain(VIZ5_BOROUGHS).range([margin.left, width - margin.right]).paddingInner(0.08).paddingOuter(0.04);
  const y = d3.scaleBand().domain(VIZ5_ROOM_TYPES).range([margin.top, height - margin.bottom]).paddingInner(0.12).paddingOuter(0.02);
  const values = data.map((d) => d.average).filter(Number.isFinite);
  const color = d3.scaleSequential().domain(d3.extent(values)).interpolator(d3.interpolateYlOrBr);

  svg
    .append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call((group) => group.select(".domain").remove())
    .call((group) => group.selectAll("text").attr("class", "heatmap-axis-text"));

  svg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).tickSize(0))
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

  renderViz5Legend(svg, color, width, height, margin);

  const tooltip = shell.querySelector(".viz5-tooltip") || document.createElement("div");
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
    .attr("fill", (d) => (d.count === 0 ? "#f1ece3" : color(d.average)))
    .on("mousemove", (event, datum) => {
      tooltip.innerHTML = `
        <strong>${datum.borough}</strong>
        <span>${datum.roomType}</span>
        <span>Listings: ${datum.count}</span>
        <span>Average price: ${datum.average ? formatViz5Currency(datum.average) : "No data"}</span>
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
      const c = d3.color(color(d.average));
      const luminance = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
      return luminance < 0.58 ? "#fffdf8" : "#1f2933";
    })
    .text((d) => `$${Math.round(d.average)}`);

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

  const rows = await d3.csv("AB_NYC_2019_clean_5000.csv", (row) => ({
    neighbourhood_group: row.neighbourhood_group,
    room_type: row.room_type,
    price: Number(row.price),
  }));

  renderViz5Heatmap(chartRoot, shell, summarizePriceHeatmap(rows));
}

initViz5Heatmap().catch((error) => {
  const chartRoot = document.getElementById("viz5-chart");
  if (chartRoot) {
    chartRoot.innerHTML = '<p class="chart-error">Failed to load heatmap data.</p>';
  }
  console.error(error);
});
