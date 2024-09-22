const mongoose = require("mongoose");

const themeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    primaryColor: {
      type: String,
      required: true,
    },
    secondaryColor: {
      type: String,
      required: true,
    },
    textColor: {
      type: String,
      required: true,
    },
    textHover: {
      type: String,
      required: true,
    },
    backgroundColor: {
      type: String,
      required: true,
    },
    border: {
      type: String,
      required: true,
    },
    font: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Theme", themeSchema);
