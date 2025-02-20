const mysql = require("mysql");

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hardi@sql8705",
  database: "main_project",
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to database:", err);
    return;
  }
  console.log("Connected to database");
});

const fetchData = (category, subcategory, res) => {
  let query = "";
  if (subcategory) {
    query = `
      SELECT ss_id, ss_name, ss_image
      FROM SubSubcategory 
      WHERE sub_id = (SELECT sub_id FROM Subcategory WHERE sub_name = ? AND cy_id = (SELECT cy_id FROM CATEGORY WHERE CY_NAME = ?))
    `;
    db.query(query, [subcategory, category], (err, results) => {
      if (err) {
        console.error("Error executing query:", err);
        res.status(500).json({ error: "Error executing query" });
        return;
      }
      res.json({ items: results });
    });
  } else {
    query = `
      SELECT sub_id, sub_name, sub_image
      FROM Subcategory 
      WHERE cy_id = (SELECT cy_id FROM CATEGORY WHERE CY_NAME = ?)
    `;
    db.query(query, [category], (err, results) => {
      if (err) {
        console.error("Error executing query:", err);
        res.status(500).json({ error: "Error executing query" });
        return;
      }
      res.json({ items: results });
    });
  }
};
const getCategoryData = (req, res) => {
  const category = req.params.category;
  const subcategory = req.params.subcategory || null;
  fetchData(category, subcategory, res);
};

const getCategories = (req, res) => {
  db.query("SELECT * FROM CATEGORY", (err, results) => {
    if (err) {
      console.error("Error fetching categories:", err);
      res.status(500).send("Error fetching categories");
      return;
    }
    res.json(results);
  });
};

module.exports = {
  getCategoryData,
  getCategories,
};
