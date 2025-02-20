const express = require('express');
const router = express.Router();
const { getCategoryData,getCategories } = require('../controllers/categoriescontroller');

router.get("/fetch/fetchcategories", getCategories);
router.get("/category/:category", getCategoryData);
router.get("/category/:category/:subcategory", getCategoryData);

module.exports = router;
