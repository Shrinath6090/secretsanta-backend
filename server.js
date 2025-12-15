const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

/* ============================
   MongoDB Serverless Safe Setup
=============================== */

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        bufferCommands: false,
      })
      .then((mongoose) => {
        console.log("MongoDB connected");
        return mongoose;
      })
      .catch((err) => {
        console.error("MongoDB connection error:", err);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

/* Ensure DB connection before every request */
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    return res.status(500).json({
      message: "Database connection failed"
    });
  }
});

/* ============================
   Routes
=============================== */

const Nomination = require("./models/Selection");

/* Health check */
app.get("/", (req, res) => {
  res.json({
    activeStatus: true,
    error: false
  });
});

/* Get all nominations */
app.get("/api/all", async (req, res) => {
  try {
    const data = await Nomination.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch data" });
  }
});

/* Get available numbers */
app.get("/api/available-numbers", async (req, res) => {
  try {
    const used = await Nomination.find().select("selectedNumber -_id");
    const usedNumbers = used.map(u => u.selectedNumber);

    const allNumbers = Array.from({ length: 12 }, (_, i) => i + 1);
    const available = allNumbers.filter(n => !usedNumbers.includes(n));

    res.json(available);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch numbers" });
  }
});

/* Budget summary */
app.get("/api/budgetSummary", async (req, res) => {
  try {
    const data = await Nomination.aggregate([
      { $group: { _id: "$budget", count: { $sum: 1 } } }
    ]);

    const result = {};
    data.forEach(d => (result[d._id] = d.count));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch budget summary" });
  }
});

/* Submit nomination */
app.post("/api/submit", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      selectedNumber,
      preferences,
      budget
    } = req.body;

    if (
      !firstName?.trim() ||
      !lastName?.trim() ||
      !selectedNumber ||
      !preferences?.[0]?.trim() ||
      !preferences?.[1]?.trim() ||
      !budget
    ) {
      return res.status(422).json({
        code: "INVALID_INPUT",
        message: "Required fields missing"
      });
    }

    const nameExists = await Nomination.findOne({
      firstName: firstName.trim(),
      lastName: lastName.trim()
    });

    if (nameExists) {
      return res.status(409).json({
        code: "ALREADY_NOMINATED",
        message: "You are already nominated"
      });
    }

    const numberExists = await Nomination.findOne({ selectedNumber });
    if (numberExists) {
      return res.status(409).json({
        code: "NUMBER_TAKEN",
        message: "Number already selected"
      });
    }

    await Nomination.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      selectedNumber,
      preferences: preferences.map(p => p.trim()),
      budget
    });

    res.status(201).json({ message: "Successfully submitted" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================
   Local Development Only
=============================== */

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
}

module.exports = app;
