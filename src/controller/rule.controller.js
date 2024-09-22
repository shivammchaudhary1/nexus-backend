const Rules = require("../models/rule.model.js");
const Workspace = require("../models/workspace.model");

const createRule = async (req, res) => {
  const { workingHours, workingDays, weekDays, workspaceId } = req.body;

  if (!workspaceId) {
    return res.status(400).json({ error: "Workspace ID is required" });
  }

  if (!workingHours || !workingDays || !weekDays) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Create a new instance of the Rules model
    const newRule = new Rules({
      workingHours,
      workingDays,
      weekDays,
      workspace: workspaceId,
    });

    // Save the newRule instance to the database
    await newRule.save();

    // Respond with the created rule
    return res.status(200).json({ newRule });
  } catch (error) {
    return res.status(500).json(`Failed to create Rule: ${error.message}`);
  }
};

const updateRule = async (req, res) => {
  const { workingHours, workingDays, weekDays, isActive, ruleId } = req.body;

  if (!workingHours || !workingDays || !weekDays) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const existingRule = await Rules.findById(ruleId);

    if (!existingRule) {
      return res.status(404).json({ error: "Rule not found" });
    }

    existingRule.workingHours = workingHours;
    existingRule.workingDays = workingDays;
    existingRule.weekDays = weekDays;

    if (isActive !== undefined) {
      existingRule.isActive = isActive;
    }

    await existingRule.save();

    // Respond with the updated rule
    return res.status(200).json({ updatedRule: existingRule });
  } catch (error) {
    return res.status(500).json(`Failed to update Rule: ${error.message}`);
  }
};

const getRule = async (req, res) => {
  const { workspaceId } = req.params;

  try {
    const workspace = await Workspace.findById(workspaceId).populate("rules");

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    const rule = workspace.rules;

    if (!rule) {
      return res.status(404).json({ error: "Rule not found" });
    }

    return res.status(200).json({ rule });
  } catch (error) {
    return res.status(500).json(`Failed to get Rule: ${error.message}`);
  }
};

const deleteRule = async (req, res) => {
  const { ruleId } = req.params;

  try {
    const existingRule = await Rules.findById(ruleId);

    if (!existingRule) {
      return res.status(404).json({ error: "Rule not found" });
    }

    await Rules.findByIdAndDelete(ruleId);

    return res.status(200).json({ message: "Rule deleted successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Failed to delete Rule: ${error.message}` });
  }
};

module.exports = {
  createRule,
  updateRule,
  getRule,
  deleteRule,
};
