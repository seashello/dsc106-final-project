import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let meanData;
let hrData, o2Data, speedData, co2Data, rrData, veData;
let svg;
let chartData = [];
let leaderboardTimeouts = [];


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
  const startButton = document.getElementById("startButton");
  const resetButton = document.getElementById("resetButton");

  // --- Set up each contestant's listeners ---
  contestants.forEach((contestant, index) => {
    const checkbox = contestant.querySelector("input[type='checkbox']");
    const figureNameInput = contestant.querySelector(".figureName");
    const nameDisplay = contestant.querySelector(".nameDisplay");
    const silhouette = contestant.querySelector(".silhouette");

    // When checkbox changes, update the silhouette and active list.
    checkbox.addEventListener("change", () => {
      if (!checkbox.checked) {
        silhouette.classList.remove("run-male", "run-female", "walk-male", "walk-female");
        silhouette.style.backgroundPosition = "-24px -12px"; // still image
      } else {
        silhouette.style.backgroundPosition = "-215px -14px"; // pre-run image
      }
      updateCheckedContestants();
    });

    // Update the displayed name when the user types.
    figureNameInput.addEventListener("input", () => {
      if (figureNameInput.value.length == 24) {
        showAlert("Name cannot exceed 24 characters.");
        figureNameInput.value = figureNameInput.value.substring(0, 24);
      }
      nameDisplay.textContent = figureNameInput.value || `Contestant #${index + 1}`;
      updateCheckedContestants();
    });
  });

  // --- Update the active contestants list ---
  // We tag each <li> with a data-index attribute corresponding to the contestant’s original index.
  function updateCheckedContestants() {
    checkedContestantsList.innerHTML = "";
    contestants.forEach((contestant, index) => {
      const checkbox = contestant.querySelector("input[type='checkbox']");
      const figureNameInput = contestant.querySelector(".figureName");
      if (checkbox.checked) {
        const listItem = document.createElement("li");
        listItem.setAttribute("data-index", index); // tag with original index

        // Name container.
        const nameContainer = document.createElement("div");
        nameContainer.className = "name-container";
        nameContainer.textContent =
          (figureNameInput.value || `Contestant #${index + 1}`) +
          ` (Aged ${index + 1}0-${index + 2}0 Range)`;
        listItem.appendChild(nameContainer);

        // Time container (loading animation + time text).
        const timeContainer = document.createElement("div");
        timeContainer.className = "time-container";

        const loadingAnimation = document.createElement("span");
        loadingAnimation.className = "loading-animation";
        loadingAnimation.textContent = "...";
        timeContainer.appendChild(loadingAnimation);

        const timeText = document.createElement("span");
        timeText.className = "time-text";
        timeText.textContent = `${hrData[index].time.toFixed(2)} seconds`;
        timeText.style.color = "#3d5fa8";
        timeText.style.display = "none"; // Hide initially.
        timeContainer.appendChild(timeText);

        listItem.appendChild(timeContainer);
        checkedContestantsList.appendChild(listItem);
      }
    });
  }

  // Define a Proxy handler to intercept changes.
  const chartDataHandler = {
    set(target, property, value, receiver) {
      target[property] = value;
      // Dispatch a custom event every time the array is updated.
      document.dispatchEvent(new CustomEvent('chartDataUpdated', { detail: target }));
      return true;
    }
  };

  // Wrap chartData with the Proxy.
  chartData = new Proxy(chartData, chartDataHandler);

  // Add an event listener for the updated event.
  document.addEventListener('chartDataUpdated', (event) => {
    // Update your plots or perform any actions with the updated chartData.
    createBarPlots(chartData);
  });

  // --- Show alert message ---
  function showAlert(message) {
    alertMessage.textContent = message;
    alertBox.style.display = "block";
    setTimeout(() => {
      alertBox.style.display = "none";
    }, 2000);
  }

  // --- Start Button: Animate and build leaderboard ---
  startButton.addEventListener("click", () => {
    if (startButton.disabled) return;
    startButton.disabled = true;

    // Build an array of checked contestants with their original index.
    const checkedContestants = [];
    contestants.forEach((contestant, index) => {
      const checkbox = contestant.querySelector("input[type='checkbox']");
      if (checkbox.checked) {
        checkedContestants.push({ element: contestant, origIndex: index });
      }
    });

    // Calculate a delay for each checked contestant.
    const delays = checkedContestants.map(({ origIndex }) => {
      return 14000 - Math.pow(hrData[2].time - hrData[origIndex].time, 1 / 3) * 2000;
    });

    // For each checked contestant, start animations and energy depletion.
    checkedContestants.forEach(({ element, origIndex }, idx) => {
      const silhouette = element.querySelector(".silhouette");
      if (globalToggle.checked) {
        silhouette.classList.add("run-female");
      } else {
        silhouette.classList.add("run-male");
      }
      const delay = delays[idx];

      // Animate the energy bar depletion.
      const energyBar = element.querySelector(".energy-bar");
      // Set energy bar to full initially.
      energyBar.style.height = "100%";
      // Store the start time.
      const startTime = Date.now();
      // Start interval to update the energy bar.
      energyBar.energyIntervalID = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const percentRemaining = Math.max(0, ((delay - elapsed) / delay) * 100);
        energyBar.style.height = percentRemaining + "%";
        if (elapsed >= delay) {
          clearInterval(energyBar.energyIntervalID);
          delete energyBar.energyIntervalID;
        }
      }, 50);

      // Update the corresponding <li> in the active list (using data-index).
      const listItem = checkedContestantsList.querySelector(`li[data-index="${origIndex}"]`);
      if (listItem) {
        const loadingAnimation = listItem.querySelector(".loading-animation");
        const timeText = listItem.querySelector(".time-text");
        loadingAnimation.textContent = "Currently Running...";
        loadingAnimation.style.color = "#a32a2a";
        // Save the timeout ID for later clearing if needed.
        listItem.runningTimeoutID = setTimeout(() => {
          loadingAnimation.style.display = "none";
          timeText.style.display = "inline";
        }, delay);
      }

      // After delay, switch the animation from run to walk.
      // Save this timeout ID as well.
      silhouette.switchTimeoutID = setTimeout(() => {
        // Clear the inline background image so that the walk sprite sheet from CSS is used.
        silhouette.style.backgroundImage = "";
        if (globalToggle.checked) {
          silhouette.classList.remove("run-female");
          silhouette.classList.add("walk-female");
        } else {
          silhouette.classList.remove("run-male");
          silhouette.classList.add("walk-male");
        }
        chartData.push(hrData[origIndex].age_grp);
      }, delay);
    });

    // Build leaderboard after all delays finish.
    const leaderboardPromises = Array.from(checkedContestantsList.querySelectorAll("li")).map((listItem) => {
        const idx = parseInt(listItem.getAttribute("data-index"));
        const delay = 14000 - Math.pow(hrData[2].time - hrData[idx].time, 1 / 3) * 2000;
        return new Promise((resolve) => {
          const timeoutID = setTimeout(resolve, delay);
          leaderboardTimeouts.push(timeoutID);
        });
      });

    Promise.all(leaderboardPromises).then(() => {
      const leaderboardData = [];
      const liElements = checkedContestantsList.querySelectorAll("li");
      liElements.forEach(li => {
        const idx = parseInt(li.getAttribute("data-index"));
        const timeText = li.querySelector(".time-text").textContent;
        const timeVal = parseFloat(timeText);
        const name = li.querySelector(".name-container").textContent;
        leaderboardData.push({ time: timeVal, name });
      });
      leaderboardData.sort((a, b) => b.time - a.time);

      // Remove any existing leaderboard.
      const existingLeaderboard = checkedContestantsList.querySelector(".additional-text");
      if (existingLeaderboard) {
        existingLeaderboard.remove();
      }

      const additionalText = document.createElement("div");
      additionalText.className = "additional-text";
      additionalText.style.textAlign = "center";
      additionalText.innerHTML = `
            <h3>Leaderboard</h3>
            <ol style="list-style: none; padding: 0;">
              ${leaderboardData.map((item, idx) => {
        let color;
        if (idx === 0) color = "#ffbf00";
        else if (idx === 1) color = "silver";
        else if (idx === 2) color = "#cd7f32"; // bronze color
        return `<li style="color: ${color}; font-weight: bold; margin: 5px 0;">
                          ${item.name}: ${item.time.toFixed(2)} seconds
                        </li>`;
      }).join('')}
            </ol>
          `;
      checkedContestantsList.appendChild(additionalText);
    });
  });

  const globalToggle = document.getElementById("globalToggleSprite");

  // Helper function to reset everything for all contestants
  function resetEverything() {
    const isFemale = globalToggle.checked;
    // Iterate over each contestant card
    contestants.forEach((contestant, index) => {
      // Uncheck the running checkbox (class "toggleColor")
      const checkbox = contestant.querySelector("input.toggleColor");
      if (checkbox) {
        checkbox.checked = false;
      }

      // Reset the silhouette
      const silhouette = contestant.querySelector(".silhouette");
      if (silhouette) {
        // Clear any pending timeouts for switching animations
        if (silhouette.switchTimeoutID) {
          clearTimeout(silhouette.switchTimeoutID);
          delete silhouette.switchTimeoutID;
        }
        // Remove any running or walking classes
        silhouette.classList.remove("run-male",  "run-female", "walk-male", "walk-female");
        // Set default sprite image based on global gender state
        if (isFemale) {
          // Use female running sprite as the default still image
          silhouette.style.backgroundImage = "url('sprites_female_run.png')";
        } else {
          silhouette.style.backgroundImage = "url('sprites_male_run.png')";
        }
        silhouette.style.backgroundPosition = "-24px -12px";
      }

      // Reset the energy bar
      const energyBar = contestant.querySelector(".energy-bar");
      if (energyBar) {
        if (energyBar.energyIntervalID) {
          clearInterval(energyBar.energyIntervalID);
          delete energyBar.energyIntervalID;
        }
        energyBar.style.height = "100%";
      }

      // Reset bar charts
      svg.remove();
      createBarPlots();
    });

    leaderboardTimeouts.forEach(timeoutID => clearTimeout(timeoutID));
    leaderboardTimeouts = [];

    // Clear any pending leaderboard timeouts (if any)
    checkedContestantsList.querySelectorAll("li").forEach(li => {
      if (li.runningTimeoutID) {
        clearTimeout(li.runningTimeoutID);
        delete li.runningTimeoutID;
      }
    });
    // Clear the leaderboard
    checkedContestantsList.innerHTML = "";
    // Re-enable the start button
    startButton.disabled = false;
  }

  // Reset button handler calls resetEverything
  resetButton.addEventListener("click", () => {
    console.log("Reset button clicked");
    resetEverything();
  });

  // Global gender toggle now acts as a full reset.
  globalToggle.addEventListener("change", function() {
    console.log("Global gender toggled to:", this.checked ? "female" : "male");
    resetEverything();
  });

  // Attach event listeners for all customize buttons
  document.querySelectorAll(".customize-btn").forEach((button, index) => {
    button.addEventListener("click", () => {
      console.log("Customize button clicked for contestant", index);
      openCustomizationModal(index);
    });
  });

  // Function to open the modal
  function openCustomizationModal(index) {
    const modal = document.getElementById("customize-modal");
    if (modal) {
      // Optionally, update modal content based on the contestant's index
      modal.hidden = false;
    } else {
      console.error("Modal element not found");
    }
  }

  // Close modal when the close button is clicked
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

    // Build scales using the full dataset for consistent axes.
    const xScale = d3.scaleBand()
      .domain(dataset.data.map(d => d.age_grp))
      .range([0, chartWidth])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(dataset.data, d => d[dataset.yKey])])
      .nice()
      .range([chartHeight, 0]);

    // Determine which bars to show: filter dataset.data based on filteredData.
    // If filteredData is empty, barsData will be an empty array and no bars are rendered.
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

    // Add the x-axis.
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

    // Add the y-axis.
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

    // Add the chart title.
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


  
  
  



  
  



