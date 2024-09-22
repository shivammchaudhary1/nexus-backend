const mongoose = require("mongoose");
const { comparePassword } = require("../config/lib/bcryptjs.js");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      selected: false,
    },
    accessToken: {
      type: String,
      default: null,
      selected: false,
    },
    refreshToken: {
      type: String,
      default: null,
      selected: false,
    },
    timer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timer",
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "admin",
      required: true,
    },
    dateOfBirth: {
      type: Date,
      min: "1900-01-01",
      max: Date.now(),
    },
    profilePic: {
      type: String,
      default: null,
    },
    leaveBalance: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LeaveBalance",
      },
    ],
    status: {
      type: String,
      enum: ["active", "inactive", "deleted"],
      default: "active",
      required: true,
    },
    currentWorkspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
    },
    workspaces: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workspace",
        default: [],
      },
    ],
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
    leaves: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Leave",
        default: [],
      },
    ],
    entryLogs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Entry",
      },
    ],
    workspaceThemes: [
      {
        workspaceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Workspace",
        },
        theme: {
          type: String,
          required: true,
        },
        default:[]
      }
    ]
  },
  {
    timestamps: true,
    versionKey: false,
    strictQuery: false,
  }
);

userSchema.methods.authenticate = async function authenticate(password) {
  return comparePassword(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
