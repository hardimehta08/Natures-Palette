const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController'); // Adjust path as needed

router.get('/feedback-report', feedbackController.getFeedback);

module.exports = router;