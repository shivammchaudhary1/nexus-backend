const { config } = require("../config/env/default.js");

const homeController = (req, res) => {
  res.redirect(config.frontend_domain);
};

module.exports = { homeController };
