const express = require("express");
const router = express.Router();
const deliveryController = require("../controllers/dcontrollers");

// ✅ Get all deliveries assigned to a delivery person
router.get("/deliveries/:d_id", deliveryController.getDeliveries);

// ✅ Update delivery status
router.post("/update-status", deliveryController.updateDeliveryStatus);

// ✅ Update payment status
router.post("/update-payment", deliveryController.updatePaymentStatus);

router.get("/transaction-id/:deliveryId",deliveryController.getTransactionId);

router.post("/verify-otp",deliveryController.verifyotp);

router.post('/register', deliveryController.registerDeliveryPerson);

router.post('/login', deliveryController.loginDeliveryPerson);

router.get("/check-session", deliveryController.checkSession);

router.post("/forgot-password", deliveryController.forgotPassword);
router.post("/reset-password", deliveryController.resetPassword);

// ✅ Route for Logout
router.post("/logout", deliveryController.logoutUser);
module.exports = router;
