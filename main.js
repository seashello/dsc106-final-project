import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let meanData;
let hrData, o2Data, speedData, co2Data, rrData, veData;
let svg;
let chartData = [];
let leaderboardTimeouts = [];

// Global leaderboard data array.
let leaderboardData = [];

// Global variable to store the currently customizing contestant index.
let currentContestantIndex = null;

// Hair sprite mapping for hair customization.
// Update these color codes and file names with your actual asset filenames.
const hairSpriteMapping = {
  "gray": { male: "customization/gray-hair-male.png", female: "customization/gray-hair-female.png" },
  "black": { male: "customization/black-hair-male.png", female: "customization/black-hair-female.png" },
  "blonde":{ male: "customization/blonde-hair-male.png",female: "customization/blonde-hair-female.png" },
  "brown":   { male: "customization/brown-hair-male.png",   female: "customization/brown-hair-female.png" },
  "red":   { male: "customization/red-hair-male.png",   female: "customization/red-hair-female.png" },
  "blue":   { male: "customization/blue-hair-male.png",   female: "customization/blue-hair-female.png" },
  "green":   { male: "customization/green-hair-male.png",   female: "customization/green-hair-female.png" },
  "orange":   { male: "customization/orange-hair-male.png",   female: "customization/orange-hair-female.png" },
  "pink":   { male: "customization/pink-hair-male.png",   female: "customization/pink-hair-female.png" },
  "purple":   { male: "customization/purple-hair-male.png",   female: "customization/purple-hair-female.png" }
};

const clothingSpriteMapping = {
  "gray":   { male: "customization/gray-clothing-male.png",   female: "customization/gray-clothing-female.png" },
  "black":  { male: "customization/black-clothing-male.png",  female: "customization/black-clothing-female.png" },
  "yellow": { male: "customization/yellow-clothing-male.png", female: "customization/yellow-clothing-female.png" },
  "brown":  { male: "customization/brown-clothing-male.png",  female: "customization/brown-clothing-female.png" },
  "red":    { male: "customization/red-clothing-male.png",    female: "customization/red-clothing-female.png" },
  "blue":   { male: "customization/blue-clothing-male.png",   female: "customization/blue-clothing-female.png" },
  "green":  { male: "customization/green-clothing-male.png",  female: "customization/green-clothing-female.png" },
  "orange": { male: "customization/orange-clothing-male.png", female: "customization/orange-clothing-female.png" },
  "pink":   { male: "customization/pink-clothing-male.png",   female: "customization/pink-clothing-female.png" },
  "purple": { male: "customization/purple-clothing-male.png", female: "customization/purple-clothing-female.png" }
};

// Update the leaderboard with a new result.
function updateLeaderboard(newResult) {
  leaderboardData.push(newResult);
  leaderboardData.sort((a, b) => b.time - a.time);
  renderLeaderboard();
}

// Render the leaderboard with D3 transitions.
function renderLeaderboard() {
  let container = d3.select("#leaderboard");
  if (container.empty()) {
    container = d3.select("#chatbox")
      .append("div")
      .attr("id", "leaderboard")
      .style("position", "relative")
      .style("margin-top", "10px")
      .style("text-align", "center");
    container.append("h3").text("Leaderboard");
  }
  
  const headerNode = container.select("h3").node();
  const headerHeight = headerNode ? headerNode.getBoundingClientRect().height : 30;
  
  const items = container.selectAll("div.leaderboard-item")
    .data(leaderboardData, d => d.index);
  
  const itemsEnter = items.enter().append("div")
    .attr("class", "leaderboard-item")
    .style("position", "absolute")
    .style("left", "50%")
    .style("transform", "translateX(-50%)")
    .style("width", "100%")
    .style("opacity", 0)
    .text(d => `${d.name}: ${d.time.toFixed(2)} seconds`)
    .on("click", d => showContestantDetails(d));
  
  itemsEnter.merge(items)
    .transition()
    .duration(500)
    .style("opacity", 1)
    .style("top", (d, i) => `${i * 30 + headerHeight + 20}px`)
    .style("color", (d, i) => {
      if (i === 0) return "#ffbf00";
      else if (i === 1) return "silver";
      else if (i === 2) return "#cd7f32";
      else return "#333";
    });
  
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
  const globalToggle = document.getElementById("globalToggleSprite");
  const gender = globalToggle && globalToggle.checked ? 'female' : 'male';
  const csvFile = gender === 'female' ? "data/f_mean_max_df.csv" : "data/m_mean_max_df.csv";
  
  meanData = await d3.csv(csvFile);

  // Sort the meanData array by the lower age bound so the data matches the contestant order.
  meanData.sort((a, b) => {
    const ageA = parseInt(a.age_grp.match(/\d+/)[0]);
    const ageB = parseInt(b.age_grp.match(/\d+/)[0]);
    return ageA - ageB;
  });

  hrData = meanData.map(d => ({ age_grp: d.age_grp, HR: +d.HR, time: +d.time }));
  o2Data = meanData.map(d => ({ age_grp: d.age_grp, VO2: +d.VO2, time: +d.time }));
  speedData = meanData.map(d => ({ age_grp: d.age_grp, Speed: +d.Speed, time: +d.time }));
  co2Data = meanData.map(d => ({ age_grp: d.age_grp, VCO2: +d.VCO2, time: +d.time }));
  rrData = meanData.map(d => ({ age_grp: d.age_grp, RR: +d.RR, time: +d.time }));
  veData = meanData.map(d => ({ age_grp: d.age_grp, VE: +d.VE, time: +d.time }));
  
  createBarPlots();
  
  // For females, disable the 60-70 checkbox if data is missing.
  if (gender === 'female') {
    const has60_70 = meanData.some(d => d.age_grp.includes("60") && d.age_grp.includes("70"));
    if (!has60_70) {
      const contestantCards = document.querySelectorAll(".contestant");
      if (contestantCards[5]) {
        const checkbox = contestantCards[5].querySelector("input[type='checkbox']");
        if (checkbox) {
          checkbox.disabled = true;
        }
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
  } else {
    // For males, ensure the 60-70 checkbox is enabled and remove any overlay.
    const contestantCards = document.querySelectorAll(".contestant");
    if (contestantCards[5]) {
      const checkbox = contestantCards[5].querySelector("input[type='checkbox']");
      if (checkbox) {
        checkbox.disabled = false;
      }
      const existingOverlay = contestantCards[5].querySelector(".no-data-overlay");
      if (existingOverlay) {
        existingOverlay.remove();
      }
    }
  }
} 

function injectBounceStyle() {
  if (!document.getElementById('bounce-style')) {
    const style = document.createElement('style');
    style.id = 'bounce-style';
    style.innerHTML = `
      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateX(-50%) translateY(0); }
        40% { transform: translateX(-50%) translateY(-10px); }
        60% { transform: translateX(-50%) translateY(-5px); }
      }
    `;
    document.head.appendChild(style);
  }
}

function showScrollIndicator() {
  injectBounceStyle();
  let indicator = document.getElementById('scroll-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'scroll-indicator';
    indicator.innerHTML = "&#8595; In Depth Statistics &#8595;";
    indicator.style.position = 'fixed';
    indicator.style.bottom = '20px';
    indicator.style.left = '50%';
    indicator.style.transform = 'translateX(-50%)';
    indicator.style.fontSize = '1.2em';
    indicator.style.color = '#3d5fa8';
    indicator.style.cursor = 'pointer';
    indicator.style.zIndex = '1000';
    indicator.style.animation = 'bounce 2s infinite';
    document.body.appendChild(indicator);
  }
  indicator.style.display = 'block';
}

function hideScrollIndicator() {
  let indicator = document.getElementById('scroll-indicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

function checkScrollForIndicator() {
  const graphs = document.getElementById("graphs");
  if (graphs) {
    if (window.scrollY + window.innerHeight >= graphs.offsetTop + 50) {
      hideScrollIndicator();
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

  const globalToggle = document.getElementById("globalToggleSprite");

  window.addEventListener('scroll', checkScrollForIndicator);

  document.querySelectorAll('.hair').forEach(hair => {
    hair.style.backgroundImage = "url('customization/gray-hair-male.png')";
  });

  document.querySelectorAll('.clothing').forEach(clothing => {
    clothing.style.backgroundImage = "url('customization/gray-clothing-male.png')";
  });

  contestants.forEach((contestant, index) => {
    const checkbox = contestant.querySelector("input[type='checkbox']");
    const figureNameInput = contestant.querySelector(".figureName");
    const nameDisplay = contestant.querySelector(".nameDisplay");
    const silhouette = contestant.querySelector(".silhouette");
    const hairElement = contestant.querySelector(".hair");

    figureNameInput.addEventListener("input", () => {
      if (figureNameInput.value.length == 24) {
        showAlert("Name cannot exceed 24 characters.");
        figureNameInput.value = figureNameInput.value.substring(0, 24);
      }
      // Update the name display below the contestant.
      nameDisplay.textContent = figureNameInput.value || `Contestant #${index + 1}`;
      // And update the chatbox for active contestants.
      updateCheckedContestants();
    });

    checkbox.addEventListener("change", () => {
      const clothingElement = contestant.querySelector(".clothing");
      if (!checkbox.checked) {
        silhouette.classList.remove("run-male", "run-female", "walk-male", "walk-female");
        silhouette.style.backgroundPosition = "-24px -12px";
        hairElement.classList.remove("run-male", "run-female", "walk-male", "walk-female");
        hairElement.style.backgroundPosition = "-24px -12px";
        clothingElement.classList.remove("run-male", "run-female", "walk-male", "walk-female");
        clothingElement.style.backgroundPosition = "-24px -12px";
      } else {
        silhouette.style.backgroundPosition = "-215px -14px";
        hairElement.style.backgroundPosition = "-215px -14px";
        clothingElement.style.backgroundPosition = "-215px -14px";
      }
      updateCheckedContestants();
    });    
  });

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

  //this doesn't work anymore but it's not really necessary
  function showAlert(message) {
    alertMessage.textContent = message;
    alertBox.style.display = "block";
    setTimeout(() => {
      alertBox.style.display = "none";
    }, 2000);
  }

  startButton.addEventListener("click", () => {
    if (startButton.disabled) return;
    
    leaderboardData = [];
    
    const checkedContestants = [];
    const unChecked = [];

    contestants.forEach((contestant, index) => {
      const checkbox = contestant.querySelector("input[type='checkbox']");
      if (checkbox.checked) {
        checkedContestants.push({ element: contestant, origIndex: index });
      }
      else {
        unChecked.push({ element: contestant, origIndex: index });
      }
    });

    unChecked.forEach(({ element, origIndex }, idx) => {
      const energyBar = element.querySelector(".energy-bar");
      element.style.opacity = "50%";
      energyBar.style.backgroundColor = "Gray";

      //disable checkbox
      const checkbox = element.querySelector("input[type='checkbox']");
      checkbox.disabled = true;
      element.classList.add("no-hover");

      //disable name inputter
      const input = element.querySelector(".figureName");
      input.disabled = true;

      //disable customize
      const button = element.querySelector(".customize-btn");
      button.disabled = true;
      button.classList.add("no-color");
    });

    if (checkedContestants.length === 0) {
      return;
    }
    
    startButton.disabled = true;
    
    const delays = checkedContestants.map(({ origIndex }) => {
      return 14000 - Math.cbrt(hrData[2].time - hrData[origIndex].time) * 2000;
    });
  
    checkedContestants.forEach(({ element, origIndex }, idx) => {
      const silhouette = element.querySelector(".silhouette");
      const hairElement = element.querySelector(".hair");
      const clothingElement = element.querySelector(".clothing");
  
      if (globalToggle.checked) {
        silhouette.classList.add("run-female");
        if (hairElement) {
          hairElement.className = "hair run-female";
        }
        if (clothingElement) {
          clothingElement.className = "clothing run-female";
        }
      } else {
        silhouette.classList.add("run-male");
        if (hairElement) {
          hairElement.className = "hair run-male";
        }
        if (clothingElement) {
          clothingElement.className = "clothing run-male";
        }
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
        let dotCount = 0;
        loadingAnimation.style.color = "#a32a2a";
        const loadingIntervalID = setInterval(() => {
          dotCount = (dotCount + 1) % 4;
          loadingAnimation.textContent = "Currently Running" + ".".repeat(dotCount);
        }, 500);
        listItem.runningTimeoutID = setTimeout(() => {
          clearInterval(loadingIntervalID);
          loadingAnimation.style.display = "none";
          timeText.style.display = "inline";
        }, delay);
      }

      silhouette.switchTimeoutID = setTimeout(() => {
        silhouette.style.backgroundImage = "";
        if (globalToggle.checked) {
          silhouette.classList.remove("run-female");
          silhouette.classList.add("walk-female");
          hairElement.classList.remove("run-female");
          hairElement.classList.add("walk-female");
          clothingElement.classList.remove("run-female");
          clothingElement.classList.add("walk-female");
        } else {
          silhouette.classList.remove("run-male");
          silhouette.classList.add("walk-male");
          hairElement.classList.remove("run-male");
          hairElement.classList.add("walk-male");
          clothingElement.classList.remove("run-male");
          clothingElement.classList.add("walk-male");
        }   
        chartData.push(hrData[origIndex].age_grp);
        const nameDisplay = element.querySelector(".nameDisplay");
        const contestantName = nameDisplay ? nameDisplay.textContent : `Contestant #${origIndex + 1}`;
        updateLeaderboard({ index: origIndex, time: hrData[origIndex].time, name: contestantName });
      }, delay);  
    });

    let maxDelay = Math.max(...delays);
    setTimeout(() => {
      showScrollIndicator();
    }, maxDelay + 500);
  });

  function resetEverything() {
    hideScrollIndicator();
  
    // Clear chartData in place so the Proxy remains intact.
    chartData.length = 0;
  
    const contestants = document.querySelectorAll(".contestant");
    // Remove any no-data overlay from each contestant.
    contestants.forEach((contestant) => {
      const overlay = contestant.querySelector(".no-data-overlay");
      if (overlay) overlay.remove();
    });
  
    // Determine current gender.
    const isFemale = document.getElementById("globalToggleSprite").checked;
  
    contestants.forEach((contestant, index) => {
      // Reset the checkbox but do not clear the name input.
      const checkbox = contestant.querySelector("input.toggleColor");
      if (checkbox) {
        checkbox.checked = false;
      }
  
      // Get the visual elements.
      const silhouette = contestant.querySelector(".silhouette");
      const hairElement = contestant.querySelector(".hair");
      const clothingElement = contestant.querySelector(".clothing");
  
      // Reset silhouette.
      if (silhouette) {
        if (silhouette.switchTimeoutID) {
          clearTimeout(silhouette.switchTimeoutID);
          delete silhouette.switchTimeoutID;
        }
        silhouette.classList.remove("run-male", "run-female", "walk-male", "walk-female");
        silhouette.style.backgroundImage = isFemale
          ? "url('sprites_female_run.png')"
          : "url('sprites_male_run.png')";
        silhouette.style.backgroundPosition = "-24px -12px";
      }
  
      // Reset hair sprite while preserving saved customization.
      if (hairElement) {
        hairElement.classList.remove("run-male", "run-female", "walk-male", "walk-female");
        const customHairColor = contestant.dataset.hairColor;
        if (customHairColor) {
          const mapping = hairSpriteMapping[customHairColor] || hairSpriteMapping["gray"];
          hairElement.style.backgroundImage = `url('${mapping[isFemale ? "female" : "male"]}')`;
        } else {
          hairElement.style.backgroundImage = isFemale
            ? "url('customization/gray-hair-female.png')"
            : "url('customization/gray-hair-male.png')";
        }
        hairElement.style.backgroundPosition = "-24px -12px";
      }
  
      // Reset clothing sprite while preserving saved customization.
      if (clothingElement) {
        clothingElement.classList.remove("run-male", "run-female", "walk-male", "walk-female");
        const customClothingColor = contestant.dataset.clothingColor;
        if (customClothingColor) {
          const mapping = clothingSpriteMapping[customClothingColor] || clothingSpriteMapping["gray"];
          clothingElement.style.backgroundImage = `url('${mapping[isFemale ? "female" : "male"]}')`;
        } else {
          clothingElement.style.backgroundImage = isFemale
            ? "url('customization/gray-clothing-female.png')"
            : "url('customization/gray-clothing-male.png')";
        }
        clothingElement.style.backgroundPosition = "-24px -12px";
      }
  
      // Reset energy bar.
      const energyBar = contestant.querySelector(".energy-bar");
      if (energyBar) {
        if (energyBar.energyIntervalID) {
          clearInterval(energyBar.energyIntervalID);
          delete energyBar.energyIntervalID;
        }
        energyBar.style.height = "100%";
        energyBar.style.backgroundColor ="#3cb371";
      }

      contestant.style.opacity = "100%";
      contestant.classList.remove('no-hover');

      //undisable everything
      const check = contestant.querySelector("input[type='checkbox']");
      check.disabled = false;

      const input = contestant.querySelector(".figureName");
      input.disabled = false;

      const button = contestant.querySelector(".customize-btn");
      button.disabled = false;
      button.classList.remove("no-color");
  
      // Do not alter the .figureName input or .nameDisplay element—this preserves the custom name.
    });
  
    // Recreate the bar plots once after processing all contestants.
    if (svg) {
      svg.remove();
    }
    createBarPlots();
  
    // Clear leaderboard timeouts and display.
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
      
      // Reset chartData
      chartData = [];
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
  
  // Event listener for saving hair customization.
  document.getElementById("save-customization").addEventListener("click", () => {
    const hairColor = document.getElementById("hair-color").value;
    const clothingColor = document.getElementById("clothing-color").value;
    const gender = document.getElementById("globalToggleSprite").checked ? 'female' : 'male';
    
    const hairMapping = hairSpriteMapping[hairColor] || hairSpriteMapping["gray"];
    const hairSprite = hairMapping[gender];
    
    const clothingMapping = clothingSpriteMapping[clothingColor] || clothingSpriteMapping["gray"];
    const clothingSprite = clothingMapping[gender];
    
    const contestant = document.querySelectorAll(".contestant")[currentContestantIndex];
    if (contestant) {
      // Save the customizations so they persist (for example, on reset)
      contestant.dataset.hairColor = hairColor;
      contestant.dataset.clothingColor = clothingColor;
      
      // Update hair element
      const hairElement = contestant.querySelector(".hair");
      if (hairElement) {
        hairElement.style.backgroundImage = `url('${hairSprite}')`;
      }
      
      // Update clothing element
      const clothingElement = contestant.querySelector(".clothing");
      if (clothingElement) {
        clothingElement.style.backgroundImage = `url('${clothingSprite}')`;
      }
      
      console.log(`Saved customization for contestant ${currentContestantIndex}: hair=${hairColor}, clothing=${clothingColor}`);
    }
    
    document.getElementById("customize-modal").hidden = true;
  });
  
  
  // Modify openCustomizationModal to store current contestant index.
  function openCustomizationModal(index) {
    currentContestantIndex = index;
    const modal = document.getElementById("customize-modal");
    const contestant = document.querySelectorAll(".contestant")[index];
    if (contestant) {
      // Set the hair color input to the contestant's saved hair color (default to "gray" if none)
      const hairColor = contestant.dataset.hairColor || "gray";
      document.getElementById("hair-color").value = hairColor;
  
      // Set the clothing color input to the contestant's saved clothing color (default to "gray" if none)
      const clothingColor = contestant.dataset.clothingColor || "gray";
      document.getElementById("clothing-color").value = clothingColor;
    }
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

document.addEventListener("DOMContentLoaded", function() {
  const tooltipDef = document.getElementById("tooltip-def");
  
  // If tooltip doesn't exist, create it with styles that match the other tooltip
  if (!tooltipDef) {
    const newTooltip = document.createElement('div');
    newTooltip.id = 'tooltip-def';
    newTooltip.style.position = 'fixed'; // Use fixed positioning for floating appearance
    newTooltip.style.background = 'white';
    newTooltip.style.border = '1px solid #ccc';
    newTooltip.style.padding = '10px';
    newTooltip.style.borderRadius = '4px';
    newTooltip.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    newTooltip.style.zIndex = '1000';
    newTooltip.style.maxWidth = '300px';
    newTooltip.style.display = 'none';
    newTooltip.style.pointerEvents = 'none'; // Prevents tooltip from interfering with mouse events
    document.body.appendChild(newTooltip);
  }
  
  const hoverWord = document.querySelector(".hover-word");
  tooltipDef.style.display = 'none';
  hoverWord.addEventListener("mouseenter", (event) => {
      const tooltipDef = document.getElementById("tooltip-def");

      const content = hoverWord.getAttribute('data-tooltip') || 
                        `<strong><u>Heart Rate</u>:</strong> The number of heartbeats per minute. 
                        In endurance tests, HR is used to assess cardiovascular fitness and 
                        effort level. Highly trained individuals may have lower HR at a given 
                        intensity due to better cardiovascular efficiency.<br><br>

                        <strong><u>Oxygen Consumption</u>:</strong> VO2 max, or maximal oxygen 
                        consumption, is the maximum amount of oxygen that a person can use 
                        during intense exercise. It is a measure of aerobic fitness, or the 
                        body's ability to deliver and utilize oxygen. Higher VO₂ values indicate 
                        better aerobic capacity. VO₂ max (maximum oxygen uptake) is a key measure 
                        of endurance fitness, representing how efficiently the body can use oxygen 
                        during exercise. Elite endurance athletes typically have very high VO₂ max 
                        values.<br><br>

                        <strong><u>Carbon Dioxide Production</u>:</strong> The amount of carbon 
                        dioxide exhaled per minute. A high VCO₂ indicates increased metabolic 
                        activity and energy expenditure. The balance between VO₂ and VCO₂ 
                        (respiratory exchange ratio) helps assess the type of fuel 
                        (carbohydrates or fats) being used for energy during exercise.<br><br>
                        
                        <strong><u>Speed</u>:</strong> The pace at which an individual moves during 
                        the endurance test.Higher speed indicates greater endurance performance and 
                        fitness level. Well-trained endurance athletes can sustain high speeds for 
                        longer durations.<br><br>

                        <strong><u>Respiratory Rate</u>:</strong> The number of breaths taken per minute.
                        A higher respiratory rate reflects an increased demand for oxygen and 
                        removal of CO₂. Trained individuals may have a lower RR at submaximal exercise 
                        intensities due to more efficient breathing mechanics.<br><br>

                        <strong><u>Pulmonary Ventilation</u>:</strong> The total volume of air inhaled 
                        and exhaled per minute. A higher VE indicates greater lung capacity and efficiency 
                        in oxygen delivery. Endurance-trained individuals can achieve high VE values without 
                        excessive breathing effort.
                        `;
                        
      tooltipDef.innerHTML = content;
      tooltipDef.style.display = 'block';
      
      const rect = hoverWord.getBoundingClientRect();
      const tooltipHeight = tooltipDef.offsetHeight;
      const tooltipWidth = tooltipDef.offsetWidth;
      
      let top = rect.top - tooltipHeight - 10;
      let left = rect.left + (rect.width - tooltipWidth) / 2;
      
      if (top < 10) {
          top = rect.bottom + 10;
      }
      
      if (left < 200) {
          left = 200;
      } else if (left + tooltipWidth > window.innerWidth - 200) {
          left = window.innerWidth - tooltipWidth - 200;
      }
      
      tooltipDef.style.position = 'fixed';
      tooltipDef.style.left = `${left}px`;
      tooltipDef.style.top = `${top}px`;
  });

  hoverWord.addEventListener("mouseleave", () => {
      const tooltipDef = document.getElementById("tooltip-def");
      tooltipDef.style.display = 'none';
  })
});