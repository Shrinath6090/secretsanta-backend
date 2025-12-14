const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
    });
    isConnected = true;
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error", err);
    throw err;
  }
}

/* DB middleware */
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch {
    res.status(500).json({ message: "Database connection failed" });
  }
});

const Nomination = require("../models/Selection");

/* ROUTES */
app.get("/api/all", async (req, res) => {
  const data = await Nomination.find();
  res.json(data);
});

app.get("/api/available-numbers", async (req, res) => {
  const used = await Nomination.find().select("selectedNumber -_id");
  const usedNumbers = used.map(u => u.selectedNumber);
  const allNumbers = Array.from({ length: 12 }, (_, i) => i + 1);
  const available = allNumbers.filter(n => !usedNumbers.includes(n));
  res.json(available);
});

app.post("/api/submit", async (req, res) => {
  try {
    const { firstName, lastName, selectedNumber, preferences, budget } = req.body;

    if (
      !firstName?.trim() ||
      !lastName?.trim() ||
      !selectedNumber ||
      !preferences?.[0] ||
      !preferences?.[1] ||
      !budget
    ) {
      return res.status(422).json({ message: "Invalid input" });
    }

    const exists = await Nomination.findOne({ firstName, lastName });
    if (exists) {
      return res.status(409).json({ message: "Already nominated" });
    }

    const numTaken = await Nomination.findOne({ selectedNumber });
    if (numTaken) {
      return res.status(409).json({ message: "Number taken" });
    }

    await Nomination.create({
      firstName,
      lastName,
      selectedNumber,
      preferences,
      budget,
    });

    res.status(201).json({ message: "Submitted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = app;
