const express = require("express");
const {
  createWorkspace,
  switchWorkspace,
  readWorkspace,
  getWorkspaceViaUserId,
  deleteWorkspaceById,
  updateWorkspace,
  editTimer
} = require("../controller/workspace.controller.js");

const workspaceRoutes = express.Router();

workspaceRoutes.route("/create").post(createWorkspace);
workspaceRoutes.route("/read-workspace/:workspaceId").get(readWorkspace);
workspaceRoutes.route("/read-workspaces/:userId").get(getWorkspaceViaUserId);
workspaceRoutes.route("/workspace-actions/switch/:userId/:workspaceId").patch(switchWorkspace);
workspaceRoutes.route("/workspace-actions/delete/:workspaceId").delete(deleteWorkspaceById);
workspaceRoutes.route("/workspace-actions/update/:workspaceId").patch(updateWorkspace);
workspaceRoutes.route("/edittimer").patch(editTimer);

module.exports = workspaceRoutes;
