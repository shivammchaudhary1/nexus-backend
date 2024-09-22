const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema(
  {
    startTime: [
      {
        type: String,
        default: [],
      },
    ],
    endTime: [
      {
        type: String,
        default: [],
      },
    ],
    title: {
      type: String,
    },
    durationInSeconds: {
      type: Number,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Entry", entrySchema);
