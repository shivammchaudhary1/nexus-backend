const { config } = require("../config/env/default.js");
const User = require("../models/user.model.js");
const Entry = require("../models/entries.model.js");
const Workspace = require("../models/workspace.model.js");
const Timer = require("../models/timer.model.js");
const Project = require("../models/project.model.js");
const LeaveBalance = require("../models/leaveBalance.model.js");
const Rule = require("../models/rule.model.js");
const mongoose = require("mongoose");
const { convertDateToTimestamps } = require("../config/lib/timeCalculator.js");
const {
  generateRandomPassword,
} = require("../config/utility/generateRandomPassword.js");

const { encryptPassword } = require("../config/lib/bcryptjs.js");
const { signJwt, jwtVerify } = require("../config/lib/jwt.js");
const {
  isValidPassword,
  isValidEmail,
} = require("../config/utility/validation.js");
const { sendEmail } = require("../config/lib/nodemailer.js");
const { createSession } = require("../config/utility/utility.js");

const expiresIn = 10 * 365 * 24 * 60 * 60;

const signup = async (req, res) => {
  try {
    const { name, email, password, themeId } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        status: "failed",
        message: "Email already present, Try Sign in.",
      });
    }

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are mandatory." });
    } else if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid Email" });
    } else if (!isValidPassword(password)) {
      return res.status(400).json({
        message:
          "Password must include at least one number, both lower and uppercase letters, and at least one special character, such as '@,#,$,%,-'. Password length should be between 6 and 12 characters.",
      });
    }

    const encryptedPassword = await encryptPassword(password);

    const user = new User({
      name,
      email: email.toLowerCase(),
      password: encryptedPassword,
    });

    const accessToken = signJwt(
      { user_id: user._id, email: user.email },
      "2h",
      "access"
    );

    const refreshToken = signJwt(
      { user_id: user._id, email: user.email },
      expiresIn,
      "refresh"
    );

    const workspace = new Workspace({
      name: `${user.name}'s workspace`,
    });
    const newTimer = new Timer({
      user: user._id,
    });
    const userWorkspace = {
      user: user._id,
      isAdmin: true,
    };

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

    const newRule = new Rule();
    newRule.workspace = workspace._id;

    workspace.users.push(userWorkspace);
    workspace.rules.push(newRule._id);

    user.workspaces.push(workspace._id);
    user.accessToken = accessToken;
    user.refreshToken = refreshToken;
    user.currentWorkspace = workspace._id;
    user.timer = newTimer._id;
    user.leaveBalance.push(leave._id);
    user.workspaceThemes.push({ workspaceId: workspace._id, theme: themeId });

    await Promise.all([newTimer.save(), user.save(), workspace.save()]);
    await leave.save();
    await newRule.save();

    const token = {
      accessToken,
      refreshToken,
      expiresIn: 3600,
    };
    const cookieData = createSession(user._id, req.headers["user-agent"]);
    res.cookie("sessionId", cookieData.sessionId, {
      httpOnly: true,
      maxAge: cookieData.maxAge,
    });

    return res.json({
      isAuthenticated: true,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `User Registration Failed ${error.message}` });
  }
};

const getUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).send("user not found");
    }
    return res.status(200).json(user);
  } catch (error) {
    return res
      .status(500)
      .json(`Error getting users associated with workspace: ${error.message}`);
  }
};

const changeRole = async (req, res) => {
  const { role: isAdmin, userId } = req.body;

  try {
    const workspace = await Workspace.findById(req.user.currentWorkspace);

    if (!workspace) {
      return res.status(404).json("Workspace not found.");
    }

    const adminCount = workspace.users.filter(
      (user) => user.isAdmin === true
    ).length;
    if (!isAdmin && adminCount === 1) {
      return res.status(400).json("One admin is required in the workspace.");
    }
    await Workspace.findOneAndUpdate(
      {
        _id: req.user.currentWorkspace,
        users: { $elemMatch: { user: userId } },
      },
      { $set: { "users.$.isAdmin": isAdmin } } // add the array field name here
    );
    const updatedWorkspace = await Workspace.findById(
      req.user.currentWorkspace
    ).select("name status isEditable holidays rules leaveTypes users");
    return res.status(200).json({ workspace: updatedWorkspace });
  } catch (error) {
    return res.status(500).json(`Failed to switch admin: ${error.message} `);
  }
};

const invite = async (req, res) => {
  try {
    const { workspaceId, email, themeId } = req.body;
    let user = await User.findOne({ email });

    if (!user) {
      const token = signJwt({ email, workspaceId, themeId }, "24h", "access");
      const link = `${config.frontend_domain}/invite-new?token=${token}`;
      const html = `<div style="height: auto; width: 90%; margin: auto">
      <div style="text-align: center; background-color: #19acb4; padding: 2%">
        <img
          style="width: 10%; margin-bottom: 10px;"
          src="https://trackify.ai/static/media/logo.cb10d908.png"
          alt="no image"
        />
        <h4 style="color: aliceblue; ">Workspace Invitation</h4>
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
          Hello there,<br />
          Someone has invited you to join their workspace. <br />
          <br />
          <br />To accept the invitation please click on the join workspace
          button below:
        </p>
        <div style="margin-top: 5%; margin-bottom: 7%">
          <a
            href="${link}"
            style="
              text-decoration: none;
              background-color: #19acb4;
              color: aliceblue;
              padding: 1% 3%;
              border-radius: 20px;
              box-shadow: 0 2px #999;
              width: 25%;
            "
            >Join Workspace</a
          >
        </div>
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

      await sendEmail(email, "Workspace Invitation", html);

      res.status(201).json({ message: "Invitation sent successfully" });
    } else {
      const token = signJwt({ email, workspaceId }, "24h", "access");
      const link = `${config.frontend_domain}/invite-existing?token=${token}`;
      const html = `<div style="height: auto; width: 90%; margin: auto">
      <div style="text-align: center; background-color: #19acb4; padding: 2%">
        <img
          style="width: 10%; margin-bottom: 10px;"
          src="https://trackify.ai/static/media/logo.cb10d908.png"
          alt="no image"
        />
        <h4 style="color: aliceblue; ">Workspace Invitation</h4>
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
          Hello there,<br />
          Someone has invited you to join their workspace. <br />
          <br />
          <br />To accept the invitation please click on the join workspace
          button below:
        </p>
        <div style="margin-top: 5%; margin-bottom: 7%">
          <a
            href="${link}"
            style="
              text-decoration: none;
              background-color: #19acb4;
              color: aliceblue;
              padding: 1% 3%;
              border-radius: 20px;
              box-shadow: 0 2px #999;
              width: 25%;
            "
            >Join Workspace</a
          >
        </div>
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

      await sendEmail(email, "Workspace Invitation", html);
      res.status(201).json({ message: "Invitation sent successfully" });
    }
  } catch (error) {
    return res.status(500).json(`Failed to invite user, ${error.message}`);
  }
};

const invitenewuser = async (req, res) => {
  try {
    const { token } = req.params;
    const { email, workspaceId, themeId } = jwtVerify(token, "access");

    const invitedUserWorkspace = await Workspace.findById(workspaceId);

    if (!invitedUserWorkspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const randomPassword = generateRandomPassword(7);
    let password = randomPassword;

    const encryptedPassword = await encryptPassword(password);

    const user = new User({
      name: email.split("@")[0],
      email: email.toLowerCase(),
      password: encryptedPassword,
    });

    const accessToken = signJwt(
      { user_id: user._id, email: user.email },
      "2h",
      "access"
    );
    const refreshToken = signJwt(
      { user_id: user._id, email: user.email },
      "7d",
      "refresh"
    );

    const newTimer = new Timer({
      user: user._id,
    });

    const leaveBalance = invitedUserWorkspace.leaveTypes.map((type) => ({
      type: type.leaveType,
      value: 0,
    }));

    const leave = new LeaveBalance({
      user: user._id,
      workspace: workspaceId,
      leaveBalance: leaveBalance,
    });

    user.accessToken = accessToken;
    user.refreshToken = refreshToken;
    user.currentWorkspace = invitedUserWorkspace._id;
    user.timer = newTimer._id;
    user.leaveBalance.push(leave._id);
    user.workspaces.push(invitedUserWorkspace._id);
    user.workspaceThemes.push({
      workspaceId: invitedUserWorkspace._id,
      theme: themeId,
    });

    await Promise.all([newTimer.save(), user.save()]);

    await leave.save();

    const InvitedUserWorkspace = {
      user: user._id,
      isAdmin: false,
    };

    invitedUserWorkspace.users.push(InvitedUserWorkspace);
    await invitedUserWorkspace.save();

    const link = `${config.frontend_domain}/signin`;

    const html = `  <div style="height: auto; width: 90%; margin: auto">
  <div style="text-align: center; background-color: #19acb4; padding: 2%">
    <img
      style="width: 10%;margin-bottom: 10px;"
      src="https://trackify.ai/static/media/logo.cb10d908.png"
      alt="no image"
    />
    <h4 style="color: aliceblue">Join Workspace</h4>
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
      Your Workspace is ready. <br />
      Click the button below to login with your credentials:
    </p>
    <p>Your Account Credentials:</p>
    Email: <span style="color: #236fa1">${email}</span><br />
    Password: <span style="color: #236fa1">${randomPassword}</span><br />
    <br />
    <i style="color: #999">
      You can change your password in the profile section.</i
    >
    <div style="margin-top: 5%; margin-bottom: 7%">
      <a
        href="${link}"
        style="
          text-decoration: none;
          background-color: #19acb4;
          color: aliceblue;
          padding: 1% 3%;
          border-radius: 20px;
          box-shadow: 0 2px #999;
          width: 25%;
        "
        >Login</a
      >
    </div>
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
    console.log(html);
    await sendEmail(email, "Workspace Invitation", html);

    res.status(201).json("Registration successful");
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(`Failed to add new user to invited workspace ${error.message}`);
  }
};

const inviteexistinguser = async (req, res) => {
  const { token } = req.params;

  try {
    const { email, workspaceId, themeId } = jwtVerify(token, "access");
    const { _id } = await User.findOne({ email });
    const userDetails = await User.findOne({ email });

    const workspace = await Workspace.findById(workspaceId);

    // Check if the user already exists in the workspace
    const userExists = workspace.users.some((user) => user.user.equals(_id));

    if (userExists) {
      return res.status(400).json("User is already part of the workspace");
    }

    const InvitedUserWorkspace = {
      user: userDetails._id,
      isAdmin: false,
    };

    const leaveTypes = workspace.leaveTypes;
    const leaveBalance = leaveTypes.map((type) => ({
      type: type.leaveType,
      value: 0,
    }));

    const leave = new LeaveBalance({
      user: userDetails._id,
      workspace: workspace._id,
      leaveBalance: leaveBalance,
    });

    userDetails.leaveBalance.push(leave._id);
    userDetails.workspaces.push(workspace._id);
    userDetails.workspaceThemes.push({
      workspaceId: workspaceId,
      theme: themeId,
    });

    workspace.users.push(InvitedUserWorkspace);
    await workspace.save();
    await leave.save();
    await userDetails.save();

    return res.status(200).json("User added to the workspace");
  } catch (error) {
    return res
      .status(500)
      .json(`Failed to add user to the workspace: ${error.message}`);
  }
};

const entries = async (req, res) => {
  try {
    const { date } = req.query;
    const { startTimestamp, endTimestamp } = convertDateToTimestamps(date);
    const userId = req.user._id;
    const workspace = req.user.currentWorkspace;
    const entries = await Entry.find({
      user: userId,
      workspace,
      endTime: { $ne: [] },
      createdAt: {
        $gte: new Date(startTimestamp), // Start of the day
        $lt: new Date(endTimestamp), // End of the day
      },
    }).populate("project");
    res.status(200).json({ entries });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
};

const deleteEntry = async (req, res) => {
  try {
    const { entryId } = req.query;
    if (!entryId) {
      return res.status(400).send({ message: "Entry Id is required" });
    }
    const userId = req.user._id;
    const updateOneUser = User.updateOne(
      { _id: userId },
      { $pull: { entryLogs: entryId } }
    );
    const deletedEntry = await Entry.findByIdAndDelete(entryId);
    const updateOneTimer = Timer.updateOne(
      { user: userId },
      { $pull: { entryLogs: entryId } }
    );
    const updateOneProject = Project.updateOne(
      { user: userId },
      { $pull: { entryLogs: entryId } }
    );
    await Promise.all([updateOneUser, updateOneTimer, updateOneProject]);
    return res
      .status(200)
      .json({ message: "Entry Deleted Successfully", deletedEntry });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
};

const deleteUserFromWorkspace = async (req, res) => {
  const workspaceId = req.params.workspaceId;
  const userId = req.body.userId;

  try {
    const workspace = await Workspace.findById(workspaceId);
    const user = await User.findById(userId);

    if (!workspace)
      return res.status(404).json({ message: "Workspace not found" });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.timer) {
      await Timer.findOneAndDelete({ _id: user.timer });
    }

    const projects = await Project.find({ workspace: workspace._id });

    if (projects.length === 0) {
      return res
        .status(404)
        .json({ message: "No projects found in the workspace" });
    }

    for (const project of projects) {
      const userIndex = project.team.findIndex(
        (member) => member.toString() === userId
      );

      if (userIndex !== -1) {
        project.team.splice(userIndex, 1);
        await project.save();
      }
    }

    user.status = "inactive";
    user.holidays = [];
    user.projects = [];
    user.currentWorkspace = null;
    user.workspaces = [];
    user.entryLogs = [];
    user.timer = null;

    await user.save();

    const userIndex = workspace.users.findIndex(
      (user) => user.user.toString() === userId
    );

    if (userIndex === -1)
      return res.status(404).json({ message: "User not found in workspace" });

    workspace.users.splice(userIndex, 1);
    await workspace.save();

    res.status(200).json({ message: "User removed from workspace" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

const editEntry = async (req, res) => {
  try {
    const { entry } = req.body;
    const updatedEntry = await Entry.findOneAndUpdate(
      {
        _id: entry._id,
      },
      entry,
      { new: true }
    ).populate("project");
    res
      .status(200)
      .send({ message: "Entry Time updated successfully", updatedEntry });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: error.message });
  }
};

const editEntryTitle = async (req, res) => {
  try {
    const { entry } = req.body;
    const updatedEntry = await Entry.findOneAndUpdate(
      {
        _id: entry._id,
      },
      { title: entry.title },
      { new: true }
    ).populate("project");
    res
      .status(200)
      .send({ message: "Title updated successfully", updatedEntry });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: error.message });
  }
};

const getAllUsersFromSelectedWorkspace = async (req, res) => {
  try {
    const users = await User.find({
      workspaces: { $in: req.user.currentWorkspace },
    }).select(
      "name email leaveBalance leaves status currentWorkspace workspaceThemes currentWorkspace timer"
    );
    return res.status(200).json({ users });
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = {
  signup,
  getUser,
  changeRole,
  invite,
  invitenewuser,
  inviteexistinguser,
  entries,
  deleteEntry,
  deleteUserFromWorkspace,
  editEntry,
  editEntryTitle,
  getAllUsersFromSelectedWorkspace,
};
