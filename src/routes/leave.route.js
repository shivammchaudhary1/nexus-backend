const express = require("express");
const leave = require("../controller/leave.controller.js");

const leaveRoutes = express.Router();

//user
leaveRoutes.post("/createleave", leave.createLeaveRequest);
leaveRoutes.get("/getleaves/:userId", leave.getRequestedLeaveByUser);
leaveRoutes.patch("/updateleave", leave.updateLeaveRequest);
leaveRoutes.delete("/deleteleave", leave.deleteLeaveRequest);
leaveRoutes.get("/getuserleavebalance/:userId/:workspaceId", leave.getUserLeaveBalance);

//admin
leaveRoutes.get("/getallleaves/:userId", leave.getAllLeaves);
leaveRoutes.patch("/updatestatus", leave.updateStatusOfLeave); 

module.exports = leaveRoutes;
