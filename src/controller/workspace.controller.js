const User = require("../models/user.model.js");
const Workspace = require("../models/workspace.model.js");
const Timer = require("../models/timer.model.js");
const LeaveBalance = require("../models/leaveBalance.model.js");
const Rule = require("../models/rule.model.js");
const { loadUserProfile } = require("./auth.controller.js");

const createWorkspace = async (req, res) => {
  const { name, userId, themeId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json("User not found!");
    }

    const workspace = new Workspace({
      name: `${name}'s workspace`,
    });

    const newRule = new Rule();
    newRule.workspace = workspace._id;

    workspace.rules.push(newRule);
    workspace.users.push({ user: userId, isAdmin: true });
    
    user.workspaces.push(workspace._id);
    user.workspaceThemes.push({workspaceId: workspace._id, theme:themeId});

    const leaveTypes = workspace.leaveTypes;
    const leaveBalance = leaveTypes.map((type) => ({
      type: type.leaveType,
      value: 0,
    }));

    const leave = new LeaveBalance({
      user: user._id,
      workspace: workspace._id,
      leaveBalance: leaveBalance,
    });
    
    user.leaveBalance.push(leave._id);

    await Promise.all([await user.save(), await workspace.save()]);
    await leave.save();
    await newRule.save();

    const tempWorkspace = await Workspace.findById(workspace._id).populate(
      "clients projects"
    );

    return res.status(201).json(tempWorkspace);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(`Failed to create a new workspace: ${error.message}.`);
  }
};

const readWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId)
      .populate({
        path: "users.user",
        select: "name email",
      })
      .exec();

    if (!workspace) {
      return res.status(404).json("Workspace not found.");
    }

    return res.status(200).json({ workspace });
  } catch (error) {
    return res.status(500).json(`Failed to get Workspace: ${error.message}`);
  }
};

const getWorkspaceViaUserId = async (req, res) => {
  let { userId } = req.params;
  try {
    if (!userId) {
      return res.status(400).json("Invalid User id.");
    }

    const [user, workspaces] = await Promise.all([
      User.findById(userId),
      Workspace.find({ users: { $elemMatch: { user: userId } } })
        .populate("projects")
        .populate("clients")
        .populate("users.user"),
    ]);
    if (!user) {
      return res.status(404).json("User Not Found.");
    }
    return res.status(200).json(workspaces);
  } catch (error) {
    return res
      .status(500)
      .json(`Failed to get All Workspaces: ${error.message}`);
  }
};

const updateWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const updates = req.body;

    const workspace = await Workspace.findByIdAndUpdate(workspaceId, updates, {
      new: true,
    }).populate("clients projects theme");

    if (!workspace) {
      return res.status(404).json("Workspace not found.");
    }

    return res.status(200).json({ updatedWorkspace: workspace });
  } catch (error) {
    return res.status(500).json(`Failed to update Workspace: ${error.message}`);
  }
};

const deleteWorkspaceById = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findByIdAndDelete(workspaceId);

    if (!workspace) {
      return res.status(404).json("Workspace not found.");
    }

    await User.updateMany({}, { $pull: { workspaces: workspaceId } });

    return res.status(200).json("Workspace deleted successfully.");
  } catch (error) {
    return res.status(500).json(`Failed to delete Workspace: ${error.message}`);
  }
};

const switchWorkspace = async (req, res) => {
  try {
    const { workspaceId, userId } = req.params;
    const { isRunning } = await Timer.findOne({ user: userId });
    if (isRunning) {
      return res
        .status(400)
        .send({ message: "Please stop the timer to switch the workspace" });
    }
    const { currentWorkspace } = await User.findByIdAndUpdate(
      userId,
      { currentWorkspace: workspaceId },
      { new: true }
    ).populate("currentWorkspace");
    req.user.currentWorkspace = currentWorkspace._id;
    const { projects, entries, clients, lastEntryDate } = await loadUserProfile(
      req.user
    );
    console.log(entries);
    return res.status(200).json({
      workspace: currentWorkspace,
      projects,
      entries,
      clients,
      lastEntryDate,
    });
  } catch (error) {
    return res.status(500).json(`Failed to switch workspace: ${error.message}`);
  }
};

const editTimer = async (req, res) => {
  try {
    const { isEditable, workspace } = req.query;
    const updatedWorkspace = await Workspace.findByIdAndUpdate(
      { _id: workspace },
      { isEditable },
      { new: true }
    );
    return res
      .status(200)
      .send({ message: "Timer updated successfully", updatedWorkspace });
  } catch (error) {
    res.status(500).json(error.message);
  }
};

module.exports = {
  createWorkspace,
  switchWorkspace,
  readWorkspace,
  getWorkspaceViaUserId,
  deleteWorkspaceById,
  updateWorkspace,
  editTimer,
};
