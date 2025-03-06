const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");


router.get('/get/payments', paymentController.getPayments);

// PUT /api/payments/:PY_ID - Update payment details
router.put('/:PY_ID', paymentController.updatePayment);

module.exports = router;