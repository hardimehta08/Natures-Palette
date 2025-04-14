const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// Database Connection
const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hardi@sql8705",
  database: "project(1)",
});

con.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("✅ Connected to MySQL database");
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "public", "html")));
app.use(
  "/Database",
  express.static(path.join(__dirname, "../public/Database"))
);
// app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));

app.use(
  session({
    secret: "my_secure_secret_key_12345", // Use a strong, unique secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true with HTTPS
  })
);

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "login.html")); // Default to login
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "register.html"));
});

const authRoutes = require("./routes/authRoutes");
app.use("/auth", authRoutes);

const customerRoutes = require("./routes/customerRoutes");
app.use("/customers", customerRoutes);

const categoryRoutes = require("./routes/categoryRoutes");
app.use("/category", categoryRoutes);

const orderdetRoutes = require("./routes/orderdetRoutes");
app.use("/order", orderdetRoutes);

const productRoutes = require("./routes/productRoutes");
app.use("/product", productRoutes);

const adminRoutes = require("./routes/adminRoutes");
app.use("/admin", adminRoutes);

const reportRoutes = require("./routes/reportRoutes");
app.use("/report", reportRoutes);

const paymentRoutes = require("./routes/paymentRoutes");
app.use("/payment", paymentRoutes);

const feedbackRoutes = require("./routes/feedbackRoutes");
app.use("/feedback", feedbackRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});