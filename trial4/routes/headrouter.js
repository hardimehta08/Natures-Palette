const express = require("express");
const router = express.Router();
const {
  getCategoryData,
  getSubCategoryData,
  getSubSubCategoryData,
  getCategories,
} = require("../controllers/headcontroller.js");

router.get("/menu/categories", getCategories);
router.get("/:category", getCategoryData);
router.get("/:category/:subCategory", getSubCategoryData);
router.get("/sub/:subcategory/:subsubcategory", getSubSubCategoryData);


module.exports = router;
