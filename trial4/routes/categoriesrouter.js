const express = require('express');
const router = express.Router();
const indexController = require('../controllers/categoriescontroller');

router.get('/fetchcategories', indexController.getCategories);

module.exports = router;
