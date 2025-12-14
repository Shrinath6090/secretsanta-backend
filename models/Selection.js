const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  selectedNumber: Number,
  preferences: [String],
  budget: String
});

module.exports = mongoose.model("Nomination", schema);