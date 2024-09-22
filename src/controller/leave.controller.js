const Leave = require("../models/leave.model");
const User = require("../models/user.model");
const { sendEmail } = require("../config/lib/nodemailer.js");
const leaveBalanceModel = require("../models/leaveBalance.model.js");
const Workspace = require("../models/workspace.model.js");

const createLeaveRequest = async (req, res) => {
  try {
    const {
      title,
      type,
      startDate,
      endDate,
      userId,
      dailyDetails,
      numberOfDays,
      description,
    } = req.body;

    if (!title || !type || !startDate || !endDate || !userId || !numberOfDays) {
      return res.status(400).json("All fields are required");
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json("User not found");
    }

    // const existingLeave = await Leave.findOne({
    //   user: user._id,
    //   status: "pending",
    //   startDate: { $lte: endDate },
    //   endDate: { $gte: startDate },
    // });

    const existingLeave = await Leave.findOne({
      user: user._id,
      $or: [{ status: "pending" }, { status: "approved" }],
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    });

    if (existingLeave) {
      return res.status(400).json("Leave already applied for the same date");
    }

    const admin = await User.findOne({
      currentWorkspace: user.currentWorkspace,
    });

    const leaveBalance = await leaveBalanceModel.findOne({
      user: user._id,
      workspace: user.currentWorkspace,
    });

    const newLeave = new Leave({
      title,
      type,
      startDate,
      endDate,
      numberOfDays,
      dailyDetails,
      user: user._id,
      description,
      workspace: user.currentWorkspace,
      leaveBalance: leaveBalance._id,
    });

    await newLeave.save();

    user.leaves.push(newLeave._id);
    await user.save();

    const adminName = admin.name;
    const adminEmail = admin.email;

    const html = `<div style="height: auto; width: 90%; margin: auto">
    <div style="text-align: center; background-color: #19acb4; padding: 2%">
      <img
        style="width: 10%; margin-bottom: 10px"
        src="https://trackify.ai/static/media/logo.cb10d908.png"
        alt="no image"
      />
      <h4 style="color: aliceblue">Leave Application Notification</h4>
    </div>

    <div
      style="
        height: 50%;
        padding: 2%;
        background-color: #c4eaec;
        font-size: 1.2em;
      "
    >
      <p>Hello ${adminName},</p>
      <p>The following employee has applied for leave:</p>
      <ul>
        <li><strong>Employee Name:</strong> ${user.name}</li>
        <li><strong>Leave Type:</strong> ${type}</li>
        <li><strong>Start Date:</strong> ${startDate}</li>
        <li><strong>End Date:</strong> ${endDate}</li>
        <li><strong>Reason:</strong> ${title}</li>
      </ul>
      <p>
        Please take the necessary action and respond to the employee
        accordingly.
      </p>
      <p>Thank you!</p>
      <hr />
      <p style="color: #888; font-size: 12px">
        This is an automated email. Please do not reply to this email.
      </p>
      <hr />
    </div>

    <div style="height: 17%; text-align: center; background-color: #19acb4">
      <div style="padding: 2%">
        <p style="color: aliceblue">
          For more information, contact <br />
          <a href="mailto:trackify@gmail.com" style="color: aliceblue"
            >trackify@gmail.com</a
          >
        </p>
      </div>
    </div>
  </div>`;

    await sendEmail(adminEmail, "Request Leave", html);

    return res
      .status(200)
      .json({ status: "Leave applied successfully", newLeave });
  } catch (error) {
    return res.status(500).json(`Failed to create leave: ${error.message}`);
  }
};

const getRequestedLeaveByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const allLeaves = await Leave.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("user")
      .populate("leaveBalance")
      .lean();
    // Use sort({ createdAt: -1 }) to retrieve the data in descending order based on createdAt

    return res.status(200).json({ success: true, userLeaveData: allLeaves });
  } catch (error) {
    console.error(`Failed to send leave's data: ${error.message}`);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateLeaveRequest = async (req, res) => {
  try {
    const {
      leaveId,
      title,
      type,
      startDate,
      endDate,
      dailyDetails,
      numberOfDays,
      userId,
    } = req.body;

    // const user = await User.findById(req.user._id);
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json("User not found");
    }

    // Check if the leave request exists
    const existingLeave = await Leave.findById(leaveId);

    if (!existingLeave) {
      return res.status(404).json("Leave not found");
    }

    // Check if the user is the owner of the leave request
    if (existingLeave.user.toString() !== user._id.toString()) {
      return res
        .status(403)
        .json("Unauthorized: You are not the owner of this leave request");
    }

    // Update leave details
    existingLeave.title = title;
    existingLeave.type = type;
    existingLeave.startDate = startDate;
    existingLeave.endDate = endDate;
    existingLeave.dailyDetails = dailyDetails;
    existingLeave.numberOfDays = numberOfDays;

    await existingLeave.save();

    return res.status(200).json({
      status: "Leave updated successfully",
      updatedLeave: existingLeave,
    });
  } catch (error) {
    return res.status(500).json(`Failed to update leave: ${error.message}`);
  }
};

const deleteLeaveRequest = async (req, res) => {
  try {
    const { userId, leaveId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json("User not found");
    }

    // Check if the leave request exists
    const existingLeave = await Leave.findById(leaveId);

    if (!existingLeave) {
      return res.status(404).json("Leave not found");
    }

    if (existingLeave.status === "approved") {
      return res
        .status(403)
        .json("Unauthorized: You cannot delete approved leave request");
    }

    // Check if the user is the owner of the leave request
    if (existingLeave.user.toString() !== user._id.toString()) {
      return res
        .status(403)
        .json("Unauthorized: You are not the owner of this leave request");
    }

    user.leaves.pull(leaveId);
    await user.save();

    // Remove the leave request
    await Leave.findByIdAndDelete(leaveId);

    return res.status(200).json({ status: "Leave deleted successfully" });
  } catch (error) {
    return res.status(500).json(`Failed to delete leave: ${error.message}`);
  }
};

const getUserLeaveBalance = async (req, res) => {
  const { userId, workspaceId } = req.params;

  if (!userId || !workspaceId) {
    return res.status(400).json({
      error: "Bad Request",
      message: "User ID or workspace ID not provided",
    });
  }

  try {
    const leaveBalance = await leaveBalanceModel.findOne({
      user: userId,
      workspace: workspaceId,
    });

    if (!leaveBalance) {
      return res
        .status(404)
        .json({ error: "Not Found", message: "Leave balance not found" });
    }

    return res.status(200).json({ leaveBalance });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while processing the request",
    });
  }
};

// Accessible only for admin

const getAllLeaves = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json("User not found");
    }

    const { monthsBack } = req.query;

    const monthsToGoBack = parseInt(monthsBack) || 1;

    const currentDate = new Date();
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() - monthsToGoBack);

    const leaves = await Leave.find({
      createdAt: { $gte: targetDate, $lt: currentDate },
    })
      .sort({ createdAt: -1 })
      .populate("user");

    return res.status(200).json({ leaves });
  } catch (error) {
    return res
      .status(500)
      .json(`Failed to get leave requests: ${error.message}`);
  }
};

const updateStatusOfLeave = async (req, res) => {
  try {
    const { status, leaveId, rejectionReason, workspaceId } = req.body;

    const leaveDetails = await Leave.findById(leaveId)
      .populate("leaveBalance")
      .populate("user");
    const leaveBalanceData = await leaveBalanceModel.findById(
      leaveDetails.leaveBalance._id
    );

    if (!leaveDetails) {
      return res.status(404).json("Leave Data not found");
    }

    if (!leaveBalanceData) {
      return res.status(404).json("Leave Balance Data not found");
    }

    if (status === leaveDetails.status) {
      return res.status(200).json({
        message:
          "The provided status is the same as the current status. No further updates were necessary.",
      });
    }

    const workspaceLeaveTypes = await Workspace.findById(workspaceId);
    // workspaceLeaveTypes.leaveTypes;

    const leaveType = leaveDetails.type;
    const days = leaveDetails.numberOfDays;
    let leaveBalance = leaveBalanceData.leaveBalance;

    const overtimeIndex = findLeaveIndex("overtime");

    function findLeaveIndex(leaveType) {
      return leaveBalance.findIndex((item) => item.type === leaveType);
    }

    function updateLeaveBalance(leaveType, days) {
      const leaveIndex = findLeaveIndex(leaveType);
      const overtimeBalance = leaveBalance[overtimeIndex];

      if (leaveIndex !== -1) {
        if (overtimeBalance.value > 0) {
          const deductionFromOvertime = Math.min(overtimeBalance.value, days);
          overtimeBalance.value -= deductionFromOvertime;
          overtimeBalance.consumed += deductionFromOvertime;
          days -= deductionFromOvertime;
        }

        if (days > 0 && leaveBalance[leaveIndex].value > 0) {
          const deductionFromLeaveType = Math.min(
            leaveBalance[leaveIndex].value,
            days
          );
          leaveBalance[leaveIndex].value -= deductionFromLeaveType;
          leaveBalance[leaveIndex].consumed += deductionFromLeaveType;
          days -= deductionFromLeaveType;
        }

        // if (days > 0) {
        //   const LOPIndex = findLeaveIndex("leaveWithoutPay");
        //   // leaveBalance[LOPIndex].value += days;
        //   leaveBalance[LOPIndex].consumed += days;
        // }

        //dynamically update unpaid leave
        //check condition if two or more unpaid leave types are there in workspace
        if (days > 0) {
          const unpaidLeaveType = workspaceLeaveTypes.leaveTypes.find(
            (type) => type.paid === false
          );

          if (unpaidLeaveType) {
            const unpaidLeaveIndex = findLeaveIndex(unpaidLeaveType.leaveType);
            leaveBalance[unpaidLeaveIndex].consumed += days;
          }
        }
      }
    }

    // Save the status in MongoDB
    leaveDetails.status = status;

    // Update leaveBalance only if status is "approved"
    if (status === "approved") {
      updateLeaveBalance(leaveType, days);

      const html = ` <div style="height: auto; width: 90%; margin: auto">
      <div style="text-align: center; background-color: #19acb4; padding: 2%">
        <img
          style="width: 10%; margin-bottom: 10px"
          src="https://trackify.ai/static/media/logo.cb10d908.png"
          alt="no image"
        />
        <h4 style="color: aliceblue">Leave Request Approved</h4>
      </div>

      <div
        style="
          height: 50%;
          padding: 2%;
          background-color: #c4eaec;
          font-size: 1.2em;
        "
      >
        <p>
          Hello ,<br />
          Your leave request has been approved. Here are the details: <br />
          <br />
          <br /> <ul>
            <li><strong>Title : </strong> ${leaveDetails.title}</li>
            <li><strong>Leave Type: </strong> ${leaveDetails.type}</li>
            <li><strong>Number of Days: </strong> ${
              leaveDetails.numberOfDays
            }</li>
            <li><strong>Start Date: </strong> ${formatDate(
              leaveDetails.startDate
            )}</li>
            <li><strong>End Date: </strong> ${formatDate(
              leaveDetails.endDate
            )}</li>
          </ul>
        </p>
        <hr>
        <p style="color: #888; font-size: 12px">
            This is an automated email. Please do not reply to this email.
          </p>
      </div>

      <div style="height: 17%; text-align: center; background-color: #19acb4">
        <div style="padding: 2%">
          <p style="color: aliceblue">
            For more information, contact <br />
            <a href="mailto:trackify@gmail.com" style="color: aliceblue"
              >trackify@gmail.com</a
            >
          </p>
        </div>
      </div>
    </div>`;

      await sendEmail(leaveDetails.user.email, "Leave Request Approved", html);
    }

    if (status === "rejected") {
      const html = `<div style="height: auto; width: 90%; margin: auto">
      <div style="text-align: center; background-color: #19acb4; padding: 2%">
        <img
          style="width: 10%; margin-bottom: 10px"
          src="https://trackify.ai/static/media/logo.cb10d908.png"
          alt="no image"
        />
        <h4 style="color: aliceblue">Leave Request Rejected</h4>
      </div>
    
      <div
        style="
          height: 50%;
          padding: 2%;
          background-color: #c4eaec;
          font-size: 1.2em;
        "
      >
        <p>
          Hello ,<br />
          We regret to inform you that your leave request has been rejected. Here are the details: <br />
          <br />
          <br />
          <ul>
            <li><strong>Title : </strong> ${leaveDetails.title}</li>
            <li><strong>Leave Type: </strong> ${leaveDetails.type}</li>
            <li><strong>Number of Days: </strong> ${
              leaveDetails.numberOfDays
            }</li>
            <li><strong>Start Date: </strong> ${formatDate(
              leaveDetails.startDate
            )}</li>
            <li><strong>End Date: </strong> ${formatDate(
              leaveDetails.endDate
            )}</li>
          </ul>
          <br />
          <p><strong>Reason for Rejection:</strong> ${rejectionReason}</p>
        </p>
    
        <hr>
        <p>If you have any concerns or questions, please contact the HR department.</p>
        <hr>
        <p style="color: #888; font-size: 12px">
          This is an automated email. Please do not reply to this email.
        </p>
      </div>
    
      <div style="height: 17%; text-align: center; background-color: #19acb4">
        <div style="padding: 2%">
          <p style="color: aliceblue">
            For more information, contact <br />
            <a href="mailto:trackify@gmail.com" style="color: aliceblue"
              >trackify@gmail.com</a
            >
          </p>
        </div>
      </div>
    </div>
    `;
      await sendEmail(leaveDetails.user.email, "Leave Request Rejected", html);
    }

    // Save the changes in MongoDB
    leaveBalanceData.leaveBalance = leaveBalance;
    await leaveBalanceData.save();

    if (rejectionReason) {
      leaveDetails.rejectionReason = rejectionReason;
    }

    // Save leaveDetails with updated status
    await leaveDetails.save();

    return res.status(200).json({ leaveDetails });
  } catch (error) {
    return res.status(500).json(`Failed to update status: ${error.message}`);
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

module.exports = {
  createLeaveRequest,
  getRequestedLeaveByUser,
  updateLeaveRequest,
  deleteLeaveRequest,
  getAllLeaves,
  updateStatusOfLeave,
  getUserLeaveBalance,
};
