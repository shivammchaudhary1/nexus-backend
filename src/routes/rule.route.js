const express = require("express");
const ruleRoutes = express.Router();
const {
  createRule,
  updateRule,
  getRule,
  deleteRule,
} = require("../controller/rule.controller.js");

ruleRoutes.route("/create").post(createRule);
ruleRoutes.route("/update").patch(updateRule);
ruleRoutes.route("/get/:workspaceId").get(getRule);
ruleRoutes.route("/delete").delete(deleteRule);

module.exports = ruleRoutes;
