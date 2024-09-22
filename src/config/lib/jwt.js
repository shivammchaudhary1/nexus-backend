const jwt = require("jsonwebtoken");
const { config } = require("../env/default.js");

function signJwt(payload, exp, tType) {
  let token = "";

  if (tType === "access") {
    token = jwt.sign(payload, config.jwtPrivateKey, { expiresIn: exp });
  }

  if (tType === "refresh") {
    token = jwt.sign(payload, config.jwtPublicKey, { expiresIn: exp });
  }

  return token;
}

function jwtVerify(token, tType) {
  let decodedStatus = {};

  try {
    if (tType === "access") {
      decodedStatus = jwt.verify(token, config.jwtPrivateKey);
    }

    if (tType === "refresh") {
      decodedStatus = jwt.verify(token, config.jwtPublicKey);
    }
    
    return decodedStatus;
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = { signJwt, jwtVerify };
