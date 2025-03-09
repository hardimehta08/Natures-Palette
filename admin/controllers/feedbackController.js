const mysql = require("mysql2");

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hetalsql@1405",
  database: "main_project",
});

// Fetch feedback report with customer name filter
exports.getFeedback = (req, res) => {
  const { startDate, endDate, rating, customerName } = req.query;

  let query = `
        SELECT 
            f.F_id AS feedback_id,
            c.C_username AS customer_name,
            f.F_desc AS feedback_desc,
            DATE_FORMAT(f.F_date, '%Y-%m-%d') AS feedback_date,
            f.product_id,
            f.star_rating AS rating
        FROM Feedback f
        JOIN customer c ON f.C_id = c.C_id
    `;
  const queryParams = [];

  // Apply filters
  let whereClauses = [];
  if (startDate) {
    whereClauses.push("f.F_date >= ?");
    queryParams.push(startDate);
  }
  if (endDate) {
    whereClauses.push("f.F_date <= ?");
    queryParams.push(endDate);
  }
  if (rating) {
    whereClauses.push("f.star_rating = ?");
    queryParams.push(rating);
  }
  if (customerName) {
    whereClauses.push("c.C_username LIKE ?");
    queryParams.push(`${customerName}%`); // Match customer names starting with the search term
  }
  if (whereClauses.length > 0) {
    query += ` WHERE ${whereClauses.join(" AND ")}`;
  }

  // Sort by date descending (most recent first)
  query += ` ORDER BY f.F_date DESC`;

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching feedback report:", err);
      return res
        .status(500)
        .json({ error: "Database error", details: err.message });
    }
    console.log("Feedback Report Results:", results);
    res.json(results);
  });
};

