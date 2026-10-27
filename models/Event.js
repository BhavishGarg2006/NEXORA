let mongoose = require("mongoose");

let eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, enum: ["Workshop", "Hackathon", "Seminar", "Paid Event", "Trip"], required: true },
  date: { type: String, required: true },          // start date  YYYY-MM-DD
  endDate: { type: String, required: true },       // end date    YYYY-MM-DD
  time: { type: String, required: true },          // "10:00 AM"
  location: { type: String, required: true, trim: true, maxlength: 120 },
  desc: { type: String, required: true, trim: true, maxlength: 1000 },
  seats: { type: Number, required: true, min: 1 },
  registered: { type: Number, default: 0 },
  paid: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  destination: { type: String, default: "", trim: true, maxlength: 120 },   // sirf Trip ke liye
  dutyLeave: { type: Boolean, default: false },    // DL (Duty Leave) milti hai ya nahi
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  organizerName: { type: String, default: "Nexora Team" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Event", eventSchema);
