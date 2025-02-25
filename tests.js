const margin = { top: 20, right: 30, bottom: 40, left: 50 },
  width = 800 - margin.left - margin.right,
  height = 600 - margin.top - margin.bottom;

const svg = d3
  .select("#test_viz")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Load the data
d3.csv("treadmill-data/combined.csv").then((data) => {
  // Parse the data
  data.forEach((d) => {
    d.Age = +d.Age;
    d.HR = +d.HR;
    d.Speed = +d.Speed;
    d.Sex = d.Sex.toString();
  });

  // Add X axis
  const x = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.Age)])
    .range([0, width]);
  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  // Add X axis title
  svg
    .append("text")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", height + margin.top + 20)
    .text("Age");

  // Add Y axis
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.HR)])
    .range([height, 0]);
  svg.append("g").call(d3.axisLeft(y));

  // Add Y axis title
  svg
    .append("text")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 20)
    .attr("x", -margin.top)
    .text("Heart Rate");

  // Add color scale
  const color = d3
    .scaleOrdinal()
    .domain(["male", "female"])
    .range(["#1f77b4", "#ff7f0e"]);

  // Function to update the scatterplot
  function update(speed) {
    const filteredData = data.filter((d) => Math.round(d.Speed) === speed);

    // Aggregate data to calculate average HR per age and per gender
    const aggregatedData = d3
      .rollups(
        filteredData,
        (v) => d3.mean(v, (d) => d.HR),
        (d) => d.Age,
        (d) => d.Sex
      )
      .map(([age, sexData]) => {
        return sexData.map(([sex, avgHR]) => ({
          Age: age,
          Sex: sex,
          AvgHR: avgHR,
        }));
      })
      .flat();

    // Remove existing dots and lines
    svg.selectAll("circle").remove();
    svg.selectAll(".line").remove();

    // Add dots
    svg
      .append("g")
      .selectAll("circle")
      .data(aggregatedData)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.Age))
      .attr("cy", (d) => y(d.AvgHR))
      .attr("r", 5)
      .style("fill", (d) => color(d.Sex))
      .style("fill-opacity", 1);

    // Update the title
    d3.select("#chart-title").text(`Heart Rate vs. Age During Speed ${speed}`);
  }

  // Get unique rounded speeds
  const roundedSpeeds = [...new Set(data.map((d) => Math.round(d.Speed)))].sort(
    (a, b) => a - b
  );
  // Create buttons
  const buttons = d3
    .select("#buttons")
    .selectAll("button")
    .data(roundedSpeeds)
    .enter()
    .append("button")
    .text((d) => `Speed ${d}`)
    .on("click", (event, d) => update(d));

  // Initialize with the first rounded speed
  update(roundedSpeeds[0]);
});
