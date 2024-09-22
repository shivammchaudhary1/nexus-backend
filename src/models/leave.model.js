const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      // enum: ["casual", "restricted"],
    },
    numberOfDays: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
    dailyDetails: [
      {
        _id: false,
        day: {
          type: Date,
          required: true,
        },
        duration: {
          type: String,
          enum: ["halfday", "fullday"],
          default: "fullday",
        },
      },
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
    },
    leaveBalance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveBalance",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Leave", leaveSchema);
