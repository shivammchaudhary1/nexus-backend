const clientRoutes = require("./client.route.js");
const holidayRoutes = require("./holiday.route.js");
const homeRoutes = require("./home.route.js");
const profileRoutes = require("./profile.route.js");
const projectRoutes = require("./project.route.js");
const reportsRoutes = require("./reports.route.js");
const timerRoutes = require("./timer.route.js");
const userRoutes = require("./user.route.js");
const workspaceRoutes = require("./workspace.route.js");
const authRoutes = require("./auth.routes.js");
const leaveRoutes = require("./leave.route.js");
const ruleRoutes = require("./rule.route.js");
const authenticateJWT = require("../middleware/auth.middleware.js");

async function routes(app) {
  app.use("/api/", homeRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/client", authenticateJWT, clientRoutes);
  app.use("/api/projects", authenticateJWT, projectRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/workspace", authenticateJWT, workspaceRoutes);
  app.use("/api/timer", authenticateJWT, timerRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/reports", authenticateJWT, reportsRoutes);
  app.use("/api/holiday", authenticateJWT, holidayRoutes);
  app.use("/api/leave", authenticateJWT, leaveRoutes);
  app.use("/api/rule", authenticateJWT, ruleRoutes);
}

module.exports = { routes };
