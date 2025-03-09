import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let meanData;
let hrData, o2Data, speedData, co2Data, rrData, veData;
let svg;

async function loadData() {
  // Load CSV data and convert numeric fields as needed
  meanData = await d3.csv("data/mean_max_df.csv");
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
    // Use the checkbox input directly (no .toggleColor anymore)
    const checkbox = contestant.querySelector("input[type='checkbox']");
    const figureNameInput = contestant.querySelector(".figureName");
    const nameDisplay = contestant.querySelector(".nameDisplay");

    // When checkbox changes, update the still silhouette and the checked contestants list.
    checkbox.addEventListener("change", () => {
        const silhouette = contestant.querySelector(".silhouette");
        // When unchecked, remove both "run" and "walk" classes.
        if (!checkbox.checked) {
          silhouette.classList.remove("run", "walk");
          silhouette.style.backgroundPosition = "-24px -12px"; // still image
        } else {
          // If checked, set to running image (before start)
          silhouette.style.backgroundPosition = "-215px -14px";
        }
        updateCheckedContestants();
      });

    // Update the displayed name for this contestant.
    figureNameInput.addEventListener("input", () => {
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

        // Create a container for the name
        const nameContainer = document.createElement("div");
        nameContainer.className = "name-container";
        nameContainer.textContent = (figureNameInput.value || `Contestant #${index + 1}`) + ` (Aged ${index + 1}0-${index + 2}0 Range)`;
        listItem.appendChild(nameContainer);

        // Create a container for the loading animation and time text
        const timeContainer = document.createElement("div");
        timeContainer.className = "time-container";

        // Create loading animation
        const loadingAnimation = document.createElement("span");
        loadingAnimation.className = "loading-animation";
        loadingAnimation.textContent = "...";
        timeContainer.appendChild(loadingAnimation);

        // Create text element for time
        const timeText = document.createElement("span");
        timeText.className = "time-text";
        timeText.textContent = `${hrData[index].time.toFixed(2)} seconds`;
        timeText.style.display = "none"; // Hide initially
        timeContainer.appendChild(timeText);

        listItem.appendChild(timeContainer);
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

  startButton.addEventListener("click", () => {
    // Get all checked contestants.
    const checkedContestants = Array.from(contestants).filter(contestant => {
      return contestant.querySelector("input[type='checkbox']").checked;
    });
  
    // For each checked contestant, start the run animation and schedule the switch to walk.
    checkedContestants.forEach((contestant, index) => {
      const silhouette = contestant.querySelector(".silhouette");
      // Start the running animation.
      silhouette.classList.add("run");
      // Calculate the delay (in ms) based on your logic.
      const delay = 14000 - Math.pow(hrData[2].time - hrData[index].time, 1/3) * 2000;
      // After the delay, switch from "run" to "walk".
      setTimeout(() => {
        silhouette.classList.remove("run");
        silhouette.classList.add("walk");
      }, delay);
    });
  
    // Update the chat box entries using promises.
    const listItems = checkedContestantsList.querySelectorAll("li");
    const promises = Array.from(listItems).map((listItem, index) => {
      return new Promise((resolve) => {
        const loadingAnimation = listItem.querySelector(".loading-animation");
        const timeText = listItem.querySelector(".time-text");
        loadingAnimation.textContent = "Currently Running...";
        // After the delay, update the chat box.
        setTimeout(() => {
          loadingAnimation.style.display = "none";
          timeText.style.display = "inline";
          resolve();
        }, 14000 - Math.pow(hrData[2].time - hrData[index].time, 1/3) * 2000);
      });
    });
  
    Promise.all(promises).then(() => {
      // After all timeouts are complete, create a leaderboard.
      const checkedTimes = Array.from(listItems).map((listItem, index) => {
        const timeText = listItem.querySelector(".time-text");
        return {
          time: parseFloat(timeText.textContent),
          name: listItem.querySelector(".name-container").textContent
        };
      });
  
      checkedTimes.sort((a, b) => b.time - a.time);
      const top3 = checkedTimes.slice(0, 3);
  
      const additionalText = document.createElement("div");
      additionalText.className = "additional-text";
      additionalText.innerHTML = `
        <h3>Leaderboard</h3>
        <ol>
          ${top3.map(item => `<li>${item.name}: ${item.time.toFixed(2)} seconds</li>`).join('')}
        </ol>
      `;
      checkedContestantsList.appendChild(additionalText);
    });
  });

  // --- Reset Button: reset all contestant data ---
  resetButton.addEventListener("click", () => {
    console.log("Reset button clicked"); // Debug log
  
    contestants.forEach((contestant, index) => {
      // Reset checkbox state
      const checkbox = contestant.querySelector("input[type='checkbox']");
      checkbox.checked = false;
  
      // Reset silhouette image and remove any animation classes
      const silhouette = contestant.querySelector(".silhouette");
      silhouette.style.backgroundPosition = "-24px -12px";
      silhouette.classList.remove("run", "walk");
  
      // Reset the name input and displayed name
      const figureNameInput = contestant.querySelector(".figureName");
      figureNameInput.value = "";
      const nameDisplay = contestant.querySelector(".nameDisplay");
      nameDisplay.textContent = `Contestant #${index + 1}`;
    });
  
    // Clear the active contestants list (including any leaderboard info)
    checkedContestantsList.innerHTML = "";
  });
  
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
    { data: hrData, yKey: "HR", color: "steelblue", title: "Heart Rate", ytitle: "HR (bpm)" },
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
//   createBarPlots();
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
    } else if (measurement_name === "HR"){
        measurement_txt.textContent = "Heart Rate";
        measurement.textContent = `${data.HR.toFixed(3)}`;
    } else if (measurement_name === "VCO2"){
        measurement_txt.textContent = "VCO₂";
        measurement.textContent = `${data.VCO2.toFixed(3)}`;
    } else if (measurement_name === "Speed"){
        measurement_txt.textContent = "Speed";
        measurement.textContent = `${data.Speed.toFixed(3)}`;
    } else if (measurement_name === "RR"){
        measurement_txt.textContent = "RR";
        measurement.textContent = `${data.RR.toFixed(3)}`;
    } else {
        measurement_txt.textContent = "VE";
        measurement.textContent = `${data.VE.toFixed(3)}`;
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
