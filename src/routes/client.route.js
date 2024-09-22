const express = require("express");
const {
  createClient,
  updateClient,
  deleteClient,
  getWorkspaceClients,
} = require("../controller/client.controller.js");

const clientRoutes = express.Router();

clientRoutes.route("/create").post(createClient);
clientRoutes.route("/get-all").get(getWorkspaceClients);
clientRoutes.route("/update/:clientId").patch(updateClient);
clientRoutes.route("/delete/:clientId").delete(deleteClient);

module.exports = clientRoutes;
