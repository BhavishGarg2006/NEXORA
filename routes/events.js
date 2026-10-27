let express = require("express");
let Event = require("../models/Event");
let Registration = require("../models/Registration");
let Experience = require("../models/Experience");
let { requireAuth, requireRole } = require("../middleware/auth");
let { shapeEvent, todayStr } = require("../utils");

let router = express.Router();

// PUBLIC: saare events
router.get("/", async function (req, res) {
  let events = await Event.find().sort({ date: 1 });
  res.json({ events: events.map(shapeEvent) });
});

// ORGANIZER: sirf apne events
router.get("/mine", requireAuth, requireRole("organizer"), async function (req, res) {
  let events = await Event.find({ createdBy: req.user.id }).sort({ date: 1 });
  res.json({ events: events.map(shapeEvent) });
});

// body ko validate karke clean object banao
function readEventBody(body) {
  let b = body || {};
  let data = {
    title: String(b.title || "").trim(),
    type: b.type,
    date: String(b.date || ""),
    endDate: String(b.endDate || b.date || ""),
    time: String(b.time || "").trim(),
    location: String(b.location || "").trim(),
    desc: String(b.desc || "").trim(),
    seats: parseInt(b.seats, 10),
    paid: b.paid === true || b.paid === "true",
    price: parseInt(b.price || 0, 10) || 0,
    dutyLeave: b.dutyLeave === true || b.dutyLeave === "true",
    destination: String(b.destination || "").trim()
  };
  // Trip hamesha paid hota hai
  if (data.type === "Trip") data.paid = true;
  let types = ["Workshop", "Hackathon", "Seminar", "Paid Event", "Trip"];
  let dateRe = /^\d{4}-\d{2}-\d{2}$/;
  let error = null;

  if (!data.title) error = "Title is required.";
  else if (types.indexOf(data.type) === -1) error = "Select a valid type.";
  else if (!dateRe.test(data.date) || !dateRe.test(data.endDate)) error = "Valid dates are required.";
  else if (data.endDate < data.date) error = "End date can't be before the start date.";
  else if (!data.time) error = "Time is required.";
  else if (!data.location) error = "Location is required.";
  else if (data.desc.length < 20) error = "Description too short (min 20 chars).";
  else if (!data.seats || data.seats < 1) error = "Seats must be at least 1.";
  else if (data.type === "Trip" && !data.destination) error = "Destination is required for a trip.";
  else if (data.paid && data.price < 1) error = data.type === "Trip" ? "Enter the trip price." : "Enter the entry fee for a paid event.";

  if (!data.paid) data.price = 0;
  if (data.type !== "Trip") data.destination = "";
  return { data: data, error: error };
}

// ORGANIZER: event banao
router.post("/", requireAuth, requireRole("organizer"), async function (req, res) {
  let r = readEventBody(req.body);
  if (r.error) return res.status(400).json({ error: r.error });
  if (r.data.date < todayStr()) return res.status(400).json({ error: "Start date can't be in the past." });

  r.data.createdBy = req.user.id;
  r.data.organizerName = req.user.name;
  let ev = await Event.create(r.data);
  res.status(201).json({ event: shapeEvent(ev) });
});

// ORGANIZER: apna event edit karo (ownership check)
router.put("/:id", requireAuth, requireRole("organizer"), async function (req, res) {
  let ev = await Event.findById(req.params.id);
  if (!ev) return res.status(404).json({ error: "Event not found." });
  if (String(ev.createdBy) !== req.user.id) return res.status(403).json({ error: "You can only edit your own events." });

  let r = readEventBody(req.body);
  if (r.error) return res.status(400).json({ error: r.error });
  if (r.data.seats < ev.registered) {
    return res.status(400).json({ error: "Seats can't be less than " + ev.registered + " already registered." });
  }

  Object.assign(ev, r.data);
  await ev.save();
  res.json({ event: shapeEvent(ev) });
});

// ORGANIZER: apna event delete karo (registrations bhi hat jaate hain)
router.delete("/:id", requireAuth, requireRole("organizer"), async function (req, res) {
  let ev = await Event.findById(req.params.id);
  if (!ev) return res.status(404).json({ error: "Event not found." });
  if (String(ev.createdBy) !== req.user.id) return res.status(403).json({ error: "You can only delete your own events." });

  await Registration.deleteMany({ event: ev._id });
  await Experience.deleteMany({ event: ev._id });
  await ev.deleteOne();
  res.json({ ok: true });
});

async function loadOwnEvent(req, res) {
  let ev = await Event.findById(req.params.id);
  if (!ev) { res.status(404).json({ error: "Event not found." }); return null; }
  if (String(ev.createdBy) !== req.user.id) { res.status(403).json({ error: "Not your event." }); return null; }
  return ev;
}

// ORGANIZER: registrants list
router.get("/:id/registrants", requireAuth, requireRole("organizer"), async function (req, res) {
  let ev = await loadOwnEvent(req, res);
  if (!ev) return;
  let regs = await Registration.find({ event: ev._id }).sort({ registeredAt: 1 });
  res.json({ registrants: regs.map(function (r) {
    return { name: r.name, email: r.email, year: r.year, branch: r.branch, registeredAt: r.registeredAt };
  }) });
});

// CSV me aisa value ho jo "=" "+" "-" "@" se shuru ho to Excel formula ban sakta hai, isliye ' lagate hain
function csvCell(v) {
  let s = String(v == null ? "" : v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

// ORGANIZER: CSV download
router.get("/:id/registrants.csv", requireAuth, requireRole("organizer"), async function (req, res) {
  let ev = await loadOwnEvent(req, res);
  if (!ev) return;
  let regs = await Registration.find({ event: ev._id }).sort({ registeredAt: 1 });

  let csv = "Name,Email,Year,Branch,Registered At\n";
  regs.forEach(function (r) {
    let year = r.year === "pg" ? "PG" : r.year + " Year";
    csv += [r.name, r.email, year, r.branch, new Date(r.registeredAt).toISOString()].map(csvCell).join(",") + "\n";
  });

  let fname = ev.title.replace(/[^a-z0-9]+/gi, "_") + "_registrants.csv";
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="' + fname + '"');
  res.send(csv);
});

module.exports = router;
