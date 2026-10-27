let express = require("express");
let bcrypt = require("bcryptjs");
let jwt = require("jsonwebtoken");
let User = require("../models/User");
let { optionalAuth } = require("../middleware/auth");

let router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sendToken(res, user) {
  let token = jwt.sign(
    { id: String(user._id), name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  res.cookie("token", token, {
    httpOnly: true,                 // JS se cookie nahi padhi ja sakti (XSS safe)
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function publicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role };
}

// SIGNUP  (role = "student" ya "organizer"; organizer ke liye access code chahiye)
router.post("/signup", async function (req, res) {
  try {
    let name = String(req.body.name || "").trim();
    let email = String(req.body.email || "").trim().toLowerCase();
    let password = String(req.body.password || "");
    let role = req.body.role === "organizer" ? "organizer" : "student";

    if (!name) return res.status(400).json({ error: "Name is required." });
    if (!isValidEmail(email)) return res.status(400).json({ error: "Enter a valid email." });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });

    if (role === "organizer" && req.body.orgCode !== process.env.ORGANIZER_CODE) {
      return res.status(403).json({ error: "Incorrect organizer access code." });
    }

    let exists = await User.findOne({ email: email });
    if (exists) return res.status(409).json({ error: "An account with this email already exists. Please log in." });

    let hash = await bcrypt.hash(password, 10);
    let user = await User.create({ name: name, email: email, password: hash, role: role });

    sendToken(res, user);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed." });
  }
});

// LOGIN
router.post("/login", async function (req, res) {
  try {
    let email = String(req.body.email || "").trim().toLowerCase();
    let password = String(req.body.password || "");

    let user = await User.findOne({ email: email });
    let ok = user ? await bcrypt.compare(password, user.password) : false;
    if (!ok) return res.status(401).json({ error: "Wrong email or password." });

    sendToken(res, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed." });
  }
});

// ME (page load par check: kaun logged in hai)
router.get("/me", optionalAuth, function (req, res) {
  let u = req.user ? { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role } : null;
  res.json({ user: u });
});

// LOGOUT
router.post("/logout", function (req, res) {
  res.clearCookie("token");
  res.json({ ok: true });
});

module.exports = router;
