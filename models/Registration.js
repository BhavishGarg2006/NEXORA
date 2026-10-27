let mongoose = require("mongoose");

let registrationSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: String,
  email: String,
  year: { type: String, enum: ["1", "2", "3", "4", "pg"], required: true },
  branch: { type: String, required: true, trim: true, maxlength: 80 },
  registeredAt: { type: Date, default: Date.now }
});

// ek user ek event mein sirf ek baar register ho sakta hai
registrationSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Registration", registrationSchema);
