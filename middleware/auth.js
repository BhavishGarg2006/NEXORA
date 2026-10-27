let jwt = require("jsonwebtoken");

// AUTHENTICATION: kya user logged in hai? (cookie ka JWT verify karo)
function requireAuth(req, res, next) {
  let token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Please log in first." });   // token nahi => 401
  }
  jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).json({ error: "Session expired or invalid. Log in again." }); // invalid/expired => 403
    }
    req.user = decoded;      // { id, name, email, role }
    next();                  // next() callback ke ANDAR hona chahiye
  });
}

// AUTHORIZATION: kya is user ka role allowed hai?
function requireRole(role) {
  return function (req, res, next) {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "Only " + role + "s can do this." });
    }
    next();
  };
}

// route me login optional ho (public page par agar logged in ho to user pata chale)
function optionalAuth(req, res, next) {
  let token = req.cookies.token;
  if (!token) return next();
  jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
    if (!err) req.user = decoded;
    next();
  });
}

module.exports = { requireAuth, requireRole, optionalAuth };
