const mysql = require("mysql");

const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hetalsql@1405",
  database: "project(1)",
});

conn.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err.stack);
    return;
  }
  console.log("Connected to the database");
});

// Route to get best-selling and new arrivals products
const bs = (req, res) => {
  const bestSellingQuery = `
    SELECT Product_id, SUM(ODETAILS_QTY) AS TotalQuantity
    FROM order_details
    GROUP BY Product_id
    ORDER BY TotalQuantity DESC
    LIMIT 8
  `;

  conn.query(bestSellingQuery, (err, bestSellingResult) => {
    if (err) {
      console.error("Error fetching best-selling products: " + err.message);
      res.status(500).json({ error: "Error fetching best-selling products" });
      return;
    }

    if (bestSellingResult.length === 0) {
      console.log("No best-selling products found.");
      res.status(404).json({ error: "No best-selling products found." });
      return;
    }

    const productIds = bestSellingResult.map((item) => `'${item.Product_id}'`);

    const viewsQuery = `
      SELECT table_name
      FROM INFORMATION_SCHEMA.views
      WHERE table_schema = 'project(1)';
    `;

    conn.query(viewsQuery, (err, viewsResult) => {
      if (err) {
        console.error("Error fetching views: " + err.message);
        res.status(500).json({ error: "Error fetching views" });
        return;
      }

      if (viewsResult.length === 0) {
        console.log("No views found in the database.");
        res.status(404).json({ error: "No views found in the database" });
        return;
      }

      let productDetailsArray = [];
      let processedViews = 0;

      viewsResult.forEach((view) => {
        const checkProductDetailsQuery = `
          SELECT id AS Product_id, name AS Product_name, price AS Product_price
          FROM ${view.TABLE_NAME}
          WHERE id IN (${productIds.join(",")});
        `;

        conn.query(checkProductDetailsQuery, (err, result) => {
          if (err) {
            console.error(
              `Error querying view ${view.TABLE_NAME}: ` + err.message
            );
          } else if (result.length > 0) {
            productDetailsArray = productDetailsArray.concat(result);
          }

          processedViews++;

          // Check if all views have been processed
          if (processedViews === viewsResult.length) {
            if (productDetailsArray.length === 0) {
              console.log("No product details found in any views.");
              res
                .status(404)
                .json({ error: "Product details not found in any views." });
              return;
            }

            const imageQuery = `
              SELECT Product_id, PATH1
              FROM image
              WHERE Product_id IN (${productIds.join(",")});
            `;

            conn.query(imageQuery, (err, imageResults) => {
              if (err) {
                console.error("Error fetching images: " + err.message);
                res.status(500).json({ error: "Error fetching images" });
                return;
              }

              const productArray = productDetailsArray.map((product) => {
                const image = imageResults.find(
                  (img) => img.Product_id === product.Product_id
                );
                return {
                  id: product.Product_id,
                  P_NAME: product.Product_name,
                  P_PRICE: product.Product_price,
                  PATH1: image ? image.PATH1.toString() : null,
                };
              });
              res.json(productArray);
            });
          }
        });
      });
    });
  });
};

const fa = (req, res) => {
  const maxIdQuery = `
    SELECT PRODUCT_ID AS MaxProductId
    FROM image
    WHERE IMG_ID LIKE 'IT%'
    ORDER BY PRODUCT_ID DESC
    LIMIT 8;
  `;

  conn.query(maxIdQuery, (err, maxIdResult) => {
    if (err) {
      console.error("Error fetching max Product_id: " + err.message);
      res.status(500).json({ error: "Error fetching max Product_id" });
      return;
    }

    if (maxIdResult.length === 0) {
      console.log("No products found with Product_id starting with IMG000.");
      res.status(404).json({ error: "No fresh arrivals found." });
      return;
    }

    const productIds = maxIdResult.map((row) => row.MaxProductId);

    const viewsQuery = `
      SELECT table_name
      FROM INFORMATION_SCHEMA.views
      WHERE table_schema = 'project(1)';
    `;

    conn.query(viewsQuery, (err, viewsResult) => {
      if (err) {
        console.error("Error fetching views: " + err.message);
        res.status(500).json({ error: "Error fetching views" });
        return;
      }

      if (viewsResult.length === 0) {
        console.log("No views found in the database.");
        res.status(404).json({ error: "No views found in the database" });
        return;
      }

      let productDetailsArray = [];
      let processedViews = 0;

      viewsResult.forEach((view) => {
        productIds.forEach((productId) => {
          const checkProductDetailsQuery = `
            SELECT id AS Product_id, name AS Product_name, price AS Product_price
            FROM ${view.TABLE_NAME}
            WHERE id = '${productId}';
          `;

          conn.query(checkProductDetailsQuery, (err, result) => {
            if (err) {
              console.error(
                `Error querying view ${view.TABLE_NAME} with Product_id ${productId}: ` +
                  err.message
              );
            } else if (result.length > 0) {
              productDetailsArray = productDetailsArray.concat(result);
            }

            processedViews++;

            // Check if all views and all productIds have been processed
            if (processedViews === viewsResult.length * productIds.length) {
              if (productDetailsArray.length === 0) {
                console.log("No product details found in any views.");
                res
                  .status(404)
                  .json({ error: "No product details found in any views." });
                return;
              }

              const imageQuery = `
                SELECT PRODUCT_ID, PATH1
                FROM IMAGE
                WHERE PRODUCT_ID IN (${productIds
                  .map((id) => `'${id}'`)
                  .join(",")});
              `;

              conn.query(imageQuery, (err, imageResult) => {
                if (err) {
                  console.error("Error fetching images: " + err.message);
                  res.status(500).json({ error: "Error fetching images" });
                  return;
                }

                const productArray = productDetailsArray.map((product) => {
                  const image = imageResult.find(
                    (img) => img.PRODUCT_ID === product.Product_id
                  );
                  return {
                    Product_id: product.Product_id,
                    P_NAME: product.Product_name,
                    P_PRICE: product.Product_price,
                    PATH1: image ? image.PATH1.toString() : null,
                  };
                });

                res.json(productArray);
              });
            }
          });
        });
      });
    });
  });
};

module.exports = { bs, fa };
