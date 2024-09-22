const Project = require("../models/project.model.js");
const Workspace = require("../models/workspace.model.js");
const Entry = require("../models/entries.model.js");
const Client = require("../models/client.model.js");
const User = require("../models/user.model.js");

// Create new project
const createProject = async (req, res) => {
  const data = req.body;

  try {
    const [user, workspace, client] = await Promise.all([
      User.findById(data.user),
      Workspace.findById(data.workspace),
      Client.findById(data.client),
    ]);

    if (!user) {
      return res.status(400).json("User not found.");
    }

    if (!workspace) {
      return res.status(400).json("Workspace not found.");
    }

    if (!client) {
      return res.status(400).json("Client not found.");
    }

    const teamMembersNotInArray = data.team.filter(
      (member) => !data.user.includes(member)
    );

    const newProject = new Project(data);

    await Promise.all([
      user.updateOne({ $push: { projects: newProject._id } }),
      workspace.updateOne({ $push: { projects: newProject._id } }),
      client.updateOne({ $push: { projects: newProject._id } }),
      ...teamMembersNotInArray.map(async (memberId) => {
        const memberUser = await User.findById(memberId);
        const memberWorkspace = await Workspace.findById(
          memberUser.currentWorkspace
        );

        if (memberUser && memberWorkspace) {
          await Promise.all([
            memberUser.updateOne({ $push: { projects: newProject._id } }),
            memberWorkspace.updateOne({ $push: { projects: newProject._id } }),
          ]);
        }
      }),
    ]);

    const savedProject = await newProject.save();
    const projects = await Project.aggregate([
      {
        // Match the project by its ID
        $match: { _id: savedProject._id },
      },
      {
        $lookup: {
          from: "entries",
          localField: "entryLogs",
          foreignField: "_id",
          as: "entries",
        },
      },
      // Next, we need to calculate the total hours spent for each project
      // using the $addFields stage. We can use the $reduce operator to sum up
      // the durationInSeconds field of each entry
      {
        $addFields: {
          timeSpend: {
            $reduce: {
              input: "$entries",
              initialValue: 0,
              in: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$$this.durationInSeconds", null] },
                      { $not: ["$$this.durationInSeconds"] },
                    ],
                  },
                  "$$value",
                  { $add: ["$$value", "$$this.durationInSeconds"] },
                ],
              },
            },
          },
        },
      },
      // Finally, we need to project only the fields that we want in the output
      // using the $project stage. We can use 1 to include a field, and 0 to exclude it.
      {
        $project: {
          name: 1,
          description: 1,
          user: 1,
          estimatedHours: 1,
          isCompleted: 1,
          timeSpend: 1,
          client: 1,
          team: 1,
          // We don't need the entries array in the output, so we exclude it
          entries: "$$REMOVE",
        },
      },
    ]);
    res.status(201).json({ project: projects[0] });
  } catch (error) {
    return res.status(500).json(`Failed to create project: ${error.message}`);
  }
};

const getProjectListForUser = async (req, res) => {
  try {
    const [user, workspace] = await Promise.all([
      User.findById(req.user._id),
      Workspace.findOne({ _id: req.user.currentWorkspace }).populate(
        "users.user"
      ),
    ]);

    if (!user) {
      return res.status(404).json("User not found");
    }

    const isAdminUser = workspace.users?.some(
      (obj) => obj?.user._id.toString() === user._id.toString() && obj.isAdmin
    );

    // First, we need to join the projects collection with the entries collection
    // using the $lookup stage. This will create an array of entries for each project.
    const projects = await Project.aggregate([
      {
        $match: isAdminUser
          ? { workspace: req.user.currentWorkspace }
          : {
              workspace: req.user.currentWorkspace,
              team: user._id,
            },
      },
      {
        $lookup: {
          from: "entries",
          localField: "entryLogs",
          foreignField: "_id",
          as: "entries",
        },
      },
      // Next, we need to calculate the total hours spent for each project
      // using the $addFields stage. We can use the $reduce operator to sum up
      // the durationInSeconds field of each entry
      {
        $addFields: {
          timeSpend: {
            $reduce: {
              input: "$entries",
              initialValue: 0,
              in: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$$this.durationInSeconds", null] },
                      { $not: ["$$this.durationInSeconds"] },
                    ],
                  },
                  "$$value",
                  { $add: ["$$value", "$$this.durationInSeconds"] },
                ],
              },
            },
          },
        },
      },
      // Finally, we need to project only the fields that we want in the output
      // using the $project stage. We can use 1 to include a field, and 0 to exclude it.
      {
        $project: {
          name: 1,
          description: 1,
          user: 1,
          estimatedHours: 1,
          isCompleted: 1,
          timeSpend: 1,
          client: 1,
          team: 1,
          // We don't need the entries array in the output, so we exclude it
          entries: "$$REMOVE",
        },
      },
    ]);
    return res.status(200).json({ projects });
  } catch (error) {
    return res.status(500).json(`Failed to get Projects: ${error.message}`);
  }
};

const getProjectListForWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const workspace = await Workspace.findById(id).populate({
      path: "projects",
      populate: { path: "entryLogs" },
    });

    if (!workspace) {
      return res.status(404).json("Workspace not found");
    }

    const projects = workspace.projects;

    return res.status(200).json({ projects });
  } catch (error) {
    return res.status(500).json(`Failed to get Projects: ${error.message}`);
  }
};

const getProject = async (req, res) => {
  const { id } = req.params;

  try {
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json("Project not found");
    }

    res.json({ project });
  } catch (error) {
    return res.status(500).json(`Failed to get project: ${error.message}`);
  }
};

const updateProject = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    estimatedHours,
    toggleIsComplete,
    clientId,
    selectedUsers,
  } = req.body;

  try {
    const project = await Project.findById(id).populate("entryLogs");

    if (!project) {
      return res.status(404).json("Project not found");
    }

    if (toggleIsComplete !== undefined) {
      project.isCompleted = !project.isCompleted;
    }

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (estimatedHours !== undefined) project.estimatedHours = estimatedHours;
    if (clientId !== undefined) project.client = clientId;

    if (selectedUsers !== undefined) {
      const userPromises = selectedUsers.map(async (userId) => {
        const user = await User.findById(userId);
        if (user) {
          user.projects.addToSet(project._id);
          return user.save();
        }
      });

      await Promise.all(userPromises);

      project.team = selectedUsers;
    }

    await project.save();

    const projects = await Project.aggregate([
      {
        // Match the project by its ID
        $match: { _id: project._id },
      },
      {
        $lookup: {
          from: "entries",
          localField: "entryLogs",
          foreignField: "_id",
          as: "entries",
        },
      },
      // Next, we need to calculate the total hours spent for each project
      // using the $addFields stage. We can use the $reduce operator to sum up
      // the durationInSeconds field of each entry
      {
        $addFields: {
          timeSpend: {
            $reduce: {
              input: "$entries",
              initialValue: 0,
              in: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$$this.durationInSeconds", null] },
                      { $not: ["$$this.durationInSeconds"] },
                    ],
                  },
                  "$$value",
                  { $add: ["$$value", "$$this.durationInSeconds"] },
                ],
              },
            },
          },
        },
      },
      // Finally, we need to project only the fields that we want in the output
      // using the $project stage. We can use 1 to include a field, and 0 to exclude it.
      {
        $project: {
          name: 1,
          description: 1,
          user: 1,
          estimatedHours: 1,
          isCompleted: 1,
          timeSpend: 1,
          client: 1,
          team: 1,
          // We don't need the entries array in the output, so we exclude it
          entries: "$$REMOVE",
        },
      },
    ]);

    return res.status(200).json({ project: projects[0] });
  } catch (error) {
    return res.status(500).json(`Failed to update project: ${error.message}`);
  }
};

const deleteProject = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedProject = await Project.findById(id);

    if (!deletedProject) {
      return res.status(404).json("Project not found.");
    }
    const [userUpdate, workspaceUpdate, clientUpdate] = await Promise.all([
      User.updateMany({}, { $pull: { projects: id } }),
      Workspace.updateMany({}, { $pull: { projects: id } }),
      Client.updateMany({}, { $pull: { projects: id } }),
      Entry.deleteMany({ project: id }),
      Project.findByIdAndDelete(id),
    ]);

    if (
      userUpdate.nModified === 0 ||
      workspaceUpdate.nModified === 0 ||
      clientUpdate.nModified === 0
    ) {
      return res
        .status(500)
        .json("Failed to update references in user, workspace, or client.");
    }

    res.json("Project deleted successfully");
  } catch (error) {
    return res.status(500).json(`Failed to delete project: ${error.message}`);
  }
};

const getTeamMembersForProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id).populate({
      path: "team",
      select: "name email",
    });

    if (!project) {
      return res
        .status(404)
        .json({ status: "error", message: "Project not found" });
    }

    const teamMembers = project.team;

    return res.status(200).json({ users: teamMembers });
  } catch (error) {
    console.error(error);
    return res.status(500).json(`Failed to get team members: ${error.message}`);
  }
};

const removeTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const [project, user] = await Promise.all([
      Project.findById(id),
      User.findById(userId),
    ]);

    if (!project) {
      return res.status(404).json("Project not found");
    }

    const index = project.team.indexOf(userId);

    if (index === -1) {
      return res.status(404).json("User is not a team member of the project");
    }

    project.team.splice(index, 1);
    user.projects.pull(id);
    user.workspaces.pull(project.workspace);

    await Promise.all([project.save(), user.save()]);

    return res.status(200).json("Team member removed successfully");
  } catch (error) {
    return res
      .status(500)
      .json(`Failed to remove team member: ${error.message}`);
  }
};

const addTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const [project, user] = await Promise.all([
      Project.findById(id),
      User.findById(userId),
    ]);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const workspace = await Workspace.findById(project.workspace);

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    const isUserExistInWorkspace = workspace.users.some((userEntry) =>
      userEntry.user._id.equals(userId)
    );

    if (!isUserExistInWorkspace) {
      return res.status(400).json({
        error: "User is not a member of the workspace. Try to invite first.",
      });
    }

    if (project.team.includes(userId)) {
      return res.status(400).json({
        error: "User is already a team member of this project.",
      });
    }

    project.team.push(userId);
    user.projects.push(project._id);

    await Promise.all([project.save(), user.save()]);

    return res.status(200).json({ message: "Team member added successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to add team member: ${error.message}` });
  }
};

module.exports = {
  addTeamMember,
  createProject,
  deleteProject,
  getProjectListForUser,
  getProjectListForWorkspace,
  getProject,
  getTeamMembersForProject,
  removeTeamMember,
  updateProject,
};
