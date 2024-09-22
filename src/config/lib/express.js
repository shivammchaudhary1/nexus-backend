const express = require("express");
const { routes } = require("../../routes/main.routes.js");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { config } = require("../env/default.js");

function initSecurityHeaders(app) {
  // Six months expiration period specified in seconds
  const SIX_MONTHS = 15778476;
  app.use(helmet.xssFilter());
  app.use(helmet.noSniff());
  app.use(helmet.ieNoOpen());
  app.use(
    helmet.hsts({
      maxAge: SIX_MONTHS,
      includeSubDomains: true,
      force: true,
    }),
  );
  app.disable("x-powered-by");
}

function initMiddleware(app) {
  app.use(
    express.json({
      limit: "5mb",
    }),
  );
  app.use(express.urlencoded({ extended: false }));
  app.use(
    cors({
      origin: config.frontend_domain,
      credentials: true,
    }),
  );
  app.use(cookieParser());
}

async function init() {
  const app = express();
  initSecurityHeaders(app);
  initMiddleware(app);
  await routes(app);
  return app;
}

module.exports = { init };
