const mysql = require("mysql2/promise"); // Use promise-based MySQL
const bcrypt = require("bcrypt");

// Database Connection (using promise-based API)
const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "Hetalsql@1405",
    database: "project(1)",
  });

  exports.getAdminProfile = async (req, res) => {
    const adminId = req.session.user?.a_id;

    if (!adminId) return res.status(401).json({ message: "Unauthorized" });

    try {
        const [rows] = await db.query("SELECT a_username, a_email, a_photo FROM admin WHERE a_id = ?", [adminId]);
        if (rows.length === 0) return res.status(404).json({ message: "Admin not found" });
        res.json(rows[0]);
    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ message: "DB error", err });
    }
};

// Update name and email
exports.updateProfile = async (req, res) => {
    const adminId = req.session.user?.a_id;
    const { name, email } = req.body;

    if (!adminId) return res.status(401).json({ message: "Unauthorized" });
    if (!name || !email) return res.status(400).json({ message: "Name and email are required" });

    try {
        const [result] = await db.query(
            "UPDATE admin SET a_username = ?, a_email = ? WHERE a_id = ?",
            [name, email, adminId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Admin not found" });
        }
        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        console.error("DB error in updateProfile:", err);
        res.status(500).json({ message: "Database error", error: err.message });
    }
};

// Upload profile photo
exports.updateProfilePhoto = async (req, res) => {
    const adminId = req.session.user?.a_id;
    if (!adminId) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const photoPath = `/ad-images/${req.file.filename}`;
    try {
        const [result] = await db.query(
            "UPDATE admin SET a_photo = ? WHERE a_id = ?",
            [photoPath, adminId]
        );
        if (result.affectedRows === 0) {
            console.warn("No admin found for a_id:", adminId);
            return res.status(404).json({ message: "Admin not found" });
        }
        res.json({ message: "Profile photo updated", photo: photoPath });
    } catch (err) {
        console.error("DB error in updateProfilePhoto:", err);
        res.status(500).json({ message: "Database error", error: err.message });
    }
};

// Change password
exports.changePassword = async (req, res) => {
    const adminId = req.session.user?.a_id;
    const { currentPassword, newPassword } = req.body;
    
    if (!adminId) return res.status(401).json({ message: "Unauthorized" });
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
    }

    try {
        const [rows] = await db.query("SELECT a_password FROM admin WHERE a_id = ?", [adminId]);
        if (rows.length === 0) return res.status(404).json({ message: "Admin not found" });

        const passwordMatch = await bcrypt.compare(currentPassword, rows[0].a_password);
        if (!passwordMatch) return res.status(401).json({ message: "Incorrect current password" });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const [result] = await db.query(
            "UPDATE admin SET a_password = ? WHERE a_id = ?",
            [hashedPassword, adminId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Admin not found" });
        }
        res.json({ message: "Password updated successfully" });
    } catch (err) {
        console.error("DB error in changePassword:", err);
        res.status(500).json({ message: "Database error", error: err.message });
    }
};