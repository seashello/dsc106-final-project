import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let meanData;
let hrData, o2Data, speedData, co2Data, rrData, veData;
let svg;
let chartData = [];
let leaderboardTimeouts = [];

// Global leaderboard data array.
let leaderboardData = [];

// Update the leaderboard with a new result.
function updateLeaderboard(newResult) {
  leaderboardData.push(newResult);
  // For an endurance test, higher time is better.
  leaderboardData.sort((a, b) => b.time - a.time);
  renderLeaderboard();
}

// Render the leaderboard with D3 transitions.
function renderLeaderboard() {
  // Select the leaderboard container if it exists.
  let container = d3.select("#leaderboard");
  if (container.empty()) {
    // Create it if not present.
    container = d3.select("#chatbox")
      .append("div")
      .attr("id", "leaderboard")
      .style("position", "relative")
      .style("margin-top", "10px")
      .style("text-align", "center"); // Center content within the container.
    container.append("h3").text("Leaderboard");
  }
  
  // Get the height of the header so we can offset items.
  const headerNode = container.select("h3").node();
  const headerHeight = headerNode ? headerNode.getBoundingClientRect().height : 30;
  
  // Bind leaderboardData to divs with class "leaderboard-item".
  const items = container.selectAll("div.leaderboard-item")
    .data(leaderboardData, d => d.index);
  
  // For new items, create the div and set initial opacity.
  const itemsEnter = items.enter().append("div")
    .attr("class", "leaderboard-item")
    .style("position", "absolute")
    .style("left", "50%")
    .style("transform", "translateX(-50%)")
    .style("width", "100%")
    .style("opacity", 0)
    .text(d => `${d.name}: ${d.time.toFixed(2)} seconds`)
    .on("click", d => showContestantDetails(d));
  
  // Merge the enter and update selections and animate positions.
  itemsEnter.merge(items)
    .transition()
    .duration(500)
    .style("opacity", 1)
    .style("top", (d, i) => `${i * 30 + headerHeight + 20}px`) // Offset by header height.
    .style("color", (d, i) => {
      if (i === 0) return "#ffbf00";
      else if (i === 1) return "silver";
      else if (i === 2) return "#cd7f32";
      else return "#333";
    });
  
  // Remove any exiting items with a fade-out.
  items.exit()
    .transition()
    .duration(500)
    .style("opacity", 0)
    .remove();
}

function showContestantDetails(item) {
  alert(`Details for ${item.name}:\nTime: ${item.time.toFixed(2)} seconds`);
}

async function loadData() {
  // Get the global gender toggle element.
  const globalToggle = document.getElementById("globalToggleSprite");
  // Determine the gender: checked means female, unchecked means male.
  const gender = globalToggle && globalToggle.checked ? 'female' : 'male';
  // Choose the appropriate CSV file.
  const csvFile = gender === 'female' ? "data/f_mean_max_df.csv" : "data/m_mean_max_df.csv";
  
  // Load CSV data and convert numeric fields.
  meanData = await d3.csv(csvFile);
  hrData = meanData.map(d => ({ age_grp: d.age_grp, HR: +d.HR, time: +d.time }));
  o2Data = meanData.map(d => ({ age_grp: d.age_grp, VO2: +d.VO2, time: +d.time }));
  speedData = meanData.map(d => ({ age_grp: d.age_grp, Speed: +d.Speed, time: +d.time }));
  co2Data = meanData.map(d => ({ age_grp: d.age_grp, VCO2: +d.VCO2, time: +d.time }));
  rrData = meanData.map(d => ({ age_grp: d.age_grp, RR: +d.RR, time: +d.time }));
  veData = meanData.map(d => ({ age_grp: d.age_grp, VE: +d.VE, time: +d.time }));
  
  createBarPlots();
  
  // For female data, check for missing 60–70 age group.
  if (gender === 'female') {
    const has60_70 = meanData.some(d => d.age_grp.includes("60") && d.age_grp.includes("70"));
    if (!has60_70) {
      const contestantCards = document.querySelectorAll(".contestant");
      if (contestantCards[5]) {
        // Disable the checkbox for the 60-70 representative.
        const checkbox = contestantCards[5].querySelector("input[type='checkbox']");
        if (checkbox) {
          checkbox.disabled = true;
        }
        // Add an overlay to indicate no data.
        const existingOverlay = contestantCards[5].querySelector(".no-data-overlay");
        if (existingOverlay) existingOverlay.remove();
        const bodyContainer = contestantCards[5].querySelector(".body-container");
        if (bodyContainer) {
          const overlay = document.createElement("div");
          overlay.classList.add("no-data-overlay");
          overlay.textContent = "No available data for this age group";
          bodyContainer.style.position = "relative";
          bodyContainer.appendChild(overlay);
        }
      }
    }
  }
}    

document.addEventListener("DOMContentLoaded", () => {
  const contestants = document.querySelectorAll(".contestant");
  const checkedContestantsList = document.getElementById("checked-contestants");
  const alertBox = document.getElementById("alert-box");
  const alertMessage = document.getElementById("alert-message");
  const startButton = document.getElementById("startButton");
  const resetButton = document.getElementById("resetButton");

  // Set up contestant listeners.
  contestants.forEach((contestant, index) => {
    const checkbox = contestant.querySelector("input[type='checkbox']");
    const figureNameInput = contestant.querySelector(".figureName");
    const nameDisplay = contestant.querySelector(".nameDisplay");
    const silhouette = contestant.querySelector(".silhouette");

    checkbox.addEventListener("change", () => {
      if (!checkbox.checked) {
        silhouette.classList.remove("run-male", "run-female", "walk-male", "walk-female");
        silhouette.style.backgroundPosition = "-24px -12px";
      } else {
        silhouette.style.backgroundPosition = "-215px -14px";
      }
      updateCheckedContestants();
    });

    figureNameInput.addEventListener("input", () => {
      if (figureNameInput.value.length == 24) {
        showAlert("Name cannot exceed 24 characters.");
        figureNameInput.value = figureNameInput.value.substring(0, 24);
      }
      nameDisplay.textContent = figureNameInput.value || `Contestant #${index + 1}`;
      updateCheckedContestants();
    });
  });

  // Update active contestants list.
  function updateCheckedContestants() {
    checkedContestantsList.innerHTML = "";
    contestants.forEach((contestant, index) => {
      const checkbox = contestant.querySelector("input[type='checkbox']");
      const figureNameInput = contestant.querySelector(".figureName");
      if (checkbox.checked) {
        const listItem = document.createElement("li");
        listItem.setAttribute("data-index", index);
        const nameContainer = document.createElement("div");
        nameContainer.className = "name-container";
        nameContainer.textContent =
          (figureNameInput.value || `Contestant #${index + 1}`) +
          ` (Aged ${index + 1}0-${index + 2}0 Range)`;
        listItem.appendChild(nameContainer);
        const timeContainer = document.createElement("div");
        timeContainer.className = "time-container";
        const loadingAnimation = document.createElement("span");
        loadingAnimation.className = "loading-animation";
        timeContainer.appendChild(loadingAnimation);
        const timeText = document.createElement("span");
        timeText.className = "time-text";
        timeText.textContent = `${hrData[index].time.toFixed(2)} seconds`;
        timeText.style.color = "#3d5fa8";
        timeText.style.display = "none";
        timeContainer.appendChild(timeText);
        listItem.appendChild(timeContainer);
        checkedContestantsList.appendChild(listItem);
      }
    });
  }

  // Proxy for chartData.
  const chartDataHandler = {
    set(target, property, value, receiver) {
      target[property] = value;
      document.dispatchEvent(new CustomEvent('chartDataUpdated', { detail: target }));
      return true;
    }
  };

  chartData = new Proxy(chartData, chartDataHandler);

  document.addEventListener('chartDataUpdated', (event) => {
    createBarPlots(chartData);
  });

  function showAlert(message) {
    alertMessage.textContent = message;
    alertBox.style.display = "block";
    setTimeout(() => {
      alertBox.style.display = "none";
    }, 2000);
  }

  // Start simulation and update leaderboard.
  startButton.addEventListener("click", () => {
    if (startButton.disabled) return;
    
    // Clear previous leaderboard.
    leaderboardData = [];
    
    const checkedContestants = [];
    contestants.forEach((contestant, index) => {
      const checkbox = contestant.querySelector("input[type='checkbox']");
      if (checkbox.checked) {
        checkedContestants.push({ element: contestant, origIndex: index });
      }
    });

    // If no contestants are checked, simply return without disabling the button.
    if (checkedContestants.length === 0) {
      return;
    }
    
    // Now disable the start button as we proceed with the simulation.
    startButton.disabled = true;
    
    const delays = checkedContestants.map(({ origIndex }) => {
      return 14000 - Math.cbrt(hrData[2].time - hrData[origIndex].time) * 2000;
    });

    checkedContestants.forEach(({ element, origIndex }, idx) => {
      const silhouette = element.querySelector(".silhouette");
      if (globalToggle.checked) {
        silhouette.classList.add("run-female");
      } else {
        silhouette.classList.add("run-male");
      }
      const delay = delays[idx];

      const energyBar = element.querySelector(".energy-bar");
      energyBar.style.height = "100%";
      const startTime = Date.now();
      energyBar.delay = delay;
      energyBar.startTime = startTime;
      energyBar.energyIntervalID = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const percentRemaining = Math.max(0, ((delay - elapsed) / delay) * 100);
        energyBar.style.height = percentRemaining + "%";
        if (elapsed >= delay) {
          clearInterval(energyBar.energyIntervalID);
          delete energyBar.energyIntervalID;
        }
      }, 50);

      const listItem = checkedContestantsList.querySelector(`li[data-index="${origIndex}"]`);
      if (listItem) {
        const loadingAnimation = listItem.querySelector(".loading-animation");
        const timeText = listItem.querySelector(".time-text");
        // Start an interval to animate the dots.
        let dotCount = 0;
        loadingAnimation.style.color = "#a32a2a";
        const loadingIntervalID = setInterval(() => {
          dotCount = (dotCount + 1) % 4; // cycles 0-3
          loadingAnimation.textContent = "Currently Running" + ".".repeat(dotCount);
        }, 500);
        listItem.runningTimeoutID = setTimeout(() => {
          clearInterval(loadingIntervalID);
          loadingAnimation.style.display = "none";
          timeText.style.display = "inline";
        }, delay);
      }

      // When the simulation for this contestant finishes:
      silhouette.switchTimeoutID = setTimeout(() => {
        silhouette.style.backgroundImage = "";
        if (globalToggle.checked) {
          silhouette.classList.remove("run-female");
          silhouette.classList.add("walk-female");
        } else {
          silhouette.classList.remove("run-male");
          silhouette.classList.add("walk-male");
        }
        chartData.push(hrData[origIndex].age_grp);
        const nameDisplay = element.querySelector(".nameDisplay");
        const contestantName = nameDisplay ? nameDisplay.textContent : `Contestant #${origIndex + 1}`;
        updateLeaderboard({ index: origIndex, time: hrData[origIndex].time, name: contestantName });
      }, delay);
    });
  });

  const globalToggle = document.getElementById("globalToggleSprite");

  // Reset function.
  function resetEverything() {
    const contestants = document.querySelectorAll(".contestant");
    contestants.forEach((contestant) => {
      const note = contestant.querySelector(".no-data-overlay");
      if (note) {
        note.remove();
      }
    });
  
    const isFemale = globalToggle.checked;
    contestants.forEach((contestant, index) => {
      const checkbox = contestant.querySelector("input.toggleColor");
      if (checkbox) {
        checkbox.checked = false;
      }
  
      const silhouette = contestant.querySelector(".silhouette");
      if (silhouette) {
        if (silhouette.switchTimeoutID) {
          clearTimeout(silhouette.switchTimeoutID);
          delete silhouette.switchTimeoutID;
        }
        silhouette.classList.remove("run-male", "run-female", "walk-male", "walk-female");
        if (isFemale) {
          silhouette.style.backgroundImage = "url('sprites_female_run.png')";
        } else {
          silhouette.style.backgroundImage = "url('sprites_male_run.png')";
        }
        silhouette.style.backgroundPosition = "-24px -12px";
      }
  
      const energyBar = contestant.querySelector(".energy-bar");
      if (energyBar) {
        if (energyBar.energyIntervalID) {
          clearInterval(energyBar.energyIntervalID);
          delete energyBar.energyIntervalID;
        }
        energyBar.style.height = "100%";
      }
  
      svg.remove();
      createBarPlots();
    });
    
    leaderboardTimeouts.forEach(timeoutID => clearTimeout(timeoutID));
    leaderboardTimeouts = [];
    
    const checkedContestantsList = document.getElementById("checked-contestants");
    checkedContestantsList.querySelectorAll("li").forEach(li => {
      if (li.runningTimeoutID) {
        clearTimeout(li.runningTimeoutID);
        delete li.runningTimeoutID;
      }
    });
    checkedContestantsList.innerHTML = "";
    leaderboardData = [];
    const leaderboardContainer = document.getElementById("leaderboard");
    if (leaderboardContainer) {
      leaderboardContainer.remove();
    }
    startButton.disabled = false;
  }
  
  resetButton.addEventListener("click", () => {
    console.log("Reset button clicked");
    resetEverything();
  });
  
  globalToggle.addEventListener("change", function() {
    console.log("Global gender toggled to:", this.checked ? "female" : "male");
    resetEverything();
    loadData();
  });
  
  document.querySelectorAll(".customize-btn").forEach((button, index) => {
    button.addEventListener("click", () => {
      console.log("Customize button clicked for contestant", index);
      openCustomizationModal(index);
    });
  });
  
  function openCustomizationModal(index) {
    const modal = document.getElementById("customize-modal");
    if (modal) {
      modal.hidden = false;
    } else {
      console.error("Modal element not found");
    }
  }
  
  document.getElementById("close-modal").addEventListener("click", () => {
    const modal = document.getElementById("customize-modal");
    if (modal) {
      modal.hidden = true;
    }
  });
});

function createBarPlots(filteredData) {
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
    { data: o2Data, yKey: "VO2", color: "plum", title: "Oxygen Consumption", ytitle: "VO₂ (mL/min)" },
    { data: co2Data, yKey: "VCO2", color: "orange", title: "Carbon Dioxide Production", ytitle: "VCO₂ (mL/min)" },
    { data: speedData, yKey: "Speed", color: "green", title: "Speed", ytitle: "Speed (km/h)" },
    { data: rrData, yKey: "RR", color: "red", title: "Respiratory Rate", ytitle: "RR (respiration/min)" },
    { data: veData, yKey: "VE", color: "purple", title: "Pulmonary Ventilation", ytitle: "VE (L/min)" }
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
  
    const barsData = (filteredData && filteredData.length > 0)
      ? dataset.data.filter(d => filteredData.includes(d.age_grp))
      : [];
  
    group.selectAll(".bar")
      .data(barsData)
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
  } else if (measurement_name === "HR") {
    measurement_txt.textContent = "Heart Rate";
    measurement.textContent = `${data.HR.toFixed(3)}`;
  } else if (measurement_name === "VCO2") {
    measurement_txt.textContent = "VCO₂";
    measurement.textContent = `${data.VCO2.toFixed(3)}`;
  } else if (measurement_name === "Speed") {
    measurement_txt.textContent = "Speed";
    measurement.textContent = `${data.Speed.toFixed(3)}`;
  } else if (measurement_name === "RR") {
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
  const offsetX = 10;
  const offsetY = 10;
  let tooltipX = event.clientX + offsetX;
  let tooltipY = event.clientY + offsetY;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;
  if (tooltipX + tooltipWidth > windowWidth) {
    tooltipX = windowWidth - tooltipWidth - offsetX;
  }
  if (tooltipY + tooltipHeight > windowHeight) {
    tooltipY = windowHeight - tooltipHeight - offsetY;
  }
  tooltip.style.left = `${tooltipX}px`;
  tooltip.style.top = `${tooltipY}px`;
}
