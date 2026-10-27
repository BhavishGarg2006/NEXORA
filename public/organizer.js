/* =========================================================
   Nexora - Organizer Portal | organizer.js
   Login/Signup server par hota hai (JWT cookie + role = organizer).
   Event data MongoDB me rehta hai.
   ========================================================= */

let currentOrganizer = null;     // { id, name, email, role }
let myEvents = [];
let currentRegistrantsEventId = null;
let orgMode = "login";

/* ── 1. LOAD ──────────────────────────────────────────────── */

async function loadMyEvents() {
  try {
    myEvents = (await api("/api/events/mine")).events;
  } catch (err) {
    myEvents = [];
    showToast(err.message, "error");
  }
}

function findEventById(id) {
  for (let i = 0; i < myEvents.length; i++) {
    if (myEvents[i].id === id) return myEvents[i];
  }
  return null;
}

/* ── 2. AUTH GATE ─────────────────────────────────────────── */

function renderGateOrDashboard() {
  let gate = document.getElementById("access-gate");
  let dashboard = document.getElementById("org-dashboard");
  let badge = document.getElementById("org-user-badge");

  if (currentOrganizer) {
    gate.style.display = "none";
    dashboard.style.display = "block";
    badge.style.display = "flex";
    document.getElementById("org-user-name").textContent = currentOrganizer.name.split(" ")[0];
    document.getElementById("org-welcome-name").textContent = currentOrganizer.name;
    renderDashboard();
  } else {
    gate.style.display = "flex";
    dashboard.style.display = "none";
    badge.style.display = "none";
  }
}

function setOrgMode(mode) {
  orgMode = mode;
  let tabs = document.querySelectorAll(".auth-tab");
  for (let i = 0; i < tabs.length; i++) tabs[i].classList.toggle("active", tabs[i].dataset.mode === mode);
  document.getElementById("org-name-group").style.display = mode === "signup" ? "flex" : "none";
  document.getElementById("org-code-group").style.display = mode === "signup" ? "flex" : "none";
  document.getElementById("org-submit-btn").textContent = mode === "signup" ? "Create Organizer Account" : "Unlock Dashboard";
  setError("org-form-error", "");
}

async function handleOrganizerAuth(e) {
  e.preventDefault();
  let name = document.getElementById("org-name").value.trim();
  let email = document.getElementById("org-email").value.trim();
  let password = document.getElementById("org-password").value;
  let code = document.getElementById("org-code").value.trim();
  let valid = true;

  ["org-name-error", "org-email-error", "org-password-error", "org-code-error", "org-form-error"].forEach(function (id) { setError(id, ""); });

  if (orgMode === "signup" && !name) { setError("org-name-error", "Name is required."); valid = false; }
  if (!email || !isValidEmail(email)) { setError("org-email-error", "Valid email required."); valid = false; }
  if (!password || (orgMode === "signup" && password.length < 6)) {
    setError("org-password-error", orgMode === "signup" ? "At least 6 characters." : "Password is required.");
    valid = false;
  }
  if (orgMode === "signup" && !code) { setError("org-code-error", "Access code is required."); valid = false; }
  if (!valid) return;

  try {
    let d;
    if (orgMode === "signup") {
      d = await api("/api/auth/signup", "POST", { name: name, email: email, password: password, role: "organizer", orgCode: code });
    } else {
      d = await api("/api/auth/login", "POST", { email: email, password: password });
    }

    // student account se organizer portal me ghusne ki koshish roko
    if (d.user.role !== "organizer") {
      await api("/api/auth/logout", "POST");
      setError("org-form-error", "This is a student account. Organizer accounts only, please.");
      return;
    }

    currentOrganizer = d.user;
    await loadMyEvents();
    showToast("Welcome, " + currentOrganizer.name.split(" ")[0] + "! Dashboard unlocked.");
    renderGateOrDashboard();
    e.target.reset();
  } catch (err) {
    setError(err.status === 403 && orgMode === "signup" ? "org-code-error" : "org-form-error", err.message);
  }
}

async function handleOrganizerLogout() {
  try { await api("/api/auth/logout", "POST"); } catch (e) {}
  currentOrganizer = null;
  myEvents = [];
  closeAllModals();
  showToast("Logged out of the Organizer Portal.", "info");
  renderGateOrDashboard();
}

/* ── 3. DASHBOARD ─────────────────────────────────────────── */

function renderDashboard() {
  let totalRegs = 0;
  let totalSeats = 0;
  for (let i = 0; i < myEvents.length; i++) {
    totalRegs += myEvents[i].registered;
    totalSeats += myEvents[i].seats;
  }
  document.getElementById("stat-events-created").textContent = myEvents.length;
  document.getElementById("stat-total-registrations").textContent = totalRegs;
  document.getElementById("stat-total-seats").textContent = totalSeats;

  let grid = document.getElementById("my-events-grid");
  if (myEvents.length === 0) {
    grid.innerHTML = "<p class='no-results'>You haven't created any events yet. Click \"+ Create New Event\" to publish your first one.</p>";
    return;
  }
  let html = "";
  for (let i = 0; i < myEvents.length; i++) html += buildOrganizerEventCard(myEvents[i]);
  grid.innerHTML = html;
}

function buildOrganizerEventCard(ev) {
  let pct = Math.min(100, Math.round((ev.registered / ev.seats) * 100));
  let seatsLeft = ev.seats - ev.registered;
  let typeClass = ev.paid ? "paid-type" : "";
  let cardClass = ev.status === "ongoing" ? "ongoing" : (ev.type === "Trip" ? "trip" : (ev.paid ? "paid" : ""));
  let priceTag = ev.paid ? "<div class='price-tag'>₹" + esc(ev.price) + "</div>" : "";
  let dlTag = ev.dutyLeave ? "<span class='dl-chip'>🎓 DL</span>" : "";
  let statusLabel = ev.status === "ongoing" ? "Ongoing" : (ev.status === "completed" ? "Completed" : "Upcoming");
  let statusClass = ev.status === "ongoing" ? "live" : "upcoming";
  let seatsLeftText = seatsLeft <= 0 ? "No seats left" : seatsLeft + (seatsLeft === 1 ? " seat left" : " seats left");

  let card = "";
  card += "<div class='event-card " + cardClass + "'>";
  card += "  <div class='event-top'>";
  card += "    <span class='event-type " + typeClass + "'>" + esc(ev.type) + "</span>";
  card += "    <span class='top-right'>" + dlTag + "<span class='event-status " + statusClass + "'>" + statusLabel + "</span></span>";
  card += "  </div>";
  card += "  <h3>" + esc(ev.title) + "</h3>";
  card += "  <p class='event-desc'>" + esc(ev.desc) + "</p>";
  card += "  <div class='event-info'>";
  card += "    <p>📅 " + esc(ev.dateDisplay) + "</p>";
  card += "    <p>⏰ " + esc(ev.time) + "</p>";
  if (ev.type === "Trip" && ev.destination) card += "    <p>🧳 " + esc(ev.destination) + "</p>";
  card += "    <p>📍 " + esc(ev.location) + "</p>";
  card += "  </div>";
  card += priceTag;
  card += "  <div class='seat-box'>";
  card += "    <div class='seat-row'><span>Registered</span><span>" + ev.registered + " / " + ev.seats + "</span></div>";
  card += "    <div class='progress'><div class='progress-fill' style='width:" + pct + "%'></div></div>";
  card += "    <p class='seats-left'>" + seatsLeftText + "</p>";
  card += "  </div>";
  card += "  <div class='card-actions-row'>";
  card += "    <button class='card-action-btn view-reg-btn' onclick=\"openRegistrantsModal('" + ev.id + "')\">👥 Registrants</button>";
  card += "    <button class='card-action-btn edit-btn' onclick=\"openEditEvent('" + ev.id + "')\">✏️ Edit</button>";
  card += "    <button class='card-action-btn delete-btn' onclick=\"confirmDeleteEvent('" + ev.id + "')\">🗑 Delete</button>";
  card += "  </div>";
  card += "</div>";
  return card;
}

/* ── 4. CREATE / EDIT ─────────────────────────────────────── */

function todayInput() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

// Trip chuno to destination dikhao aur paid zaroori kar do
function applyTypeRules() {
  let isTrip = document.getElementById("ce-type").value === "Trip";
  let paid = document.getElementById("ce-paid");
  document.getElementById("ce-dest-group").style.display = isTrip ? "flex" : "none";
  document.getElementById("ce-loc-hint").textContent = isTrip ? "(meeting point)" : "";
  document.getElementById("ce-price-label").textContent = isTrip ? "Trip Price per Student (₹)" : "Entry Fee (₹)";
  if (isTrip) paid.checked = true;
  paid.disabled = isTrip;
  document.getElementById("ce-price-group").style.display = (isTrip || paid.checked) ? "block" : "none";
}

function openCreateEventModal() {
  document.getElementById("create-event-form").reset();
  document.getElementById("ce-modal-title").textContent = "Create New Event";
  document.getElementById("ce-submit-btn").textContent = "Publish Event 🚀";
  document.getElementById("ce-editing-id").value = "";
  document.getElementById("ce-price-group").style.display = "none";
  applyTypeRules();
  document.getElementById("ce-date").min = todayInput();
  document.getElementById("ce-end-date").min = todayInput();
  openModal("create-event-modal");
}

function to24Hour(timeStr) {
  let match = String(timeStr).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return "";
  let h = parseInt(match[1], 10);
  let ap = match[3] ? match[3].toUpperCase() : "";
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return (h < 10 ? "0" + h : String(h)) + ":" + match[2];
}

function formatTimeDisplay(timeStr) {
  let parts = timeStr.split(":");
  let h = Number(parts[0]);
  let m = parts[1];
  let ap = h >= 12 ? "PM" : "AM";
  let hour12 = h % 12 === 0 ? 12 : h % 12;
  return hour12 + ":" + m + " " + ap;
}

function openEditEvent(eventId) {
  let ev = findEventById(eventId);
  if (!ev) return;

  document.getElementById("create-event-form").reset();
  document.getElementById("ce-modal-title").textContent = "Edit Event";
  document.getElementById("ce-submit-btn").textContent = "Save Changes 💾";
  document.getElementById("ce-editing-id").value = eventId;

  document.getElementById("ce-title").value = ev.title;
  document.getElementById("ce-type").value = ev.type;
  document.getElementById("ce-date").value = ev.date;
  document.getElementById("ce-end-date").value = ev.endDate;
  document.getElementById("ce-time").value = to24Hour(ev.time);
  document.getElementById("ce-location").value = ev.location;
  document.getElementById("ce-desc").value = ev.desc;
  document.getElementById("ce-seats").value = ev.seats;
  document.getElementById("ce-paid").checked = ev.paid;
  document.getElementById("ce-dl").checked = ev.dutyLeave;
  document.getElementById("ce-price-group").style.display = ev.paid ? "block" : "none";
  document.getElementById("ce-price").value = ev.price || "";
  document.getElementById("ce-destination").value = ev.destination || "";
  applyTypeRules();
  document.getElementById("ce-date").removeAttribute("min");
  document.getElementById("ce-end-date").removeAttribute("min");
  openModal("create-event-modal");
}

async function handleCreateOrEditEvent(e) {
  e.preventDefault();

  let editingId = document.getElementById("ce-editing-id").value;
  let title = document.getElementById("ce-title").value.trim();
  let type = document.getElementById("ce-type").value;
  let dateVal = document.getElementById("ce-date").value;
  let endVal = document.getElementById("ce-end-date").value || dateVal;
  let time = document.getElementById("ce-time").value;
  let location = document.getElementById("ce-location").value.trim();
  let desc = document.getElementById("ce-desc").value.trim();
  let seats = parseInt(document.getElementById("ce-seats").value, 10);
  let paid = document.getElementById("ce-paid").checked;
  let price = parseInt(document.getElementById("ce-price").value || "0", 10);
  let dutyLeave = document.getElementById("ce-dl").checked;
  let destination = document.getElementById("ce-destination").value.trim();
  if (type === "Trip") paid = true;

  ["ce-destination-error", "ce-title-error", "ce-type-error", "ce-date-error", "ce-end-date-error", "ce-time-error", "ce-location-error", "ce-desc-error", "ce-seats-error", "ce-form-error"].forEach(function (id) { setError(id, ""); });

  let valid = true;
  if (!title) { setError("ce-title-error", "Title is required."); valid = false; }
  if (!type) { setError("ce-type-error", "Select a type."); valid = false; }
  if (type === "Trip" && !destination) { setError("ce-destination-error", "Destination is required."); valid = false; }
  if (paid && (!price || price < 1)) { setError("ce-form-error", type === "Trip" ? "Enter the trip price." : "Enter the entry fee."); valid = false; }
  if (!dateVal) { setError("ce-date-error", "Date is required."); valid = false; }
  if (dateVal && endVal < dateVal) { setError("ce-end-date-error", "End can't be before start."); valid = false; }
  if (!time) { setError("ce-time-error", "Time is required."); valid = false; }
  if (!location) { setError("ce-location-error", "Location is required."); valid = false; }
  if (desc.length < 20) { setError("ce-desc-error", "Description too short (min 20 chars)."); valid = false; }
  if (!seats || seats < 1) { setError("ce-seats-error", "Seats must be at least 1."); valid = false; }
  if (!valid) return;

  let payload = {
    title: title, type: type, date: dateVal, endDate: endVal, time: formatTimeDisplay(time),
    location: location, desc: desc, seats: seats, paid: paid, price: paid ? price : 0, dutyLeave: dutyLeave,
    destination: type === "Trip" ? destination : ""
  };

  try {
    if (editingId) {
      await api("/api/events/" + editingId, "PUT", payload);
      showToast('"' + title + '" updated successfully! ✏️');
    } else {
      await api("/api/events", "POST", payload);
      showToast('"' + title + '" created successfully! 🎉');
    }
  } catch (err) {
    setError("ce-form-error", err.message);
    return;
  }

  await loadMyEvents();
  renderDashboard();
  closeModal("create-event-modal");
}

/* ── 5. DELETE ────────────────────────────────────────────── */

async function confirmDeleteEvent(eventId) {
  let ev = findEventById(eventId);
  if (!ev) return;

  let warn = 'Delete "' + ev.title + '"? This can\'t be undone.';
  if (ev.registered > 0) {
    warn = '"' + ev.title + '" has ' + ev.registered + " student(s) registered. Deleting it will also remove their registrations and experience posts. This can't be undone.";
  }
  if (!confirm(warn)) return;

  try {
    await api("/api/events/" + eventId, "DELETE");
  } catch (err) {
    showToast(err.message, "error");
    return;
  }
  await loadMyEvents();
  renderDashboard();
  showToast('"' + ev.title + '" deleted.', "info");
}

/* ── 6. REGISTRANTS ───────────────────────────────────────── */

async function openRegistrantsModal(eventId) {
  let ev = findEventById(eventId);
  if (!ev) return;
  currentRegistrantsEventId = eventId;

  let regs = [];
  try {
    regs = (await api("/api/events/" + eventId + "/registrants")).registrants;
  } catch (err) {
    showToast(err.message, "error");
    return;
  }

  document.getElementById("registrants-event-title").textContent = "Registrants — " + ev.title;
  document.getElementById("registrants-count").textContent = regs.length + " registered";
  document.getElementById("export-csv-btn").style.display = regs.length ? "inline-block" : "none";

  let list = document.getElementById("registrants-list");
  if (regs.length === 0) {
    list.innerHTML = "<p class='no-results'>No one has registered for this event yet.</p>";
  } else {
    let html = "<div class='registrant-row registrant-row--head'><span>Name</span><span>Email</span><span>Year</span><span>Branch</span></div>";
    for (let i = 0; i < regs.length; i++) {
      let r = regs[i];
      let yearLabel = r.year === "pg" ? "PG" : r.year + " Year";
      html += "<div class='registrant-row'>" +
        "<span data-label='Name'>" + esc(r.name) + "</span>" +
        "<span data-label='Email'>" + esc(r.email) + "</span>" +
        "<span data-label='Year'>" + esc(yearLabel) + "</span>" +
        "<span data-label='Branch'>" + esc(r.branch) + "</span></div>";
    }
    list.innerHTML = html;
  }
  openModal("registrants-modal");
}

function exportRegistrantsCSV() {
  if (!currentRegistrantsEventId) return;
  // server CSV banata hai aur cookie ke saath download hota hai
  window.location.href = "/api/events/" + currentRegistrantsEventId + "/registrants.csv";
}

/* ── 7. INIT ──────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", async function () {
  let me = await currentUserFromServer();
  if (me && me.role === "organizer") {
    currentOrganizer = me;
    await loadMyEvents();
  }
  renderGateOrDashboard();

  document.getElementById("organizer-login-form").addEventListener("submit", handleOrganizerAuth);
  document.getElementById("org-logout-btn").addEventListener("click", handleOrganizerLogout);
  document.getElementById("open-create-event-btn").addEventListener("click", openCreateEventModal);
  document.getElementById("create-event-form").addEventListener("submit", handleCreateOrEditEvent);
  document.getElementById("export-csv-btn").addEventListener("click", exportRegistrantsCSV);

  let tabs = document.querySelectorAll(".auth-tab");
  for (let i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener("click", function () { setOrgMode(this.dataset.mode); });
  }

  document.getElementById("ce-paid").addEventListener("change", applyTypeRules);
  document.getElementById("ce-type").addEventListener("change", applyTypeRules);
});
