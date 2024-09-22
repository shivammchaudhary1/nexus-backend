const mongoose = require("mongoose");

const leaveBalanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    leaveBalance: [
      {
        type: {
          type: String,
          required: true,
        },
        value: {
          type: Number,
          required: true,
        },
        consumed: {
          type: Number,
          default: 0,
        },
        _id: false,
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
    strictQuery: false,
  }
);

module.exports = mongoose.model("LeaveBalance", leaveBalanceSchema);
