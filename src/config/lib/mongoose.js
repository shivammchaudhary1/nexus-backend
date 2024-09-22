const mongoose = require("mongoose");
const { config } = require("../env/default.js");

const connect = async () => {
  try {

    // https://mongoosejs.com/docs/guide.html#strictQuery
    mongoose.set("strictQuery", true);
    return mongoose.connect(config.db_url, config.dbOptions || {});

  } catch (error) {
    console.error("Could not connect to MongoDB!");
    console.error(error);
  }
};

async function disconnect() {
  await mongoose.connection.close();
}
  

module.exports = {
  connect,
  disconnect,
};
