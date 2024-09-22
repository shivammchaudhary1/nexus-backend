const express = require("express");
const {
  signup,
  changeRole,
  getUser,
  invite,
  invitenewuser,
  inviteexistinguser,
  entries,
  deleteEntry,
  deleteUserFromWorkspace,
  editEntry,
  editEntryTitle,
  getAllUsersFromSelectedWorkspace
} = require("../controller/user.controller.js");
const authenticateJWT = require("../middleware/auth.middleware.js");

const userRoutes = express.Router();

userRoutes.route("/create").post(signup);
userRoutes.route("/user-actions/read/:userId").get(authenticateJWT, getUser);
userRoutes.patch("/user-actions/change-role",authenticateJWT, changeRole);
userRoutes.post("/invite", authenticateJWT, invite);
userRoutes.post("/invitenewuser/:token", invitenewuser);
userRoutes.post("/inviteexistinguser/:token",  inviteexistinguser);
userRoutes.get("/entries", authenticateJWT, entries);
userRoutes.delete("/entry/delete", authenticateJWT, deleteEntry);
userRoutes.patch("/entry/edit", authenticateJWT, editEntry);
userRoutes.patch("/entry/title", authenticateJWT, editEntryTitle);
userRoutes.get("/users/all", authenticateJWT, getAllUsersFromSelectedWorkspace);

userRoutes.delete("/deleteuserfromworkspace/:workspaceId",authenticateJWT, deleteUserFromWorkspace);

module.exports = userRoutes;
