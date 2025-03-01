const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentcontroller"); // Ensure this path is correct

// Define routes
router.get("/:orderId", paymentController.getPaymentDetails);
router.post("/createPayment", paymentController.createPayment);
router.post("/generate-qr-code", paymentController.generateQRCodeForOrder);
router.post("/update-transaction-id", paymentController.updateTransactionId);

module.exports = router;
