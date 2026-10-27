// aaj ki date YYYY-MM-DD (India time)
function todayStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function addDays(n) {
  let d = new Date(Date.now() + n * 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function formatDate(s) {
  let d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// status ab date se nikalta hai (pehle hardcoded tha isliye purana ho jata tha)
function getStatus(ev) {
  let t = todayStr();
  if (ev.endDate < t) return "completed";
  if (ev.date <= t) return "ongoing";
  return "upcoming";
}

function dateDisplay(ev) {
  if (ev.endDate && ev.endDate !== ev.date) {
    return formatDate(ev.date) + " – " + formatDate(ev.endDate);
  }
  return formatDate(ev.date);
}

// DB document -> frontend ko bhejne wala object
function shapeEvent(ev) {
  let o = ev.toObject ? ev.toObject() : ev;
  return {
    id: String(o._id),
    title: o.title, type: o.type, date: o.date, endDate: o.endDate,
    dateDisplay: dateDisplay(o), time: o.time, location: o.location, desc: o.desc,
    seats: o.seats, registered: o.registered, paid: o.paid, price: o.price,
    dutyLeave: !!o.dutyLeave,
    destination: o.destination || "",
    status: getStatus(o),
    createdBy: o.createdBy ? String(o.createdBy) : null,
    organizerName: o.organizerName
  };
}

module.exports = { todayStr, addDays, getStatus, shapeEvent };
