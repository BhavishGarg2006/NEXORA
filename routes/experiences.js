let express = require("express");
let fs = require("fs");
let path = require("path");
let Event = require("../models/Event");
let Registration = require("../models/Registration");
let Experience = require("../models/Experience");
let upload = require("../middleware/upload");
let { requireAuth } = require("../middleware/auth");

let router = express.Router();

function shape(x, userId, eventTitle) {
  return {
    id: String(x._id),
    eventId: String(x.event),
    eventTitle: eventTitle,
    authorName: x.authorName,
    authorRole: x.authorRole,
    rating: x.rating,
    text: x.text,
    photo: x.photo,
    createdAt: x.createdAt,
    mine: userId ? String(x.user) === userId : false
  };
}

function removeFile(photo) {
  if (!photo) return;
  let file = path.join(__dirname, "..", "uploads", path.basename(photo));
  fs.unlink(file, function () {});
}

// PUBLIC: experiences list
router.get("/", require("../middleware/auth").optionalAuth, async function (req, res) {
  let list = await Experience.find().sort({ createdAt: -1 }).limit(60);
  let ids = [];
  list.forEach(function (x) { ids.push(x.event); });
  let events = await Event.find({ _id: { $in: ids } }).select("title");
  let titles = {};
  events.forEach(function (e) { titles[String(e._id)] = e.title; });

  let uid = req.user ? req.user.id : null;
  res.json({ experiences: list.map(function (x) { return shape(x, uid, titles[String(x.event)] || "Event"); }) });
});

// LOGGED-IN: kin events par experience likh sakta hu?
//   student  -> jisme register kiya
//   organizer-> jo khud banaye
router.get("/eligible", requireAuth, async function (req, res) {
  let events = [];
  if (req.user.role === "organizer") {
    events = await Event.find({ createdBy: req.user.id });
  } else {
    let regs = await Registration.find({ user: req.user.id });
    let ids = regs.map(function (r) { return r.event; });
    events = await Event.find({ _id: { $in: ids } });
  }
  res.json({ events: events.map(function (e) { return { id: String(e._id), title: e.title }; }) });
});

// LOGGED-IN: experience post karo (photo ke saath, Multer se)
router.post("/", requireAuth, function (req, res) {
  upload.single("photo")(req, res, async function (err) {
    // Multer ke errors yahin pakadte hain
    if (err) {
      let msg = err.code === "LIMIT_FILE_SIZE" ? "Photo must be under 3 MB." : err.message;
      return res.status(400).json({ error: msg });
    }
    let photo = req.file ? "/uploads/" + req.file.filename : "";

    try {
      let rating = parseInt(req.body.rating, 10);
      let text = String(req.body.text || "").trim();
      if (!rating || rating < 1 || rating > 5) throw { code: 400, msg: "Give a rating from 1 to 5." };
      if (text.length < 10) throw { code: 400, msg: "Please write at least 10 characters." };

      let ev = await Event.findById(req.body.eventId);
      if (!ev) throw { code: 404, msg: "Event not found." };

      if (req.user.role === "organizer") {
        if (String(ev.createdBy) !== req.user.id) throw { code: 403, msg: "You can only share experiences for events you organized." };
      } else {
        let reg = await Registration.findOne({ event: ev._id, user: req.user.id });
        if (!reg) throw { code: 403, msg: "You can only share experiences for events you registered for." };
      }

      let exp = await Experience.create({
        event: ev._id, user: req.user.id, authorName: req.user.name, authorRole: req.user.role,
        rating: rating, text: text, photo: photo
      });
      res.status(201).json({ experience: shape(exp, req.user.id, ev.title) });
    } catch (e) {
      removeFile(photo);                       // fail hua to uploaded photo hata do
      if (e && e.code && e.msg) return res.status(e.code).json({ error: e.msg });
      console.error(e);
      res.status(500).json({ error: "Could not save experience." });
    }
  });
});

// AUTHOR: apna experience delete karo
router.delete("/:id", requireAuth, async function (req, res) {
  let x = await Experience.findById(req.params.id);
  if (!x) return res.status(404).json({ error: "Not found." });
  if (String(x.user) !== req.user.id) return res.status(403).json({ error: "You can only delete your own post." });
  removeFile(x.photo);
  await x.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
