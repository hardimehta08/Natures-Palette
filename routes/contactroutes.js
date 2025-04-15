const express = require("express");
const contactController = require("../controllers/contactcontroller");

const router = express.Router();

// Only one route for form submission
router.post("/", contactController.createContact);

module.exports = router;
