const mysql = require("mysql");

const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hardi@sql8705",
  database: "main_project",
});

const getCategoryData = (req, res) => {
  const category = req.params.category;
  const checkCategoryQuery = "SELECT cy_name FROM category WHERE cy_name = ?";

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

    const dataQuery = `
    SELECT p.id, p.name, p.price, i.PATH1 AS image,
    (SELECT COUNT(*) FROM ??) AS count
    FROM ?? p
    LEFT JOIN image i ON p.id = i.PRODUCT_ID`;

    conn.query(dataQuery, [category, category], (err, results) => {
      if (err) {
        console.error("Error executing query: " + err.message);
        res.status(500).json({ error: "Error executing query" });
        return;
      }

      results = results.map((result) => {
        if (result.image) {
          result.image = result.image.toString();
        }
        return result;
      });
      res.json(results);
    });
  });
};

const getSubCategoryData = (req, res) => {
  const category = req.params.category;
  const subCategory = req.params.subCategory;
  const checkCategoryQuery = "SELECT cy_name FROM category WHERE cy_name = ?";

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

    const checkSubCategoryQuery =
      "SELECT sub_name FROM subcategory WHERE sub_name = ?";
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

        const dataQuery = `
          SELECT p.id, p.name, p.price, i.PATH1 AS image,
    (SELECT COUNT(*) FROM ??) AS count
    FROM ?? p
    LEFT JOIN image i ON p.id = i.PRODUCT_ID ORDER BY ${subCategory}`;

        conn.query(dataQuery, [category, category], (err, results) => {
          if (err) {
            console.error("Error executing query: " + err.message);
            res.status(500).json({ error: "Error executing query" });
            return;
          }
          results = results.map((result) => {
            if (result.image) {
              result.image = result.image.toString();
            }
            return result;
          });
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
