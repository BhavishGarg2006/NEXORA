let multer = require("multer");
let path = require("path");
let crypto = require("crypto");

let allowed = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: function (req, file, cb) {
    // user ka original filename use nahi karte (path tricks se bachne ke liye)
    cb(null, "exp-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex") + allowed[file.mimetype]);
  }
});

let upload = multer({
  storage: storage,
  limits: { fileSize: 3 * 1024 * 1024 },     // max 3 MB
  fileFilter: function (req, file, cb) {
    if (allowed[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG or WEBP images are allowed."));
    }
  }
});

module.exports = upload;
