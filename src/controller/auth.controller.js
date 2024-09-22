const User = require("../models/user.model.js");
const Workspace = require("../models/workspace.model.js");
const Project = require("../models/project.model.js");
const Entry = require("../models/entries.model.js");
const Client = require("../models/client.model.js");
const { comparePassword } = require("../config/lib/bcryptjs.js");

const {
  isValidPassword,
  isValidEmail,
} = require("../config/utility/validation.js");
const {
  decodeSession,
  createSession,
} = require("../config/utility/utility.js");

const expiresIn = 10 * 365 * 24 * 60 * 60;

const login = async (req, res) => {
  const { credentials } = req.body;
  const [email, password] = Buffer.from(credentials, "base64")
    .toString()
    .split(":");

  try {
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: "Invalid password" });
    } else if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid Email" });
    }

    let user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(400).json({
        message: "This email is not registered, try to signup",
      });
    }

    if (user.status === "inactive") {
      return res.status(400).json({ message: "User is inactive" });
    }

    // TODO:: Remove this once theme is added for all the user.
    if (!user?.workspaceThemes?.length) {
      await User.findByIdAndUpdate(user._id, {
        workspaceThemes: [
          { workspaceId: user.currentWorkspace, theme: "trackify-ui-theme-1" },
        ],
      });
    }

    const isCorrectPassword = await comparePassword(password, user.password);

    if (user && isCorrectPassword) {
      const cookieData = createSession(user._id, req.headers["user-agent"]);
      res.cookie("sessionId", cookieData.sessionId, {
        httpOnly: true,
        maxAge: cookieData.maxAge,
      });
      return res.json({
        isAuthenticated: true,
      });
    }

    return res.status(400).json({
      message: "Invalid credentials",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `Failed to Login : ${error.message}` });
  }
};

const logout = async (req, res) => {
  try {
    res.cookie("sessionId", "", {
      httpOnly: true,
      maxAge: new Date(0), // Set the expiration date to the past
    });
    res.status(200).json("Logout successful");
  } catch (error) {
    res.status(500).json(`Failed to logout: ${error.message}`);
  }
};

async function isAuthenticated(req, res) {
  try {
    const { sessionId } = req.cookies;
    const { loginDate } = req.body;

    if (!sessionId) {
      return res.status(403).send("Unauthorized");
    }
    const { userId, error } = decodeSession(
      sessionId,
      req.headers["user-agent"]
    );
    let user = await User.findById(userId).select(
      "name email leaveBalance leaves status currentWorkspace workspaceThemes currentWorkspace timer"
    );
    if (error || !user) {
      return res.status(403).json({ message: "invalid session" });
    }

    // TODO: Remove this once theme is added for all the user.
    if (!user?.workspaceThemes?.length) {
      user = await User.findByIdAndUpdate(user._id, {
        workspaceThemes: [
          { workspaceId: user.currentWorkspace, theme: "trackify-ui-theme-1" },
        ],
      }).select(
        "name email leaveBalance leaves status currentWorkspace workspaceThemes currentWorkspace timer"
      );
    }

    const { projects, entries, workspaces, clients, lastEntryDate, users } =
      await loadUserProfile(user, loginDate);

    const cookieData = createSession(user._id, req.headers["user-agent"]);
    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      maxAge: cookieData.maxAge,
    });

    return res.json({
      user,
      isAuthenticated: true,
      projects,
      entries,
      workspaces,
      clients,
      lastEntryDate,
      users,
    });
  } catch (error) {
    return res.status(500).json(error);
  }
}

async function loadUserProfile(user, loginDate) {
  const todayISO = new Date(loginDate);
  try {
    const workspaces = await Workspace.find({
      users: { $elemMatch: { user: user._id } },
    }).select("name status isEditable holidays rules leaveTypes users");
    const isAdminUser = workspaces
      .find(
        (workspace) =>
          workspace._id.toString() === user.currentWorkspace.toString()
      )
      ?.users?.some(
        (obj) => obj?.user._id.toString() === user._id.toString() && obj.isAdmin
      );

    // remove when live is active for the first time

    if (isAdminUser) {
      const filter = {
        currentWorkspace: user.currentWorkspace,
        workspaces: { $ne: user.currentWorkspace },
      };
      const update = { $push: { workspaces: user.currentWorkspace } };
      const options = { multi: true };
      await User.updateMany(filter, update, options);
    }

    const projects = await Project.find({
      ...(isAdminUser
        ? { workspace: user.currentWorkspace }
        : { team: user._id }),
    }).select("name description user estimatedHours isCompleted");
    const entries = await Entry.find({
      workspace: user.currentWorkspace,
      user: user._id,
      createdAt: { $gte: todayISO },
    }).populate({
      path: "project",
      select: "name description",
    });
    let workspaceClients = [];
    let workspaceUsers = [];
    if (isAdminUser) {
      const [clients, users] = await Promise.all([
        Client.find({ workspace: user.currentWorkspace }).select(
          "name createdAt workspace"
        ),
        User.find({ workspaces: { $in: user.currentWorkspace } }).select(
          "name email"
        ),
      ]);
      workspaceClients = clients;
      workspaceUsers = users;
    }

    return {
      projects,
      entries,
      workspaces,
      clients: workspaceClients,
      users: workspaceUsers,
      lastEntryDate: todayISO,
    };
  } catch (error) {
    console.log(error);
  }
}
module.exports = { login, logout, isAuthenticated, loadUserProfile };
