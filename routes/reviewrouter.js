const express = require("express");
const reviewController = require("../controllers/reviewcontroller");
const router = express.Router();

router.post("/add", reviewController.addFeedback);
router.delete("/delete", reviewController.deleteFeedback);
router.get("/",reviewController.feedbacks);
router.get("/customer",reviewController.userfeedback)

module.exports = router;
