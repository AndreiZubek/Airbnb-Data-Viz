function formatViz4Currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildPriceRangeData(points) {
  const ranges = [
    { min: 0, max: 100, label: "$0–$100" },
    { min: 100, max: 200, label: "$100–$200" },
    { min: 200, max: 350, label: "$200–$350" },
    { min: 350, max: 1000, label: "$350+" },
  ];

  return ranges.map((range) => {
    const inRange = points.filter(
      (p) => p.price >= range.min && p.price < range.max,
    );
    return {
      label: range.label,
      avgReviews: inRange.length > 0 ? d3.mean(inRange, (d) => d.reviews) : 0,
      count: inRange.length,
      medianReviews:
        inRange.length > 0 ? d3.median(inRange.map((d) => d.reviews)) : 0,
    };
  });
}

function renderViz4Comparison(chartRoot, shell, points) {
  chartRoot.innerHTML = "";

  const width = Math.max(740, Math.min(chartRoot.clientWidth || 860, 980));
  const containerHeight = 480;
  const margin = { top: 16, right: 20, bottom: 48, left: 60 };
  const chartHeight = containerHeight - 40;

  const container = d3
    .select(chartRoot)
    .append("div")
    .style("display", "flex")
    .style("flex-direction", "row")
    .style("gap", "12px");

  const leftSvg = container
    .append("svg")
    .style("flex", "1")
    .attr("viewBox", `0 0 ${width / 2} ${chartHeight}`);

  const xHist = d3
    .scaleLinear()
    .domain([0, d3.max(points, (d) => d.reviews) * 1.05])
    .nice()
    .range([margin.left, width / 2 - margin.right]);

  const yHist = d3
    .scaleLinear()
    .domain([0, d3.max(points, (d) => d.price) * 1.05])
    .nice()
    .range([chartHeight - margin.bottom, margin.top]);

  // 2D bins for density
  const binWidth = 5; // reviews per bin
  const binHeight = 50; // price per bin
  const bins = new Map();

  points.forEach((point) => {
    const xBin = Math.floor(point.reviews / binWidth);
    const yBin = Math.floor(point.price / binHeight);
    const key = `${xBin},${yBin}`;
    bins.set(key, (bins.get(key) || 0) + 1);
  });

  const maxBinCount = Math.max(...Array.from(bins.values()));
  const colorScale = d3
    .scaleLinear()
    .domain([0, maxBinCount])
    .range(["#fef3c7", "#c2410c"]);

  const binData = Array.from(bins.entries()).map(([key, count]) => {
    const [xBin, yBin] = key.split(",").map(Number);
    return {
      x: xBin * binWidth,
      y: yBin * binHeight,
      count,
      xBin,
      yBin,
    };
  });

  leftSvg
    .append("g")
    .selectAll("rect")
    .data(binData)
    .join("rect")
    .attr("x", (d) => xHist(d.x))
    .attr("y", (d) => yHist(d.y + binHeight))
    .attr("width", (d) => Math.max(1, xHist(d.x + binWidth) - xHist(d.x)))
    .attr("height", (d) => Math.max(1, yHist(d.y) - yHist(d.y + binHeight)))
    .attr("fill", (d) => colorScale(d.count))
    .attr("stroke", "#f5f5f5")
    .attr("stroke-width", 0.5)
    .on("mouseover", (event, d) => {
      const tooltip =
        shell.querySelector(".scatter-tooltip") ||
        document.createElement("div");
      if (!tooltip.parentNode) {
        tooltip.className = "viz2-tooltip scatter-tooltip";
        shell.appendChild(tooltip);
      }
      tooltip.innerHTML = `<strong>Density cluster</strong><span>${d.count} listings</span><span>Avg price: ${formatViz4Currency((d.yBin + 0.5) * binHeight)}</span><span>Avg reviews: ~${((d.xBin + 0.5) * binWidth).toFixed(0)}</span>`;
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
      const tooltip = shell.querySelector(".scatter-tooltip");
      if (tooltip) tooltip.hidden = true;
    });

  leftSvg
    .append("g")
    .attr("transform", `translate(0, ${chartHeight - margin.bottom})`)
    .call(d3.axisBottom(xHist).ticks(5))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").attr("class", "heatmap-axis-text"));

  leftSvg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(
      d3
        .axisLeft(yHist)
        .ticks(5)
        .tickFormat((d) => `$${d}`),
    )
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").attr("class", "heatmap-axis-text"));

  leftSvg
    .append("text")
    .attr("class", "heatmap-axis-label")
    .attr("x", (margin.left + width / 2 - margin.right) / 2)
    .attr("y", chartHeight - 12)
    .attr("text-anchor", "middle")
    .text("Reviews");

  leftSvg
    .append("text")
    .attr("class", "heatmap-axis-label")
    .attr("x", -((margin.top + chartHeight - margin.bottom) / 2))
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Price (USD)");

  const priceData = buildPriceRangeData(points);
  const rightSvg = container
    .append("svg")
    .style("flex", "1")
    .attr("viewBox", `0 0 ${width / 2} ${chartHeight}`);

  const xBar = d3
    .scaleBand()
    .domain(priceData.map((d) => d.label))
    .range([margin.left, width / 2 - margin.right])
    .padding(0.3);

  const yBar = d3
    .scaleLinear()
    .domain([0, d3.max(priceData, (d) => d.avgReviews) * 1.15])
    .nice()
    .range([chartHeight - margin.bottom, margin.top]);

  rightSvg
    .append("g")
    .selectAll("rect")
    .data(priceData)
    .join("rect")
    .attr("x", (d) => xBar(d.label))
    .attr("y", (d) => yBar(d.avgReviews))
    .attr("width", xBar.bandwidth())
    .attr("height", (d) => chartHeight - margin.bottom - yBar(d.avgReviews))
    .attr("fill", "#2563eb")
    .attr("fill-opacity", 0.8)
    .on("mouseover", (event, d) => {
      const tooltip =
        shell.querySelector(".scatter-tooltip") ||
        document.createElement("div");
      if (!tooltip.parentNode) {
        tooltip.className = "viz2-tooltip scatter-tooltip";
        shell.appendChild(tooltip);
      }
      tooltip.innerHTML = `<strong>${d.label}</strong><span>${d.count} listings</span><span>Avg reviews: ${d.avgReviews.toFixed(1)}</span><span>Median reviews: ${d.medianReviews.toFixed(0)}</span>`;
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
      const tooltip = shell.querySelector(".scatter-tooltip");
      if (tooltip) tooltip.hidden = true;
    });

  rightSvg
    .append("g")
    .attr("transform", `translate(0, ${chartHeight - margin.bottom})`)
    .call(d3.axisBottom(xBar))
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g
        .selectAll("text")
        .attr("class", "heatmap-axis-text")
        .style("font-size", "11px"),
    );

  rightSvg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yBar).ticks(5))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll("text").attr("class", "heatmap-axis-text"));

  rightSvg
    .append("text")
    .attr("class", "heatmap-axis-label")
    .attr("x", (margin.left + width / 2 - margin.right) / 2)
    .attr("y", chartHeight - 12)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text("Price Range");

  rightSvg
    .append("text")
    .attr("class", "heatmap-axis-label")
    .attr("x", -((margin.top + chartHeight - margin.bottom) / 2))
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Average Reviews");

  const note = document.getElementById("viz4-note");
  if (note) {
    note.innerHTML = `
      <strong>Left chart (heatmap):</strong> Darker areas show clusters of listings. Most cluster in the 0–30 reviews range regardless of price.
      <strong>Right chart (bars):</strong> Cheaper listings actually get slightly more reviews on average, which suggests that frequent travelers book budget options more often.
    `;
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

  const points = rows.filter(
    (row) =>
      Number.isFinite(row.price) &&
      row.price > 0 &&
      Number.isFinite(row.reviews) &&
      row.reviews >= 0,
  );
  renderViz4Comparison(chartRoot, shell, points);
}

initViz4Scatter().catch((error) => {
  const chartRoot = document.getElementById("viz4-chart");
  if (chartRoot) {
    chartRoot.innerHTML =
      '<p class="chart-error">Failed to load comparison data.</p>';
  }
  console.error(error);
});
