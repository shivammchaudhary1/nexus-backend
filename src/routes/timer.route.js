const express = require("express");
const {
  startTimer,
  stopTimer,
  pauseTimer,
  checkTimer,
  resumeTimer,
  newManualEntry,
  fetchEntries,
} = require("../controller/timer.controller.js");

const timerRoutes = express.Router();

timerRoutes.route("/timer-actions/start").post(startTimer);
timerRoutes.route("/timer-actions/stop").post(stopTimer);
timerRoutes.route("/timer-actions/pause").patch(pauseTimer);
timerRoutes.route("/timer-actions/resume").patch(resumeTimer);
timerRoutes.route("/timer-actions/isRunning").get(checkTimer);
timerRoutes.route("/timer-actions/manualEntry/:userId").post(newManualEntry);
timerRoutes.route("/entries/get-entries/:lastFetchedDate").get(fetchEntries);

module.exports = timerRoutes;
