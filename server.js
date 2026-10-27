require("dotenv").config();
let express = require("express");
let mongoose = require("mongoose");
let cookieParser = require("cookie-parser");
let path = require("path");

let Message = require("./models/Message");
let seedEvents = require("./seed");

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error("Missing MONGO_URI or JWT_SECRET in .env");
  process.exit(1);
}

let app = express();
app.use(express.json());
app.use(cookieParser());

// frontend + uploaded photos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/events", require("./routes/events"));
app.use("/api/registrations", require("./routes/registrations"));
app.use("/api/experiences", require("./routes/experiences"));

// contact form
app.post("/api/contact", async function (req, res) {
  let name = String(req.body.name || "").trim();
  let email = String(req.body.email || "").trim();
  let message = String(req.body.message || "").trim();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10) {
    return res.status(400).json({ error: "Please fill all fields correctly." });
  }
  await Message.create({ name: name, email: email, message: message });
  res.status(201).json({ ok: true });
});

// unknown API route
app.use("/api", function (req, res) {
  res.status(404).json({ error: "Not found." });
});

// error handler (async route errors / bad JSON)
app.use(function (err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status === 400 ? "Bad request." : "Server error." });
});

let PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI).then(async function () {
  console.log("MongoDB connected");
  await seedEvents();
  app.listen(PORT, function () {
    console.log("Nexora running on http://localhost:" + PORT);
  });
}).catch(function (err) {
  console.error("MongoDB connection failed:", err.message);
  process.exit(1);
});
