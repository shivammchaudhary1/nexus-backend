const dotenv = require("dotenv");
dotenv.config();

const config = {
  db_url: process.env.DB_URL,
  port: process.env.PORT,
  frontend_domain: process.env.FRONTEND_DOMAIN,
  dbOptions: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
  jwtPublicKey: process.env.JWT_PUBLIC_KEY,
  cryptoPassword: process.env.CRYPTO_KEY,
  cryptoSalt: process.env.CRYPTO_SALT,
  cryptoAlgorithm: process.env.CRYPTO_ALGO,
};
module.exports = { config };
