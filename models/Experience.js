let mongoose = require("mongoose");

let experienceSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  authorName: String,
  authorRole: String,
  rating: { type: Number, min: 1, max: 5, required: true },
  text: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
  photo: { type: String, default: "" },            // /uploads/xxxx.jpg
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Experience", experienceSchema);
