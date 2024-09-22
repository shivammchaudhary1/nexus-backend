const mongoose = require("mongoose");

const timerSchema = new mongoose.Schema(
  {
    isRunning: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    entryLogs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Entry",
      },
    ],
    currentLog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entry",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Timer", timerSchema);
