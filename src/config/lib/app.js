const express = require("./express.js");
const mongooseLib = require("./mongoose.js");
const { config } = require("../env/default.js");

async function init() {
  await mongooseLib.connect();
  // Initialize express
  const app = await express.init();

  return app;
}

async function start() {
  const app = await init();
  app.listen(config.port, () => {
    console.log(`Server is running at port: ${config.port}`);
  });
}

module.exports = { start };
