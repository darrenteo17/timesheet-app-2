// =====================
// Constants
// =====================
const HOURLY_RATE = 11;
const CPF_DEDUCTION = 0.20; // Employee deduction
const CPF_EMPLOYER = 0.37;   // Employer CPF

// =====================
// Track edit state
// =====================
let editIndex = null;

// =====================
// Load saved entries
// =====================
let entries = JSON.parse(localStorage.getItem("timesheetEntries")) || [];

// =====================
// Helper Functions
// =====================

// Format date to "08 Nov 2025" and return weekday
function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return { display: "Invalid Date", day: "" };
  const day = String(date.getDate()).padStart(2, '0'); // 2-digit day
  const month = date.toLocaleString('en-US', { month: 'short' }); // short month
  const year = date.getFullYear();
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  return {
    display: `${day} ${month} ${year}`, // 08 Nov 2025
    day: weekday
  };
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function calculateTotalTime(timeIn, timeOut) {
  const diff = timeToMinutes(timeOut) - timeToMinutes(timeIn);
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return {
    text: `${hours}hrs ${minutes}mins`,
    decimal: hours + minutes / 60
  };
}

function calculateEarnings(decimalHours) {
  const gross = decimalHours * HOURLY_RATE;
  return {
    gross,
    net: gross - gross * CPF_DEDUCTION,
    cpf: gross * CPF_EMPLOYER
  };
}

// =====================
// Populate month filter
// =====================
function populateMonthFilter() {
  const filter = document.getElementById("monthFilter");
  const monthsSet = new Set(entries.map(e => e.month));
  filter.innerHTML = '<option value="all">All Months</option>';
  monthsSet.forEach(month => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = month;
    filter.appendChild(option);
  });
}

// =====================
// Dashboard
// =====================
function updateDashboard(entriesToUse = entries) {
  let totalHours = 0, totalGross = 0, totalNet = 0, totalCPF = 0;

  entriesToUse.forEach(e => {
    const h = parseFloat(e.hours.split("hrs")[0]) + parseFloat(e.hours.split(" ")[1].replace("mins",""))/60;
    totalHours += h;
    totalGross += parseFloat(e.gross);
    totalNet += parseFloat(e.net);
    totalCPF += parseFloat(e.cpf);
  });

  document.getElementById("totalHours").textContent = totalHours.toFixed(2);
  document.getElementById("totalGross").textContent = totalGross.toFixed(2);
  document.getElementById("totalNet").textContent = totalNet.toFixed(2);
  document.getElementById("totalCPF").textContent = totalCPF.toFixed(2);
}

// =====================
// Render entries
// =====================
function renderEntries(filterMonth = "all") {
  const container = document.getElementById("entries");
  container.innerHTML = "";

  let filteredEntries = entries;
  if (filterMonth !== "all") {
    filteredEntries = entries.filter(e => e.month === filterMonth);
  }

  if (filteredEntries.length === 0) {
    container.innerHTML = "<p>No entries for this month.</p>";
    updateDashboard(filteredEntries);
    return;
  }

  // Group entries by month
  const months = {};
  filteredEntries.forEach(e => {
    if (!months[e.month]) months[e.month] = [];
    months[e.month].push(e);
  });

  // Render each month with totals
  for (let month in months) {
    let monthHours = 0, monthGross = 0, monthNet = 0, monthCPF = 0;

    months[month].forEach(e => {
      const h = parseFloat(e.hours.split("hrs")[0]) + parseFloat(e.hours.split(" ")[1].replace("mins",""))/60;
      monthHours += h;
      monthGross += parseFloat(e.gross);
      monthNet += parseFloat(e.net);
      monthCPF += parseFloat(e.cpf);
    });

    const monthCard = document.createElement("div");
    monthCard.className = "month-card";

    monthCard.innerHTML = `
      <div class="month-header">
        ${month} — Hours: ${monthHours.toFixed(2)}, Gross: $${monthGross.toFixed(2)}, Net: $${monthNet.toFixed(2)}, CPF: $${monthCPF.toFixed(2)}
      </div>
      <div class="entry-container"></div>
    `;

    const entryContainer = monthCard.querySelector(".entry-container");

    months[month].forEach((e) => {
      const entryCard = document.createElement("div");
      entryCard.className = "entry-card";
      entryCard.innerHTML = `
        <p><strong>${e.displayDate}</strong> (${e.day})</p>
        <p><strong>Branch:</strong> ${e.branch}</p>
        <p><strong>Time:</strong> ${e.timeIn} – ${e.timeOut}</p>
        <p><strong>Total Hours:</strong> ${e.hours}</p>
        <p><strong>Gross:</strong> $${e.gross} | <strong>Net:</strong> $${e.net} | <strong>CPF:</strong> $${e.cpf}</p>
        <div class="entry-buttons">
          <button onclick="editEntry(${entries.indexOf(e)})">Edit</button>
          <button onclick="deleteEntry(${entries.indexOf(e)})">Delete</button>
        </div>
      `;
      entryContainer.appendChild(entryCard);
    });

    // Add expand/collapse
    const header = monthCard.querySelector(".month-header");
    header.addEventListener("click", () => {
      entryContainer.classList.toggle("show");
    });

    container.appendChild(monthCard);
  }

  updateDashboard(filteredEntries);
}

// =====================
// Edit / Delete
// =====================
function deleteEntry(index) {
  if (confirm("Are you sure you want to delete this entry?")) {
    entries.splice(index, 1);
    saveEntries();
    populateMonthFilter();
    renderEntries(document.getElementById("monthFilter").value);
  }
}

function editEntry(index) {
  const entry = entries[index];
  document.getElementById("dateWorked").value = entry.rawDate; // use raw date for input[type=date]
  document.getElementById("branch").value = entry.branch;
  document.getElementById("timeIn").value = entry.timeIn;
  document.getElementById("timeOut").value = entry.timeOut;

  editIndex = index;
  document.getElementById("modalTitle").textContent = "Edit Entry";
  showModal();
}

// =====================
// Save
// =====================
function saveEntries() {
  localStorage.setItem("timesheetEntries", JSON.stringify(entries));
}

// =====================
// Form submit
// =====================
document.getElementById("timesheetForm").addEventListener("submit", e => {
  e.preventDefault();

  const date = document.getElementById("dateWorked").value;
  const branch = document.getElementById("branch").value;
  const timeIn = document.getElementById("timeIn").value;
  const timeOut = document.getElementById("timeOut").value;

  const total = calculateTotalTime(timeIn, timeOut);
  const pay = calculateEarnings(total.decimal);
  const formatted = formatDate(date);

  const entry = {
    rawDate: date, // store YYYY-MM-DD for editing
    displayDate: formatted.display, // 08 Nov 2025 for UI
    day: formatted.day,
    month: new Date(date).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    branch,
    timeIn,
    timeOut,
    hours: total.text,
    gross: pay.gross.toFixed(2),
    net: pay.net.toFixed(2),
    cpf: pay.cpf.toFixed(2)
  };

  if (editIndex === null) {
    entries.push(entry);
  } else {
    entries[editIndex] = entry;
    editIndex = null;
    document.getElementById("modalTitle").textContent = "Add Entry";
  }

  saveEntries();
  populateMonthFilter();
  renderEntries(document.getElementById("monthFilter").value);
  closeModal();
  e.target.reset();
});

// =====================
// Clear all entries
// =====================
document.getElementById("clearAll").addEventListener("click", () => {
  if (confirm("Are you sure you want to delete all entries?")) {
    entries = [];
    saveEntries();
    populateMonthFilter();
    renderEntries();
  }
});

// =====================
// Month filter change
// =====================
document.getElementById("monthFilter").addEventListener("change", (e) => {
  renderEntries(e.target.value);
});

// =====================
// Modal logic (FAB)
// =====================
const fab = document.getElementById("fab");
const modal = document.getElementById("entryModal");
const closeBtn = document.querySelector(".close");

function showModal() {
  modal.classList.add("show");
}

function closeModal() {
  modal.classList.remove("show");
  editIndex = null;
  document.getElementById("modalTitle").textContent = "Add Entry";
  document.getElementById("timesheetForm").reset();
}

fab.addEventListener("click", showModal);
closeBtn.addEventListener("click", closeModal);
window.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// =====================
// Initial render
// =====================
populateMonthFilter();
renderEntries();
