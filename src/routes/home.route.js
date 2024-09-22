const { Router } = require("express");
const { homeController } = require("../controller/home.controller.js");

const homeRoutes = Router();

homeRoutes.get("/", homeController);

module.exports = homeRoutes;
