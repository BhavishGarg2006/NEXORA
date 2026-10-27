let mongoose = require("mongoose");

module.exports = mongoose.model("Message", new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  sentAt: { type: Date, default: Date.now }
}));
