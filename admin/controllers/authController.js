const mysql = require("mysql2/promise"); // Use promise-based MySQL
const bcrypt = require("bcryptjs");
const { sendMail } = require("./mailer");

// Database Connection (using promise-based API)
const con = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Hetalsql@1405",
  database: "main_project",
});

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: Please log in" });
  }
  next();
};

// Register User
exports.registerUser = async (req, res) => {
  const { username, email, password } = req.body; // Removed cpassword since frontend validates it

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  try {
    const connection = await con.getConnection();
    
    // Check if email already exists
    const [existingUsers] = await connection.query(
      "SELECT * FROM admin WHERE a_email = ?",
      [email]
    );
    
    if (existingUsers.length > 0) {
      connection.release();
      return res.status(400).json({ success: false, message: "Email already registered. Please login." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    await connection.query(
      "INSERT INTO admin (a_username, a_email, a_password) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );

    connection.release();
    req.session.registered = true; // Optional: only if you use this elsewhere
    
    res.json({
      success: true,
      message: "User registered successfully",
      redirect: "/html/login.html" // Match frontend path
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Login User
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  try {
    const connection = await con.getConnection();
    const [users] = await connection.query(
      "SELECT * FROM admin WHERE a_email = ?",
      [email]
    );

    if (users.length === 0) {
      connection.release();
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.a_password);

    if (!passwordMatch) {
      connection.release();
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    req.session.user = {
      id: user.a_id,
      username: user.a_username,
      email: user.a_email,
    };

    connection.release();
    res.json({
      success: true,
      message: "Login successful",
      redirect: "/html/index.html" // Match frontend path
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  try {
    const connection = await con.getConnection();
    const [users] = await connection.query(
      "SELECT a_id, a_email FROM admin WHERE a_email = ?",
      [email]
    );

    if (users.length === 0) {
      connection.release();
      return res.status(400).json({ success: false, message: "Email not found" });
    }

    const resetToken = Math.random().toString(36).slice(2);
    req.session.resetToken = { email, token: resetToken, expires: Date.now() + 3600000 }; // 1-hour expiry

    const resetLink = `http://localhost:3000/html/reset.html?token=${resetToken}&email=${email}`;
    console.log("Generated reset link:", resetLink);

    const subject = "Password Reset Request";
    const text = `Hello,\n\nPlease click the following link to reset your password: <a href="${resetLink}">${resetLink}</a>\n\nThis link will expire in 1 hour.\n\nBest regards,\nNature's Palette Team`;

    await sendMail(email, subject, text, 3);
    connection.release();
    res.json({ success: true, message: "Password reset email sent. Check your inbox." });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).json({ success: false, message: "Failed to send reset email" });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { email, token, newPassword, confirmPassword } = req.body;

  if (!email || !token || !newPassword || !confirmPassword) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: "Passwords do not match" });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
  }

  const resetData = req.session.resetToken;
  if (!resetData || resetData.token !== token || resetData.email !== email || resetData.expires < Date.now()) {
    return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
  }

  try {
    const connection = await con.getConnection();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const [result] = await connection.query(
      "UPDATE admin SET a_password = ? WHERE a_email = ?",
      [hashedPassword, email]
    );

    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: "Email not found" });
    }

    delete req.session.resetToken;
    connection.release();
    res.json({
      success: true,
      message: "Password reset successful! Please log in with your new password.",
      redirect: "/html/login.html"
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Logout User
exports.logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error logging out:", err);
      return res.status(500).json({ success: false, message: "Failed to logout" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true, message: "Logged out successfully", redirect: "/html/login.html" });
  });
};

// Check Session
exports.checkSession = (req, res) => {
  if (req.session.user) {
    res.json({ success: true, loggedIn: true, user: req.session.user });
  } else {
    res.json({ success: true, loggedIn: false });
  }
};

// Get Admin Profile
exports.getAdminProfile = [ensureAuthenticated, async (req, res) => {
  try {
    const connection = await con.getConnection();
    const [results] = await connection.query(
      "SELECT a_id, a_username, a_email, a_photo FROM admin WHERE a_id = ?",
      [req.session.user.id]
    );

    if (results.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const admin = results[0];
    connection.release();
    res.json({
      success: true,
      admin: {
        name: admin.a_username,
        email: admin.a_email,
        role: "Admin",
        photo: admin.a_photo || "/ad-images/profile/default.jpg",
      },
    });
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}];

// Update Profile Photo
exports.updateProfilePhoto = [ensureAuthenticated, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  const photoPath = `/ad-images/${req.file.filename}`;

  con.query(
    "UPDATE admin SET a_photo = ? WHERE a_id = ?",
    [photoPath, req.session.user.id],
    (err, result) => {
      if (err) {
        console.error("Error updating profile photo:", err);
        return res.status(500).json({ success: false, message: "Database error" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Admin not found" });
      }

      res.json({ success: true, photoUrl: photoPath });
    }
  );
}];

// Update Profile
exports.updateProfile = [ensureAuthenticated, async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ success: false, message: "Name and email are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }

  try {
    const connection = await con.getConnection();
    const [existing] = await connection.query(
      "SELECT * FROM admin WHERE a_email = ? AND a_id != ?",
      [email, req.session.user.id]
    );

    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ success: false, message: "Email already in use by another admin" });
    }

    const [result] = await connection.query(
      "UPDATE admin SET a_username = ?, a_email = ? WHERE a_id = ?",
      [name, email, req.session.user.id]
    );

    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    req.session.user.username = name;
    req.session.user.email = email;
    connection.release();
    res.json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}];

// Change Password
exports.changePassword = [ensureAuthenticated, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: "New password must be at least 8 characters long" });
  }

  try {
    const connection = await con.getConnection();
    const [users] = await connection.query(
      "SELECT a_password FROM admin WHERE a_id = ?",
      [req.session.user.id]
    );

    if (users.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, users[0].a_password);
    if (!passwordMatch) {
      connection.release();
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const [result] = await connection.query(
      "UPDATE admin SET a_password = ? WHERE a_id = ?",
      [hashedNewPassword, req.session.user.id]
    );

    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    connection.release();
    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}];