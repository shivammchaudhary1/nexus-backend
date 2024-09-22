const User = require("../models/user.model.js");
const { decodeSession } = require("../config/utility/utility.js");
const { config } = require("../config/env/default.js");

const authenticateJWT = async (req, res, next) => {
  const { sessionId } = req.cookies;
  if (!sessionId || req.headers.origin !== config.frontend_domain) {
    return res.status(403).send("Unauthorized");
  }

  const {userId} = decodeSession(sessionId, req.headers['user-agent']);
  
  if (!userId) {
    return res.status(403).send("Unauthorized");
  }

  try {
    const user = await User.findById(userId);

    if (!user || user.status!=='active') {
      return res.status(403).json({ message: "invalid session" });
    }
    req.user = user
    next();
  } catch (error) {
    res.status(500).send(`Failed: ${error.message}`);
  }
};

module.exports = authenticateJWT;
