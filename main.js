import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let meanData;
let hrData;
let o2Data;
let svg;

async function loadData() {
    // Load CSV data and convert numeric fields as needed
    meanData = await d3.csv("data/mean_max_df.csv");
    hrData = meanData.map(d => ({ age_grp: d.age_grp, HR: +d.HR, time: +d.time }));
    o2Data = meanData.map(d => ({ age_grp: d.age_grp, VO2: +d.VO2, time: +d.time }));
}

document.addEventListener("DOMContentLoaded", () => {
    const contestants = document.querySelectorAll(".contestant");
    const checkedContestantsList = document.getElementById("checked-contestants");
    const alertBox = document.getElementById("alert-box");
    const alertMessage = document.getElementById("alert-message");

  
    contestants.forEach((contestant, index) => {
      const toggle = contestant.querySelector(".toggleColor");
      const overlay = contestant.querySelector(".overlay");
      const figureNameInput = contestant.querySelector(".figureName");
      const nameDisplay = contestant.querySelector(".nameDisplay");
  
      // Toggle overlay color for this contestant
      toggle.addEventListener("change", () => {
        overlay.style.backgroundColor = toggle.checked ? "blue" : "gray";
        updateCheckedContestants();
      });
  
      // Update the displayed name for this contestant
      figureNameInput.addEventListener("input", () => {
        // if (figureNameInput.value.length == 24) {
        //     alert("Max characters.");
        //     figureNameInput.value = figureNameInput.value.substring(0, 24);
        //   }
        if (figureNameInput.value.length == 24) {
            showAlert("Name cannot exceed 24 characters.");
            figureNameInput.value = figureNameInput.value.substring(0, 24);
          }
        nameDisplay.textContent = figureNameInput.value || `Contestant #${index + 1}`;
        updateCheckedContestants();
      });
    });

    function updateCheckedContestants() {
        checkedContestantsList.innerHTML = "";
        contestants.forEach((contestant, index) => {
          const toggle = contestant.querySelector(".toggleColor");
          const figureNameInput = contestant.querySelector(".figureName");
          if (toggle.checked) {
            const listItem = document.createElement("li");
            listItem.textContent = figureNameInput.value || `Contestant #${index + 1}`;
            checkedContestantsList.appendChild(listItem);
          }
        });
      }
      function showAlert(message) {
        alertMessage.textContent = message;
        alertBox.style.display = "block";
        setTimeout(() => {
          alertBox.style.display = "none";
        }, 2000);
      }
  });

function createBarPlots() {
    // Define overall dimensions and margins
    const width = 500;
    const height = 225;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const separation = 50;

    // Set svg dimensions (assumed to be equal to the overall width/height)
    const svgWidth = width;
    const svgHeight = height;
    const horizontalSpace = svgWidth - margin.left - margin.right - separation;

    // Each chart takes half of the width minus margins
    const totalChartArea = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const chartWidth = (totalChartArea - separation) / 2;

    // Remove previous svg if exists
    if (svg) {
        svg.remove();
    }

    // Create the main svg element
    svg = d3.select("#graphs")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("overflow", "visible")
        .style("width", "100%")
        .style("height", "auto");

    // Create a group for the HR chart (left side)
    const hrChartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Create a group for the VO2 chart (right side)
    const o2ChartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left + chartWidth + separation}, ${margin.top})`);

    // HR Chart
    const xScaleHR = d3.scaleBand()
        .domain(hrData.map(d => d.age_grp))
        .range([0, chartWidth])
        .padding(0.1);

    const yScaleHR = d3.scaleLinear()
        .domain([0, d3.max(hrData, d => d.HR)])
        .nice()
        .range([chartHeight, 0]);

    // Create bars
    hrChartGroup.selectAll(".bar")
        .data(hrData)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => xScaleHR(d.age_grp))
        .attr("y", d => yScaleHR(d.HR))
        .attr("width", xScaleHR.bandwidth())
        .attr("height", d => chartHeight - yScaleHR(d.HR))
        .attr("fill", "steelblue")
        .on("mouseenter", function (event, d) {
            d3.select(event.currentTarget).style("fill-opacity", 0.8);
            updateTooltipContent(event, d, "HR");
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on("mouseleave", function (event, d) {
            d3.select(event.currentTarget).style("fill-opacity", 1);
            updateTooltipVisibility(false);
        });;

    // x-axis
    hrChartGroup.append("g")
        .attr("transform", `translate(0, ${chartHeight})`)
        .style("font-size", "50%")
        .call(d3.axisBottom(xScaleHR));

    // x-axis title
    hrChartGroup.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 30)
        .attr("text-anchor", "middle")
        .style("font-size", "9px")
        .text("Age Group");

    // y-axis
    hrChartGroup.append("g")
        .style("font-size", "8px")
        .call(d3.axisLeft(yScaleHR));

    // y-axis title
    hrChartGroup.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -30)
        .attr("x", -chartHeight / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "9px")
        .text("Heart Rate");

    // title
    hrChartGroup.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .text("Heart Rate");

    // VO2 Chart
    const xScaleO2 = d3.scaleBand()
        .domain(o2Data.map(d => d.age_grp))
        .range([0, chartWidth])
        .padding(0.1);

    const yScaleO2 = d3.scaleLinear()
        .domain([0, d3.max(o2Data, d => d.VO2)])
        .nice()
        .range([chartHeight, 0]);

    // Create bars
    o2ChartGroup.selectAll(".bar")
        .data(o2Data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => xScaleO2(d.age_grp))
        .attr("y", d => yScaleO2(d.VO2))
        .attr("width", xScaleO2.bandwidth())
        .attr("height", d => chartHeight - yScaleO2(d.VO2))
        .attr("fill", "plum")
        .on("mouseenter", function (event, d) {
            d3.select(event.currentTarget).style("fill-opacity", 0.8);
            updateTooltipContent(event, d, "VO2");
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on("mouseleave", function (event, d) {
            d3.select(event.currentTarget).style("fill-opacity", 1);
            updateTooltipVisibility(false);
        });

    // x-axis
    o2ChartGroup.append("g")
        .attr("transform", `translate(0, ${chartHeight})`)
        .style("font-size", "8px")
        .call(d3.axisBottom(xScaleO2));

    // x-axis title
    o2ChartGroup.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 30)
        .attr("text-anchor", "middle")
        .style("font-size", "9px")
        .text("Age Group");

    // y-axis
    o2ChartGroup.append("g")
        .style("font-size", "8px")
        .call(d3.axisLeft(yScaleO2));

    // y-axis title
    o2ChartGroup.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -35)
        .attr("x", -chartHeight / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "9px")
        .text("VO₂");

    // title
    o2ChartGroup.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .text("VO₂");
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadData();
    createBarPlots();
});

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById("tooltip");
    tooltip.hidden = !isVisible;
}


function updateTooltipContent(event, data, measurement_name) {
    const agerange = document.getElementById("agerange_value");
    const measurement_txt = document.getElementById("measurement_name");
    const measurement = document.getElementById("measurement_value");
    const time = document.getElementById("time_value");

    if (!data || Object.keys(data).length === 0) return;

    agerange.textContent = data.age_grp;

    if (measurement_name === "VO2") {
        measurement_txt.textContent = "VO₂";
        measurement.textContent = `${data.VO2.toFixed(3)}`;
    } else {
        measurement_txt.textContent = "Heart Rate";
        measurement.textContent = `${data.HR.toFixed(3)}`;
    }

    time.textContent = `${data.time.toFixed(3)}`;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById("tooltip");

    const offsetX = 10; // Offset
    const offsetY = 10;

    // Get the current mouse position
    let tooltipX = event.clientX + offsetX;
    let tooltipY = event.clientY + offsetY;

    // Get the window's dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Get the tooltip's width and height
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;

    // Check if the tooltip exceeds the window's right edge and adjust position
    if (tooltipX + tooltipWidth > windowWidth) {
        tooltipX = windowWidth - tooltipWidth - offsetX;
    }

    // Check if the tooltip exceeds the window's bottom edge and adjust position
    if (tooltipY + tooltipHeight > windowHeight) {
        tooltipY = windowHeight - tooltipHeight - offsetY;
    }

    // Update the tooltip position
    tooltip.style.left = `${tooltipX}px`;
    tooltip.style.top = `${tooltipY}px`;
}

function updateCheckedContestants() {
    checkedContestantsList.innerHTML = "";
    contestants.forEach((contestant, index) => {
      const toggle = contestant.querySelector(".toggleColor");
      const figureNameInput = contestant.querySelector(".figureName");
      if (toggle.checked) {
        const listItem = document.createElement("li");
        listItem.textContent = figureNameInput.value || `Contestant #${index + 1}`;
        checkedContestantsList.appendChild(listItem);
      }
    });
  }