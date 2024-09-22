const Holiday = require("../models/holiday.model.js");
const Workspace = require("../models/workspace.model.js");
const User = require("../models/user.model.js");
const LeaveBalance = require("../models/leaveBalance.model.js");

const createHoliday = async (req, res) => {
  try {
    const { title, date, description, workspaceId, type, userId } = req.body;

    if (!title || !date || !workspaceId || !type || !userId) {
      return res.status(400).json("Missing required fields");
    }

    const workspace = await Workspace.findById(workspaceId).exec();

    if (!workspace) {
      return res.status(404).json("Workspace not found");
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json("User not found");
    }

    workspace.holidays = workspace.holidays || [];

    const newHoliday = new Holiday({
      title,
      date,
      description,
      workspace: workspaceId,
      type,
      user: userId,
    });

    workspace.holidays.push(newHoliday._id);

    await Promise.all([workspace.save(), newHoliday.save()]);

    res
      .status(201)
      .json({ status: "Holiday created successfully", newHoliday });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json(`Failed to create Holiday: ${error.message}`);
  }
};

const getHolidayDetails = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById({ _id: userId }).populate("leaves");
    const workspaceHoliday = await Workspace.findById({
      _id: user.currentWorkspace,
    }).populate("holidays");

    if (!user) {
      return res.status(404).json("User not found");
    }

    res.status(200).json({
      workspaceHoliday: workspaceHoliday.holidays,
      userHoliday: user.leaves,
    });
  } catch (error) {
    return res
      .status(500)
      .json(`Failed to get holiday details: ${error.message}`);
  }
};

const updateHolidayDetails = async (req, res) => {
  const { holidayId, title, date, description, type } = req.body;

  try {
    const updatedHoliday = await Holiday.findByIdAndUpdate(
      holidayId,
      { $set: { title, date, description, type } },
      { new: true }
    );

    if (!updatedHoliday) {
      return res.status(404).json("Holiday details not found");
    }

    res.json({ status: "success", holiday: updatedHoliday });
  } catch (error) {
    return res
      .status(500)
      .json(`Failed to update holiday details: ${error.message}`);
  }
};

const deleteHolidayDetails = async (req, res) => {
  const { id } = req.params;
  const { holidayId } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const holiday = await Holiday.findByIdAndDelete(holidayId);
    if (!holiday) {
      return res.status(404).json({ message: "Holiday Details not found" });
    }

    await Workspace.updateOne(
      { _id: holiday.workspace },
      { $pull: { holidays: holidayId } }
    );

    return res
      .status(200)
      .json({ message: "Holiday Details Deleted successfully", holidayId });
  } catch (error) {
    return res
      .status(500)
      .json(`Failed to delete Holiday Details: ${error.message}`);
  }
};

const addLeaveType = async (req, res) => {
  try {
    const { userId, leaveType } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const currentWorkspace = await Workspace.findById(user.currentWorkspace);

    if (!currentWorkspace) {
      return res
        .status(404)
        .json({ success: false, error: "Current workspace not found" });
    }

    if (
      currentWorkspace.leaveTypes.some((type) => type.leaveType === leaveType)
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Leave type already exists" });
    }

    // Update leaveTypes for the workspace
    currentWorkspace.leaveTypes.push({ leaveType: leaveType });

    // Update leaveBalance for each user in the workspace
    for (const userRef of currentWorkspace.users) {
      const userIdToUpdate = userRef.user;
      const userToUpdate = await User.findById(userIdToUpdate);

      if (userToUpdate) {
        // Find the corresponding leaveBalance document and update it
        const leaveBalanceToUpdate = await LeaveBalance.findOneAndUpdate(
          { user: userIdToUpdate, workspace: currentWorkspace._id },
          {
            $push: {
              leaveBalance: {
                type: leaveType,
                value: 0,
              },
            },
          },
          { upsert: true, new: true }
        );
      }
    }

    const updatedWorkspace = await currentWorkspace.save();

    res.status(200).json({ success: true, user: updatedWorkspace });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const deleteLeaveType = async (req, res) => {
  try {
    const { userId, leaveType } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const currentWorkspace = await Workspace.findById(user.currentWorkspace);

    if (!currentWorkspace) {
      return res
        .status(404)
        .json({ success: false, error: "Current workspace not found" });
    }

    // Check if the leave type exists
    const leaveTypeIndex = currentWorkspace.leaveTypes.findIndex(
      (type) => type.leaveType === leaveType
    );

    if (leaveTypeIndex === -1) {
      return res
        .status(400)
        .json({ success: false, error: "Leave type not found" });
    }

    // Remove the leave type from the workspace
    currentWorkspace.leaveTypes.splice(leaveTypeIndex, 1);

    // Remove the leave type from the leaveBalance for each user in the workspace
    for (const userRef of currentWorkspace.users) {
      const userIdToUpdate = userRef.user;
      const userToUpdate = await User.findById(userIdToUpdate);

      if (userToUpdate) {
        // Find the corresponding leaveBalance document and update it
        const leaveBalanceToUpdate = await LeaveBalance.findOneAndUpdate(
          { user: userIdToUpdate, workspace: currentWorkspace._id },
          {
            $pull: {
              leaveBalance: {
                type: leaveType,
              },
            },
          },
          { new: true }
        );
      }
    }

    const updatedWorkspace = await currentWorkspace.save();

    res.status(200).json({ success: true, user: updatedWorkspace });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const updateLeaveTypeName = async (req, res) => {
  try {
    const { userId, oldLeaveType, newLeaveType, paid } = req.body;

    if (
      !userId ||
      !oldLeaveType ||
      (newLeaveType === undefined && paid === undefined)
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const currentWorkspace = await Workspace.findById(user.currentWorkspace);

    if (!currentWorkspace) {
      return res
        .status(404)
        .json({ success: false, error: "Current workspace not found" });
    }

    // Check if the old leave type exists in the leaveTypes array

    const oldLeaveTypeIndex = currentWorkspace.leaveTypes.findIndex(
      (type) => type.leaveType === oldLeaveType
    );

    if (oldLeaveTypeIndex === -1) {
      return res
        .status(400)
        .json({ success: false, error: "Old leave type not found" });
    }

    // Update name of leave type in the workspace

    if (newLeaveType !== undefined) {
      currentWorkspace.leaveTypes[oldLeaveTypeIndex].leaveType = newLeaveType;
    }

    if (paid !== undefined) {
      currentWorkspace.leaveTypes[oldLeaveTypeIndex].paid = paid;
    }

    // Update leave type name in the leaveBalance for each user in the workspace
    for (const userRef of currentWorkspace.users) {
      const userIdToUpdate = userRef.user;
      const userToUpdate = await User.findById(userIdToUpdate);

      if (userToUpdate && newLeaveType !== undefined) {
        // Find the corresponding leaveBalance document
        const leaveBalanceToUpdate = await LeaveBalance.findOneAndUpdate(
          {
            user: userIdToUpdate,
            workspace: currentWorkspace._id,
            "leaveBalance.type": oldLeaveType,
          },
          { $set: { "leaveBalance.$.type": newLeaveType } },
          { new: true }
        );
      }
    }

    // Save the updated workspace
    const updatedWorkspace = await currentWorkspace.save();

    res.status(200).json({ success: true, data: { user: updatedWorkspace } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const getLeaveTypes = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const currentWorkspace = await Workspace.findById(user.currentWorkspace);

    if (!currentWorkspace) {
      return res
        .status(404)
        .json({ success: false, error: "Current workspace not found" });
    }

    // Ensure leaveTypes is an array, handle the case where it's undefined or null
    const leaveTypes = currentWorkspace.leaveTypes || [];

    res.status(200).json({ success: true, leaveTypes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

//All Users
const getLeaveBalances = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    const userIds = workspace.users.map((user) => user.user._id);

    const leaveBalances = await Promise.all(
      userIds.map(async (userId) => {
        // Assuming you have a LeaveBalance model
        const leaveBalance = await LeaveBalance.findOne({
          user: userId,
          workspace: workspaceId,
        })
          .populate("user")
          .sort({ createdAt: 1 });

        return leaveBalance;
      })
    );

    res.status(200).json({ success: true, leaveBalances });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const updateLeaveBalanceManually = async (req, res) => {
  try {
    const { userId, workspaceId, leaveType, amount } = req.body;

    if (!userId || !workspaceId || !leaveType) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    const userLeaveBalance = await LeaveBalance.findOne({
      user: userId,
      workspace: workspaceId,
    });

    if (!userLeaveBalance) {
      return res
        .status(404)
        .json({ success: false, error: "User Leave Balance not found" });
    }

    userLeaveBalance.leaveBalance.forEach((e) => {
      if (e.type === leaveType) {
        // e.value = Number(amount);
        e.value = parseFloat(parseFloat(amount).toFixed(2));
        return;
      }
    });

    await userLeaveBalance.save();

    res.status(200).json({
      success: true,
      leaveBalance: userLeaveBalance,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

const updateLeaveBalanceManuallyToAllUsers = async (req, res) => {
  try {
    const { workspaceId, leaveType, amount } = req.body;

    await LeaveBalance.updateMany(
      { workspace: workspaceId, "leaveBalance.type": leaveType },
      { $inc: { "leaveBalance.$.value": amount } }
    );

    const updatedLeaveBalances = await LeaveBalance.find({
      workspace: workspaceId,
    })
      .populate("user")
      .sort({ createdAt: 1 });

    res
      .status(200)
      .json({ success: true, leaveBalances: updatedLeaveBalances });
  } catch (error) {
    console.error("Error updating leave balances:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to update leave balances" });
  }
};

module.exports = {
  getHolidayDetails,
  createHoliday,
  updateHolidayDetails,
  deleteHolidayDetails,
  addLeaveType,
  deleteLeaveType,
  updateLeaveTypeName,
  getLeaveTypes,
  updateLeaveBalanceManually,
  updateLeaveBalanceManuallyToAllUsers,
  getLeaveBalances,
};
