let express = require("express");
let Event = require("../models/Event");
let Registration = require("../models/Registration");
let { requireAuth, requireRole } = require("../middleware/auth");
let { getStatus } = require("../utils");

let router = express.Router();

// STUDENT: meri registrations
router.get("/mine", requireAuth, async function (req, res) {
  let regs = await Registration.find({ user: req.user.id }).sort({ registeredAt: -1 });
  res.json({ registrations: regs.map(function (r) {
    return { eventId: String(r.event), year: r.year, branch: r.branch, registeredAt: r.registeredAt };
  }) });
});

// STUDENT: register
router.post("/", requireAuth, requireRole("student"), async function (req, res) {
  try {
    let year = String(req.body.year || "");
    let branch = String(req.body.branch || "").trim();
    if (["1", "2", "3", "4", "pg"].indexOf(year) === -1) return res.status(400).json({ error: "Select your year." });
    if (!branch) return res.status(400).json({ error: "Branch is required." });

    let ev = await Event.findById(req.body.eventId);
    if (!ev) return res.status(404).json({ error: "Event not found." });
    if (getStatus(ev) === "completed") return res.status(400).json({ error: "This event has already ended." });

    // seat ek hi atomic step me badhti hai, isliye overbooking nahi hoti
    let updated = await Event.findOneAndUpdate(
      { _id: ev._id, registered: { $lt: ev.seats } },
      { $inc: { registered: 1 } },
      { returnDocument: "after" }
    );
    if (!updated) return res.status(400).json({ error: "Sorry, this event is fully booked." });

    try {
      await Registration.create({
        event: ev._id, user: req.user.id, name: req.user.name, email: req.user.email,
        year: year, branch: branch
      });
    } catch (err) {
      await Event.updateOne({ _id: ev._id }, { $inc: { registered: -1 } });   // seat wapas
      if (err.code === 11000) return res.status(409).json({ error: "You are already registered for this event." });
      throw err;
    }
    res.status(201).json({ ok: true, registered: updated.registered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed." });
  }
});

// STUDENT: cancel
router.delete("/:eventId", requireAuth, requireRole("student"), async function (req, res) {
  let reg = await Registration.findOneAndDelete({ event: req.params.eventId, user: req.user.id });
  if (!reg) return res.status(404).json({ error: "Registration not found." });
  await Event.updateOne({ _id: req.params.eventId, registered: { $gt: 0 } }, { $inc: { registered: -1 } });
  res.json({ ok: true });
});

module.exports = router;
