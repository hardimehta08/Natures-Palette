const express = require("express");
const router = express.Router();
const { generateBill } = require("../controllers/billcontroller");

router.get("/generateBill", generateBill);

module.exports = router;