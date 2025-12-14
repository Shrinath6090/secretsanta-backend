const router = require("express").Router();
const Nomination = require("../models/Selection");

/* Submit nomination */
router.post("/submit", async (req, res) => {
  const { firstName, lastName, number, preferences, budget } = req.body;

  if (
    !firstName?.trim() ||
    !lastName?.trim() ||
    number === null ||
    !preferences[0]?.trim() ||
    !preferences[1]?.trim() ||
    !budget
  ) {
    return res.status(200).json({ success: false, message: "Invalid data" });
  }

  const nameExists = await Nomination.findOne({
    firstName: firstName.trim(),
    lastName: lastName.trim()
  });

  if (nameExists) {
    return res.status(200).json({
      success: false,
      message: "You are already nominated"
    });
  }

  const numberExists = await Nomination.findOne({ number });
  if (numberExists) {
    return res.status(200).json({
      success: false,
      message: "Number already taken"
    });
  }

  await Nomination.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    number,
    preferences,
    budget
  });

  res.json({ success: true });
});

/* Get all */
router.get("/all", async (req, res) => {
  res.json(await Nomination.find());
});

/* Budget summary */
router.get("/budgetSummary", async (req, res) => {
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
});

module.exports = router;
