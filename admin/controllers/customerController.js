const mysql = require("mysql");

// Database connection
const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hetalsql@1405",
  database: "main_project",
});

const getAllCustomers = (req, res) => {
  const searchName = req.query.searchName || ""; // Get searchName from query parameter
  let query = "SELECT * FROM customer";
  let queryParams = [];

  // Add WHERE clause if searchName is provided
  if (searchName) {
    query += " WHERE c_username LIKE ?";
    queryParams.push(`${searchName}%`); // Match names starting with searchName
  }

  conn.query(query, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching customers:", err);
      return res.status(500).send(err);
    }
    res.json(results);
  });
};

// Update Customer Status
const updateCustomerStatus = (req, res) => {
  const c_id = req.params.c_id;
  const { c_status } = req.body;

  const query = "UPDATE customer SET c_status = ? WHERE c_id = ?";
  conn.query(query, [c_status, c_id], (err, results) => {
    if (err) {
      console.error("Error updating status:", err);
      return res.status(500).json({ error: "Database update failed" });
    }
    res.json({ message: "Status updated successfully!" });
  });
};

module.exports = {
  getAllCustomers,
  updateCustomerStatus,
};
