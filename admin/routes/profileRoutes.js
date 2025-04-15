const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "public/ad-images"),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (!file || !file.originalname) {
            return cb(new Error("No file or invalid file provided"), false);
        }
        const filetypes = /jpeg|jpg|png/;
        const extnameValid = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetypeValid = filetypes.test(file.mimetype);
        if (extnameValid && mimetypeValid) {
            cb(null, true);
        } else {
            cb(new Error("Only JPEG, JPG, and PNG files are allowed!"), false);
        }
    },
    limits: { fileSize: 800000 }, // 800KB
});

const handleMulterError = (err, req, res, next) => {
    console.error("Multer error:", err);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Multer error: ${err.message}` });
    } else if (err) {
        return res.status(400).json({ message: err.message });
    }
    next();
};

router.get("/admin-profile", profileController.getAdminProfile);
router.post("/update-profile", profileController.updateProfile);
router.post("/update-profile-photo", upload.single("profilePic"), handleMulterError, profileController.updateProfilePhoto);
router.post("/change-password", profileController.changePassword);

module.exports = router;