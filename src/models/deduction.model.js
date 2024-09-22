const mongoose = require("mongoose");

const deductionSchema = new mongoose.Schema({
  deduction: [
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
    },
  ],
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
  leave: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Leave",
  },
  leaveBalance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LeaveBalance",
  },
});
