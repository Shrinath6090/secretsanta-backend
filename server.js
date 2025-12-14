const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

let isConnected = false;
async function connectedMongoDB(){
  try {
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log("MongoDB connected");
  } catch (error) {
    console.error("error connecting to the mongodb");
  }
}
app.use((req,res,next)=>{
  if(!isConnected){
    connectedMongoDB()
  }
  next();
})
// mongoose.connect(
//   process.env.MONGO_URI
// ).then(() => {
//   console.log("MongoDB connected");
//   console.log("DB:", mongoose.connection.name);
// });

const Nomination = require("./models/Selection");

// Get all nominations
app.get("/api/all", async (req, res) => {
  const data = await Nomination.find();
  res.json(data);
});

// Get available numbers
app.get("/api/available-numbers", async (req, res) => {
  const used = await Nomination.find().select("selectedNumber -_id");
  const usedNumbers = used.map(u => u.selectedNumber);
  const allNumbers = Array.from({ length: 12 }, (_, i) => i + 1);
  const available = allNumbers.filter(n => !usedNumbers.includes(n));
  res.json(available);
});
app.get('/api/budgetSummary',async(req,res)=>{
    const allDocs = await Nomination.find();
    console.log("TOTAL DOCUMENTS:", allDocs.length);
    console.log("SAMPLE DOC:", allDocs[0]);
    const data = await Nomination.aggregate([
    { $group: { _id: "$budget", count: { $sum: 1 } } }
    ]);
    console.log("AGGREGATION RESULT:", data);
    const result = {};
    data.forEach(d => (result[d._id] = d.count));
    res.json(result);
})
// Submit nomination
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

    // Duplicate name check
    const nameExists = await Nomination.findOne({
      firstName: firstName.trim(),
      lastName: lastName.trim()
    });

    if (nameExists) {
      return res.status(409).json({
        code: "ALREADY_NOMINATED",
        message: "You are already nominated for the event"
      });
    }

    // Duplicate number check
    const numberExists = await Nomination.findOne({ selectedNumber });
    if (numberExists) {
      return res.status(409).json({
        code: "NUMBER_TAKEN",
        message: "This number is already selected"
      });
    }

    await Nomination.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      selectedNumber,
      preferences: preferences.map(p => p.trim()),
      budget
    });

    res.status(201).json({
      message: "Successfully submitted"
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// app.listen(5000, () => {
//   console.log("Backend running on port 5000");
// });

module.exports = app;