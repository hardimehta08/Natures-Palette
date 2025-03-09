const mysql = require("mysql");

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hetalsql@1405",
  database: "main_project",
});

// Define the base URL for the client-side images
const CLIENT_IMAGE_BASE_URL = "http://localhost:4000/images/"; // Adjust this to your client server's URL

// Fetch all orders with optional status filter
exports.getAllOrders = (req, res) => {
  const status = req.query.status; // Get status from query parameter
  const searchName = req.query.searchName; // New search parameter for customer name
  let query = `
        SELECT 
            om.O_id,
            om.O_date,
            om.O_status,
            om.C_id,
            c.c_username AS customer_name
        FROM order_master om
        LEFT JOIN customer c ON om.C_id = c.c_id
    `;

  const queryParams = [];
  if (
    status &&
    ["PENDING","PLACED", "PROCESSING", "SHIPPING", "DELIVERED", "CANCELLED"].includes(status)
  ) {
    query += ` WHERE om.O_status = ?`;
    queryParams.push(status);
  }

  // Add search by customer name if provided
  if (searchName) {
    query += (query.includes("WHERE") ? " AND" : " WHERE") + ` c.c_username LIKE ?`;
    queryParams.push(`%${searchName}%`);
  }

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching orders:", err);
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.json(results);
    }
  });
};
exports.getOrderDetails = (req, res) => {
  const orderId = req.params.id;

  if (!orderId) {
    return res.status(400).json({ error: "Invalid order ID" });
  }

  const initialQuery = `
    SELECT 
        od.Odetails_id,
        od.Product_id,
        od.ODETAILS_Qty,
        od.ODETAILS_price,
        od.O_id
    FROM order_details od
    WHERE od.O_id = ?
  `;

  db.query(initialQuery, [orderId], (err, orderDetails) => {
    if (err) {
      console.error("Error fetching initial order details:", err.sqlMessage);
      return res
        .status(500)
        .json({ error: "Database error", details: err.sqlMessage });
    }

    if (orderDetails.length === 0) {
      return res.status(404).json({ error: "No details found for this order" });
    }

    const productIds = orderDetails.map((detail) => detail.Product_id);

    db.query("SELECT CY_ID, CY_NAME FROM category", (err, categories) => {
      if (err) {
        console.error("Error fetching categories:", err.sqlMessage);
        return res
          .status(500)
          .json({ error: "Database error", details: err.sqlMessage });
      }

      const categoryTableMap = new Map(
        categories.map((c) => [
          c.CY_ID,
          c.CY_NAME.toLowerCase().replace(/\s+/g, "_"),
        ])
      );

      const tableQueries = [];
      for (const [cyId, tableName] of categoryTableMap) {
        tableQueries.push(
          new Promise((resolve, reject) => {
            db.query(`SHOW TABLES LIKE ?`, [tableName], (err, result) => {
              if (err || result.length === 0) {
                console.log(
                  `Table ${tableName} does not exist:`,
                  err?.sqlMessage
                );
                resolve([]);
                return;
              }

              db.query(`SHOW COLUMNS FROM \`${tableName}\``, (err, columns) => {
                if (err) {
                  console.error(
                    `Error fetching schema for ${tableName}:`,
                    err.sqlMessage
                  );
                  resolve([]);
                  return;
                }

                const columnMap = {
                  id: null,
                  name: null,
                  desc: null,
                  category_id: null,
                };

                columns.forEach((col) => {
                  const field = col.Field.toLowerCase();
                  if (field.includes("id") && !field.includes("cy_id"))
                    columnMap.id = col.Field;
                  else if (field.includes("name")) columnMap.name = col.Field;
                  else if (field.includes("desc")) columnMap.desc = col.Field;
                  else if (field === "category_id")
                    columnMap.category_id = col.Field;
                });

                if (!columnMap.id || !columnMap.name) {
                  console.warn(
                    `Table ${tableName} missing required columns (id or name)`
                  );
                  resolve([]);
                  return;
                }

                const query = `
                 SELECT 
    od.Odetails_id,
    od.Product_id,
    od.ODETAILS_Qty,
    od.ODETAILS_price,
    t.name AS product_name,
    t.description,
    i.PATH1 AS image,
    c.CY_NAME AS category_name
FROM order_details od
LEFT JOIN ${tableName} t ON od.Product_id = t.id
LEFT JOIN image i ON t.id = i.PRODUCT_ID
LEFT JOIN category c ON t.category_id = c.CY_ID
WHERE od.O_id = ? AND od.Product_id IN (?)

                `;

                db.query(query, [orderId, productIds], (err, results) => {
                  if (err) {
                    console.error(
                      `Error querying ${tableName}:`,
                      err.sqlMessage
                    );
                    resolve([]);
                    return;
                  }
                  results.forEach((result) => {
                    if (result.image) result.image = result.image.toString();
                  });
                  console.log(`Results from ${tableName}:`, results);
                  resolve(
                    results.filter((result) => result.product_name !== null)
                  );
                });
              });
            });
          })
        );
      }

      Promise.all(tableQueries)
        .then((results) => {
          const combinedResults = results.flat();
          console.log(`Combined results for O_id ${orderId}:`, combinedResults);

          const finalResults = orderDetails.map((detail) => {
            const matchedDetail =
              combinedResults.find(
                (r) => r.Odetails_id === detail.Odetails_id
              ) || {};
            return {
              Odetails_id: detail.Odetails_id,
              Product_id: detail.Product_id,
              ODETAILS_Qty: detail.ODETAILS_Qty,
              ODETAILS_price: detail.ODETAILS_price,
              product_name: matchedDetail.product_name || "Unknown Product",
              description:
                matchedDetail.description || "No description available",
              image:
                matchedDetail.image || `${CLIENT_IMAGE_BASE_URL}default.jpg`,
              category_name: matchedDetail.category_name || "Uncategorized",
            };
          });
          console.log(`Final response for O_id ${orderId}:`, finalResults);
          res.json(finalResults);
        })
        .catch((err) => {
          console.error("Error processing order details:", err);
          res
            .status(500)
            .json({ error: "Database error", details: err.message });
        });
    });
  });
};

// Update order status
exports.updateOrderStatus = (req, res) => {
  const { orderId, status } = req.body;

  if (
    !orderId ||
    ![ "PROCESSING", "PLACED", "DELIVERED", "CANCELLED"].includes(
      status
    )
  ) {
    return res.status(400).json({ error: "Invalid order ID or status" });
  }

  const query = `
        UPDATE order_master 
        SET O_status = ? 
        WHERE O_id = ?
    `;

  db.query(query, [status, orderId], (err, result) => {
    if (err) {
      console.error("Error updating order status:", err);
      res
        .status(500)
        .json({ error: "Database error", details: err.sqlMessage });
    } else if (result.affectedRows === 0) {
      res.status(404).json({ error: "Order not found" });
    } else {
      res.json({ success: true, message: "Order status updated successfully" });
    }
  });
};
