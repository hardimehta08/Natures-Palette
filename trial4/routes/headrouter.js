const express = require("express");
const router = express.Router();
const {
  getCategoryData,
  getSubCategoryData,
  getSubSubCategoryData,
} = require("../controllers/headcontroller.js");

router.get("/:category", getCategoryData);
router.get("/:category/:subCategory", getSubCategoryData);
router.get("/sub/:subcategory/:subsubcategory", getSubSubCategoryData);

module.exports = router;
