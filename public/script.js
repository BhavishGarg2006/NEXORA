/* =========================================================
   Nexora - Student site | script.js
   Data ab server (MongoDB) se aata hai. Login JWT cookie se hota hai.
   ========================================================= */

/* ── 1. STATE ─────────────────────────────────────────────── */

let currentUser = null;       // { id, name, email, role }
let allEvents = [];
let myRegIds = [];            // jin events me user registered hai
let myRegs = [];
let experiences = [];
let activeFilter = "all";
let searchQuery = "";
let pendingEventId = null;
let authMode = "login";       // "login" ya "signup"
let expRating = 0;

function isRegistered(eventId) {
  return myRegIds.indexOf(eventId) !== -1;
}

function getEvent(eventId) {
  for (let i = 0; i < allEvents.length; i++) {
    if (allEvents[i].id === eventId) return allEvents[i];
  }
  return null;
}

/* ── 2. LOAD DATA FROM SERVER ─────────────────────────────── */

async function loadEvents() {
  try {
    let d = await api("/api/events");
    allEvents = d.events;
  } catch (e) {
    showToast("Could not load events. Is the server running?", "error");
  }
}

async function loadMyRegistrations() {
  myRegs = [];
  myRegIds = [];
  if (!currentUser) return;
  try {
    let d = await api("/api/registrations/mine");
    myRegs = d.registrations;
    for (let i = 0; i < myRegs.length; i++) myRegIds.push(myRegs[i].eventId);
  } catch (e) {}
}

async function loadExperiences() {
  try {
    let d = await api("/api/experiences");
    experiences = d.experiences;
  } catch (e) {
    experiences = [];
  }
}

/* ── 3. AUTH (login / signup) ─────────────────────────────── */

function updateAuthUI() {
  let loginBtn = document.getElementById("nav-login-btn");
  let userBadge = document.getElementById("nav-user-badge");
  let userName = document.getElementById("nav-user-name");
  let regBtn = document.getElementById("my-reg-btn");

  if (currentUser) {
    loginBtn.style.display = "none";
    userBadge.style.display = "flex";
    let label = currentUser.name.split(" ")[0];
    if (currentUser.role === "organizer") label += " (Organizer)";
    userName.textContent = label;
    // organizer ke liye "My Registrations" ka matlab nahi
    regBtn.style.display = currentUser.role === "student" ? "inline-block" : "none";
  } else {
    loginBtn.style.display = "flex";
    userBadge.style.display = "none";
  }
}

function setAuthMode(mode) {
  authMode = mode;
  let tabs = document.querySelectorAll(".auth-tab");
  for (let i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle("active", tabs[i].dataset.mode === mode);
  }
  document.getElementById("login-name-group").style.display = mode === "signup" ? "flex" : "none";
  document.getElementById("login-submit-btn").textContent = mode === "signup" ? "Create Account" : "Login";
  document.getElementById("login-password").autocomplete = mode === "signup" ? "new-password" : "current-password";
  setError("login-form-error", "");
}

function openLoginModal(mode) {
  setAuthMode(mode || "login");
  openModal("login-modal");
}

async function handleLogin(e) {
  e.preventDefault();
  let name = document.getElementById("login-name").value.trim();
  let email = document.getElementById("login-email").value.trim();
  let password = document.getElementById("login-password").value;
  let valid = true;

  setError("login-name-error", "");
  setError("login-email-error", "");
  setError("login-password-error", "");
  setError("login-form-error", "");

  if (authMode === "signup" && !name) { setError("login-name-error", "Name is required."); valid = false; }
  if (!email || !isValidEmail(email)) { setError("login-email-error", "Enter a valid email."); valid = false; }
  if (!password || (authMode === "signup" && password.length < 6)) {
    setError("login-password-error", authMode === "signup" ? "At least 6 characters." : "Password is required.");
    valid = false;
  }
  if (!valid) return;

  try {
    let d;
    if (authMode === "signup") {
      d = await api("/api/auth/signup", "POST", { name: name, email: email, password: password, role: "student" });
    } else {
      d = await api("/api/auth/login", "POST", { email: email, password: password });
    }
    currentUser = d.user;
    await loadMyRegistrations();
    await loadExperiences();
    updateAuthUI();
    renderAll();
    closeModal("login-modal");
    showToast((authMode === "signup" ? "Account created! Welcome, " : "Welcome back, ") + currentUser.name.split(" ")[0] + "! 👋");

    if (pendingEventId && currentUser.role === "student") {
      let id = pendingEventId;
      pendingEventId = null;
      openRegistrationModal(id);
    }
  } catch (err) {
    setError("login-form-error", err.message);
  }
}

async function handleLogout() {
  try { await api("/api/auth/logout", "POST"); } catch (e) {}
  currentUser = null;
  myRegs = [];
  myRegIds = [];
  await loadExperiences();
  updateAuthUI();
  renderAll();
  closeAllModals();
  showToast("Logged out successfully.", "info");
}

/* ── 4. REGISTRATION FLOW ─────────────────────────────────── */

function openRegistrationModal(eventId) {
  if (!currentUser) {
    showToast("Please log in to register for events.", "info");
    pendingEventId = eventId;
    openLoginModal("login");
    return;
  }
  if (currentUser.role !== "student") {
    showToast("Organizer accounts can't register for events. Use a student account.", "info");
    return;
  }

  let ev = getEvent(eventId);
  if (!ev) return;

  pendingEventId = eventId;
  let modal = document.getElementById("register-modal");

  modal.querySelector("#reg-event-title").textContent = ev.title;
  modal.querySelector("#reg-event-meta").textContent = "📅 " + ev.dateDisplay + "  ·  📍 " + ev.location;

  let priceBlock = modal.querySelector("#reg-price-block");
  if (ev.paid) {
    priceBlock.style.display = "flex";
    modal.querySelector("#reg-price-amount").textContent = "₹" + ev.price;
    modal.querySelector("#reg-submit-btn").textContent = "Pay ₹" + ev.price + " & " + (ev.type === "Trip" ? "Book" : "Register");
  } else {
    priceBlock.style.display = "none";
    modal.querySelector("#reg-submit-btn").textContent = "Confirm Registration";
  }

  modal.querySelector("#reg-name").value = currentUser.name;
  modal.querySelector("#reg-email").value = currentUser.email;
  openModal("register-modal");
}

async function handleRegistration(e) {
  e.preventDefault();
  let year = document.getElementById("reg-year").value;
  let branch = document.getElementById("reg-branch").value.trim();
  let valid = true;

  setError("reg-year-error", "");
  setError("reg-branch-error", "");
  setError("reg-form-error", "");

  if (!year) { setError("reg-year-error", "Select your year."); valid = false; }
  if (!branch) { setError("reg-branch-error", "Branch is required."); valid = false; }
  if (!valid) return;

  let ev = getEvent(pendingEventId);
  if (!ev) return;

  try {
    await api("/api/registrations", "POST", { eventId: pendingEventId, year: year, branch: branch });
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      showToast(err.message, "error");
    }
    setError("reg-form-error", err.message);
    return;
  }

  await loadEvents();
  await loadMyRegistrations();
  renderAll();
  closeModal("register-modal");
  openSuccessModal(ev);
  pendingEventId = null;
}

function openSuccessModal(ev) {
  document.getElementById("success-event-title").textContent = ev.title;
  document.getElementById("success-event-date").textContent = ev.dateDisplay;
  document.getElementById("success-event-location").textContent = ev.location;
  document.getElementById("success-dl-note").style.display = ev.dutyLeave ? "block" : "none";
  openModal("success-modal");
}

/* ── 5. EVENT CARDS ───────────────────────────────────────── */

function buildEventCard(ev) {
  let registered = isRegistered(ev.id);
  let pct = Math.min(100, Math.round((ev.registered / ev.seats) * 100));
  let seatsLeft = ev.seats - ev.registered;
  let isFull = seatsLeft <= 0;
  let isOrganizer = currentUser && currentUser.role === "organizer";

  let typeClass = ev.paid ? "paid-type" : "";
  let cardClass = ev.status === "ongoing" ? "ongoing" : (ev.type === "Trip" ? "trip" : (ev.paid ? "paid" : ""));
  let statusClass = ev.status === "ongoing" ? "live" : "upcoming";
  let statusLabel = ev.status === "ongoing" ? "Ongoing" : "Upcoming";

  let btnText, btnClass, canClick = false;
  if (registered) {
    btnText = ev.status === "ongoing" ? "✅ Joined" : "✅ Registered";
    btnClass = "register-btn btn-registered";
  } else if (isOrganizer) {
    btnText = "Organizer account";
    btnClass = "register-btn btn-disabled";
  } else if (isFull) {
    btnText = "Fully Booked";
    btnClass = "register-btn btn-disabled";
  } else if (ev.status === "ongoing") {
    btnText = "Join Live"; btnClass = "register-btn"; canClick = true;
  } else if (ev.type === "Trip") {
    btnText = "Book Trip · ₹" + ev.price; btnClass = "register-btn trip-btn"; canClick = true;
  } else if (ev.paid) {
    btnText = "Pay ₹" + ev.price + " & Register"; btnClass = "register-btn paid-btn"; canClick = true;
  } else {
    btnText = "Register"; btnClass = "register-btn"; canClick = true;
  }

  let priceTag = ev.paid ? "<div class='price-tag'>₹" + esc(ev.price) + "</div>" : "";
  let dlTag = ev.dutyLeave ? "<span class='dl-chip'>🎓 DL</span>" : "";
  let seatsColor = seatsLeft <= 5 ? "color:#dc2626" : "";
  let seatsLeftText = isFull ? "No seats left" : seatsLeft + (seatsLeft === 1 ? " seat left" : " seats left");
  let action = canClick ? "onclick=\"openRegistrationModal('" + ev.id + "')\"" : "disabled";

  let card = "";
  card += "<div class='event-card " + cardClass + "' data-id='" + ev.id + "'>";
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
  card += "    <div class='seat-row'><span>" + (ev.type === "Trip" ? "Booked" : "Registered") + "</span><span>" + ev.registered + " / " + ev.seats + "</span></div>";
  card += "    <div class='progress'><div class='progress-fill' style='width:" + pct + "%'></div></div>";
  card += "    <p class='seats-left' style='" + seatsColor + "'>" + seatsLeftText + "</p>";
  card += "  </div>";
  card += "  <button class='" + btnClass + "' " + action + ">" + btnText + "</button>";
  card += "</div>";
  return card;
}

function filterEvents(events) {
  let q = searchQuery.toLowerCase();
  let result = [];
  for (let i = 0; i < events.length; i++) {
    let ev = events[i];
    let matchesSearch =
      ev.title.toLowerCase().includes(q) ||
      ev.desc.toLowerCase().includes(q) ||
      ev.type.toLowerCase().includes(q);

    let matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "workshop" && ev.type === "Workshop") ||
      (activeFilter === "hackathon" && ev.type === "Hackathon") ||
      (activeFilter === "seminar" && ev.type === "Seminar") ||
      (activeFilter === "trip" && ev.type === "Trip") ||
      (activeFilter === "paid" && ev.paid) ||
      (activeFilter === "dl" && ev.dutyLeave);

    if (matchesSearch && matchesFilter) result.push(ev);
  }
  return result;
}

// section ka decision yahin hota hai (completed events dikhaye nahi jaate)
function eventsInSection(section) {
  let result = [];
  for (let i = 0; i < allEvents.length; i++) {
    let ev = allEvents[i];
    if (ev.status === "completed") continue;

    if (section === "ongoing" && ev.status === "ongoing") result.push(ev);
    if (section === "events" && ev.status === "upcoming" && ev.type !== "Hackathon" && ev.type !== "Trip") result.push(ev);
    if (section === "trips" && ev.type === "Trip") result.push(ev);
    if (section === "hackathons" && ev.type === "Hackathon") result.push(ev);
    if (section === "dl" && ev.dutyLeave) result.push(ev);
  }
  return result;
}

function buildCardsHTML(events) {
  let html = "";
  for (let i = 0; i < events.length; i++) html += buildEventCard(events[i]);
  return html;
}

function fillGrid(gridId, section, emptyText) {
  let list = filterEvents(eventsInSection(section));
  document.getElementById(gridId).innerHTML = list.length ? buildCardsHTML(list) : "<p class='no-results'>" + emptyText + "</p>";
}

function renderAllEvents() {
  fillGrid("ongoing-grid", "ongoing", "No ongoing events match your search.");
  fillGrid("events-grid", "events", "No upcoming events match your search.");
  fillGrid("hackathons-grid", "hackathons", "No hackathons match your search.");
  fillGrid("trips-grid", "trips", "No trips planned right now. Check back soon.");
  fillGrid("dl-grid", "dl", "No Duty Leave events right now.");
  updateEventCounts();
}

/* ── 6. LIVE COUNTS ───────────────────────────────────────── */

function setText(id, value) {
  let el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateEventCounts() {
  let ongoing = eventsInSection("ongoing").length;
  let upcoming = eventsInSection("events").length;
  let hack = eventsInSection("hackathons").length;
  let dl = eventsInSection("dl").length;
  let trips = eventsInSection("trips").length;
  let total = 0;
  for (let i = 0; i < allEvents.length; i++) {
    if (allEvents[i].status !== "completed") total++;
  }

  setText("overview-total", total);
  setText("overview-ongoing", ongoing);
  setText("overview-upcoming", upcoming);
  setText("overview-hackathons", hack);
  setText("ongoing-count-badge", ongoing);
  setText("events-count-badge", upcoming);
  setText("hackathons-count-badge", hack);
  setText("dl-count-badge", dl);
  setText("trips-count-badge", trips);
  setText("overview-trips", trips);
}

/* ── 7. SEARCH & FILTER ───────────────────────────────────── */

function initSearchAndFilter() {
  document.getElementById("search-input").addEventListener("input", function (e) {
    searchQuery = e.target.value;
    renderAllEvents();
  });

  let buttons = document.querySelectorAll(".filter-btn");
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener("click", function () {
      for (let j = 0; j < buttons.length; j++) buttons[j].classList.remove("active");
      this.classList.add("active");
      activeFilter = this.dataset.filter;
      renderAllEvents();
    });
  }
}

/* ── 8. MY REGISTRATIONS ──────────────────────────────────── */

function openMyRegistrations() {
  if (!currentUser) {
    showToast("Please log in first.", "info");
    return;
  }
  let list = document.getElementById("my-reg-list");
  let html = "";
  for (let i = 0; i < myRegs.length; i++) {
    let ev = getEvent(myRegs[i].eventId);
    if (!ev) continue;
    html += "<div class='reg-item'>";
    html += "  <div class='reg-item-info'>";
    html += "    <strong>" + esc(ev.title) + "</strong>";
    html += "    <span>📅 " + esc(ev.dateDisplay) + " · 📍 " + esc(ev.location) + "</span>";
    html += "    <span class='reg-type-badge'>" + esc(ev.type) + (ev.dutyLeave ? " · DL" : "") + "</span>";
    html += "  </div>";
    html += "  <button class='cancel-reg-btn' onclick=\"cancelRegistration('" + ev.id + "')\">Cancel</button>";
    html += "</div>";
  }
  list.innerHTML = html || "<p class='no-results'>You haven't registered for any events yet.</p>";
  openModal("my-reg-modal");
}

async function cancelRegistration(eventId) {
  if (!confirm("Cancel this registration?")) return;
  try {
    await api("/api/registrations/" + eventId, "DELETE");
  } catch (err) {
    showToast(err.message, "error");
    return;
  }
  await loadEvents();
  await loadMyRegistrations();
  renderAll();
  openMyRegistrations();
  showToast("Registration cancelled.", "info");
}

/* ── 9. EXPERIENCES ───────────────────────────────────────── */

function renderExperiences() {
  let grid = document.getElementById("exp-grid");
  setText("exp-count-badge", experiences.length);

  if (experiences.length === 0) {
    grid.innerHTML = "<p class='no-results'>No experiences yet. Attended an event? Be the first to share!</p>";
    return;
  }

  let html = "";
  for (let i = 0; i < experiences.length; i++) {
    let x = experiences[i];
    let date = new Date(x.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    html += "<article class='exp-card'>";
    if (x.photo) html += "  <img class='exp-photo' src='" + esc(x.photo) + "' alt='Photo from " + esc(x.eventTitle) + "' loading='lazy'>";
    html += "  <div class='exp-body'>";
    html += "    <div class='exp-event'>" + esc(x.eventTitle) + "</div>";
    html += "    <div class='exp-stars' aria-label='" + x.rating + " out of 5'>" + starsText(x.rating) + "</div>";
    html += "    <p class='exp-text'>" + esc(x.text) + "</p>";
    html += "    <div class='exp-footer'>";
    html += "      <span><strong>" + esc(x.authorName) + "</strong> <span class='role-chip " + esc(x.authorRole) + "'>" + esc(x.authorRole) + "</span><br><small>" + date + "</small></span>";
    if (x.mine) html += "      <button class='cancel-reg-btn' onclick=\"deleteExperience('" + x.id + "')\">Delete</button>";
    html += "    </div>";
    html += "  </div>";
    html += "</article>";
  }
  grid.innerHTML = html;
}

async function openExperienceModal() {
  if (!currentUser) {
    showToast("Please log in to share your experience.", "info");
    openLoginModal("login");
    return;
  }
  let events = [];
  try {
    events = (await api("/api/experiences/eligible")).events;
  } catch (err) {
    showToast(err.message, "error");
    return;
  }
  if (events.length === 0) {
    let msg = currentUser.role === "organizer"
      ? "Create an event in the Organizer Portal first, then share how it went."
      : "Register for an event first, then you can share your experience.";
    showToast(msg, "info");
    return;
  }

  let sel = document.getElementById("exp-event");
  sel.innerHTML = "<option value=''>Select event…</option>";
  for (let i = 0; i < events.length; i++) {
    let o = document.createElement("option");
    o.value = events[i].id;
    o.textContent = events[i].title;
    sel.appendChild(o);
  }
  setStars(0);
  document.getElementById("exp-preview").style.display = "none";
  openModal("exp-modal");
}

function setStars(n) {
  expRating = n;
  document.getElementById("exp-rating").value = n || "";
  let btns = document.querySelectorAll("#exp-stars button");
  for (let i = 0; i < btns.length; i++) {
    btns[i].classList.toggle("on", Number(btns[i].dataset.v) <= n);
  }
}

async function handleExperience(e) {
  e.preventDefault();
  let eventId = document.getElementById("exp-event").value;
  let text = document.getElementById("exp-text").value.trim();
  let file = document.getElementById("exp-photo").files[0];
  let valid = true;

  ["exp-event-error", "exp-rating-error", "exp-text-error", "exp-photo-error", "exp-form-error"].forEach(function (id) { setError(id, ""); });

  if (!eventId) { setError("exp-event-error", "Select an event."); valid = false; }
  if (!expRating) { setError("exp-rating-error", "Give a rating."); valid = false; }
  if (text.length < 10) { setError("exp-text-error", "Write at least 10 characters."); valid = false; }
  if (file) {
    if (["image/jpeg", "image/png", "image/webp"].indexOf(file.type) === -1) { setError("exp-photo-error", "Only JPG, PNG or WEBP."); valid = false; }
    else if (file.size > 3 * 1024 * 1024) { setError("exp-photo-error", "Photo must be under 3 MB."); valid = false; }
  }
  if (!valid) return;

  let fd = new FormData();
  fd.append("eventId", eventId);
  fd.append("rating", expRating);
  fd.append("text", text);
  if (file) fd.append("photo", file);      // field name "photo" Multer se match karta hai

  let btn = document.getElementById("exp-submit-btn");
  btn.disabled = true;
  try {
    await api("/api/experiences", "POST", fd);
  } catch (err) {
    setError("exp-form-error", err.message);
    btn.disabled = false;
    return;
  }
  btn.disabled = false;
  await loadExperiences();
  renderExperiences();
  closeModal("exp-modal");
  showToast("Thanks for sharing your experience! 📸");
  document.getElementById("experiences").scrollIntoView({ behavior: "smooth" });
}

async function deleteExperience(id) {
  if (!confirm("Delete your post?")) return;
  try {
    await api("/api/experiences/" + id, "DELETE");
  } catch (err) {
    showToast(err.message, "error");
    return;
  }
  await loadExperiences();
  renderExperiences();
  showToast("Post deleted.", "info");
}

/* ── 10. CONTACT FORM ─────────────────────────────────────── */

async function handleContact(e) {
  e.preventDefault();
  let name = document.getElementById("contact-name").value.trim();
  let email = document.getElementById("contact-email").value.trim();
  let msg = document.getElementById("contact-msg").value.trim();
  let valid = true;

  setError("contact-name-error", "");
  setError("contact-email-error", "");
  setError("contact-msg-error", "");

  if (!name) { setError("contact-name-error", "Name is required."); valid = false; }
  if (!email || !isValidEmail(email)) { setError("contact-email-error", "Valid email required."); valid = false; }
  if (msg.length < 10) { setError("contact-msg-error", "Message must be at least 10 characters."); valid = false; }
  if (!valid) return;

  try {
    await api("/api/contact", "POST", { name: name, email: email, message: msg });
    showToast("Message sent! We'll get back to you soon. 📬");
    e.target.reset();
  } catch (err) {
    showToast(err.message, "error");
  }
}

/* ── 11. SMOOTH SCROLL / NAVBAR / MOBILE NAV ──────────────── */

function initSmoothScroll() {
  let links = document.querySelectorAll('a[href^="#"]');
  for (let i = 0; i < links.length; i++) {
    links[i].addEventListener("click", function (e) {
      let href = this.getAttribute("href");
      if (href === "#") { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      let target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }
}

function initNavbarScroll() {
  let navbar = document.querySelector(".navbar");
  window.addEventListener("scroll", function () {
    navbar.style.boxShadow = window.scrollY > 10 ? "0 4px 20px rgba(0,0,0,0.18)" : "none";
  });
}

function initMobileNav() {
  let toggle = document.getElementById("mobile-nav-toggle");
  let navLinks = document.querySelector(".nav-links");
  if (!toggle) return;

  toggle.addEventListener("click", function () {
    navLinks.classList.toggle("open");
    toggle.textContent = navLinks.classList.contains("open") ? "✕" : "☰";
  });
  let links = navLinks.querySelectorAll("a");
  for (let i = 0; i < links.length; i++) {
    links[i].addEventListener("click", function () {
      navLinks.classList.remove("open");
      toggle.textContent = "☰";
    });
  }
}

/* ── 12. INIT ─────────────────────────────────────────────── */

function renderAll() {
  renderAllEvents();
  renderExperiences();
}

document.addEventListener("DOMContentLoaded", async function () {
  currentUser = await currentUserFromServer();
  await Promise.all([loadEvents(), loadMyRegistrations(), loadExperiences()]);
  updateAuthUI();
  renderAll();

  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
  document.getElementById("nav-login-btn").addEventListener("click", function () { openLoginModal("login"); });
  document.getElementById("my-reg-btn").addEventListener("click", openMyRegistrations);
  document.getElementById("register-form").addEventListener("submit", handleRegistration);
  document.getElementById("contact-form").addEventListener("submit", handleContact);

  let tabs = document.querySelectorAll(".auth-tab");
  for (let i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener("click", function () { setAuthMode(this.dataset.mode); });
  }

  document.getElementById("share-exp-btn").addEventListener("click", openExperienceModal);
  document.getElementById("exp-form").addEventListener("submit", handleExperience);
  let stars = document.querySelectorAll("#exp-stars button");
  for (let i = 0; i < stars.length; i++) {
    stars[i].addEventListener("click", function () { setStars(Number(this.dataset.v)); });
  }
  document.getElementById("exp-photo").addEventListener("change", function () {
    let f = this.files[0];
    let prev = document.getElementById("exp-preview");
    if (f && f.type.indexOf("image/") === 0) {
      prev.src = URL.createObjectURL(f);
      prev.style.display = "block";
    } else {
      prev.style.display = "none";
    }
  });

  initSearchAndFilter();
  initSmoothScroll();
  initNavbarScroll();
  initMobileNav();
});
