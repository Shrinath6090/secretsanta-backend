const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config({ quiet: true });

const app = express();
app.use(cors());
app.use(express.json());

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI missing");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
  console.log("MongoDB connected");
  console.log("DB:", mongoose.connection.name);
}

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Database connection failed" });
  }
});

const Nomination = require("./models/Selection");

app.get("/api/all", async (req, res) => {
  res.json(await Nomination.find());
});

module.exports = app;
