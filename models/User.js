let mongoose = require("mongoose");

let userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },   // bcrypt hash, never plain text
  role: { type: String, enum: ["student", "organizer"], default: "student" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
