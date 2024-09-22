const express = require("express");
const {
  getProjectDetailsByName,
  getProjectDetailsByClientName,
  getProjectReport,
  getUserReport,
  report,
  generateMonthlyReport,
  savingMonthlyReport
} = require("../controller/reports.controller.js");

const reportsRoutes = express.Router();

reportsRoutes.get("/projectbyname", getProjectDetailsByName);
reportsRoutes.get("/projectbyclientname", getProjectDetailsByClientName);
reportsRoutes.get("/projectreport/:id", getProjectReport);
reportsRoutes.get("/user/:userId", getUserReport);
reportsRoutes.get("/userreport", report);
reportsRoutes.post("/monthlyreport/:workspaceId", generateMonthlyReport);
reportsRoutes.post("/savingmonthlyreport/:userId/:workspaceId", savingMonthlyReport);

module.exports = reportsRoutes;
