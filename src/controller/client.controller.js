const Client = require("../models/client.model.js");
const User = require("../models/user.model.js");
const Workspace = require("../models/workspace.model.js");

// create new client 
const createClient = async (req, res) => {
  const { clientName, userId, workspaceId } = req.body;

  try {
    const [user, workspace] = await Promise.all([
      User.findById(userId),
      Workspace.findById(workspaceId),
    ]);

    if (!user) {
      return res.status(404).json("User not found.");
    }

    if (!workspace) {
      return res.status(404).json("Workspace not found.");
    }

    const newClient = await Client.create({
      name: clientName,
      user: userId,
      workspace: workspaceId,
    });

    const [, , newClientData] = await Promise.all([
      user.updateOne({ $push: { clients: newClient._id } }),
      workspace.updateOne({ $push: { clients: newClient._id } }),
      Client.findById(newClient._id).select("name createdAt"),
    ]);

    res.status(201).json({ client: newClientData });
  } catch (error) {
    return res.status(500).json(`Failed to Create a Client: ${error.message}`);
  }
};

// get all the clients belongs to the workspace
const getWorkspaceClients = async (req, res) => {
  try {
    const clients = await Client.find({
      workspace: req.user.currentWorkspace,
    }).select("name createdAt");
    return res.status(200).json({ clients });
  } catch (error) {
    return res.status(400).json(`Failed to Get All Clients: ${error.message}`);
  }
};

// update the client
const updateClient = async (req, res) => {
  const { clientId } = req.params;
  const { name } = req.body;
  console.log(clientId, name);
  if (!name) {
    return res.status(400).json("New client name is mandatory.");
  }

  if (!clientId) {
    return res.status(400).json({ message: "Client not found" });
  }

  try {
    const updatedClient = await Client.findByIdAndUpdate(
      clientId,
      {
        $set: { name, updatedAt: new Date() },
      },
      { new: true }
    ).select("name createdAt");

    return res.status(200).json({ client: updatedClient });
  } catch (error) {
    return res.status(500).json(`Error updating Client: ${error.message}`);
  }
};

// Delete client
const deleteClient = async (req, res) => {
  const { clientId } = req.params;
  try {
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    await Promise.all([
      User.updateOne({ _id: client.user }, { $pull: { clients: clientId } }),
      Workspace.updateOne(
        { _id: client.workspace },
        { $pull: { clients: clientId } }
      ),
    ]);
    await Client.findByIdAndDelete(clientId);
    res.status(200).json({ message: "Client deleted successfully", clientId });
  } catch (error) {
    res.status(500).json("Failed to delete client" + error.message);
  }
};

module.exports = {
  createClient,
  getWorkspaceClients,
  updateClient,
  deleteClient,
};
