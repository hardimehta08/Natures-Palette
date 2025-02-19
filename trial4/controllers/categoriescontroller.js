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

const getCategories = (req, res) => {
  db.query("SELECT CY_NAME, CY_IMAGE FROM CATEGORY", (err, results) => {
    if (err) {
      console.error("Error fetching categories:", err);
      res.status(500).send("Error fetching categories");
      return;
    }
    res.json(results);
  });
};

const getSubcategories = (req, res) => {
  const categoryId = req.params.categoryId;
  db.query(
    "SELECT sub_id, sub_name, sub_image, sub_desc FROM Subcategory WHERE cy_id = ?",
    [categoryId],
    (err, subcategoryResults) => {
      if (err) {
        console.error("Error fetching subcategories:", err);
        res.status(500).send("Error fetching subcategories");
        return;
      }

      const subcategoryIds = subcategoryResults.map(
        (subcategory) => subcategory.sub_id
      );
      db.query(
        "SELECT ss_id FROM SubSubcategory WHERE sub_id IN (?)",
        [subcategoryIds],
        (err, subSubcategoryResults) => {
          if (err) {
            console.error("Error checking sub-subcategories:", err);
            res.status(500).send("Error checking sub-subcategories");
            return;
          }

          const hasSubSubcategories = subSubcategoryResults.length > 0;
          const template = hasSubSubcategories ? "shop.html" : "shopsub.html";
          res.json({ template, data: subcategoryResults });
        }
      );
    }
  );
};

const getSubSubcategories = (req, res) => {
  const subcategoryId = req.params.subcategoryId;
  db.query(
    "SELECT ss_id, ss_name, ss_image, ss_desc FROM SubSubcategory WHERE sub_id = ?",
    [subcategoryId],
    (err, subSubcategoryResults) => {
      if (err) {
        console.error("Error fetching sub-subcategories:", err);
        res.status(500).send("Error fetching sub-subcategories");
        return;
      }

      const hasSubSubcategories = subSubcategoryResults.length > 0;
      const template = hasSubSubcategories ? "shopsub.html" : "shop.html";
      res.json({ template, data: subSubcategoryResults });
    }
  );
};

module.exports = {
  getCategories,
  getSubcategories,
  getSubSubcategories,
};
