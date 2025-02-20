const mysql = require("mysql");

const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hardi@sql8705",
  database: "main_project",
});

const getCategoryData = (category) => (req, res) => {
  // First, check if the category exists in the categories table
  const checkCategoryQuery = "SELECT cy_name FROM categories WHERE name = ?";

  conn.query(checkCategoryQuery, [category], (err, results) => {
    if (err) {
      console.error("Error executing query: " + err.message);
      res.status(500).json({ error: "Error executing query" });
      return;
    }

    if (results.length === 0) {
      res.status(400).json({ error: "Invalid category" });
      return;
    }
    const dataQuery = `SELECT id, name, price, (SELECT COUNT(*) FROM ${mysql.escapeId(
      category
    )}) AS count
  FROM ${mysql.escapeId(category)}`;

    conn.query(dataQuery, (err, results) => {
      if (err) {
        console.error("Error executing query: " + err.message);
        res.status(500).json({ error: "Error executing query" });
        return;
      }
      res.json(results);
    });
  });
};

const getSubCategoryData = (query, countQuery) => (req, res) => {
  const category = req.params.category;
  const subCategory = req.params.subCategory;
  const checkCategoryQuery = "SELECT cy_name FROM categories WHERE name = ?";

  // Check if the category is valid
  conn.query(checkCategoryQuery, [category], (err, categoryResults) => {
    if (err) {
      console.error("Error executing query: " + err.message);
      res.status(500).json({ error: "Error executing query" });
      return;
    }

    if (categoryResults.length === 0) {
      res.status(400).json({ error: "Invalid category" });
      return;
    }

    // Check if the subCategory is valid
    const checkSubCategoryQuery =
      "SELECT sub_name FROM subcategories WHERE sub_name = ?";
    conn.query(
      checkSubCategoryQuery,
      [subCategory],
      (err, subCategoryResults) => {
        if (err) {
          console.error("Error executing query: " + err.message);
          res.status(500).json({ error: "Error executing query" });
          return;
        }

        if (subCategoryResults.length === 0) {
          res.status(400).json({ error: "Invalid subCategory" });
          return;
        }

        // If both category and subCategory are valid, execute the data query
        const dataQuery = `
        SELECT id, name, price, 
        (SELECT COUNT(*) FROM ${mysql.escapeId(category)}) AS count
        FROM ${mysql.escapeId(category)}
        ORDER BY ${mysql.escapeId(subCategory)}
      `;

        conn.query(dataQuery, (err, results) => {
          if (err) {
            console.error("Error executing query: " + err.message);
            res.status(500).json({ error: "Error executing query" });
            return;
          }
          res.json(results);
        });
      }
    );
  });
};

module.exports = {
  getCategoryData,
  getSubCategoryData,
};
