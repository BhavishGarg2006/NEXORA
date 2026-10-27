// =========================================================
// Nexora - Shared helpers | shared.js
// Used by index.html and organizer.html
// (ab data localStorage me nahi, server/MongoDB me rehta hai)
// =========================================================

// ---------- API helper ----------
// body object ho to JSON bhejta hai, FormData ho to file upload
async function api(url, method, body) {
    let opts = { method: method || "GET", headers: {}, credentials: "same-origin" };
    if (body instanceof FormData) {
        opts.body = body;
    } else if (body) {
        opts.headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(body);
    }
    let res = await fetch(url, opts);
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
        let err = new Error(data.error || "Something went wrong.");
        err.status = res.status;
        throw err;
    }
    return data;
}

// ---------- XSS se bachne ke liye ----------
function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ---------- TOAST ----------
function showToast(message, type) {
    if (!type) type = "success";
    let container = document.getElementById("toast-container");
    if (!container) return;

    let icon = type === "success" ? "✅" : (type === "error" ? "❌" : "ℹ️");
    let toast = document.createElement("div");
    toast.className = "toast toast-" + type;

    let i = document.createElement("span");
    i.className = "toast-icon";
    i.textContent = icon;
    let m = document.createElement("span");
    m.textContent = message;          // textContent => safe
    toast.appendChild(i);
    toast.appendChild(m);
    container.appendChild(toast);

    setTimeout(function () { toast.classList.add("show"); }, 10);
    setTimeout(function () {
        toast.classList.remove("show");
        setTimeout(function () { toast.remove(); }, 400);
    }, 3200);
}

// ---------- MODALS ----------
function openModal(id) {
    let modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
}

function resetModal(modal) {
    modal.querySelectorAll(".field-error").forEach(function (el) { el.textContent = ""; });
    modal.querySelectorAll("form").forEach(function (f) { f.reset(); });
    modal.querySelectorAll("input[type=hidden]").forEach(function (el) { el.value = ""; });
}

function closeModal(id) {
    let modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove("active");
    if (!document.querySelector(".modal.active")) document.body.style.overflow = "";
    resetModal(modal);
}

function closeAllModals() {
    document.querySelectorAll(".modal").forEach(function (m) {
        m.classList.remove("active");
        resetModal(m);
    });
    document.body.style.overflow = "";
}

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAllModals();
});

document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".modal-overlay, .modal-close").forEach(function (el) {
        el.addEventListener("click", function () {
            let modal = el.closest(".modal");
            if (modal) closeModal(modal.id);
        });
    });
});

// ---------- VALIDATORS ----------
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setError(id, msg) {
    let el = document.getElementById(id);
    if (el) el.textContent = msg || "";
}

// ---------- Auth tabs (login / signup) ----------
// prefix: "login" (index) ya "org" (organizer)
function currentUserFromServer() {
    return api("/api/auth/me").then(function (d) { return d.user; }).catch(function () { return null; });
}

function starsText(n) {
    return "★".repeat(n) + "☆".repeat(5 - n);
}
