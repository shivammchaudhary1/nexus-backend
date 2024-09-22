const express = require("express");
const {
  createHoliday,
  getHolidayDetails,
  updateHolidayDetails,
  deleteHolidayDetails,
  addLeaveType,
  deleteLeaveType,
  updateLeaveTypeName,
  getLeaveTypes,
  updateLeaveBalanceManually,
  updateLeaveBalanceManuallyToAllUsers,
  getLeaveBalances,
} = require("../controller/holiday.controller.js");

const holidayRoutes = express.Router();

holidayRoutes.post("/requestholiday", createHoliday);
holidayRoutes.get("/holidaydetails/:userId", getHolidayDetails);
holidayRoutes.patch("/updateholiday", updateHolidayDetails);
holidayRoutes.delete("/deleteholiday/:id", deleteHolidayDetails);
holidayRoutes.patch("/updateleavebalance", updateLeaveBalanceManually);
holidayRoutes.patch("/updateleavebalancetoallusers",updateLeaveBalanceManuallyToAllUsers);
holidayRoutes.post("/addleavetype", addLeaveType);
holidayRoutes.delete("/deleteleavetype", deleteLeaveType);
holidayRoutes.patch("/updateleavetype", updateLeaveTypeName);
holidayRoutes.get("/getleavetypes/:userId", getLeaveTypes);
holidayRoutes.get("/getleavebalances/:workspaceId", getLeaveBalances);

module.exports = holidayRoutes;
