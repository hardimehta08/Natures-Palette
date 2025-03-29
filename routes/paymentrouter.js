const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentcontroller"); // Ensure this path is correct

router.get("/:orderId", paymentController.getPaymentDetails);
router.post("/createPaymentWithBill", paymentController.createPaymentWithBill);
router.post("/createPaymentWithQRCode", paymentController.createPaymentWithQRCode);
router.post("/confirm-qr-payment", paymentController.confirmQRCodePayment);
router.post("/generateBillAndRedirect", paymentController.generateBillAndRedirect);

module.exports = router;
