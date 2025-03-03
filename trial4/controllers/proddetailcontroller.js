const mysql = require("mysql");

const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hardi@sql8705",
  database: "main_project",
});

// Connect to the database
conn.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err.stack);
    return;
  }
  console.log("Connected to the database");
});

const getProductDetails = (req, res) => {
  const productName = req.params.name;

  // Step 1: Get views from INFORMATION_SCHEMA
  const viewsQuery = `
    SELECT table_name 
    FROM INFORMATION_SCHEMA.views 
    WHERE table_schema = 'main_project';
  `;

  conn.query(viewsQuery, (err, viewsResult) => {
    if (err) {
      console.error("Error executing views query:", err);
      res.status(500).json({ error: "Error executing views query" });
      return;
    }

    if (viewsResult.length === 0) {
      res.status(404).json({ error: "No views found in the schema" });
      return;
    }

    // Step 2: Loop through the views to find the product details
    const productDetails = [];
    let completed = 0;
    let found = false;

    for (const view of viewsResult) {
      const productQuery = `
        SELECT 
          pd.id AS productId,
          pd.name AS name,
          pd.price AS price,
          img.PATH1 AS image1,
          img.PATH2 AS image2,
          img.PATH3 AS image3,
          pd.description AS description
        FROM ${view.TABLE_NAME} AS pd
        JOIN IMAGE AS img ON pd.id = img.PRODUCT_ID
        WHERE pd.name = ?;
      `;

      conn.query(productQuery, [productName], (err, results) => {
        if (err) {
          console.error(`Error executing product query on view ${view.TABLE_NAME}:`, err);
          res.status(500).json({ error: `Error executing product query on view ${view.TABLE_NAME}` });
          return;
        }

        if (results.length > 0 && !found) {
          found = true; // Exit loop when product is found
          const product = results[0];

          const feedbackQuery = `
            SELECT  
              f.f_desc, 
              f.f_date,
              f.star_rating,
              cu.c_username AS username 
            FROM 
              feedback f 
            JOIN 
              customer cu 
            ON 
              f.c_id = cu.c_id 
            WHERE 
              f.product_id = ?
          `;

          conn.query(feedbackQuery, [product.productId], (err, feedbackResults) => {
            if (err) {
              console.error("Error executing feedback query:", err);
              res.status(500).json({ error: "Error executing feedback query" });
              return;
            }

            const responseData = {
              productId: product.productId,
              name: product.name,
              price: product.price,
              images: [
                product.image1 ? product.image1.toString() : null,
                product.image2 ? product.image2.toString() : null,
                product.image3 ? product.image3.toString() : null,
              ].filter(Boolean),
              description: product.description,
              feedback: feedbackResults,
            };

            res.json(responseData);
          });
        }

        completed++;
        if (completed === viewsResult.length && !found) {
          res.status(404).json({ error: "Product not found" });
        }
      });
    }
  });
};

module.exports = {
  getProductDetails,
};
