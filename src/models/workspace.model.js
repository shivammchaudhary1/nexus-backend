const mongoose = require("mongoose");
const User = require("../models/user.model.js");
const Project = require("../models/project.model.js");
const Client = require("../models/client.model.js");

const userWorkspaceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  isAdmin: { type: Boolean, default: false, required: true },
  _id: false,
});

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    users: [userWorkspaceSchema],
    status: {
      type: String,
      enum: ["active", "inactive", "deleted"],
      default: "active",
      required: true,
    },
    isEditable: {
      type: Boolean,
      default: false,
    },
    projects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        default: [],
      },
    ],
    clients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        default: [],
      },
    ],
    theme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theme",
    },
    entryLogs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Entry",
      },
    ],
    holidays: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Holiday",
        default: [],
      },
    ],

    leaveTypes: {
      type: [
        {
          leaveType: {
            type: String,
          },
          paid: {
            type: Boolean,
            default: true,
          },
          // _id: false,
        },
      ],
      default: [
        { leaveType: "casual", paid: true },
        { leaveType: "sick", paid: true },
        { leaveType: "restricted", paid: true },
        { leaveType: "overtime", paid: true },
        { leaveType: "leaveWithoutPay", paid: false },
      ],
    },
    rules: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Rule",
      },
    ],
  },

  {
    timestamps: true,
    versionKey: false,
  }
);

workspaceSchema.pre("remove", async function (next) {
  try {
    await Promise.all([
      Project.deleteMany({ workspace: this._id }),
      Client.deleteMany({ workspace: this._id }),
      User.updateMany(
        { workspaces: { $in: [this._id] } },
        { $pull: { workspaces: this._id } }
      ),
    ]);
    next();
  } catch (error) {
    throw new Error(`failed to delete the workspace: ${error.message}`);
  }
});

module.exports = mongoose.model("Workspace", workspaceSchema);
