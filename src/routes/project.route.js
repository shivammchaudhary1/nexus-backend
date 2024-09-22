const express = require("express");
const {
  createProject,
  getProjectListForUser,
  getProjectListForWorkspace,
  getProject,
  deleteProject,
  updateProject,
  getTeamMembersForProject,
  removeTeamMember,
  addTeamMember,
} = require("../controller/project.controller.js");

const projectRoutes = express.Router();

projectRoutes.route("/create").post(createProject);
projectRoutes.route("/all").get(getProjectListForUser);
projectRoutes.route("/projectlistforworkspace/:id").get(getProjectListForWorkspace);
projectRoutes.route("/project/:id").get(getProject);
projectRoutes.route("/update/:id").patch(updateProject);
projectRoutes.route("/delete/:id").delete(deleteProject);
projectRoutes.route("/team/:id").get(getTeamMembersForProject);
projectRoutes.route("/addmember/:id").patch(addTeamMember);
projectRoutes.route("/removemember/:id").delete(removeTeamMember);

module.exports = projectRoutes;
