import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let meanData;
let hrData, o2Data, speedData, co2Data, rrData, veData;
let svg;

async function loadData() {
    // Load CSV data and convert numeric fields as needed
    meanData = await d3.csv("../dsc106-final-project/data/mean_max_df.csv");
    hrData = meanData.map(d => ({ age_grp: d.age_grp, HR: +d.HR, time: +d.time }));
    o2Data = meanData.map(d => ({ age_grp: d.age_grp, VO2: +d.VO2, time: +d.time }));
    speedData = meanData.map(d => ({ age_grp: d.age_grp, Speed: +d.Speed, time: +d.time }));
    co2Data = meanData.map(d => ({ age_grp: d.age_grp, VCO2: +d.VCO2, time: +d.time }));
    rrData = meanData.map(d => ({ age_grp: d.age_grp, RR: +d.RR, time: +d.time }));
    veData = meanData.map(d => ({ age_grp: d.age_grp, VE: +d.VE, time: +d.time }));
    createBarPlots();
}

document.addEventListener("DOMContentLoaded", () => {
    const contestants = document.querySelectorAll(".contestant");
    const checkedContestantsList = document.getElementById("checked-contestants");
    const alertBox = document.getElementById("alert-box");
    const alertMessage = document.getElementById("alert-message");

  
    contestants.forEach((contestant, index) => {
      const toggle = contestant.querySelector(".toggleColor");
    //   const overlay = contestant.querySelector(".overlay");
      const figureNameInput = contestant.querySelector(".figureName");
      const nameDisplay = contestant.querySelector(".nameDisplay");
  
      // Toggle overlay color for this contestant
      toggle.addEventListener("change", () => {
        // overlay.style.backgroundColor = toggle.checked ? "blue" : "gray";
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
    const width = 800, height = 250;
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const separation = 60;
    const chartWidth = (width - margin.left - margin.right - 2 * separation) / 3;
    const chartHeight = height - margin.top - margin.bottom;
    
    if (svg) svg.remove();

    svg = d3.select("#graphs")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height * 2}`)
        .style("width", "100%")
        .style("height", "auto");

    const datasets = [
        { data: hrData, yKey: "HR", color: "steelblue", title: "Heart Rate", ytitle: "HR (bpm)"},
        { data: o2Data, yKey: "VO2", color: "plum", title: "Oxygen consumption", ytitle: "VO₂ (mL/min)" },
        { data: co2Data, yKey: "VCO2", color: "orange", title: "Carbon dioxide production", ytitle: "VCO₂ (mL/min)" },
        { data: speedData, yKey: "Speed", color: "green", title: "Speed", ytitle: "Speed (km/h)" },
        { data: rrData, yKey: "RR", color: "red", title: "Respiratory Rate", ytitle: "RR (respiration/min)" },
        { data: veData, yKey: "VE", color: "purple", title: "Pulmonary ventilation", ytitle: "VE (L/min)" }
    ];

    datasets.forEach((dataset, i) => {
        const row = Math.floor(i / 3), col = i % 3;
        const group = svg.append("g")
            .attr("transform", `translate(${margin.left + col * (chartWidth + separation)}, ${margin.top + row * height})`);
        
        const xScale = d3.scaleBand()
            .domain(dataset.data.map(d => d.age_grp))
            .range([0, chartWidth])
            .padding(0.1);
        
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(dataset.data, d => d[dataset.yKey])])
            .nice()
            .range([chartHeight, 0]);
        
        group.selectAll(".bar")
            .data(dataset.data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => xScale(d.age_grp))
            .attr("y", d => yScale(d[dataset.yKey]))
            .attr("width", xScale.bandwidth())
            .attr("height", d => chartHeight - yScale(d[dataset.yKey]))
            .attr("fill", dataset.color)
            .on("mouseenter", function (event, d) {
                d3.select(event.currentTarget).style("fill-opacity", 0.8);
                updateTooltipContent(event, d, dataset.yKey);
                updateTooltipVisibility(true);
                updateTooltipPosition(event);
            })
            .on("mouseleave", function (event, d) {
                d3.select(event.currentTarget).style("fill-opacity", 1);
                updateTooltipVisibility(false);
            });
        
        group.append("g")
            .attr("transform", `translate(0, ${chartHeight})`)
            .style("font-size", "8px")
            .call(d3.axisBottom(xScale));
        
        group.append("text")
            .attr("x", chartWidth / 2)
            .attr("y", chartHeight + 40)
            .attr("text-anchor", "middle")
            .style("font-size", "9px")
            .text("Age Group");
        
        group.append("g")
            .attr("transform", `translate(-10, 0)`) 
            .style("font-size", "8px")
            .call(d3.axisLeft(yScale));
        
        group.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -45)
            .attr("x", -chartHeight / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "9px")
            .text(dataset.ytitle);
        
        group.append("text")
            .attr("x", chartWidth / 2)
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .text(dataset.title);
    });
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

document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("startButton");
    startButton.addEventListener("click", () => {
      const silhouettes = document.querySelectorAll(".silhouette");
      silhouettes.forEach(sil => sil.classList.add("run"));
    });
  });   