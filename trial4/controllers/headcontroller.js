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
    SELECT p.id, p.name, p.price, i.PATH1 AS image
    FROM ?? p
    LEFT JOIN image i ON p.id = i.PRODUCT_ID`;

    const countQuery = `SELECT COUNT(*) AS count FROM ??`;
    const descQuery = `SELECT CY_DESC AS description FROM category WHERE cy_name = ?`;

    // Execute the data query
    conn.query(dataQuery, [category, category], (err, dataResults) => {
      if (err) {
        console.error("Error executing query: " + err.message);
        res.status(500).json({ error: "Error executing query" });
        return;
      }

      // Convert image BLOB to string
      dataResults = dataResults.map((result) => {
        if (result.image) {
          result.image = result.image.toString();
        }
        return result;
      });

      // Execute the count query
      conn.query(countQuery, [category], (err, countResults) => {
        if (err) {
          console.error("Error executing query: " + err.message);
          res.status(500).json({ error: "Error executing query" });
          return;
        }

        // Execute the description query
        conn.query(descQuery, [category], (err, descResults) => {
          if (err) {
            console.error("Error executing query: " + err.message);
            res.status(500).json({ error: "Error executing query" });
            return;
          }

          const response = {
            count: countResults[0].count,
            items: dataResults,
            desc: descResults[0] ? descResults[0].description : "",
          };

          res.json(response);
        });
      });
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
          SELECT p.id, p.name, p.price, i.PATH1 AS image
          FROM ?? p
          LEFT JOIN image i ON p.id = i.PRODUCT_ID
          ORDER BY ??`;

        const countQuery = `SELECT COUNT(*) AS count FROM ??`;
        const descQuery = `SELECT SUB_DESC AS description FROM subcategory WHERE sub_name = ?`;

        // Execute the data query
        conn.query(dataQuery, [category, subCategory], (err, dataResults) => {
          if (err) {
            console.error("Error executing query: " + err.message);
            res.status(500).json({ error: "Error executing query" });
            return;
          }

          // Convert image BLOB to string
          dataResults = dataResults.map((result) => {
            if (result.image) {
              result.image = result.image.toString();
            }
            return result;
          });

          // Execute the count query
          conn.query(countQuery, [category], (err, countResults) => {
            if (err) {
              console.error("Error executing query: " + err.message);
              res.status(500).json({ error: "Error executing query" });
              return;
            }

            // Execute the description query
            conn.query(descQuery, [subCategory], (err, descResults) => {
              if (err) {
                console.error("Error executing query: " + err.message);
                res.status(500).json({ error: "Error executing query" });
                return;
              }

              const response = {
                count: countResults[0].count,
                items: dataResults,
                desc: descResults[0] ? descResults[0].description : "",
              };

              res.json(response);
            });
          });
        });
      }
    );
  });
};

const getSubSubCategoryData = (req, res) => {
  console.log("Received request params:", req.params);
  const subCategory = req.params.subcategory;
  const subSubCategory = req.params.subsubcategory.replace(/_/g, " ");
  console.log("SubCategory:", subCategory);
  console.log("SubSubCategory:", subSubCategory);

  const checkSubCategoryQuery =
    "SELECT cy_id, sub_name FROM subcategory WHERE sub_name = ?";
  const checkSubSubCategoryQuery =
    "SELECT ss_name FROM subsubcategory WHERE ss_name = ?";

  // Always check for the subsubcategory first
  conn.query(
    checkSubSubCategoryQuery,
    [subSubCategory],
    (err, subSubCategoryResults) => {
      if (err) {
        console.error("Error executing subSubCategory query:", err.message);
        res.status(500).json({ error: "Error executing query" });
        return;
      }

      console.log("SubSubCategory results:", subSubCategoryResults);

      let categoryQuery = "SELECT CY_NAME FROM CATEGORY WHERE CY_ID = ?";
      let dataQuery, countQuery, descQuery, categoryId, tableName, liketerm;

      if (subSubCategoryResults.length > 0) {
        // Subsubcategory is valid, treat subSubCategory as subCategory
        console.log(
          "SubSubCategory is valid, proceeding with subSubCategory as subCategory"
        );

        conn.query(
          checkSubCategoryQuery,
          [subCategory],
          (err, subCategoryResults) => {
            if (err) {
              console.error("Error executing subCategory query:", err.message);
              res.status(500).json({ error: "Error executing query" });
              return;
            }

            console.log("SubCategory results:", subCategoryResults);

            if (subCategoryResults.length === 0) {
              console.log("Invalid subCategory");
              res.status(400).json({ error: "Invalid subCategory" });
              return;
            }

            categoryId = subCategoryResults[0].cy_id;
            liketerm = `%${subSubCategory}%`;

            dataQuery = `
          SELECT p.id, p.name, p.price, i.PATH1 AS image
          FROM ?? p
          LEFT JOIN image i ON p.id = i.PRODUCT_ID
          WHERE p.type LIKE ?`;

            countQuery = `
          SELECT COUNT(*) AS count 
          FROM ?? p
          WHERE p.type LIKE ?`;

            descQuery = `SELECT ss_desc AS description FROM subsubcategory WHERE ss_name = ?`;

            console.log("Executing category query for cy_id:", categoryId);
            conn.query(categoryQuery, [categoryId], (err, categoryResults) => {
              if (err) {
                console.error("Error executing category query:", err.message);
                res.status(500).json({ error: "Error executing query" });
                return;
              }

              console.log("Category results:", categoryResults);

              if (categoryResults.length === 0) {
                console.log("No category found for the given cy_id");
                res
                  .status(400)
                  .json({ error: "No category found for the given cy_id" });
                return;
              }

              tableName = categoryResults[0].CY_NAME;
              console.log("Table name for category:", tableName);

              executeQueries(
                dataQuery,
                countQuery,
                descQuery,
                tableName,
                liketerm,
                subSubCategory,
                res
              );
            });
          }
        );
      } else {
        // Subsubcategory not valid or empty, use subCategory to fetch category and then treat it as subSubCategory
        console.log(
          "SubSubCategory is not valid or empty, proceeding with subCategory as main category and then as subSubCategory"
        );

        conn.query(
          checkSubCategoryQuery,
          [subSubCategory],
          (err, subCategoryResults) => {
            if (err) {
              console.error("Error executing subCategory query:", err.message);
              res.status(500).json({ error: "Error executing query" });
              return;
            }

            if (subCategoryResults.length === 0) {
              res.status(400).json({ error: "Invalid subCategory" });
              return;
            }
            const typeLiketerm = `%${subCategoryResults[0].sub_name}%`;

            dataQuery = `
            SELECT p.id, p.name, p.price, i.PATH1 AS image
            FROM ?? p
            LEFT JOIN image i ON p.id = i.PRODUCT_ID
            WHERE p.type LIKE ?`;

            countQuery = `
            SELECT COUNT(*) AS count 
            FROM ?? p
            WHERE p.type LIKE ?`;

            descQuery = `SELECT sub_desc AS description FROM subcategory WHERE sub_name = ?`;
            let categoryId = subCategoryResults[0].cy_id;
            conn.query(categoryQuery, [categoryId], (err, categoryResults) => {
              if (err) {
                console.error("Error executing category query:", err.message);
                res.status(500).json({ error: "Error executing query" });
                return;
              }
              console.log(categoryResults);
              if (categoryResults.length === 0) {
                res
                  .status(400)
                  .json({ error: "No category found for the given cy_id" });
                return;
              }

              tableName = categoryResults[0].CY_NAME;

              executeQueries(
                dataQuery,
                countQuery,
                descQuery,
                tableName,
                typeLiketerm,
                subCategory,
                res
              );
            });
          }
        );
      }
    }
  );
};

const executeQueries = (
  dataQuery,
  countQuery,
  descQuery,
  tableName,
  liketerm,
  descParam,
  res
) => {
  console.log(liketerm);
  conn.query(dataQuery, [tableName, liketerm], (err, dataResults) => {
    if (err) {
      console.error("Error executing data query:", err.message);
      res.status(500).json({ error: "Error executing query" });
      return;
    }

    dataResults = dataResults.map((result) => {
      if (result.image) {
        result.image = result.image.toString();
      }
      return result;
    });

    conn.query(countQuery, [tableName, liketerm], (err, countResults) => {
      if (err) {
        console.error("Error executing count query:", err.message);
        res.status(500).json({ error: "Error executing query" });
        return;
      }
      conn.query(descQuery, [descParam], (err, descResults) => {
        if (err) {
          console.error("Error executing description query:", err.message);
          res.status(500).json({ error: "Error executing query" });
          return;
        }

        const response = {
          count: countResults[0].count,
          items: dataResults,
          desc: descResults[0] ? descResults[0].description : "",
        };
        res.json(response);
      });
    });
  });
};

const getCategories = (req, res) => {
  const categoriesQuery = `
    SELECT c.CY_ID, c.CY_NAME, s.sub_id, s.sub_name 
    FROM category c
    LEFT JOIN subcategory s ON c.CY_ID = s.cy_id
  `;

  conn.query(categoriesQuery, (err, results) => {
    if (err) {
      console.error("Error executing query: " + err.message);
      res.status(500).json({ error: "Error executing query" });
      return;
    }

    const categories = {};

    results.forEach((row) => {
      if (!categories[row.CY_NAME]) {
        categories[row.CY_NAME] = {
          title: row.CY_NAME,
          links: [],
        };
      }

      if (row.sub_name) {
        // Assuming the format of links you provided
        categories[row.CY_NAME].links.push({
          name: row.sub_name,
          url: `/${row.CY_NAME.toLowerCase().replace(/ /g, "_")}/${row.sub_name
            .toLowerCase()
            .replace(/ /g, "_")}`,
        });
      }
    });

    const formattedCategories = Object.values(categories);
    res.json(formattedCategories);
  });
};
module.exports = {
  getCategoryData,
  getSubCategoryData,
  getSubSubCategoryData,
  getCategories,
};
