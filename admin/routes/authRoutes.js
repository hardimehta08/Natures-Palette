const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const multer = require("multer");

const path = require("path");

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/ad-images"); // Store uploaded photos in public/uploads/profile
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error("Only JPEG, JPG, and PNG files are allowed!"));
        }
    },
    limits: { fileSize: 800000 }, // Limit file size to 800KB
});

// ✅ Check if user is logged in
router.get("/check-session", (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});
// Route for Registration
router.post("/register", authController.registerUser);

// Route for Login
router.post("/login", authController.loginUser);

// Route for Forgot Password
router.post("/forgot-password", authController.forgotPassword);

router.post("/reset-password", authController.resetPassword);

// Route for Logout
router.post("/logout", authController.logoutUser);

// Check Session Route
router.get("/check-session", authController.checkSession);


router.get("/admin-profile", authController.getAdminProfile); // Fetch admin profile
router.post("/update-profile-photo", upload.single("profilePic"), authController.updateProfilePhoto); // Update profile photo
router.post("/update-profile", authController.updateProfile); // Update name and email
router.post("/change-password", authController.changePassword); // Change password

module.exports = router;
