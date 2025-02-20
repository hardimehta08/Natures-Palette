const express = require("express");
const router = express.Router();
const {
  getCategoryData,
  getSubCategoryData,
} = require("../controllers/headcontroller.js");

router.get("/:category", getCategoryData);
router.get("/:category/:subCategory", getSubCategoryData);

module.exports = router;
