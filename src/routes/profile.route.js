const express = require("express");
const authenticateJWT = require("../middleware/auth.middleware.js");

const {
  getProfile,
  updateProfile,
  changePassword,
  sendForgetLinkToMail,
  verifyEmailLinkAndUpdate,
  changeTheme,
} = require("../controller/profile.controller.js");

const profileRoutes = express.Router();

profileRoutes.get("/getprofile/:id", authenticateJWT, getProfile);
profileRoutes.patch("/changeTheme", authenticateJWT, changeTheme);
profileRoutes.patch("/submitprofile/:id", authenticateJWT, updateProfile);
profileRoutes.patch("/changepassword/:id",authenticateJWT, changePassword);
profileRoutes.post("/forgetpassword", sendForgetLinkToMail);
profileRoutes.post("/forgetpassword/:id/:token", verifyEmailLinkAndUpdate);

module.exports = profileRoutes;
