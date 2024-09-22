const express = require("express");
const { login, logout, isAuthenticated } = require("../controller/auth.controller.js");
const authenticateJWT = require("../middleware/auth.middleware.js");
const sessionRoutes = express.Router();

sessionRoutes.route("/login").post(login);
sessionRoutes.route("/logout").post(logout);
sessionRoutes.route("/isAuthenticated").post(authenticateJWT, isAuthenticated);

module.exports = sessionRoutes;
