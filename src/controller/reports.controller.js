const Project = require("../models/project.model.js");
const Client = require("../models/client.model.js");
const User = require("../models/user.model.js");
const Workspace = require("../models/workspace.model.js");
const Holiday = require("../models/holiday.model.js");
const Entry = require("../models/entries.model.js");
const Leave = require("../models/leave.model.js");
const MonthlyReport = require("../models/monthlyReport.model.js");
const LeaveBalance = require("../models/leaveBalance.model.js");
const reportsUtility = require("../utility/report.utility.js");
const { HOLIDAY_TYPES } = require("../utility/holiday.utility.js");
const mongoose = require("mongoose");

const getProjectDetailsByName = async (req, res) => {
  try {
    const { projectName } = req.body;

    if (!projectName) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const project = await Project.findOne({ name: projectName }).populate(
      "client"
    );

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.status(200).json({ project });
  } catch (error) {
    return res.status(500).json(`Failed to get data: ${error.message}`);
  }
};

const getProjectDetailsByClientName = async (req, res) => {
  try {
    const { clientName } = req.body;

    if (!clientName) {
      return res.status(400).json({ error: "Client name is required" });
    }

    const client = await Client.findOne({ name: clientName }).populate(
      "projects"
    );

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.status(200).json({ projects: client.projects });
  } catch (error) {
    return res.status(500).json(`Failed to get data: ${error.message}`);
  }
};

const getProjectReport = async (req, res) => {
  const { id } = req.params;

  try {
    const project = await Project.findById(id)
      .populate("team")
      .populate("client")
      .populate("entryLogs");

    if (!project) {
      return res.status(404).json("Project not found");
    }

    let totalHours = 0;
    project.entryLogs.forEach((entryLog) => {
      if (entryLog.durationInSeconds) {
        totalHours += entryLog.durationInSeconds / 3600;
      }
    });

    const teamMembers = project.team.map((member) => member.name);
    const creationDate = project.createdAt;

    res.status(200).json({
      report: {
        totalHoursSpent: totalHours,
        totalMembers: project.team.length,
        teamMembers: teamMembers,
        clientName: project.client.name,
        creationDate: creationDate,
      },
    });
  } catch (error) {
    return res.status(500).json(`failed to get report: ${error.messages}`);
  }
};

const getUserReport = async (req, res) => {
  const { userId } = req.params;
  const { projects, start, end, offset } = req.query;
  const projectIds = projects ? projects.split(",") : [];

  try {
    const pipeline = [];

    // Set default time period (current month) if start, end is not provided
    const now = new Date();
    let startDate = start
      ? new Date(start)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    let endDate = end
      ? new Date(end)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);
    // TODO: Update this Logic
    if (offset) {
      const isAdd = Math.sign(offset) === -1 ? true : false;
      endDate = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate() + (isAdd ? 1 : -1)
      );
    }

    // Match with user, and date range
    pipeline.push({
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        workspace: new mongoose.Types.ObjectId(req.user.currentWorkspace),
        createdAt: { $gte: startDate, $lte: endDate },
      },
    });

    // if projectIds is provided, match with project
    if (projectIds.length) {
      pipeline.push({
        $match: {
          project: {
            $in: projectIds.map(
              (projectId) => new mongoose.Types.ObjectId(projectId)
            ),
          },
        },
      });
    }

    // Populate the project and select project name
    pipeline.push({
      $lookup: {
        from: "projects",
        localField: "project",
        foreignField: "_id",
        as: "projectDetails",
        pipeline: [{ $project: { _id: 0, name: 1 } }, { $limit: 1 }],
      },
    });

    // Group by date 
    const groupBy = {
      date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
    };

    pipeline.push({
      $group: {
        _id: groupBy,
        // Keep all document details for each entry
        entries: { $push: "$$ROOT" },
        // Calculate total duration per group
        totalDuration: { $sum: "$durationInSeconds" },
      },
    });

    const results = await Entry.aggregate(pipeline).sort({ _id: 1 }).lookup({
      from: "projects",
      localField: "project",
      foreignField: "_id",
      as: "projectDetails",
    });
    return res.json(results);
  } catch (error) {
    return res.status(500).json(`Failed to get report: ${error.message}`);
  }
};

const report = async (req, res) => {
  if (!req.query.startDate || !req.query.endDate) {
    return res.status(500).send({ message: "Start and End Date is required" });
  }
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const userId = req.user._id;

  try {
    const currentWorkspace = req.user.currentWorkspace;
    const pipeline = [
      {
        $match: {
          workspace: currentWorkspace,
          $or: [{ team: { $in: [userId] } }, { user: userId }],
        },
      },
      {
        $lookup: {
          from: "entries",
          localField: "entryLogs",
          foreignField: "_id",
          as: "entryLogs",
        },
      },
      {
        $unwind: {
          path: "$entryLogs",
        },
      },
      {
        $match: {
          "entryLogs.createdAt": {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "entryLogs.user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $addFields: {
          userName: { $first: "$user.name" },
        },
      },
      {
        $group: {
          _id: {
            projectId: "$_id",
            userId: "$entryLogs.user",
          },
          userName: { $first: "$userName" },
          name: { $first: "$name" },
          description: { $first: "$description" },
          estimatedHours: { $first: "$estimatedHours" },
          isCompleted: { $first: "$isCompleted" },
          createdDate: { $first: "$createdAt" },
          totalDuration: { $sum: "$entryLogs.durationInSeconds" },
          client: { $first: "$client" },
        },
      },
      {
        $lookup: {
          from: "clients",
          localField: "client",
          foreignField: "_id",
          as: "client",
        },
      },
      {
        $group: {
          _id: "$_id.projectId",
          projectDetails: {
            $first: {
              name: "$name",
              description: "$description",
              estimatedHours: "$estimatedHours",
              isCompleted: "$isCompleted",
              createdDate: "$createdDate",
              client: {
                _id: { $first: "$client._id" },
                name: { $first: "$client.name" },
              },
            },
          },
          developers: {
            $push: {
              userId: "$_id.userId",
              name: "$userName",
              timeSpent: "$totalDuration",
            },
          },
        },
      },
    ];

    const projects = await Project.aggregate(pipeline);
    res.status(200).json({ message: "Report received successfully", projects });
  } catch (error) {
    return res.status(500).json(`Failed to get report: ${error.message}`);
  }
};

const generateMonthlyReport = async (req, res) => {
  const { workspaceId } = req.params;
  const { year, month, startDate, endDate } = req.body;

  const startUTCDate = new Date(startDate);
  const endUTCDate = new Date(endDate);
  try {
    const [workspace, yearlyHolidays] = await Promise.all([
      Workspace.findById(workspaceId)
        .populate("rules")
        .populate("holidays")
        .populate("users"),
      Holiday.find({
        type: HOLIDAY_TYPES.Gazetted,
        date: {
          $gte: startUTCDate,
          $lt: endUTCDate,
        },
      }),
    ]);

    const idealMonthlyHours = reportsUtility.calculateIdealMonthlyHours(
      workspace.rules,
      yearlyHolidays,
      year,
      month
    );

    const userMonthlyHours = await Promise.all(
      workspace.users.map(async (user) => {
        const [approvedLeaves, userEntryLogs, currentUser] = await Promise.all([
          Leave.find({
            user: user.user,
            status: "approved",
            dailyDetails: {
              $elemMatch: {
                day: {
                  $gte: startUTCDate,
                  $lte: endUTCDate,
                },
              },
            },
          }),
          Entry.find({
            user: user.user,
            createdAt: {
              $gte: startUTCDate,
              $lte: endUTCDate,
            },
          }),
          User.findById(user.user),
        ]);

        return reportsUtility.calculateUserMonthlyHours(
          currentUser,
          workspace.leaveTypes,
          idealMonthlyHours.totalRequiredWorkingHours,
          workspace.rules,
          approvedLeaves,
          userEntryLogs,
          idealMonthlyHours.holidays
        );
      })
    );

    const monthlyReport = {
      idealMonthlyHours,
      userMonthlyHours,
    };

    return res.status(200).json({ monthlyReport });
  } catch (error) {
    return res.status(500).json(`Failed to get report: ${error.message}`);
  }
};

// Usage in your monthlyReport function

const savingMonthlyReport = async (req, res) => {
  try {
    const { userId, workspaceId } = req.params;
    const { month, year, monthlyReportData } = req.body;

    // Check if the report for the given month and year already exists
    const existingReport = await MonthlyReport.findOne({ month, year });

    if (existingReport) {
      // Update the existing report if it already exists
      existingReport.report = monthlyReportData.userMonthlyHours;
      await existingReport.save();
      res.status(200).json({ message: "Monthly report updated successfully!" });
    } else {
      // Create a new report if it doesn't exist
      addOvertimeBalances(workspaceId, monthlyReportData.userMonthlyHours);
      const newMonthlyReport = new MonthlyReport({
        user: userId,
        workspace: workspaceId,
        month,
        year,
        idealMonthlyHours: monthlyReportData.idealMonthlyHours,
        report: monthlyReportData.userMonthlyHours,
        isOvertimeBalanceAdded: true,
      });

      await newMonthlyReport.save();
      res.status(201).json({
        message:
          "Monthly report saved successfully, and overtime balance added successfully!",
      });
    }
  } catch (error) {
    return res.status(500).json(`Failed to save report: ${error.message}`);
  }
};

const addOvertimeBalances = async (workspaceId, userData) => {
  const workspace = await Workspace.findById(workspaceId).populate("rules");
  const { workingHours } = workspace.rules.find((rule) => rule.isActive);
  const singleDayWorkingHoursInSeconds = workingHours * 3600;

  const overtimeBalanceInSeconds = userData.forEach(async (user) => {
    const overtimeInSeconds =
      user.overtime.hours * 3600 +
      user.overtime.minutes * 60 +
      user.overtime.seconds;
    let roundOffOvertimeBalance = (
      overtimeInSeconds / singleDayWorkingHoursInSeconds
    ).toFixed(2);

    roundOffOvertimeBalance = Math.round(roundOffOvertimeBalance * 4) / 4;

    const userLeaveBalances = await LeaveBalance.findOne({
      user: user.userId,
      workspace: workspaceId,
    });
    userLeaveBalances.leaveBalance.forEach((balance) => {
      if (balance.type === "overtime") {
        balance.value = (
          parseFloat(balance.value) + parseFloat(roundOffOvertimeBalance)
        ).toFixed(2);
      }
    });
    await userLeaveBalances.save();
  });
};

module.exports = {
  getProjectDetailsByName,
  getProjectDetailsByClientName,
  getProjectReport,
  getUserReport,
  report,
  generateMonthlyReport,
  savingMonthlyReport,
};
