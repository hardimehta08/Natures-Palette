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
  const subCategory = req.params.subcategory;
  const subSubCategory = req.params.subsubcategory;
  const checkSubCategoryQuery =
    "SELECT cy_id, sub_name FROM subcategory WHERE sub_name = ?";
  const checkSubSubCategoryQuery =
    "SELECT ss_name FROM subsubcategory WHERE ss_name = ?";

  // Check if the subcategory is valid
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

      let cy_id = subCategoryResults[0].cy_id; // Assuming cy_id is in the first result

      // Check if the sub-subcategory is valid
      conn.query(
        checkSubSubCategoryQuery,
        [subSubCategory],
        (err, subSubCategoryResults) => {
          if (err) {
            console.error("Error executing query: " + err.message);
            res.status(500).json({ error: "Error executing query" });
            return;
          }

          if (subSubCategoryResults.length === 0) {
            res.status(400).json({ error: "Invalid subSubCategory" });
            return;
          }

          // Query to get the category name based on cy_id
          const categoryQuery = "SELECT CY_NAME FROM CATEGORY WHERE CY_ID = ?";

          // Execute the category query to get the table name
          conn.query(categoryQuery, [cy_id], (err, categoryResults) => {
            if (err) {
              console.error("Error executing query: " + err.message);
              res.status(500).json({ error: "Error executing query" });
              return;
            }

            if (categoryResults.length === 0) {
              res
                .status(400)
                .json({ error: "No category found for the given cy_id" });
              return;
            }

            const tableName = categoryResults[0].CY_NAME;
            const liketerm = `%${subSubCategory}%`;

            // Construct the data query dynamically
            const dataQuery = `
          SELECT p.id, p.name, p.price, i.PATH1 AS image
          FROM ?? p
          LEFT JOIN image i ON p.id = i.PRODUCT_ID
          WHERE ?? LIKE ?`;

            const countQuery = `
          SELECT COUNT(*) AS count 
          FROM ?? p
          WHERE ?? LIKE ?`;

            const descQuery = `SELECT ss_desc AS description FROM subsubcategory WHERE ss_name = ?`;

            // Execute the data query
            conn.query(
              dataQuery,
              [tableName, subCategory, liketerm],
              (err, dataResults) => {
                if (err) {
                  console.error("Error executing query: " + err.message);
                  res.status(500).json({ error: "Error executing query" });
                  return;
                }
                // Convert image BLOB to base64 string
                dataResults = dataResults.map((result) => {
                  if (result.image) {
                    result.image = result.image.toString();
                  }
                  return result;
                });

                // Execute the count query
                conn.query(
                  countQuery,
                  [tableName, subCategory, liketerm],
                  (err, countResults) => {
                    if (err) {
                      console.error("Error executing query: " + err.message);
                      res.status(500).json({ error: "Error executing query" });
                      return;
                    }

                    // Execute the description query
                    conn.query(
                      descQuery,
                      [subSubCategory],
                      (err, descResults) => {
                        if (err) {
                          console.error(
                            "Error executing query: " + err.message
                          );
                          res
                            .status(500)
                            .json({ error: "Error executing query" });
                          return;
                        }

                        const response = {
                          count: countResults[0].count,
                          items: dataResults,
                          desc: descResults[0]
                            ? descResults[0].description
                            : "",
                        };
                        res.json(response);
                      }
                    );
                  }
                );
              }
            );
          });
        }
      );
    }
  );
};
module.exports = {
  getCategoryData,
  getSubCategoryData,
  getSubSubCategoryData,
};
