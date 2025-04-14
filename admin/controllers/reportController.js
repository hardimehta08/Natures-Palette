const mysql = require("mysql");
const { Parser } = require("json2csv");
const path = require("path");
const PDFDocument = require("pdfkit");

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hetalsql@1405",
  database: "project(1)",
});

// Dashboard Data
exports.getDashboardData = (req, res) => {
  const today = new Date();
  const startOfDay = today.toISOString().split("T")[0];
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
    .toISOString()
    .split("T")[0];
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const dailySalesQuery = `
        SELECT SUM(od.Odetails_price * od.Odetails_Qty) as totalSales
        FROM order_details od
        JOIN order_master om ON od.O_id = om.O_id
        WHERE om.O_status = 'Delivered' AND om.O_date >= ?
    `;
  const weeklySalesQuery = `
        SELECT SUM(od.Odetails_price * od.Odetails_Qty) as totalSales
        FROM order_details od
        JOIN order_master om ON od.O_id = om.O_id
        WHERE om.O_status = 'Delivered' AND om.O_date >= ?
    `;
  const monthlySalesQuery = `
        SELECT SUM(od.Odetails_price * od.Odetails_Qty) as totalSales
        FROM order_details od
        JOIN order_master om ON od.O_id = om.O_id
        WHERE om.O_status = 'Delivered' AND om.O_date >= ?
    `;
  const totalOrdersQuery = `
        SELECT COUNT(*) as totalOrders
        FROM order_master
    `;
  const totalActiveCustomersQuery = `
        SELECT COUNT(*) as totalActiveCustomers
        FROM customer
        WHERE c_status = 'active'
    `;
  const salesTrendQuery = `
        SELECT 
            DATE(om.O_date) as date,
            SUM(od.Odetails_price * od.Odetails_Qty) as totalSales
        FROM order_details od
        JOIN order_master om ON od.O_id = om.O_id
        WHERE om.O_status = 'Delivered' AND om.O_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(om.O_date)
        ORDER BY DATE(om.O_date)
    `;
  const orderStatusQuery = `
        SELECT 
            O_status as status,
            COUNT(*) as count
        FROM order_master
        GROUP BY O_status
    `;
  const recentActivityQuery = `
        SELECT 
            'New Order' as activityType,
            O_id as identifier,
            O_date as activityDate
        FROM order_master
        WHERE O_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
        UNION
        SELECT 
            'New Customer' as activityType,
            C_id as identifier,
            c_reg_date as activityDate
        FROM customer
        WHERE c_reg_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
        ORDER BY activityDate DESC
        LIMIT 5
    `;

  // Fetch all categories first
  db.query("SELECT CY_ID, CY_NAME FROM category", (err, categories) => {
    if (err) {
      console.error("Error fetching categories:", err);
      return res
        .status(500)
        .json({ error: "Database error", details: err.sqlMessage });
    }

    // Map category names to table names
    const categoryTableMap = new Map(
      categories.map((c) => [
        c.CY_NAME.trim().toLowerCase(),
        c.CY_NAME.trim().toLowerCase().replace(/\s+/g, "_"),
      ])
    );

    // Dynamic Total Inventory
    const inventoryPromises = [];
    for (const [categoryName, tableName] of categoryTableMap) {
      inventoryPromises.push(
        new Promise((resolve, reject) => {
          db.query(`SHOW TABLES LIKE ?`, [tableName], (err, result) => {
            if (err) {
              console.error(`Error checking table ${tableName}:`, err);
              reject(err);
              return;
            }
            if (result.length === 0) {
              console.log(`Table ${tableName} does not exist.`);
              resolve({ tableName, totalStock: 0 });
              return;
            }

            db.query(
              `SHOW COLUMNS FROM \`${tableName}\` LIKE '%stock%'`,
              (err, columns) => {
                if (err) {
                  console.error(
                    `Error fetching columns for table ${tableName}:`,
                    err
                  );
                  reject(err);
                  return;
                }
                if (columns.length === 0) {
                  console.warn(`Table ${tableName} has no stock column.`);
                  resolve({ tableName, totalStock: 0 });
                  return;
                }

                const stockColumn = columns[0].Field;
                const query = `
                                SELECT SUM(\`${stockColumn}\`) as totalStock
                                FROM \`${tableName}\`
                            `;
                db.query(query, (err, result) => {
                  if (err) {
                    console.error(
                      `Error calculating total stock for table ${tableName}:`,
                      err
                    );
                    reject(err);
                    return;
                  }
                  resolve({
                    tableName,
                    totalStock: result[0]?.totalStock || 0,
                  });
                });
              }
            );
          });
        })
      );
    }

    // Dynamic Best Sellers with Category Name
    const bestSellersPromises = [];
    for (const [categoryName, tableName] of categoryTableMap) {
      bestSellersPromises.push(
        new Promise((resolve, reject) => {
          db.query(`SHOW TABLES LIKE ?`, [tableName], (err, result) => {
            if (err) {
              console.error(`Error checking table ${tableName}:`, err);
              reject(err);
              return;
            }
            if (result.length === 0) {
              console.log(`Table ${tableName} does not exist.`);
              resolve([]);
              return;
            }

            // Fetch column names to ensure 'id' and 'name' exist
            db.query(`SHOW COLUMNS FROM \`${tableName}\``, (err, columns) => {
              if (err) {
                console.error(
                  `Error fetching columns for table ${tableName}:`,
                  err
                );
                reject(err);
                return;
              }

              const idColumn = columns.find(
                (col) =>
                  col.Field.toLowerCase().includes("id") &&
                  !col.Field.toLowerCase().includes("category_id")
              )?.Field;
              const nameColumn = columns.find((col) =>
                col.Field.toLowerCase().includes("name")
              )?.Field;

              if (!idColumn || !nameColumn) {
                console.warn(
                  `Table ${tableName} does not have required columns (id or name). Skipping...`
                );
                resolve([]);
                return;
              }

              const query = `
                    SELECT 
                        od.Product_id,
                        \`${tableName}\`.\`${nameColumn}\` as productName,
                        '${categoryName}' as category,
                        SUM(od.Odetails_Qty) as totalSold,
                        SUM(od.Odetails_price * od.Odetails_Qty) as totalRevenue
                    FROM order_details od
                    JOIN order_master om ON od.O_id = om.O_id
                    LEFT JOIN \`${tableName}\` ON od.Product_id = \`${tableName}\`.\`${idColumn}\`
                    WHERE om.O_status = 'Delivered'
                    GROUP BY od.Product_id, \`${tableName}\`.\`${nameColumn}\`
                `;
              db.query(query, (err, result) => {
                if (err) {
                  console.error(
                    `Error fetching best sellers for table ${tableName}:`,
                    err
                  );
                  reject(err);
                  return;
                }
                console.log(`Best sellers for ${tableName}:`, result);
                resolve(result);
              });
            });
          });
        })
      );
    }

    // Wait for inventory and best-sellers queries to complete
    Promise.all([
      Promise.all(inventoryPromises),
      Promise.all(bestSellersPromises),
    ])
      .then(([inventoryResults, bestSellersResults]) => {
        const totalInventory = inventoryResults.reduce(
          (sum, item) => sum + (item.totalStock || 0),
          0
        );
        const productsWithName = bestSellersResults
          .flat()
          .filter((item) => item.productName !== null)
          .filter((item) => item.totalSold > 0)
          .sort((a, b) => b.totalSold - a.totalSold)
          .slice(0, 5);

        // Proceed with the rest of the queries
        Promise.all([
          new Promise((resolve, reject) =>
            db.query(dailySalesQuery, [startOfDay], (err, result) => {
              if (err) {
                console.error("Error fetching daily sales:", err);
                reject(err);
              } else {
                console.log("Daily sales:", result);
                resolve(result);
              }
            })
          ),
          new Promise((resolve, reject) =>
            db.query(weeklySalesQuery, [startOfWeek], (err, result) => {
              if (err) {
                console.error("Error fetching weekly sales:", err);
                reject(err);
              } else {
                console.log("Weekly sales:", result);
                resolve(result);
              }
            })
          ),
          new Promise((resolve, reject) =>
            db.query(monthlySalesQuery, [startOfMonth], (err, result) => {
              if (err) {
                console.error("Error fetching monthly sales:", err);
                reject(err);
              } else {
                console.log("Monthly sales:", result);
                resolve(result);
              }
            })
          ),
          new Promise((resolve, reject) =>
            db.query(totalOrdersQuery, (err, result) => {
              if (err) {
                console.error("Error fetching total orders:", err);
                reject(err);
              } else {
                console.log("Total orders:", result);
                resolve(result);
              }
            })
          ),
          new Promise((resolve, reject) =>
            db.query(totalActiveCustomersQuery, (err, result) => {
              if (err) {
                console.error("Error fetching total active customers:", err);
                reject(err);
              } else {
                resolve(result);
              }
            })
          ),
          new Promise((resolve, reject) =>
            db.query(salesTrendQuery, (err, result) => {
              if (err) {
                console.error("Error fetching sales trend:", err);
                reject(err);
              } else {
                resolve(result);
              }
            })
          ),
          new Promise((resolve, reject) =>
            db.query(orderStatusQuery, (err, result) => {
              if (err) {
                console.error("Error fetching order status:", err);
                reject(err);
              } else {
                resolve(result);
              }
            })
          ),
          new Promise((resolve, reject) =>
            db.query(recentActivityQuery, (err, result) => {
              if (err) {
                console.error("Error fetching recent activity:", err);
                reject(err);
              } else {
                resolve(result);
              }
            })
          ),
        ])
          .then(
            ([
              dailySales,
              weeklySales,
              monthlySales,
              totalOrders,
              totalActiveCustomers,
              salesTrend,
              orderStatus,
              recentActivity,
            ]) => {
              res.json({
                keyMetrics: {
                  dailySales: dailySales[0]?.totalSales || 0,
                  weeklySales: weeklySales[0]?.totalSales || 0,
                  monthlySales: monthlySales[0]?.totalSales || 0,
                  totalOrders: totalOrders[0]?.totalOrders || 0,
                  totalActiveCustomers:
                    totalActiveCustomers[0]?.totalActiveCustomers || 0,
                  totalInventory: totalInventory,
                },
                charts: {
                  salesTrend: salesTrend || [],
                  bestSellers: productsWithName || [],
                  orderStatus: orderStatus || [],
                },
                recentActivity: recentActivity || [],
              });
            }
          )
          .catch((err) => {
            console.error("Error fetching dashboard data:", err);
            res
              .status(500)
              .json({ error: "Database error", details: err.message });
          });
      })
      .catch((err) => {
        console.error(
          "Error calculating total inventory or best sellers:",
          err
        );
        res.status(500).json({ error: "Database error", details: err.message });
      });
  });
};

exports.getInventoryCategories = (req, res) => {
  const query = `SELECT CY_NAME FROM category`;
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching inventory categories:", err);
      return res
        .status(500)
        .json({ error: "Database error", details: err.message });
    }
    const categories = results.map((row) => row.CY_NAME);
    res.json(categories);
  });
};

exports.getInventoryStatus = (req, res) => {
  const lowStockThreshold = 5;
  const { category } = req.query;

  db.query("SELECT CY_ID, CY_NAME FROM category", (err, categories) => {
    if (err) {
      console.error("Error fetching categories:", err);
      return res
        .status(500)
        .json({ error: "Database error", details: err.sqlMessage });
    }

    const categoryTableMap = new Map(
      categories.map((c) => [
        c.CY_NAME,
        c.CY_NAME.toLowerCase().replace(/\s+/g, "_"),
      ])
    );

    const queryPromises = [];
    for (const [categoryName, tableName] of categoryTableMap) {
      if (category && category !== categoryName) continue;

      queryPromises.push(
        new Promise((resolve, reject) => {
          db.query(`SHOW TABLES LIKE ?`, [tableName], (err, result) => {
            if (err) {
              console.error(`Error checking table ${tableName}:`, err);
              reject(err);
              return;
            }
            if (result.length === 0) {
              console.log(`Table ${tableName} does not exist.`);
              resolve({ lowStock: [], outOfStock: [] });
              return;
            }

            db.query(`SHOW COLUMNS FROM \`${tableName}\``, (err, columns) => {
              if (err) {
                console.error(`Error fetching schema for ${tableName}:`, err);
                reject(err);
                return;
              }

              const columnMap = {
                id: null,
                name: null,
                stock: null,
              };

              columns.forEach((col) => {
                const field = col.Field.toLowerCase();
                if (field.includes("id") && !field.includes("cy_id"))
                  columnMap.id = col.Field;
                else if (field.includes("name")) columnMap.name = col.Field;
                else if (field.includes("stock")) columnMap.stock = col.Field;
              });

              if (!columnMap.id || !columnMap.name || !columnMap.stock) {
                console.warn(
                  `Table ${tableName} missing required columns (id, name, or stock)`
                );
                resolve({ lowStock: [], outOfStock: [] });
                return;
              }

              const lowStockQuery = `
                                SELECT 
                                    \`${tableName}\`.${columnMap.id} as productId, 
                                    \`${tableName}\`.${columnMap.name} as productName, 
                                    \`${tableName}\`.${columnMap.stock} as stock,
                                    '${categoryName}' as category
                                FROM \`${tableName}\` 
                                WHERE \`${tableName}\`.${columnMap.stock} <= ? AND \`${tableName}\`.${columnMap.stock} > 0
                            `;
              const outOfStockQuery = `
                                SELECT 
                                    \`${tableName}\`.${columnMap.id} as productId, 
                                    \`${tableName}\`.${columnMap.name} as productName, 
                                    \`${tableName}\`.${columnMap.stock} as stock,
                                    '${categoryName}' as category
                                FROM \`${tableName}\` 
                                WHERE \`${tableName}\`.${columnMap.stock} = 0
                            `;

              Promise.all([
                new Promise((resolve, reject) =>
                  db.query(lowStockQuery, [lowStockThreshold], (err, result) =>
                    err ? reject(err) : resolve(result)
                  )
                ),
                new Promise((resolve, reject) =>
                  db.query(outOfStockQuery, [], (err, result) =>
                    err ? reject(err) : resolve(result)
                  )
                ),
              ])
                .then(([lowStock, outOfStock]) => {
                  resolve({ lowStock, outOfStock });
                })
                .catch((err) => reject(err));
            });
          });
        })
      );
    }

    Promise.all(queryPromises)
      .then((results) => {
        const lowStock = results
          .flatMap((result) => result.lowStock)
          .sort((a, b) => a.stock - b.stock);
        const outOfStock = results.flatMap((result) => result.outOfStock);
        const criticalStock = lowStock.filter((item) => item.stock <= 2);

        res.json({
          lowStock,
          outOfStock,
          criticalStock,
        });
      })
      .catch((err) => {
        console.error("Error fetching inventory status:", err);
        res.status(500).json({
          error: "Database error",
          details: err.sqlMessage || err.message,
        });
      });
  });
};

// Fetch All Categories for Inventory Filter
exports.getInventoryCategories = (req, res) => {
  const query = `SELECT CY_NAME FROM category`;
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching inventory categories:", err);
      return res.status(500).json({ error: "Database error" });
    }
    const categories = results.map((row) => row.CY_NAME);
    res.json(categories);
  });
};

// Sales Report Data

exports.getSalesReport = (req, res) => {
  const { startDate, endDate } = req.query;

  // Default date range: January 2024 to yesterday
  const defaultStartDate = "2024-01-01"; // Updated to January 2024
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const defaultEndDate = yesterday.toISOString().split("T")[0]; // e.g., "2025-03-26"

  const effectiveStartDate = startDate || defaultStartDate;
  const effectiveEndDate = endDate || defaultEndDate;

  // Validate date formats
  const start = new Date(effectiveStartDate);
  const end = new Date(effectiveEndDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res
      .status(400)
      .json({ error: "Invalid date format. Use YYYY-MM-DD." });
  }

  // Ensure startDate is not after endDate
  if (start > end) {
    return res
      .status(400)
      .json({ error: "startDate cannot be after endDate." });
  }

  // Calculate the number of days between startDate and endDate
  const timeDiff = Math.abs(end - start);
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // Convert milliseconds to days

  // Determine the grouping based on the date range
  let groupByFormat, dateFormat;
  if (daysDiff === 0 || daysDiff === 1) {
    groupByFormat = "hourly";
    dateFormat = "%Y-%m-%d %H:00"; // e.g., "2025-03-26 14:00"
  } else if (daysDiff <= 7) {
    groupByFormat = "daily";
    dateFormat = "%Y-%m-%d"; // e.g., "2025-03-26"
  } else if (daysDiff <= 90) {
    groupByFormat = "weekly";
    dateFormat = "%Y-%u"; // e.g., "2025-12" (year-week)
  } else {
    groupByFormat = "monthly";
    dateFormat = "%Y-%m"; // e.g., "2025-03"
  }

  db.query("SELECT CY_ID, CY_NAME FROM category", (err, categories) => {
    if (err) {
      console.error("Error fetching categories:", err);
      return res
        .status(500)
        .json({ error: "Database error", details: err.sqlMessage });
    }

    // Map CY_NAME to table name (lowercase, replace spaces with underscores)
    const tablePromises = categories.map((category) => {
      const tableName = category.CY_NAME.trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
      return new Promise((resolve) => {
        // Check if the table exists
        db.query(`SHOW TABLES LIKE ?`, [tableName], (err, result) => {
          if (err || result.length === 0) {
            console.warn(
              `Table ${tableName} does not exist for category ${category.CY_NAME}`
            );
            resolve(null); // Skip this table
          } else {
            resolve({
              tableName,
              categoryId: category.CY_ID,
              categoryName: category.CY_NAME,
            });
          }
        });
      });
    });

    Promise.all(tablePromises)
      .then((tableResults) => {
        // Filter out null results (tables that don't exist)
        const validTables = tableResults.filter((table) => table !== null);

        if (validTables.length === 0) {
          return res
            .status(500)
            .json({ error: "No valid category tables found" });
        }

        // Build the UNION query for the product tables
        const unionQuery = validTables
          .map(
            (table) =>
              `SELECT id, name, category_id FROM \`${table.tableName}\``
          )
          .join(" UNION ");

        // Base queries
        let salesQuery = `
        SELECT 
          SUM(od.Odetails_price * od.Odetails_Qty) as totalSales,
          DATE_FORMAT(om.O_date, ?) as period
        FROM order_details od
        JOIN order_master om ON od.O_Id = om.O_Id
        WHERE om.O_status = 'Delivered'
      `;
        let salesByProductQuery = `
        SELECT 
          od.Product_id,
          p.name as productName,
          SUM(od.Odetails_Qty) as totalUnitsSold,
          SUM(od.Odetails_price * od.Odetails_Qty) as totalRevenue,
          c.CY_NAME as categoryName
        FROM order_details od
        JOIN order_master om ON od.O_Id = om.O_Id
        JOIN (
          ${unionQuery} 
        ) p ON od.Product_id = p.id
        JOIN category c ON p.category_id = c.CY_ID
        WHERE om.O_status = 'Delivered'
      `;
        let salesByCategoryQuery = `
        SELECT 
          c.CY_NAME as categoryName,
          SUM(od.Odetails_Qty) as totalUnitsSold,
          SUM(od.Odetails_price * od.Odetails_Qty) as totalRevenue
        FROM order_details od
        JOIN order_master om ON od.O_Id = om.O_Id
        JOIN (
          ${unionQuery}
        ) p ON od.Product_id = p.id
        JOIN category c ON p.category_id = c.CY_ID
        WHERE om.O_status = 'Delivered'
      `;

        // Prepare query parameters
        const queryParams = [dateFormat]; // First parameter for DATE_FORMAT

        // Add date filters
        if (effectiveStartDate) {
          salesQuery += ` AND om.O_date >= ?`;
          salesByProductQuery += ` AND om.O_date >= ?`;
          salesByCategoryQuery += ` AND om.O_date >= ?`;
          queryParams.push(effectiveStartDate);
        }
        if (effectiveEndDate) {
          salesQuery += ` AND om.O_date <= ?`;
          salesByProductQuery += ` AND om.O_date <= ?`;
          salesByCategoryQuery += ` AND om.O_date <= ?`;
          queryParams.push(effectiveEndDate);
        }

        // Add GROUP BY and ORDER BY to salesQuery
        salesQuery += ` GROUP BY DATE_FORMAT(om.O_date, ?) ORDER BY period`;
        queryParams.push(dateFormat); // Add dateFormat again for the GROUP BY

        salesByProductQuery += ` GROUP BY od.Product_id, p.name, c.CY_NAME ORDER BY totalRevenue DESC LIMIT 5`;
        salesByCategoryQuery += ` GROUP BY c.CY_NAME ORDER BY totalRevenue DESC`;

        Promise.all([
          new Promise((resolve, reject) =>
            db.query(salesQuery, queryParams, (err, result) =>
              err ? reject(err) : resolve(result)
            )
          ),
          new Promise((resolve, reject) =>
            db.query(salesByProductQuery, queryParams.slice(1), (err, result) =>
              err ? reject(err) : resolve(result)
            )
          ),
          new Promise((resolve, reject) =>
            db.query(
              salesByCategoryQuery,
              queryParams.slice(1),
              (err, result) => (err ? reject(err) : resolve(result))
            )
          ),
        ])
          .then(([totalSales, salesByProduct, salesByCategory]) => {
            res.json({
              totalSales: totalSales || [],
              salesByProduct: salesByProduct || [],
              salesByCategory: salesByCategory || [],
            });
          })
          .catch((err) => {
            console.error("Error fetching sales report:", err);
            res.status(500).json({
              error: "Database error",
              details: err.sqlMessage || err.message,
            });
          });
      })
      .catch((err) => {
        console.error("Error fetching categories:", err);
        res.status(500).json({
          error: "Database error",
          details: err.sqlMessage || err.message,
        });
      });
  });
};
// Customer Report Data
exports.getCustomerReport = (req, res) => {
  const { startDate, endDate } = req.query;

  // Demographics query
  let demographicsQuery = `
    SELECT 
        c.c_Pincode as areaId,
        COUNT(*) as customerCount
    FROM customer c
    GROUP BY c.c_Pincode
  `;

  // Purchase history query
  let purchaseHistoryQuery = `
    SELECT 
        om.C_ID,
        c.c_username as customername,
        COUNT(om.O_id) AS totalOrders,
        SUM(od.Odetails_price * od.Odetails_Qty) AS totalSpent
    FROM order_master om
    JOIN customer c ON om.C_ID = c.C_ID
    JOIN order_details od ON om.O_id = od.O_Id
    WHERE om.O_status = 'Delivered'
  `;
  // Query parameters
  const queryParams = [];

  // Date filtering
  let whereClauses = [];
  if (startDate) {
    whereClauses.push("om.O_date >= ?");
    queryParams.push(startDate);
  }
  if (endDate) {
    whereClauses.push("om.O_date <= ?");
    queryParams.push(endDate);
  }
  if (whereClauses.length > 0) {
    const whereClause = ` AND ${whereClauses.join(" AND ")}`;
    purchaseHistoryQuery += whereClause;
  }

  // Finalize queries
  purchaseHistoryQuery += `
    GROUP BY om.C_ID
    ORDER BY totalSpent DESC
    LIMIT 10
  `;

  // Execute queries in parallel
  Promise.all([
    new Promise((resolve, reject) =>
      db.query(demographicsQuery, (err, result) =>
        err ? reject(err) : resolve(result)
      )
    ),
    new Promise((resolve, reject) =>
      db.query(purchaseHistoryQuery, queryParams, (err, result) =>
        err ? reject(err) : resolve(result)
      )
    ),
  ])
    .then(([demographics, purchaseHistory]) => {
      res.json({
        demographics: demographics || [],
        purchaseHistory: purchaseHistory || [],
      });
    })
    .catch((err) => {
      console.error("Error fetching customer report:", err);
      res.status(500).json({ error: "Database error", details: err.message });
    });
};

// Inventory Report Data
exports.getInventoryReport = (req, res) => {
  const lowStockThreshold = 5;
  const { category } = req.query;

  db.query("SELECT CY_ID, CY_NAME FROM category", (err, categories) => {
    if (err) {
      console.error("Error fetching categories:", err);
      return res
        .status(500)
        .json({ error: "Database error", details: err.sqlMessage });
    }

    const categoryTableMap = new Map(
      categories.map((c) => [
        c.CY_NAME,
        c.CY_NAME.toLowerCase().replace(/\s+/g, "_"),
      ])
    );

    const stockQueries = [];
    const turnoverQueries = [];
    const queryParams = [];

    for (const [categoryName, tableName] of categoryTableMap) {
      if (category && category !== categoryName) continue;

      db.query(`SHOW TABLES LIKE ?`, [tableName], (err, result) => {
        if (err || result.length === 0) {
          console.log(`Table ${tableName} does not exist:`, err?.sqlMessage);
          return;
        }

        db.query(`SHOW COLUMNS FROM \`${tableName}\``, (err, columns) => {
          if (err) return;

          const columnMap = {
            id: null,
            name: null,
            stock: null,
            price: null,
          };

          columns.forEach((col) => {
            const field = col.Field.toLowerCase();
            if (field.includes("id") && !field.includes("category_id"))
              columnMap.id = col.Field;
            else if (field.includes("name")) columnMap.name = col.Field;
            else if (field.includes("stock")) columnMap.stock = col.Field;
            else if (field.includes("price")) columnMap.price = col.Field;
          });

          if (!columnMap.id || !columnMap.name || !columnMap.stock) return;

          stockQueries.push(`
            SELECT 
              \`${tableName}\`.${columnMap.id} as productId, 
              \`${tableName}\`.${columnMap.name} as productName, 
              \`${tableName}\`.${columnMap.stock} as stock,
              c.cy_id as categoryId,
              c.cy_name as categoryName 
            FROM \`${tableName}\` 
            LEFT JOIN category c ON \`${tableName}\` .category_id = c.cy_id
            WHERE \`${tableName}\`.${columnMap.stock} <= ? AND \`${tableName}\`.${columnMap.stock} >= 0
          `);
          queryParams.push(lowStockThreshold);

          turnoverQueries.push(`
            SELECT 
              \`${tableName}\`.${columnMap.id} as productId,
              \`${tableName}\`.${columnMap.name} as productName,
              \`${tableName}\`.${columnMap.stock} as stock,
              COALESCE(SUM(od.Odetails_Qty), 0) as totalSold,
              c.cy_id as categoryId,
              c.cy_name as categoryName,
              CASE 
                WHEN \`${tableName}\`.${columnMap.stock} = 0 THEN 0
                ELSE COALESCE(SUM(od.Odetails_Qty), 0) / \`${tableName}\`.${columnMap.stock}
              END as turnoverRatio
            FROM \`${tableName}\`
            LEFT JOIN category c ON \`${tableName}\`.category_id = c.cy_id
            LEFT JOIN order_details od ON \`${tableName}\`.${columnMap.id} = od.Product_id
            LEFT JOIN order_master om ON od.O_id = om.O_id 
              AND om.O_status = 'Delivered'
              AND om.O_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY \`${tableName}\`.${columnMap.id}, \`${tableName}\`.${columnMap.name}, \`${tableName}\`.${columnMap.stock}
            HAVING totalSold > 0
          `);
        });
      });
    }

    setTimeout(() => {
      if (stockQueries.length === 0) {
        return res.json({ stockLevels: [], turnover: [], slowMoving: [] });
      }

      const finalStockQuery =
        stockQueries.join(" UNION ") + " ORDER BY stock ASC";
      const finalTurnoverQuery =
        turnoverQueries.join(" UNION ") + " ORDER BY totalSold DESC"; // Sort by totalSold for consistency

      Promise.all([
        new Promise((resolve, reject) =>
          db.query(finalStockQuery, queryParams, (err, result) =>
            err ? reject(err) : resolve(result)
          )
        ),
        new Promise((resolve, reject) =>
          db.query(finalTurnoverQuery, [], (err, result) =>
            err ? reject(err) : resolve(result)
          )
        ),
      ])
        .then(([stockLevels, turnover]) => {
          res.json({
            stockLevels: stockLevels || [],
            turnover: turnover || [],
          });
        })
        .catch((err) => {
          console.error("Error fetching inventory report:", err);
          res
            .status(500)
            .json({ error: "Database error", details: err.message });
        });
    }, 1000);
  });
};

exports.updateStock = (req, res) => {
  const { productId, categoryName, newStock } = req.body;

  // Step 1: Validate input
  if (!productId || !categoryName || newStock === undefined) {
    return res.status(400).json({
      success: false,
      message: "Product ID, category, and new stock value are required",
    });
  }

  const stockValue = Number(newStock);
  if (isNaN(stockValue) || stockValue < 0) {
    return res.status(400).json({
      success: false,
      message: "New stock value must be a non-negative number",
    });
  }

  // Step 2: Derive the table name
  const tableName = categoryName.toLowerCase() + "_table";

  // Step 3: Check if the table exists
  db.query(`SHOW TABLES LIKE ?`, [tableName], (err, tableResult) => {
    if (err || tableResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Table '${tableName}' does not exist`,
      });
    }

    // Step 4: Get the primary key
    db.query(
      `SHOW KEYS FROM \`${tableName}\` WHERE Key_name = 'PRIMARY'`,
      (err, keyResults) => {
        if (err || keyResults.length === 0) {
          return res
            .status(500)
            .json({ success: false, message: "No primary key found" });
        }

        const primaryKey = keyResults[0].Column_name;

        // Step 5: Get table schema to map fields
        db.query(`SHOW COLUMNS FROM \`${tableName}\``, (err, columns) => {
          if (err) {
            console.error("Error fetching table schema:", err);
            return res.status(500).json({
              success: false,
              message: `Server error: ${err.message}`,
            });
          }

          // Map generic field names to actual column names
          const columnMap = {
            stock: null,
          };

          columns.forEach((col) => {
            const field = col.Field.toLowerCase();
            if (field.includes("stock")) columnMap.stock = col.Field;
          });

          if (!columnMap.stock) {
            return res.status(400).json({
              success: false,
              message: `Stock column not found in table '${tableName}'`,
            });
          }

          // Step 6: Update the stock
          const updateQuery = `UPDATE \`${tableName}\` SET \`${columnMap.stock}\` = ? WHERE \`${primaryKey}\` = ?`;
          db.query(updateQuery, [stockValue, productId], (err, result) => {
            if (err) {
              console.error("Error updating stock:", err);
              return res.status(500).json({
                success: false,
                message: `Server error: ${err.message}`,
              });
            }

            if (result.affectedRows === 0) {
              return res
                .status(404)
                .json({ success: false, message: "Product not found" });
            }

            res.json({ success: true, message: "Stock updated successfully" });
          });
        });
      }
    );
  });
};

// Order Report Data
exports.getOrderReport = (req, res) => {
  const { startDate, endDate, status, compareStartDate, compareEndDate } =
    req.query;

  // Input validation
  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: "Start date and end date are required",
    });
  }

  if (
    status &&
    !["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].includes(
      status
    )
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid status value. Must be one of: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED",
    });
  }

  // Validate date formats (basic check for YYYY-MM-DD)
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  const datesToValidate = [
    startDate,
    endDate,
    compareStartDate,
    compareEndDate,
  ].filter(Boolean);
  for (const date of datesToValidate) {
    if (!dateFormatRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: `Invalid date format for ${date}. Must be YYYY-MM-DD`,
      });
    }
  }

  // Base query parameters and WHERE clauses
  const queryParams = [];
  const compareQueryParams = [];
  const whereClauses = [];
  const compareWhereClauses = [];

  // Build WHERE clauses for current period
  if (startDate) {
    whereClauses.push("om.O_date >= ?");
    queryParams.push(startDate);
  }
  if (endDate) {
    whereClauses.push("om.O_date <= ?");
    queryParams.push(endDate);
  }
  if (status) {
    whereClauses.push("om.O_status = ?");
    queryParams.push(status);
  }

  // Build WHERE clauses for comparison period
  if (compareStartDate) {
    compareWhereClauses.push("om.O_date >= ?");
    compareQueryParams.push(compareStartDate);
  }
  if (compareEndDate) {
    compareWhereClauses.push("om.O_date <= ?");
    compareQueryParams.push(compareEndDate);
  }

  // Add the "not cancelled" condition to queries that need it
  const notCancelledClause = "om.O_status != 'CANCELLED'";
  const whereClausesWithNotCancelled = [...whereClauses, notCancelledClause];
  const compareWhereClausesWithNotCancelled = [
    ...compareWhereClauses,
    notCancelledClause,
  ];

  // Construct WHERE clause strings
  const whereClause =
    whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : "";
  const whereClauseWithNotCancelled =
    whereClausesWithNotCancelled.length > 0
      ? " WHERE " + whereClausesWithNotCancelled.join(" AND ")
      : "";
  const compareWhereClauseWithNotCancelled =
    compareWhereClausesWithNotCancelled.length > 0
      ? " WHERE " + compareWhereClausesWithNotCancelled.join(" AND ")
      : "";

  // Define all queries
  const queries = {
    // Query 1: Status summary
    statusSummary: {
      sql: `
        SELECT 
          O_status as status,
          COUNT(*) as count
        FROM order_master om
        ${whereClause}
        GROUP BY O_status
      `,
      params: queryParams,
    },

    // Query 2: Shipping details
    shippingDetails: {
      sql: `
        SELECT 
          om.O_id,
          om.O_date,
          om.C_id,
          COALESCE(c.C_username, 'Anonymous') as customerName,
          c.c_mobile as customerphone,
          c.C_address as customerAddress,
          c.C_pincode as customerPincode,
          py.py_status as paymentstatus,
          dp.D_NAME as deliveryPerson,
          om.O_status as orderstatus
        FROM order_master om
        LEFT JOIN customer c ON om.C_id = c.C_id
        LEFT JOIN deliveries d ON om.O_id = d.O_id
         LEFT JOIN payment py ON om.O_id = py.O_id
        LEFT JOIN delivery_persons dp ON d.D_id = dp.D_id
        ${whereClause}
        ORDER BY om.O_date DESC
      `,
      params: queryParams,
    },

    // Query 3: Order count (current period)
    orderCount: {
      sql: `
        SELECT 
          COUNT(DISTINCT om.O_id) as orderCount
        FROM order_master om
        ${whereClause}
      `,
      params: queryParams,
    },

    // Query 4: Total revenue
    totalRevenue: {
      sql: `
        SELECT 
          SUM(od.ODETAILS_PRICE * od.ODETAILS_QTY) as totalRevenue
        FROM order_master om
        JOIN order_details od ON om.O_id = od.O_id
        ${whereClause}
      `,
      params: queryParams,
    },

    // Query 5: Orders over time (current period)
    ordersOverTime: {
      sql: `
        SELECT 
          DATE(om.O_date) as orderDate,
          COUNT(DISTINCT om.O_id) as orderCount
        FROM order_master om
        ${whereClauseWithNotCancelled}
        GROUP BY DATE(om.O_date)
        ORDER BY DATE(om.O_date)
      `,
      params: queryParams,
    },

    // Query 6: Orders over time (comparison period)
    compareOrdersOverTime: {
      sql: `
        SELECT 
          DATE(om.O_date) as orderDate,
          COUNT(DISTINCT om.O_id) as orderCount
        FROM order_master om
        ${compareWhereClauseWithNotCancelled}
        GROUP BY DATE(om.O_date)
        ORDER BY DATE(om.O_date)
      `,
      params: compareQueryParams,
    },

    // Query 7: Order count (comparison period)
    compareOrderCount: {
      sql: `
        SELECT 
          COUNT(DISTINCT om.O_id) as compareOrderCount
        FROM order_master om
        ${compareWhereClauseWithNotCancelled}
      `,
      params: compareQueryParams,
    },
  };

  // Execute all queries in parallel
  Promise.all(
    Object.entries(queries).map(
      ([key, { sql, params }]) =>
        new Promise((resolve, reject) => {
          db.query(sql, params, (err, result) => {
            if (err) {
              console.error(`Error executing ${key} query:`, err);
              reject(
                new Error(
                  `Failed to execute ${key} query: ${
                    err.sqlMessage || err.message
                  }`
                )
              );
            } else {
              resolve(result);
            }
          });
        })
    )
  )
    .then(
      ([
        statusSummary,
        shippingDetails,
        orderCountResult,
        totalRevenueResult,
        ordersOverTime,
        compareOrdersOverTime,
        compareOrderCountResult,
      ]) => {
        // Process results
        const response = {
          success: true,
          statusSummary: statusSummary || [],
          shippingDetails: shippingDetails || [],
          orderCount: orderCountResult[0]?.orderCount || 0,
          totalRevenue: totalRevenueResult[0]?.totalRevenue || 0,
          ordersOverTime: ordersOverTime || [],
          compareOrdersOverTime: compareOrdersOverTime || [],
          compareOrderCount: compareOrderCountResult[0]?.compareOrderCount || 0,
        };

        res.json(response);
      }
    )
    .catch((err) => {
      console.error("Error fetching order report:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch order report",
        error: err.message,
      });
    });
};

// Export Sales Report as CSV
exports.exportSalesReportCSV = (req, res) => {
  const { startDate, endDate, groupBy } = req.query;

  // Default date range if not provided
  const defaultStartDate = "2024-01-01";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const defaultEndDate = yesterday.toISOString().split("T")[0]; // e.g., "2025-03-26"

  const effectiveStartDate = startDate || defaultStartDate;
  const effectiveEndDate = endDate || defaultEndDate;

  // Current date for "Downloaded on"
  const currentDate = today.toISOString().split("T")[0]; // e.g., "2025-03-27"

  // Validate date formats
  const start = new Date(effectiveStartDate);
  const end = new Date(effectiveEndDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res
      .status(400)
      .json({ error: "Invalid date format. Use YYYY-MM-DD." });
  }

  // Ensure startDate is not after endDate
  if (start > end) {
    return res
      .status(400)
      .json({ error: "startDate cannot be after endDate." });
  }

  // Ensure startDate is not before January 2024
  const minDate = new Date("2024-01-01");
  if (start < minDate) {
    return res
      .status(400)
      .json({ error: "startDate cannot be before January 1, 2024." });
  }

  // Ensure endDate is not after yesterday
  const maxDate = new Date(defaultEndDate);
  if (end > maxDate) {
    return res
      .status(400)
      .json({ error: `endDate cannot be after ${defaultEndDate}.` });
  }

  // Fetch categories to build the UNION query
  db.query("SELECT CY_ID, CY_NAME FROM category", (err, categories) => {
    if (err) {
      console.error("Error fetching categories:", err);
      return res
        .status(500)
        .json({ error: "Database error", details: err.sqlMessage });
    }

    // Map CY_NAME to table name (lowercase, replace spaces with underscores)
    const tablePromises = categories.map((category) => {
      const tableName = category.CY_NAME.trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
      return new Promise((resolve) => {
        // Check if the table exists
        db.query(`SHOW TABLES LIKE ?`, [tableName], (err, result) => {
          if (err || result.length === 0) {
            console.warn(
              `Table ${tableName} does not exist for category ${category.CY_NAME}`
            );
            resolve(null); // Skip this table
          } else {
            // Fetch column names to find the 'name' column
            db.query(`SHOW COLUMNS FROM \`${tableName}\``, (err, columns) => {
              if (err) {
                console.error(
                  `Error fetching columns for table ${tableName}:`,
                  err
                );
                resolve(null);
                return;
              }
              const nameColumn =
                columns.find((col) => col.Field.toLowerCase().includes("name"))
                  ?.Field || "name";
              resolve({
                tableName,
                categoryId: category.CY_ID,
                categoryName: category.CY_NAME,
                nameColumn,
              });
            });
          }
        });
      });
    });

    Promise.all(tablePromises).then((tableResults) => {
      // Filter out null results (tables that don't exist)
      const validTables = tableResults.filter((table) => table !== null);

      if (validTables.length === 0) {
        return res
          .status(500)
          .json({ error: "No valid category tables found" });
      }

      // Build the UNION query for the product tables
      const unionQuery = validTables
        .map(
          (table) =>
            `SELECT id, \`${table.nameColumn}\` AS name, category_id FROM \`${table.tableName}\``
        )
        .join(" UNION ");

      // Base queries
      let totalSalesQuery = `
        SELECT 
          SUM(od.Odetails_price * od.Odetails_Qty) as totalSales,
          DATE_FORMAT(om.O_date, '%Y-%m') as period
        FROM order_details od
        JOIN order_master om ON od.O_id = om.O_id
        WHERE om.O_status = 'Delivered'
      `;
      let salesByProductQuery = `
        SELECT 
          od.Product_id,
          p.name as productName,
          SUM(od.Odetails_Qty) as totalUnitsSold,
          SUM(od.Odetails_price * od.Odetails_Qty) as totalRevenue,
          c.CY_NAME as categoryName
        FROM order_details od
        JOIN order_master om ON od.O_id = om.O_id
        JOIN (
          ${unionQuery}
        ) p ON od.Product_id = p.id
        JOIN category c ON p.category_id = c.CY_ID
        WHERE om.O_status = 'Delivered'
      `;
      let salesByCategoryQuery = `
        SELECT 
          c.CY_NAME as categoryName,
          SUM(od.Odetails_Qty) as totalUnitsSold,
          SUM(od.Odetails_price * od.Odetails_Qty) as totalRevenue
        FROM order_details od
        JOIN order_master om ON od.O_id = om.O_id
        JOIN (
          ${unionQuery}
        ) p ON od.Product_id = p.id
        JOIN category c ON p.category_id = c.CY_ID
        WHERE om.O_status = 'Delivered'
      `;

      const queryParams = [];

      if (startDate) {
        totalSalesQuery += ` AND om.O_date >= ?`;
        salesByProductQuery += ` AND om.O_date >= ?`;
        salesByCategoryQuery += ` AND om.O_date >= ?`;
        queryParams.push(startDate);
      }
      if (endDate) {
        totalSalesQuery += ` AND om.O_date <= ?`;
        salesByProductQuery += ` AND om.O_date <= ?`;
        salesByCategoryQuery += ` AND om.O_date <= ?`;
        queryParams.push(endDate);
      }

      if (groupBy === "daily") {
        totalSalesQuery = totalSalesQuery.replace("%Y-%m", "%Y-%m-%d");
        totalSalesQuery += ` GROUP BY DATE_FORMAT(om.O_date, '%Y-%m-%d')`;
      } else if (groupBy === "weekly") {
        totalSalesQuery = totalSalesQuery.replace(
          "DATE_FORMAT(om.O_date, '%Y-%m')",
          "YEARWEEK(om.O_date)"
        );
        totalSalesQuery += ` GROUP BY YEARWEEK(om.O_date)`;
      } else {
        totalSalesQuery += ` GROUP BY DATE_FORMAT(om.O_date, '%Y-%m')`;
      }

      // Limit to top 5 products by total revenue, matching the chart
      salesByProductQuery += ` GROUP BY od.Product_id, p.name, c.CY_NAME ORDER BY totalRevenue DESC LIMIT 5`;
      salesByCategoryQuery += ` GROUP BY c.CY_NAME ORDER BY totalRevenue DESC`;

      Promise.all([
        new Promise((resolve, reject) =>
          db.query(totalSalesQuery, queryParams, (err, result) =>
            err ? reject(err) : resolve(result)
          )
        ),
        new Promise((resolve, reject) =>
          db.query(salesByProductQuery, queryParams, (err, result) =>
            err ? reject(err) : resolve(result)
          )
        ),
        new Promise((resolve, reject) =>
          db.query(salesByCategoryQuery, queryParams, (err, result) =>
            err ? reject(err) : resolve(result)
          )
        ),
      ])
        .then(([totalSales, salesByProduct, salesByCategory]) => {
          // Prepare CSV data with improved formatting
          // Header Section

          const headerData = [
            { Title: "Sales Report" },
            { Title: "Downloaded on: ", Value: currentDate },
            {
              Title: "Date Range: ",
              Value: `${effectiveStartDate} to ${effectiveEndDate}`,
            },
            { Title: "" }, // Spacer
            { Title: "" }, // Spacer
          ];

          // Total Sales by Period Section
          const totalSalesHeader = [
            { Title: "Total Sales by Period" },
            { Title: "" }, // Spacer
          ];
          const totalSalesData =
            totalSales.length > 0
              ? totalSales.map((item) => ({
                  Period: item.period,
                  TotalSales: item.totalSales
                    ? item.totalSales.toFixed(2)
                    : "0.00",
                }))
              : [{ Period: "No data available", TotalSales: "" }];
          const totalSalesSection = [
            ...totalSalesHeader,
            ...totalSalesData,
            { Period: "", TotalSales: "" }, // Spacer
            { Period: "", TotalSales: "" }, // Spacer
            { Period: "", TotalSales: "" }, // Spacer
          ];

          // Top 5 Products by Revenue Section
          const productsHeader = [
            { Title: "Top 5 Products by Revenue" },
            { Title: "" }, // Spacer
          ];
          const productsData =
            salesByProduct.length > 0
              ? salesByProduct.map((item) => ({
                  ProductID: item.Product_id,
                  ProductName: item.productName || "Unknown Product",
                  Category: item.categoryName || "Not Specified",
                  UnitsSold: item.totalUnitsSold || 0,
                  Revenue: item.totalRevenue
                    ? item.totalRevenue.toFixed(2)
                    : "0.00",
                }))
              : [
                  {
                    ProductID: "No data available",
                    ProductName: "",
                    Category: "",
                    UnitsSold: "",
                    Revenue: "",
                  },
                ];
          const productsSection = [
            ...productsHeader,
            ...productsData,
            {
              ProductID: "",
              ProductName: "",
              Category: "",
              UnitsSold: "",
              Revenue: "",
            }, // Spacer
            {
              ProductID: "",
              ProductName: "",
              Category: "",
              UnitsSold: "",
              Revenue: "",
            }, // Spacer
            {
              ProductID: "",
              ProductName: "",
              Category: "",
              UnitsSold: "",
              Revenue: "",
            }, // Spacer
          ];

          // Sales by Category Section
          const categoriesHeader = [
            { Title: "Sales by Category" },
            { Title: "" }, // Spacer
          ];
          const categoriesData =
            salesByCategory.length > 0
              ? salesByCategory.map((item) => ({
                  CategoryName: item.categoryName || "Not Specified",
                  UnitsSold: item.totalUnitsSold || 0,
                  Revenue: item.totalRevenue
                    ? item.totalRevenue.toFixed(2)
                    : "0.00",
                }))
              : [
                  {
                    CategoryName: "No data available",
                    UnitsSold: "",
                    Revenue: "",
                  },
                ];
          const categoriesSection = [
            ...categoriesHeader,
            ...categoriesData,
            { CategoryName: "", UnitsSold: "", Revenue: "" }, // Spacer
            { CategoryName: "", UnitsSold: "", Revenue: "" }, // Spacer
          ];

          // Combine all sections into the final CSV data
          const csvData = [
            ...headerData,
            ...totalSalesSection,
            ...productsSection,
            ...categoriesSection,
          ];

          // Define fields for each section's data rows
          const titleFields = ["Title"];
          const totalSalesFields = [
            { label: "Period", value: "Period" },
            { label: "Total Sales (Rs.)", value: "TotalSales" },
          ];
          const productFields = [
            { label: "Product ID", value: "ProductID" },
            { label: "Product Name", value: "ProductName" },
            { label: "Category", value: "Category" },
            { label: "Units Sold", value: "UnitsSold" },
            { label: "Revenue (Rs.)", value: "Revenue" },
          ];
          const categoryFields = [
            { label: "Category Name", value: "CategoryName" },
            { label: "Units Sold", value: "UnitsSold" },
            { label: "Revenue (Rs.)", value: "Revenue" },
          ];

          // Create parsers for each type of row
          const titleParser = new Parser({
            fields: titleFields,
            header: false,
          });
          const headerParser = new Parser({
            fields: ["Title", "Value"],
            header: false,
          });
          const totalSalesParser = new Parser({
            fields: totalSalesFields,
            header: false,
          });
          const productParser = new Parser({
            fields: productFields,
            header: false,
          });
          const categoryParser = new Parser({
            fields: categoryFields,
            header: false,
          });

          // Generate CSV content manually
          let csv = "";
          csvData.forEach((row) => {
            if ("Title" in row && !("Value" in row)) {
              // Use titleParser for section headers
              csv += titleParser.parse([row]) + "\n";
            } else if ("Title" in row && "Value" in row) {
              // Use headerParser for header rows with Title and Value (e.g., "Downloaded on: ", "2025-03-27")
              csv += headerParser.parse([row]) + "\n";
            } else if ("Period" in row) {
              // Use totalSalesParser for Total Sales by Period data rows
              csv += totalSalesParser.parse([row]) + "\n";
            } else if ("ProductID" in row) {
              // Use productParser for Top 5 Products by Revenue data rows
              csv += productParser.parse([row]) + "\n";
            } else if ("CategoryName" in row) {
              // Use categoryParser for Sales by Category data rows
              csv += categoryParser.parse([row]) + "\n";
            }
          });

          res.header("Content-Type", "text/csv");
          res.header(
            "Content-Disposition",
            'attachment; filename="sales_report.csv"'
          );
          res.send(csv);
        })
        .catch((err) => {
          console.error("Error exporting sales report as CSV:", err);
          res
            .status(500)
            .json({ error: "Database error", details: err.message });
        });
    });
  });
};

exports.exportSalesReportPDF = (req, res) => {
  const { startDate, endDate, groupBy } = req.query;

  // Default date range if not provided
  const defaultStartDate = "2024-01-01";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const defaultEndDate = yesterday.toISOString().split("T")[0]; // e.g., "2025-03-26"

  const effectiveStartDate = startDate || defaultStartDate;
  const effectiveEndDate = endDate || defaultEndDate;

  // Current date for "Downloaded on"
  const currentDate = today.toISOString().split("T")[0]; // e.g., "2025-03-27"

  // Validate date formats
  const start = new Date(effectiveStartDate);
  const end = new Date(effectiveEndDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res
      .status(400)
      .json({ error: "Invalid date format. Use YYYY-MM-DD." });
  }

  // Ensure startDate is not after endDate
  if (start > end) {
    return res
      .status(400)
      .json({ error: "startDate cannot be after endDate." });
  }

  // Ensure startDate is not before January 2024
  const minDate = new Date("2024-01-01");
  if (start < minDate) {
    return res
      .status(400)
      .json({ error: "startDate cannot be before January 1, 2024." });
  }

  // Ensure endDate is not after yesterday
  const maxDate = new Date(defaultEndDate);
  if (end > maxDate) {
    return res
      .status(400)
      .json({ error: `endDate cannot be after ${defaultEndDate}.` });
  }

  // Fetch categories to build the UNION query
  db.query("SELECT CY_ID, CY_NAME FROM category", (err, categories) => {
    if (err) {
      console.error("Error fetching categories:", err);
      return res
        .status(500)
        .json({ error: "Database error", details: err.sqlMessage });
    }

    // Map CY_NAME to table name (lowercase, replace spaces with underscores)
    const tablePromises = categories.map((category) => {
      const tableName = category.CY_NAME.trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
      return new Promise((resolve) => {
        // Check if the table exists
        db.query(`SHOW TABLES LIKE ?`, [tableName], (err, result) => {
          if (err || result.length === 0) {
            console.warn(
              `Table ${tableName} does not exist for category ${category.CY_NAME}`
            );
            resolve(null); // Skip this table
          } else {
            // Fetch column names to find the 'name' column
            db.query(`SHOW COLUMNS FROM \`${tableName}\``, (err, columns) => {
              if (err) {
                console.error(
                  `Error fetching columns for table ${tableName}:`,
                  err
                );
                resolve(null);
                return;
              }
              const nameColumn =
                columns.find((col) => col.Field.toLowerCase().includes("name"))
                  ?.Field || "name";
              resolve({
                tableName,
                categoryId: category.CY_ID,
                categoryName: category.CY_NAME,
                nameColumn,
              });
            });
          }
        });
      });
    });

    Promise.all(tablePromises).then((tableResults) => {
      // Filter out null results (tables that don't exist)
      const validTables = tableResults.filter((table) => table !== null);

      if (validTables.length === 0) {
        return res
          .status(500)
          .json({ error: "No valid category tables found" });
      }

      // Build the UNION query for the product tables
      const unionQuery = validTables
        .map(
          (table) =>
            `SELECT id, \`${table.nameColumn}\` AS name, category_id FROM \`${table.tableName}\``
        )
        .join(" UNION ");

      // Base queries
      let totalSalesQuery = `
        SELECT 
          SUM(od.Odetails_price * od.Odetails_Qty) as totalSales,
          DATE_FORMAT(om.O_date, '%Y-%m') as period
        FROM order_details od
        JOIN order_master om ON od.O_id = om.O_id
        WHERE om.O_status = 'Delivered'
      `;
      let salesByProductQuery = `
        SELECT 
          od.Product_id,
          p.name as productName,
          SUM(od.Odetails_Qty) as totalUnitsSold,
          SUM(od.Odetails_price * od.Odetails_Qty) as totalRevenue,
          c.CY_NAME as categoryName
        FROM order_details od
        JOIN order_master om ON od.O_id = om.O_id
        JOIN (
          ${unionQuery}
        ) p ON od.Product_id = p.id
        JOIN category c ON p.category_id = c.CY_ID
        WHERE om.O_status = 'Delivered'
      `;
      let salesByCategoryQuery = `
        SELECT 
          c.CY_NAME as categoryName,
          SUM(od.Odetails_Qty) as totalUnitsSold,
          SUM(od.Odetails_price * od.Odetails_Qty) as totalRevenue
        FROM order_details od
        JOIN order_master om ON od.O_id = om.O_id
        JOIN (
          ${unionQuery}
        ) p ON od.Product_id = p.id
        JOIN category c ON p.category_id = c.CY_ID
        WHERE om.O_status = 'Delivered'
      `;

      const queryParams = [];

      if (startDate) {
        totalSalesQuery += ` AND om.O_date >= ?`;
        salesByProductQuery += ` AND om.O_date >= ?`;
        salesByCategoryQuery += ` AND om.O_date >= ?`;
        queryParams.push(startDate);
      }
      if (endDate) {
        totalSalesQuery += ` AND om.O_date <= ?`;
        salesByProductQuery += ` AND om.O_date <= ?`;
        salesByCategoryQuery += ` AND om.O_date <= ?`;
        queryParams.push(endDate);
      }

      if (groupBy === "daily") {
        totalSalesQuery = totalSalesQuery.replace("%Y-%m", "%Y-%m-%d");
        totalSalesQuery += ` GROUP BY DATE_FORMAT(om.O_date, '%Y-%m-%d')`;
      } else if (groupBy === "weekly") {
        totalSalesQuery = totalSalesQuery.replace(
          "DATE_FORMAT(om.O_date, '%Y-%m')",
          "YEARWEEK(om.O_date)"
        );
        totalSalesQuery += ` GROUP BY YEARWEEK(om.O_date)`;
      } else {
        totalSalesQuery += ` GROUP BY DATE_FORMAT(om.O_date, '%Y-%m')`;
      }

      // Limit to top 5 products by total revenue, matching the chart
      salesByProductQuery += ` GROUP BY od.Product_id, p.name, c.CY_NAME ORDER BY totalRevenue DESC LIMIT 5`;
      salesByCategoryQuery += ` GROUP BY c.CY_NAME ORDER BY totalRevenue DESC`;

      Promise.all([
        new Promise((resolve, reject) =>
          db.query(totalSalesQuery, queryParams, (err, result) =>
            err ? reject(err) : resolve(result)
          )
        ),
        new Promise((resolve, reject) =>
          db.query(salesByProductQuery, queryParams, (err, result) =>
            err ? reject(err) : resolve(result)
          )
        ),
        new Promise((resolve, reject) =>
          db.query(salesByCategoryQuery, queryParams, (err, result) =>
            err ? reject(err) : resolve(result)
          )
        ),
      ])
        .then(([totalSales, salesByProduct, salesByCategory]) => {
          const doc = new PDFDocument({ margin: 10 });
          let buffers = [];
          doc.on("data", buffers.push.bind(buffers));
          doc.on("end", () => {
            const pdfData = Buffer.concat(buffers);
            res.writeHead(200, {
              "Content-Type": "application/pdf",
              "Content-Disposition": 'attachment; filename="sales_report.pdf"',
              "Content-Length": pdfData.length,
            });
            res.end(pdfData);
          });

          // Track the current page number
          let pageNumber = 1;
          let isTotalSalesSection = false;
          let isProductsSection = false;
          let isCategoriesSection = false;

          // Define header dimensions
          const leftMargin = 20;
          const rightMargin = 10;
          const logoPath = path.join(
            __dirname,
            "../public/ad-images/logo/logo.png"
          );
          const logoWidth = 100;
          const logoHeight = 100;
          const logoX = 30;
          const logoY = 30;
          const textX = logoX + logoWidth + 20;
          const textY = logoY + logoHeight / 2 - 10;
          const headerHeight = logoY + logoHeight + 20;

          // Function to add the header
          const addHeader = () => {
            try {
              doc.image(logoPath, logoX, logoY, {
                width: logoWidth,
                height: logoHeight,
              });
            } catch (err) {
              console.error("Error adding logo to PDF:", err);
              doc
                .fontSize(12)
                .fillColor("red")
                .text("Logo not found", logoX, logoY, {
                  width: logoWidth,
                  align: "center",
                });
            }
            doc
              .fontSize(24)
              .fillColor("#2E7D32")
              .text("Nature’s Palette", textX, textY);
          };

          // Add page numbers and header on every page
          doc.on("pageAdded", () => {
            pageNumber++;
            addHeader();
            doc
              .fontSize(10)
              .fillColor("black")
              .text(
                `Page ${pageNumber}`,
                doc.page.width - 100,
                doc.page.height - 50,
                rightMargin,
                doc.y,
                { align: "right" }
              );
            doc.y = headerHeight;
            if (isTotalSalesSection) {
              doc
                .fontSize(16)
                .fillColor("#2E7D32")
                .text("Total Sales by Period", leftMargin, doc.y, {
                  underline: true,
                });
              doc.moveDown(0.5);
              doc.fillColor("black").fontSize(12);
            }
            if (isProductsSection) {
              doc
                .fontSize(16)
                .fillColor("#2E7D32")
                .text("Top 5 Products by Revenue", leftMargin, doc.y, {
                  underline: true,
                });
              doc.moveDown(0.5);
              doc.fillColor("black").fontSize(12);
            }
            if (isCategoriesSection) {
              doc
                .fontSize(16)
                .fillColor("#2E7D32")
                .text("Sales by Category", leftMargin, doc.y, {
                  underline: true,
                });
              doc.moveDown(0.5);
              doc.fillColor("black").fontSize(12);
            }
          });

          // Add the header and page number to the first page
          addHeader();
          doc
            .fontSize(10)
            .fillColor("black")
            .text(
              `Page ${pageNumber}`,
              doc.page.width - 100,
              doc.page.height - 50,
              rightMargin,
              doc.y,
              { align: "right" }
            );
          doc.y = headerHeight;

          // Subheader: Sales Report and Details
          doc.fillColor("black");
          doc
            .fontSize(16)
            .text("Sales Report", leftMargin, doc.y, { align: "center" });
          doc
            .fontSize(12)
            .text(`Downloaded on: ${currentDate}`, leftMargin, doc.y, {
              align: "center",
            });
          doc
            .fontSize(12)
            .text(
              `Date Range: ${effectiveStartDate} to ${effectiveEndDate}`,
              leftMargin,
              doc.y,
              { align: "center" }
            );
          doc.moveDown(2);

          // Total Sales by Period Section
          isTotalSalesSection = true;
          doc
            .fontSize(16)
            .fillColor("#2E7D32")
            .text("Total Sales by Period", leftMargin, doc.y, {
              underline: true,
            });
          doc.moveDown(0.5);
          doc.fillColor("black").fontSize(12);

          if (totalSales.length > 0) {
            totalSales.forEach((item, index) => {
              const lineHeight = 15;
              const lines = 2; // Period, Total Sales
              const blockHeight = lines * lineHeight;
              const sectionHeaderHeight = 30;

              if (
                doc.y + blockHeight + (index === 0 ? sectionHeaderHeight : 0) >
                doc.page.height - 50
              ) {
                doc.addPage();
              }

              doc.text(`Period: ${item.period}`, leftMargin, doc.y);
              doc.moveDown(0.2);
              doc.text(
                `Total Sales (Rs.): ${
                  item.totalSales ? item.totalSales.toFixed(2) : "0.00"
                }`,
                leftMargin,
                doc.y
              );
              doc.moveDown(0.2);

              if (index < totalSales.length - 1) {
                doc.moveDown(0.5);
                doc
                  .moveTo(leftMargin, doc.y)
                  .lineTo(doc.page.width - leftMargin, doc.y)
                  .stroke();
                doc.moveDown(0.5);
              }
            });
          } else {
            doc.text(
              "No sales data available for the selected period.",
              leftMargin,
              doc.y
            );
          }
          isTotalSalesSection = false;
          doc.moveDown(2.5);

          // Top 5 Products by Revenue Section
          isProductsSection = true;
          doc
            .fontSize(16)
            .fillColor("#2E7D32")
            .text("Top 5 Products by Revenue", leftMargin, doc.y, {
              underline: true,
            });
          doc.moveDown(0.5);
          doc.fillColor("black").fontSize(12);

          if (salesByProduct.length > 0) {
            salesByProduct.forEach((item, index) => {
              const lineHeight = 15;
              const lines = 5; // Product ID, Product Name, Category, Units Sold, Revenue
              const blockHeight = lines * lineHeight;
              const sectionHeaderHeight = 30;

              if (
                doc.y + blockHeight + (index === 0 ? sectionHeaderHeight : 0) >
                doc.page.height - 50
              ) {
                doc.addPage();
              }

              doc.text(`Product ID: ${item.Product_id}`, leftMargin, doc.y);
              doc.moveDown(0.2);
              doc.text(
                `Product Name: ${item.productName || "Unknown Product"}`,
                leftMargin,
                doc.y
              );
              doc.moveDown(0.2);
              doc.text(
                `Category: ${item.categoryName || "Not Specified"}`,
                leftMargin,
                doc.y
              );
              doc.moveDown(0.2);
              doc.text(
                `Units Sold: ${item.totalUnitsSold || 0}`,
                leftMargin,
                doc.y
              );
              doc.moveDown(0.2);
              doc.text(
                `Revenue (Rs.): ${
                  item.totalRevenue ? item.totalRevenue.toFixed(2) : "0.00"
                }`,
                leftMargin,
                doc.y
              );
              doc.moveDown(0.2);

              if (index < salesByProduct.length - 1) {
                doc.moveDown(0.5);
                doc
                  .moveTo(leftMargin, doc.y)
                  .lineTo(doc.page.width - leftMargin, doc.y)
                  .stroke();
                doc.moveDown(0.5);
              }
            });
          } else {
            doc.text("No product sales data available.", leftMargin, doc.y);
          }
          isProductsSection = false;
          doc.moveDown(2.5);

          // Sales by Category Section
          isCategoriesSection = true;
          doc
            .fontSize(16)
            .fillColor("#2E7D32")
            .text("Sales by Category", leftMargin, doc.y, { underline: true });
          doc.moveDown(0.5);
          doc.fillColor("black").fontSize(12);

          if (salesByCategory.length > 0) {
            salesByCategory.forEach((item, index) => {
              const lineHeight = 15;
              const lines = 3; // Category Name, Units Sold, Revenue
              const blockHeight = lines * lineHeight;
              const sectionHeaderHeight = 30;

              if (
                doc.y + blockHeight + (index === 0 ? sectionHeaderHeight : 0) >
                doc.page.height - 50
              ) {
                doc.addPage();
              }

              doc.text(
                `Category Name: ${item.categoryName || "Not Specified"}`,
                leftMargin,
                doc.y
              );
              doc.moveDown(0.2);
              doc.text(
                `Units Sold: ${item.totalUnitsSold || 0}`,
                leftMargin,
                doc.y
              );
              doc.moveDown(0.2);
              doc.text(
                `Revenue (Rs.): ${
                  item.totalRevenue ? item.totalRevenue.toFixed(2) : "0.00"
                }`,
                leftMargin,
                doc.y
              );
              doc.moveDown(0.2);

              if (index < salesByCategory.length - 1) {
                doc.moveDown(0.5);
                doc
                  .moveTo(leftMargin, doc.y)
                  .lineTo(doc.page.width - leftMargin, doc.y)
                  .stroke();
                doc.moveDown(0.5);
              }
            });
          } else {
            doc.text("No category sales data available.", leftMargin, doc.y);
          }
          isCategoriesSection = false;
          doc.moveDown(2.5);

          doc.end();
        })
        .catch((err) => {
          console.error("Error exporting sales report as PDF:", err);
          res
            .status(500)
            .json({ error: "Database error", details: err.message });
        });
    });
  });
};

exports.exportCustomerReportCSV = (req, res) => {
  const { startDate, endDate } = req.query;

  const today = new Date();
  const downloadDate = today.toISOString().split("T")[0];

  let demographicsQuery = `
    SELECT 
      c.c_pincode as areaId,
      COUNT(*) as customerCount
    FROM customer c
    GROUP BY c.c_pincode
  `;

  let purchaseHistoryQuery = `
    SELECT 
      om.C_id,
      c.c_username AS customername,
      COUNT(om.O_id) as totalOrders,
      SUM(od.odetails_price * od.odetails_qty) as totalSpent  -- Use lowercase column names
    FROM order_master om
    JOIN order_details od ON om.O_id = od.O_id
    JOIN customer c ON om.C_id = c.C_id
    WHERE om.O_status = 'Delivered'
  `;

  const queryParams = [];
  let whereClauses = [];

  if (startDate) {
    whereClauses.push("om.O_date >= ?");
    queryParams.push(startDate);
  }
  if (endDate) {
    whereClauses.push("om.O_date <= ?");
    queryParams.push(endDate);
  }

  if (whereClauses.length > 0) {
    const whereClause = ` AND ${whereClauses.join(" AND ")}`;
    purchaseHistoryQuery += whereClause;
  }

  purchaseHistoryQuery += ` GROUP BY om.C_id, c.c_username ORDER BY totalSpent DESC LIMIT 10`;

  Promise.all([
    new Promise((resolve, reject) =>
      db.query(demographicsQuery, (err, result) => {
        if (err) {
          console.error("Demographics query error:", err);
          return reject(err);
        }
        resolve(result);
      })
    ),
    new Promise((resolve, reject) =>
      db.query(purchaseHistoryQuery, queryParams, (err, result) => {
        if (err) {
          console.error("Purchase history query error:", err);
          return reject(err);
        }
        resolve(result);
      })
    ),
  ])
    .then(([demographics, purchaseHistory]) => {
      let csvContent = "";

      csvContent += "Customer Report\n";
      csvContent += `Date: ${downloadDate}\n`;
      csvContent += `Between: ${startDate || "N/A"} to ${endDate || "N/A"}\n\n`;

      csvContent += "Customer Demographics\n";
      const demographicsHeader = "Area ID,Customer Count\n";
      const demographicsRows = demographics
        .map((item) => `${item.areaId || "N/A"},${item.customerCount || 0}`)
        .join("\n");
      csvContent += demographicsHeader + demographicsRows + "\n\n";

      csvContent += "Purchase History\n";
      const purchaseHistoryHeader =
        "Customer ID,Customer Name,Total Orders,Total Spent (Rs.)\n";
      const purchaseHistoryRows = purchaseHistory
        .map(
          (item) =>
            `${item.C_id || "N/A"},${item.customername || "Unknown"},${
              item.totalOrders || 0
            },${item.totalSpent ? item.totalSpent.toFixed(2) : "0.00"}`
        )
        .join("\n");
      csvContent += purchaseHistoryHeader + purchaseHistoryRows + "\n";

      res.header("Content-Type", "text/csv");
      res.header(
        "Content-Disposition",
        'attachment; filename="customer_report.csv"'
      );
      res.send(csvContent);
    })
    .catch((err) => {
      console.error("Error exporting customer report as CSV:", err);
      res.status(500).json({ error: "Database error", details: err.message });
    });
};

// Helper function to capitalize names
const capitalizeName = (name) => {
  if (!name) return "Unknown";
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

exports.exportCustomerReportPDF = (req, res) => {
  const { startDate, endDate } = req.query;

  const today = new Date();
  const downloadDate = today.toISOString().split("T")[0];

  let demographicsQuery = `
    SELECT 
        c.c_pincode as areaId,
        COUNT(*) as customerCount
    FROM customer c
    GROUP BY c.c_pincode
  `;

  let purchaseHistoryQuery = `
    SELECT 
        om.C_id,
        c.c_username AS customername,
        COUNT(om.O_id) as totalOrders,
        SUM(od.odetails_price * od.odetails_qty) as totalSpent
    FROM order_master om
    JOIN order_details od ON om.O_id = od.O_id
    JOIN customer c ON om.C_id = c.C_id
    WHERE om.O_status = 'Delivered'
  `;

  const queryParams = [];

  let whereClauses = [];
  if (startDate) {
    whereClauses.push("om.O_date >= ?");
    queryParams.push(startDate);
  }
  if (endDate) {
    whereClauses.push("om.O_date <= ?");
    queryParams.push(endDate);
  }
  if (whereClauses.length > 0) {
    const whereClause = ` AND ${whereClauses.join(" AND ")}`;
    purchaseHistoryQuery += whereClause;
  }

  purchaseHistoryQuery += ` GROUP BY om.C_id, c.c_username ORDER BY totalSpent DESC LIMIT 10`;

  Promise.all([
    new Promise((resolve, reject) =>
      db.query(demographicsQuery, (err, result) => {
        if (err) {
          console.error("Demographics query error:", err);
          return reject(err);
        }
        resolve(result);
      })
    ),
    new Promise((resolve, reject) =>
      db.query(purchaseHistoryQuery, queryParams, (err, result) => {
        if (err) {
          console.error("Purchase history query error:", err);
          return reject(err);
        }
        resolve(result);
      })
    ),
  ])
    .then(([demographics, purchaseHistory]) => {
      const doc = new PDFDocument({ margin: 10 });
      let buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="customer_report.pdf"',
          "Content-Length": pdfData.length,
        });
        res.end(pdfData);
      });

      // Track page numbers dynamically
      let pageNumber = 1;

      // Define header dimensions
      const leftMargin = 50; // Match the document margin
      const rightMargin = 50;
      const logoPath = path.join(
        __dirname,
        "../public/ad-images/logo/logo.png"
      );
      const logoWidth = 100;
      const logoHeight = 100;
      const logoX = leftMargin; // Start at the left margin
      const logoY = 30; // Start at the top margin
      const textX = logoX + logoWidth + 20; // 20 units padding between logo and text
      const textY = logoY + logoHeight / 2 - 10; // Center vertically relative to the logo
      const headerHeight = logoY + logoHeight + 20; // Total height of the header

      // Function to add the header (logo and "Nature’s Palette") on a page
      const addHeader = () => {
        try {
          doc.image(logoPath, logoX, logoY, {
            width: logoWidth,
            height: logoHeight,
          });
        } catch (err) {
          console.error("Error adding logo to PDF:", err);
          doc
            .fontSize(12)
            .fillColor("red")
            .text("Logo not found", logoX, logoY, {
              width: logoWidth,
              align: "center",
            });
        }
        doc
          .fontSize(24)
          .fillColor("#2E7D32")
          .text("Nature’s Palette", textX, textY);
      };

      // Add page numbers to the footer and header on every page
      doc.on("pageAdded", () => {
        pageNumber++;
        addHeader(); // Add the header on the new page
        doc
          .fontSize(10)
          .fillColor("black")
          .text(
            `Page ${pageNumber}`,
            doc.page.width - rightMargin - 50,
            doc.page.height - 50,
            rightMargin,
            doc.y,
            { align: "right" }
          );
        doc.y = headerHeight; // Reset the cursor position below the header
      });

      // Add the header and page number to the first page
      addHeader();
      doc
        .fontSize(10)
        .fillColor("black")
        .text(
          `Page ${pageNumber}`,
          doc.page.width - rightMargin - 50,
          doc.page.height - 50,
          rightMargin,
          doc.y,
          { align: "right" }
        );
      doc.y = headerHeight; // Move the cursor below the header

      // Subheader: Customer Report and Details
      doc.fillColor("black");
      doc
        .fontSize(20)
        .text("Customer Report", leftMargin, doc.y, { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .text(`Date: ${downloadDate}`, leftMargin, doc.y, { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .text(
          `Between: ${startDate || "N/A"} to ${endDate || "N/A"}`,
          leftMargin,
          doc.y,
          { align: "center" }
        );
      doc.moveDown(0.8);

      // Customer Demographics Section
      doc
        .fontSize(14)
        .text("Customer Demographics", leftMargin, doc.y, { underline: true });
      doc.moveDown(0.5);

      demographics.forEach((item) => {
        // Estimate the height of the demographics block
        const lineHeight = 15; // Approximate height per line
        const lines = 2; // Two lines (Area ID, Customer Count)
        const blockHeight = lines * lineHeight;

        // Check if the block will fit on the page
        if (doc.y + blockHeight > doc.page.height - 50) {
          doc.addPage(); // Add a new page if the block won't fit
        }

        doc
          .fontSize(12)
          .text(`Area ID: ${item.areaId || "N/A"}`, leftMargin, doc.y);
        doc.moveDown(0.2);
        doc
          .fontSize(12)
          .text(
            `Customer Count: ${item.customerCount || 0}`,
            leftMargin,
            doc.y
          );
        doc.moveDown(1); // Blank line after each entry
      });

      doc.moveDown(0.8);

      // Purchase History Section
      doc
        .fontSize(14)
        .text("Purchase History", leftMargin, doc.y, { underline: true });
      doc.moveDown(0.5);

      purchaseHistory.forEach((item) => {
        // Estimate the height of the purchase history block
        const lineHeight = 15; // Approximate height per line
        const lines = 4; // Four lines (Customer, Customer ID, Total Orders, Total Spent)
        const blockHeight = lines * lineHeight;

        // Check if the block will fit on the page
        if (doc.y + blockHeight > doc.page.height - 50) {
          doc.addPage(); // Add a new page if the block won't fit
        }

        doc
          .fontSize(12)
          .text(
            `Customer: ${capitalizeName(item.customername)}`,
            leftMargin,
            doc.y
          );
        doc.moveDown(0.2);
        doc
          .fontSize(12)
          .text(`Customer ID: ${item.C_id || "N/A"}`, leftMargin, doc.y);
        doc.moveDown(0.2);
        doc
          .fontSize(12)
          .text(`Total Orders: ${item.totalOrders || 0}`, leftMargin, doc.y);
        doc.moveDown(0.2);
        doc.fontSize(12).text(
          `Total Spent: ${
            item.totalSpent
              ? `Rs. ${item.totalSpent.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "Rs. 0.00"
          }`,
          leftMargin,
          doc.y
        );
        doc.moveDown(1); // Blank line after each entry
      });

      doc.end();
    })
    .catch((err) => {
      console.error("Error exporting customer report as PDF:", err);
      res.status(500).json({ error: "Database error", details: err.message });
    });
};

exports.exportInventoryReportCSV = (req, res) => {
  const lowStockThreshold = 5;
  const { category } = req.query;

  // Calculate dates
  const currentDate = new Date();
  const startDate = new Date(currentDate);
  startDate.setDate(currentDate.getDate() - 30);

  const formatDate = (date) =>
    date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const downloadDate = `Downloaded on: ${formatDate(currentDate)}`;
  const reportPeriod = `${formatDate(startDate)} - ${formatDate(currentDate)}`;

  db.query("SELECT CY_ID, CY_NAME FROM category", (err, categories) => {
    if (err) {
      console.error("Error fetching categories:", err);
      return res
        .status(500)
        .json({ error: "Database error", details: err.sqlMessage });
    }

    const categoryTableMap = new Map(
      categories.map((c) => [
        c.CY_NAME,
        c.CY_NAME.toLowerCase().replace(/\s+/g, "_"),
      ])
    );

    const stockQueries = [];
    const turnoverQueries = [];
    const queryParams = [];

    for (const [categoryName, tableName] of categoryTableMap) {
      // Case-insensitive category matching
      if (category && category.toUpperCase() !== categoryName.toUpperCase()) {
        console.log(
          `Skipping category ${categoryName} (table: ${tableName}) as it does not match requested category: ${category}`
        );
        continue;
      }

      db.query(`SHOW TABLES LIKE ?`, [tableName], (err, result) => {
        if (err || result.length === 0) {
          console.log(`Table ${tableName} does not exist:`, err?.sqlMessage);
          return;
        }

        db.query(`SHOW COLUMNS FROM \`${tableName}\``, (err, columns) => {
          if (err) return;

          const columnMap = {
            id: null,
            name: null,
            stock: null,
            price: null,
          };

          columns.forEach((col) => {
            const field = col.Field.toLowerCase();
            if (field.includes("id") && !field.includes("category_id"))
              columnMap.id = col.Field;
            else if (field.includes("name")) columnMap.name = col.Field;
            else if (field.includes("stock")) columnMap.stock = col.Field;
            else if (field.includes("price")) columnMap.price = col.Field;
          });

          if (!columnMap.id || !columnMap.name || !columnMap.stock) return;

          stockQueries.push(`
            SELECT 
              \`${tableName}\`.${columnMap.id} as productId, 
              \`${tableName}\`.${columnMap.name} as productName, 
              \`${tableName}\`.${columnMap.stock} as stock,
              c.cy_id as categoryId,
              c.cy_name as categoryName 
            FROM \`${tableName}\` 
            LEFT JOIN category c ON \`${tableName}\`.category_id = c.cy_id
            WHERE \`${tableName}\`.${columnMap.stock} <= ? AND \`${tableName}\`.${columnMap.stock} >= 0
          `);
          queryParams.push(lowStockThreshold);

          turnoverQueries.push(`
            SELECT 
              \`${tableName}\`.${columnMap.id} as productId,
              \`${tableName}\`.${columnMap.name} as productName,
              \`${tableName}\`.${columnMap.stock} as stock,
              COALESCE(SUM(od.Odetails_Qty), 0) as totalSold,
              c.cy_id as categoryId,
              c.cy_name as categoryName,
              CASE 
                WHEN \`${tableName}\`.${columnMap.stock} = 0 THEN 0
                ELSE COALESCE(SUM(od.Odetails_Qty), 0) / \`${tableName}\`.${columnMap.stock}
              END as turnoverRatio
            FROM \`${tableName}\`
            LEFT JOIN category c ON \`${tableName}\`.category_id = c.cy_id
            LEFT JOIN order_details od ON \`${tableName}\`.${columnMap.id} = od.Product_id
            LEFT JOIN order_master om ON od.O_id = om.O_id 
              AND om.O_status = 'Delivered'
              AND om.O_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY \`${tableName}\`.${columnMap.id}, \`${tableName}\`.${columnMap.name}, \`${tableName}\`.${columnMap.stock}
            HAVING totalSold > 0
          `);
        });
      });
    }

    setTimeout(() => {
      if (stockQueries.length === 0) {
        console.log("No stock queries generated for category:", category);
        return res.json({ stockLevels: [], turnover: [] });
      }

      const finalStockQuery =
        stockQueries.join(" UNION ") + " ORDER BY stock ASC";
      const finalTurnoverQuery =
        turnoverQueries.join(" UNION ") + " ORDER BY totalSold DESC";

      Promise.all([
        new Promise((resolve, reject) =>
          db.query(finalStockQuery, queryParams, (err, result) =>
            err ? reject(err) : resolve(result)
          )
        ),
        new Promise((resolve, reject) =>
          db.query(finalTurnoverQuery, [], (err, result) =>
            err ? reject(err) : resolve(result)
          )
        ),
      ])
        .then(([stockLevels, turnover]) => {
          // Prepare CSV data with headers
          const csvData = [
            // Header Section
            { Title: "Nature's Palette" },
            { Title: "Inventory report" },
            { Title: downloadDate },
            { Title: reportPeriod },
            { Title: category ? `Category: ${category}` : "All Categories" }, // Add category to the report
            { Title: "" },

            // Stock Levels Section
            { Title: "Stock Levels (Low and Out of Stock)" },
            { Title: "" },
            {
              ProductID: "Product ID",
              ProductName: "Product Name",
              Stock: "Stock",
              CategoryID: "Category ID",
              CategoryName: "Category Name",
            },
            ...stockLevels.map((item) => ({
              ProductID: item.productId,
              ProductName: item.productName,
              Stock: item.stock,
              CategoryID: item.categoryId,
              CategoryName: item.categoryName,
            })),

            // Empty row for spacing
            {
              ProductID: "",
              ProductName: "",
              Stock: "",
              CategoryID: "",
              CategoryName: "",
            },
          ];

          if (turnover.length > 0) {
            csvData.push(
              { Title: "" },
              { Title: "Inventory Turnover" },
              { Title: `Inventory Report Period: (${reportPeriod})` },
              { Title: "" },
              {
                ProductID: "Product ID",
                ProductName: "Product Name",
                Stock: "Stock",
                TotalSold: "Total Sold",
                CategoryID: "Category ID",
                CategoryName: "Category Name",
                TurnoverRatio: "Turnover Ratio",
              },
              ...turnover.map((item) => ({
                ProductID: item.productId,
                ProductName: item.productName,
                Stock: item.stock,
                TotalSold: item.totalSold,
                CategoryID: item.categoryId,
                CategoryName: item.categoryName,
                TurnoverRatio: item.turnoverRatio.toFixed(2),
              }))
            );
          }

          const fields = [
            "ProductID",
            "ProductName",
            "Stock",
            "TotalSold",
            "CategoryID",
            "CategoryName",
            "TurnoverRatio",
          ];

          // Define a separate field for section headers
          const titleFields = ["Title"];
          // Create two parsers: one for section headers and one for data rows
          const titleParser = new Parser({
            fields: titleFields,
            header: false,
          });
          const dataParser = new Parser({ fields, header: false });

          // Generate CSV content manually
          let csv = "";
          csvData.forEach((row) => {
            if ("Title" in row) {
              // Use titleParser for section headers
              csv += titleParser.parse([row]) + "\n";
            } else {
              // Use dataParser for data rows
              csv += dataParser.parse([row]) + "\n";
            }
          });

          res.header("Content-Type", "text/csv");
          res.header(
            "Content-Disposition",
            `attachment; filename="inventory_report_${category || "all"}.csv"`
          );
          res.send(csv);
        })
        .catch((err) => {
          console.error("Error exporting inventory report as CSV:", err);
          res
            .status(500)
            .json({ error: "Database error", details: err.message });
        });
    }, 1000);
  });
};

const fs = require("fs");

exports.exportInventoryReportPDF = (req, res) => {
  const lowStockThreshold = 5;
  const { category } = req.query;

  // Calculate dates
  const currentDate = new Date();
  const startDate = new Date(currentDate);
  startDate.setDate(currentDate.getDate() - 30);

  const formatDate = (date) =>
    date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const downloadDate = `Downloaded on: ${formatDate(currentDate)}`;
  const reportPeriod = `Period: ${formatDate(startDate)} - ${formatDate(
    currentDate
  )}`;

  db.query("SELECT CY_ID, CY_NAME FROM category", (err, categories) => {
    if (err) {
      console.error("Error fetching categories:", err);
      return res
        .status(500)
        .json({ error: "Database error", details: err.sqlMessage });
    }

    const categoryTableMap = new Map(
      categories.map((c) => [
        c.CY_NAME,
        c.CY_NAME.toLowerCase().replace(/\s+/g, "_"),
      ])
    );

    const stockQueries = [];
    const turnoverQueries = [];
    const queryParams = [];

    for (const [categoryName, tableName] of categoryTableMap) {
      // Case-insensitive category matching
      if (category && category.toUpperCase() !== categoryName.toUpperCase()) {
        console.log(
          `Skipping category ${categoryName} (table: ${tableName}) as it does not match requested category: ${category}`
        );
        continue;
      }

      db.query(`SHOW TABLES LIKE ?`, [tableName], (err, result) => {
        if (err || result.length === 0) {
          console.log(`Table ${tableName} does not exist:`, err?.sqlMessage);
          return;
        }

        db.query(`SHOW COLUMNS FROM \`${tableName}\``, (err, columns) => {
          if (err) return;

          const columnMap = {
            id: null,
            name: null,
            stock: null,
            price: null,
          };

          columns.forEach((col) => {
            const field = col.Field.toLowerCase();
            if (field.includes("id") && !field.includes("category_id"))
              columnMap.id = col.Field;
            else if (field.includes("name")) columnMap.name = col.Field;
            else if (field.includes("stock")) columnMap.stock = col.Field;
            else if (field.includes("price")) columnMap.price = col.Field;
          });

          if (!columnMap.id || !columnMap.name || !columnMap.stock) return;

          stockQueries.push(`
            SELECT 
              \`${tableName}\`.${columnMap.id} as productId, 
              \`${tableName}\`.${columnMap.name} as productName, 
              \`${tableName}\`.${columnMap.stock} as stock,
              c.cy_id as categoryId,
              c.cy_name as categoryName 
            FROM \`${tableName}\` 
            LEFT JOIN category c ON \`${tableName}\`.category_id = c.cy_id
            WHERE \`${tableName}\`.${columnMap.stock} <= ? AND \`${tableName}\`.${columnMap.stock} >= 0
          `);
          queryParams.push(lowStockThreshold);

          turnoverQueries.push(`
            SELECT 
              \`${tableName}\`.${columnMap.id} as productId,
              \`${tableName}\`.${columnMap.name} as productName,
              \`${tableName}\`.${columnMap.stock} as stock,
              COALESCE(SUM(od.Odetails_Qty), 0) as totalSold,
              c.cy_id as categoryId,
              c.cy_name as categoryName,
              CASE 
                WHEN \`${tableName}\`.${columnMap.stock} = 0 THEN 0
                ELSE COALESCE(SUM(od.Odetails_Qty), 0) / \`${tableName}\`.${columnMap.stock}
              END as turnoverRatio
            FROM \`${tableName}\`
            LEFT JOIN category c ON \`${tableName}\`.category_id = c.cy_id
            LEFT JOIN order_details od ON \`${tableName}\`.${columnMap.id} = od.Product_id
            LEFT JOIN order_master om ON od.O_id = om.O_id 
              AND om.O_status = 'Delivered'
              AND om.O_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY \`${tableName}\`.${columnMap.id}, \`${tableName}\`.${columnMap.name}, \`${tableName}\`.${columnMap.stock}
            HAVING totalSold > 0
          `);
        });
      });
    }

    setTimeout(() => {
      if (stockQueries.length === 0) {
        console.log("No stock queries generated for category:", category);
        return res.json({ stockLevels: [], turnover: [] });
      }

      const finalStockQuery =
        stockQueries.join(" UNION ") + " ORDER BY stock ASC";
      const finalTurnoverQuery =
        turnoverQueries.join(" UNION ") + " ORDER BY totalSold DESC";

      Promise.all([
        new Promise((resolve, reject) =>
          db.query(finalStockQuery, queryParams, (err, result) =>
            err ? reject(err) : resolve(result)
          )
        ),
        new Promise((resolve, reject) =>
          db.query(finalTurnoverQuery, [], (err, result) =>
            err ? reject(err) : resolve(result)
          )
        ),
      ])
        .then(([stockLevels, turnover]) => {
          const doc = new PDFDocument({ margin: 10 });
          let buffers = [];
          doc.on("data", buffers.push.bind(buffers));
          doc.on("end", () => {
            const pdfData = Buffer.concat(buffers);
            res.writeHead(200, {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="inventory_report_${
                category || "all"
              }.pdf"`,
              "Content-Length": pdfData.length,
            });
            res.end(pdfData);
          });

          // Track the current page number
          let pageNumber = 1;
          let isStockLevelsSection = false;
          let isTurnoverSection = false;

          // Define header dimensions
          const leftMargin = 20;
          const rightMargin = 10;
          const logoPath = path.join(
            __dirname,
            "../public/ad-images/logo/logo.png"
          );
          const logoWidth = 100;
          const logoHeight = 100;
          const logoX = 30;
          const logoY = 30;
          const textX = logoX + logoWidth + 20;
          const textY = logoY + logoHeight / 2 - 10;
          const headerHeight = logoY + logoHeight + 20;

          // Function to add the header
          const addHeader = () => {
            try {
              doc.image(logoPath, logoX, logoY, {
                width: logoWidth,
                height: logoHeight,
              });
            } catch (err) {
              console.error("Error adding logo to PDF:", err);
              doc
                .fontSize(12)
                .fillColor("red")
                .text("Logo not found", logoX, logoY, {
                  width: logoWidth,
                  align: "center",
                });
            }
            doc
              .fontSize(24)
              .fillColor("#2E7D32")
              .text("Nature’s Palette", textX, textY);
          };

          // Add page numbers and header on every page
          doc.on("pageAdded", () => {
            pageNumber++;
            addHeader();
            doc
              .fontSize(10)
              .fillColor("black")
              .text(
                `Page ${pageNumber}`,
                doc.page.width - 100,
                doc.page.height - 50,
                rightMargin,
                doc.y,
                { align: "right" }
              );
            doc.y = headerHeight;
            if (isStockLevelsSection) {
              doc
                .fontSize(16)
                .fillColor("#2E7D32")
                .text(
                  "Stock Levels (Low and Out of Stock)",
                  leftMargin,
                  doc.y,
                  { underline: true }
                );
              doc.moveDown(0.5);
              doc.fillColor("black").fontSize(12);
            }
            if (isTurnoverSection) {
              doc
                .fontSize(16)
                .fillColor("#2E7D32")
                .text(
                  `Inventory Turnover (${reportPeriod})`,
                  leftMargin,
                  doc.y,
                  { underline: true }
                );
              doc.moveDown(0.5);
              doc.fillColor("black").fontSize(12);
            }
          });

          // Add the header and page number to the first page
          addHeader();
          doc
            .fontSize(10)
            .fillColor("black")
            .text(
              `Page ${pageNumber}`,
              doc.page.width - 100,
              doc.page.height - 50,
              rightMargin,
              doc.y,
              { align: "right" }
            );
          doc.y = headerHeight;

          // Subheader: Inventory Report and Details
          doc.fillColor("black");
          doc
            .fontSize(16)
            .text("Inventory Report", leftMargin, doc.y, { align: "center" });
          doc
            .fontSize(12)
            .text(downloadDate, leftMargin, doc.y, { align: "center" });
          doc
            .fontSize(12)
            .text(
              category ? `Category: ${category}` : "All Categories",
              leftMargin,
              doc.y,
              { align: "center" }
            );
          doc.moveDown(2);

          // Stock Levels Section
          isStockLevelsSection = true;
          doc
            .fontSize(16)
            .fillColor("#2E7D32")
            .text("Stock Levels (Low and Out of Stock)", leftMargin, doc.y, {
              underline: true,
            });
          doc.moveDown(0.5);
          doc.fillColor("black").fontSize(12);

          stockLevels.forEach((item, index) => {
            const lineHeight = 15;
            const lines = 4;
            const blockHeight = lines * lineHeight;
            const sectionHeaderHeight = 30;

            if (
              doc.y + blockHeight + (index === 0 ? sectionHeaderHeight : 0) >
              doc.page.height - 50
            ) {
              doc.addPage();
            }

            doc.text(`Product ID: ${item.productId}`, leftMargin, doc.y);
            doc.moveDown(0.2);
            doc.text(`Product Name: ${item.productName}`, leftMargin, doc.y);
            doc.moveDown(0.2);
            doc.text(`Stock: ${item.stock}`, leftMargin, doc.y);
            doc.moveDown(0.2);
            doc.text(
              `Category: [${item.categoryId}] ${item.categoryName}`,
              leftMargin,
              doc.y
            );
            doc.moveDown(0.2);

            if (index < stockLevels.length - 1) {
              doc.moveDown(0.5);
              doc
                .moveTo(leftMargin, doc.y)
                .lineTo(doc.page.width - leftMargin, doc.y)
                .stroke();
              doc.moveDown(0.5);
            }
          });

          isStockLevelsSection = false;
          doc.moveDown(2.5);

          // Inventory Turnover Section
          if (turnover.length > 0) {
            isTurnoverSection = true;
            doc
              .fontSize(16)
              .fillColor("#2E7D32")
              .text(`Inventory Turnover (${reportPeriod})`, leftMargin, doc.y, {
                underline: true,
              });
            doc.moveDown(0.5);
            doc.fillColor("black").fontSize(12);

            turnover.forEach((item, index) => {
              const lineHeight = 15;
              const lines = 6;
              const blockHeight = lines * lineHeight;
              const sectionHeaderHeight = 30;

              if (
                doc.y + blockHeight + (index === 0 ? sectionHeaderHeight : 0) >
                doc.page.height - 50
              ) {
                doc.addPage();
              }

              doc.text(`Product ID: ${item.productId}`, leftMargin, doc.y);
              doc.moveDown(0.2);
              doc.text(`Product Name: ${item.productName}`, leftMargin, doc.y);
              doc.moveDown(0.2);
              doc.text(`Stock: ${item.stock}`, leftMargin, doc.y);
              doc.moveDown(0.2);
              doc.text(`Total Sold: ${item.totalSold}`, leftMargin, doc.y);
              doc.moveDown(0.2);
              doc.text(
                `Category: [${item.categoryId}] ${item.categoryName}`,
                leftMargin,
                doc.y
              );
              doc.moveDown(0.2);
              doc.text(
                `Turnover Ratio: ${item.turnoverRatio.toFixed(2)}`,
                leftMargin,
                doc.y
              );
              doc.moveDown(0.2);

              if (index < turnover.length - 1) {
                doc.moveDown(0.5);
                doc
                  .moveTo(leftMargin, doc.y)
                  .lineTo(doc.page.width - leftMargin, doc.y)
                  .stroke();
                doc.moveDown(0.5);
              }
            });

            isTurnoverSection = false;
            doc.moveDown(2.5);
          }

          doc.end();
        })
        .catch((err) => {
          console.error("Error exporting inventory report as PDF:", err);
          res
            .status(500)
            .json({ error: "Database error", details: err.message });
        });
    }, 1000);
  });
};

exports.exportOrderReportCSV = (req, res) => {
  let { startDate, endDate, status, compareStartDate, compareEndDate } =
    req.query;

  // Define default dates
  const defaultStartDate = "2024-01-01";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const defaultEndDate = yesterday.toISOString().split("T")[0]; // e.g., "2025-03-25"

  // Set effective dates (for "all" selection, use defaultStartDate and defaultEndDate)
  const effectiveStartDate = startDate || defaultStartDate;
  const effectiveEndDate = endDate || defaultEndDate;

  // Current date for "Downloaded on"
  const currentDate = today.toISOString().split("T")[0]; // e.g., "2025-03-26"

  // Input validation
  if (
    status &&
    !["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].includes(
      status
    )
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid status value. Must be one of: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED",
    });
  }

  // Validate date formats (basic check for YYYY-MM-DD)
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  const datesToValidate = [
    effectiveStartDate,
    effectiveEndDate,
    compareStartDate,
    compareEndDate,
  ].filter(Boolean);
  for (const date of datesToValidate) {
    if (!dateFormatRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: `Invalid date format for ${date}. Must be YYYY-MM-DD`,
      });
    }
  }

  // Base query parameters and WHERE clauses
  const queryParams = [];
  const compareQueryParams = [];
  const whereClauses = [];
  const compareWhereClauses = [];

  // Build WHERE clauses for current period
  if (effectiveStartDate) {
    whereClauses.push("om.O_date >= ?");
    queryParams.push(effectiveStartDate);
  }
  if (effectiveEndDate) {
    whereClauses.push("om.O_date <= ?");
    queryParams.push(effectiveEndDate);
  }
  if (status) {
    whereClauses.push("om.O_status = ?");
    queryParams.push(status);
  }

  // Build WHERE clauses for comparison period
  if (compareStartDate) {
    compareWhereClauses.push("om.O_date >= ?");
    compareQueryParams.push(compareStartDate);
  }
  if (compareEndDate) {
    compareWhereClauses.push("om.O_date <= ?");
    compareQueryParams.push(compareEndDate);
  }

  // Add the "not cancelled" condition to queries that need it
  const notCancelledClause = "om.O_status != 'CANCELLED'";
  const whereClausesWithNotCancelled = [...whereClauses, notCancelledClause];
  const compareWhereClausesWithNotCancelled = [
    ...compareWhereClauses,
    notCancelledClause,
  ];

  // Construct WHERE clause strings
  const whereClause =
    whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : "";
  const whereClauseWithNotCancelled =
    whereClausesWithNotCancelled.length > 0
      ? " WHERE " + whereClausesWithNotCancelled.join(" AND ")
      : "";
  const compareWhereClauseWithNotCancelled =
    compareWhereClausesWithNotCancelled.length > 0
      ? " WHERE " + compareWhereClausesWithNotCancelled.join(" AND ")
      : "";

  // Define all queries
  const queries = {
    statusSummary: {
      sql: `
        SELECT 
          O_status as status,
          COUNT(*) as count
        FROM order_master om
        ${whereClause}
        GROUP BY O_status
      `,
      params: queryParams,
    },
    shippingDetails: {
      sql: `
        SELECT 
          om.O_id,
          om.O_date,
          om.C_id,
          COALESCE(c.C_username, 'Anonymous') as customerName,
          c.c_mobile as customerphone,
          c.C_address as customerAddress,
          c.C_pincode as customerPincode,
          dp.D_NAME as deliveryPerson,
          py.py_status as paymentstatus,
          om.O_status as status
        FROM order_master om
        LEFT JOIN customer c ON om.C_id = c.C_id
        LEFT JOIN deliveries d ON om.O_id = d.O_id
        LEFT JOIN payment py ON om.O_id = py.O_id
        LEFT JOIN delivery_persons dp ON d.D_id = dp.D_id
        ${whereClause}
        ORDER BY om.O_date DESC
      `,
      params: queryParams,
    },
    orderCount: {
      sql: `
        SELECT 
          COUNT(DISTINCT om.O_id) as orderCount
        FROM order_master om
        ${whereClause}
      `,
      params: queryParams,
    },
    totalRevenue: {
      sql: `
        SELECT 
          SUM(od.ODETAILS_PRICE * od.ODETAILS_QTY) as totalRevenue
        FROM order_master om
        JOIN order_details od ON om.O_id = od.O_id
        ${whereClause}
      `,
      params: queryParams,
    },
    ordersOverTime: {
      sql: `
        SELECT 
          DATE(om.O_date) as orderDate,
          COUNT(DISTINCT om.O_id) as orderCount
        FROM order_master om
        ${whereClauseWithNotCancelled}
        GROUP BY DATE(om.O_date)
        ORDER BY DATE(om.O_date)
      `,
      params: queryParams,
    },
    compareOrdersOverTime: {
      sql: `
        SELECT 
          DATE(om.O_date) as orderDate,
          COUNT(DISTINCT om.O_id) as orderCount
        FROM order_master om
        ${compareWhereClauseWithNotCancelled}
        GROUP BY DATE(om.O_date)
        ORDER BY DATE(om.O_date)
      `,
      params: compareQueryParams,
    },
    compareOrderCount: {
      sql: `
        SELECT 
          COUNT(DISTINCT om.O_id) as compareOrderCount
        FROM order_master om
        ${compareWhereClauseWithNotCancelled}
      `,
      params: compareQueryParams,
    },
  };

  // Execute all queries in parallel
  Promise.all(
    Object.entries(queries).map(
      ([key, { sql, params }]) =>
        new Promise((resolve, reject) => {
          db.query(sql, params, (err, result) => {
            if (err) {
              console.error(`Error executing ${key} query:`, err);
              reject(
                new Error(
                  `Failed to execute ${key} query: ${
                    err.sqlMessage || err.message
                  }`
                )
              );
            } else {
              resolve(result);
            }
          });
        })
    )
  )
    .then(
      ([
        statusSummary,
        shippingDetails,
        orderCountResult,
        totalRevenueResult,
        ordersOverTime,
        compareOrdersOverTime,
        compareOrderCountResult,
      ]) => {
        const orderCount = orderCountResult[0]?.orderCount || 0;
        const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;
        const compareOrderCount =
          compareOrderCountResult[0]?.compareOrderCount || 0;
        const refundCount =
          statusSummary.find((item) => item.status === "CANCELLED")?.count || 0;

        // Initialize the CSV content as an array of strings
        let csvContent = [];
        const formatDate = (dateString) => {
          const date = new Date(dateString);
          const day = String(date.getDate()).padStart(2, "0");
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const year = date.getFullYear();
          return `${day}-${month}-${year}`; // Format as DD-MM-YYYY
        };

        // Header
        csvContent.push("Nature’s Palette");
        csvContent.push("Order Report");
        csvContent.push(`"Downloaded on: ${currentDate}"`);
        csvContent.push(
          `"Period: ${effectiveStartDate} to ${effectiveEndDate}"`
        );
        if (compareStartDate && compareEndDate) {
          csvContent.push(
            `"Comparison Period: ${compareStartDate} to ${compareEndDate}"`
          );
        }
        csvContent.push(""); // Empty row for spacing

        // Order Summary Report Section
        csvContent.push("Order Summary Report");
        csvContent.push(
          "Order Count,Total Revenue,Average Order Value,Refunds,Comparison Order Count"
        );
        csvContent.push(
          `"${orderCount}","${totalRevenue.toLocaleString()}","${
            orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : 0
          }","${refundCount}","${compareOrderCount}"`
        );
        csvContent.push(""); // Empty row for spacing

        // Order Status Summary Section
        csvContent.push("Order Status Summary");
        csvContent.push("Status,Count");
        statusSummary.forEach((item) => {
          csvContent.push(`"${item.status}","${item.count}"`);
        });
        csvContent.push(""); // Empty row for spacing

        // Orders Over Time (Current Period)
        csvContent.push("Orders Over Time (Current Period)");
        csvContent.push("Date,Order Count");
        ordersOverTime.forEach((item) => {
          let formattedDate = formatDate(item.orderDate);
          csvContent.push(`"${formattedDate}","${item.orderCount}"`);
        });
        csvContent.push(""); // Empty row for spacing

        // Orders Over Time (Comparison Period)
        if (compareStartDate && compareEndDate) {
          csvContent.push("Orders Over Time (Comparison Period)");
          csvContent.push("Date,Order Count");
          compareOrdersOverTime.forEach((item) => {
            let formattedDate = formatDate(item.orderDate);
            csvContent.push(`"${formattedDate}","${item.orderCount}"`);
          });
          csvContent.push(""); // Empty row for spacing
        }

        // Shipping Details Section
        csvContent.push("Shipping Details");
        csvContent.push(
          "Order ID,Order Date,Customer Name,Phone,Address,Pincode,Delivery Person,Payment Status,Status"
        );
        shippingDetails.forEach((item) => {
          let formattedDate = formatDate(item.O_date);
          csvContent.push(
            `"${item.O_id}","${formattedDate}","${item.customerName.replace(
              /"/g,
              '""'
            )}","${
              item.customerphone || "N/A"
            }","${item.customerAddress.replace(/"/g, '""')}","${
              item.customerPincode || "N/A"
            }","${item.deliveryPerson || "N/A"}","${
              item.paymentstatus || "N/A"
            }","${item.status || "N/A"}"`
          );
        });

        // Join the CSV content with newlines
        const csv = csvContent.join("\n");

        res.header("Content-Type", "text/csv");
        res.header(
          "Content-Disposition",
          `attachment; filename="order_report_${currentDate}.csv"`
        );
        res.send(csv);
      }
    )
    .catch((err) => {
      console.error("Error exporting order report as CSV:", err);
      res.status(500).json({ error: "Database error", details: err.message });
    });
};

exports.exportOrderReportPDF = (req, res) => {
  let { startDate, endDate, status, compareStartDate, compareEndDate } =
    req.query;

  // Define default dates
  const defaultStartDate = "2024-01-01";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const defaultEndDate = yesterday.toISOString().split("T")[0]; // e.g., "2025-03-25"

  // Set effective dates (for "all" selection, use defaultStartDate and defaultEndDate)
  const effectiveStartDate = startDate || defaultStartDate;
  const effectiveEndDate = endDate || defaultEndDate;

  // Current date for "Downloaded on"
  const currentDate = today.toISOString().split("T")[0]; // e.g., "2025-03-26"

  // Input validation
  if (
    status &&
    !["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].includes(
      status
    )
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid status value. Must be one of: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED",
    });
  }

  // Validate date formats (basic check for YYYY-MM-DD)
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  const datesToValidate = [
    effectiveStartDate,
    effectiveEndDate,
    compareStartDate,
    compareEndDate,
  ].filter(Boolean);
  for (const date of datesToValidate) {
    if (!dateFormatRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: `Invalid date format for ${date}. Must be YYYY-MM-DD`,
      });
    }
  }

  const minDate = new Date("2024-01-01");
  const maxDate = yesterday;

  // Validate primary date range
  const start = new Date(effectiveStartDate);
  const end = new Date(effectiveEndDate);
  if (start > end) {
    return res.status(400).json({
      success: false,
      message: "Start date cannot be after end date.",
    });
  }
  if (start < minDate) {
    return res.status(400).json({
      success: false,
      message: "Start date cannot be before January 1, 2024.",
    });
  }
  if (end > maxDate) {
    return res.status(400).json({
      success: false,
      message: `End date cannot be after ${defaultEndDate} (yesterday).`,
    });
  }

  // Validate comparison date range (if provided)
  if (compareStartDate && compareEndDate) {
    const compareStart = new Date(compareStartDate);
    const compareEnd = new Date(compareEndDate);
    if (compareStart > compareEnd) {
      return res.status(400).json({
        success: false,
        message: "Comparison start date cannot be after comparison end date.",
      });
    }
    if (compareStart < minDate) {
      return res.status(400).json({
        success: false,
        message: "Comparison start date cannot be before January 1, 2024.",
      });
    }
    if (compareEnd > maxDate) {
      return res.status(400).json({
        success: false,
        message: `Comparison end date cannot be after ${defaultEndDate} (yesterday).`,
      });
    }
  }

  // Base query parameters and WHERE clauses
  const queryParams = [];
  const compareQueryParams = [];
  const whereClauses = [];
  const compareWhereClauses = [];

  // Build WHERE clauses for current period
  if (effectiveStartDate) {
    whereClauses.push("om.O_date >= ?");
    queryParams.push(effectiveStartDate);
  }
  if (effectiveEndDate) {
    whereClauses.push("om.O_date <= ?");
    queryParams.push(effectiveEndDate);
  }
  if (status) {
    whereClauses.push("om.O_status = ?");
    queryParams.push(status);
  }

  // Build WHERE clauses for comparison period
  if (compareStartDate) {
    compareWhereClauses.push("om.O_date >= ?");
    compareQueryParams.push(compareStartDate);
  }
  if (compareEndDate) {
    compareWhereClauses.push("om.O_date <= ?");
    compareQueryParams.push(compareEndDate);
  }

  // Add the "not cancelled" condition to queries that need it
  const notCancelledClause = "om.O_status != 'CANCELLED'";
  const whereClausesWithNotCancelled = [...whereClauses, notCancelledClause];
  const compareWhereClausesWithNotCancelled = [
    ...compareWhereClauses,
    notCancelledClause,
  ];

  // Construct WHERE clause strings
  const whereClause =
    whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : "";
  const whereClauseWithNotCancelled =
    whereClausesWithNotCancelled.length > 0
      ? " WHERE " + whereClausesWithNotCancelled.join(" AND ")
      : "";
  const compareWhereClauseWithNotCancelled =
    compareWhereClausesWithNotCancelled.length > 0
      ? " WHERE " + compareWhereClausesWithNotCancelled.join(" AND ")
      : "";

  // Define all queries
  const queries = {
    statusSummary: {
      sql: `
        SELECT 
          O_status as status,
          COUNT(*) as count
        FROM order_master om
        ${whereClause}
        GROUP BY O_status
      `,
      params: queryParams,
    },
    shippingDetails: {
      sql: `
        SELECT 
          om.O_id,
          om.O_date,
          om.C_id,
          COALESCE(c.C_username, 'Anonymous') as customerName,
          c.c_mobile as customerphone,
          c.C_address as customerAddress,
          c.C_pincode as customerPincode,
          dp.D_NAME as deliveryPerson,
          py.py_status as paymentstatus,
          om.O_status as status
        FROM order_master om
        LEFT JOIN customer c ON om.C_id = c.C_id
        LEFT JOIN deliveries d ON om.O_id = d.O_id
        LEFT JOIN payment py ON om.O_id = py.O_id
        LEFT JOIN delivery_persons dp ON d.D_id = dp.D_id
        ${whereClause}
        ORDER BY om.O_date DESC
      `,
      params: queryParams,
    },
    orderCount: {
      sql: `
        SELECT 
          COUNT(DISTINCT om.O_id) as orderCount
        FROM order_master om
        ${whereClause}
      `,
      params: queryParams,
    },
    totalRevenue: {
      sql: `
        SELECT 
          SUM(od.ODETAILS_PRICE * od.ODETAILS_QTY) as totalRevenue
        FROM order_master om
        JOIN order_details od ON om.O_id = od.O_id
        ${whereClause}
      `,
      params: queryParams,
    },
    ordersOverTime: {
      sql: `
        SELECT 
          DATE(om.O_date) as orderDate,
          COUNT(DISTINCT om.O_id) as orderCount
        FROM order_master om
        ${whereClauseWithNotCancelled}
        GROUP BY DATE(om.O_date)
        ORDER BY DATE(om.O_date)
      `,
      params: queryParams,
    },
    compareOrdersOverTime: {
      sql: `
        SELECT 
          DATE(om.O_date) as orderDate,
          COUNT(DISTINCT om.O_id) as orderCount
        FROM order_master om
        ${compareWhereClauseWithNotCancelled}
        GROUP BY DATE(om.O_date)
        ORDER BY DATE(om.O_date)
      `,
      params: compareQueryParams,
    },
    compareOrderCount: {
      sql: `
        SELECT 
          COUNT(DISTINCT om.O_id) as compareOrderCount
        FROM order_master om
        ${compareWhereClauseWithNotCancelled}
      `,
      params: compareQueryParams,
    },
  };

  // Define the formatDate function
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`; // Format as DD-MM-YYYY
  };

  // Execute all queries in parallel
  Promise.all(
    Object.entries(queries).map(
      ([key, { sql, params }]) =>
        new Promise((resolve, reject) => {
          db.query(sql, params, (err, result) => {
            if (err) {
              console.error(`Error executing ${key} query:`, err);
              reject(
                new Error(
                  `Failed to execute ${key} query: ${
                    err.sqlMessage || err.message
                  }`
                )
              );
            } else {
              resolve(result);
            }
          });
        })
    )
  )
    .then(
      ([
        statusSummary,
        shippingDetails,
        orderCountResult,
        totalRevenueResult,
        ordersOverTime,
        compareOrdersOverTime,
        compareOrderCountResult,
      ]) => {
        const orderCount = orderCountResult[0]?.orderCount || 0;
        const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;
        const compareOrderCount =
          compareOrderCountResult[0]?.compareOrderCount || 0;
        const refundCount =
          statusSummary.find((item) => item.status === "CANCELLED")?.count || 0;

        const doc = new PDFDocument({ margin: 10 });
        let buffers = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          const pdfData = Buffer.concat(buffers);
          res.writeHead(200, {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="order_report_${currentDate}.pdf"`,
            "Content-Length": pdfData.length,
          });
          res.end(pdfData);
        });

        // Track the current page number
        let pageNumber = 1;
        let isShippingDetailsSection = false; // Flag to track if we're in the Shipping Details section

        // Define header dimensions
        const leftMargin = 20; // Left margin for all content
        const rightMargin = 10;
        const logoPath = path.join(
          __dirname,
          "../public/ad-images/logo/logo.png"
        );
        const logoWidth = 100;
        const logoHeight = 100;
        const logoX = 30; // Start at the left margin
        const logoY = 30; // Start at the top margin
        const textX = logoX + logoWidth + 20; // 20 units padding between logo and text
        const textY = logoY + logoHeight / 2 - 10; // Center vertically relative to the logo
        const headerHeight = logoY + logoHeight + 20; // Total height of the header

        // Function to add the header (logo and "Nature’s Palette") on a page
        const addHeader = () => {
          try {
            doc.image(logoPath, logoX, logoY, {
              width: logoWidth,
              height: logoHeight,
            });
          } catch (err) {
            console.error("Error adding logo to PDF:", err);
            doc
              .fontSize(12)
              .fillColor("red")
              .text("Logo not found", logoX, logoY, {
                width: logoWidth,
                align: "center",
              });
          }
          doc
            .fontSize(24)
            .fillColor("#2E7D32")
            .text("Nature’s Palette", textX, textY);
        };

        // Add page numbers to the footer and header on every page
        doc.on("pageAdded", () => {
          pageNumber++;
          addHeader(); // Add the header on the new page
          doc
            .fontSize(10)
            .fillColor("black")
            .text(
              `Page ${pageNumber}`,
              doc.page.width - 100,
              doc.page.height - 50,
              rightMargin,
              doc.y,
              { align: "right" }
            );
          doc.y = headerHeight; // Reset the cursor position below the header
          // If we're in the Shipping Details section, re-add the section header
          if (isShippingDetailsSection) {
            doc
              .fontSize(16)
              .fillColor("#2E7D32")
              .text("Shipping Details", leftMargin, doc.y, { underline: true });
            doc.moveDown(0.5);
            doc.fillColor("black").fontSize(10);
          }
        });

        // Add the header and page number to the first page
        addHeader();
        doc
          .fontSize(10)
          .fillColor("black")
          .text(
            `Page ${pageNumber}`,
            doc.page.width - 100,
            doc.page.height - 50,
            rightMargin,
            doc.y,
            { align: "right" }
          );
        doc.y = headerHeight; // Move the cursor below the header

        // Subheader: Order Report and Details
        doc.fillColor("black");
        doc
          .fontSize(16)
          .text("Order Report", leftMargin, doc.y, { align: "center" });
        doc
          .fontSize(12)
          .text(`Downloaded on: ${currentDate}`, leftMargin, doc.y, {
            align: "center",
          });
        doc
          .fontSize(12)
          .text(
            `Period: ${effectiveStartDate} to ${effectiveEndDate}`,
            leftMargin,
            doc.y,
            { align: "center" }
          );
        if (compareStartDate && compareEndDate) {
          doc
            .fontSize(12)
            .text(
              `Comparison Period: ${compareStartDate} to ${compareEndDate}`,
              leftMargin,
              doc.y,
              { align: "center" }
            );
        }
        doc.moveDown(2);

        // Order Summary Report Section
        doc
          .fontSize(16)
          .fillColor("#2E7D32")
          .text("Order Summary Report", leftMargin, doc.y, { underline: true });
        doc.moveDown(1);
        doc.fillColor("black").fontSize(12);
        doc.text(`Order Count: ${orderCount}`, leftMargin, doc.y);
        doc.text(
          `Total Revenue: Rs. ${totalRevenue.toLocaleString()}`,
          leftMargin,
          doc.y
        );
        doc.text(
          `Average Order Value: Rs. ${
            orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : 0
          }`,
          leftMargin,
          doc.y
        );
        doc.text(`Refunds: ${refundCount}`, leftMargin, doc.y);
        doc.text(
          `Comparison Order Count: ${compareOrderCount}`,
          leftMargin,
          doc.y
        );
        doc.moveDown(2.5);

        // Order Status Summary Section
        doc
          .fontSize(16)
          .fillColor("#2E7D32")
          .text("Order Status Summary", leftMargin, doc.y, { underline: true });
        doc.moveDown(1);
        doc.fillColor("black").fontSize(12);
        statusSummary.forEach((item) => {
          doc.text(`${item.status}: ${item.count}`, leftMargin, doc.y);
        });
        doc.moveDown(2.5);

        // Orders Over Time (Current Period)
        doc
          .fontSize(16)
          .fillColor("#2E7D32")
          .text("Orders Over Time (Current Period)", leftMargin, doc.y, {
            underline: true,
          });
        doc.moveDown(1);
        doc.fillColor("black").fontSize(12);
        ordersOverTime.forEach((item) => {
          let formattedDate = formatDate(item.orderDate);
          doc.text(
            `${formattedDate}: ${item.orderCount} orders`,
            leftMargin,
            doc.y
          );
        });
        doc.moveDown(2.5);

        // Orders Over Time (Comparison Period)
        if (compareStartDate && compareEndDate) {
          doc
            .fontSize(16)
            .fillColor("#2E7D32")
            .text("Orders Over Time (Comparison Period)", leftMargin, doc.y, {
              underline: true,
            });
          doc.moveDown(1);
          doc.fillColor("black").fontSize(12);
          compareOrdersOverTime.forEach((item) => {
            let formattedDate = formatDate(item.orderDate);
            doc.text(
              ` ${formattedDate}: ${item.orderCount} orders`,
              leftMargin,
              doc.y
            );
          });
          doc.moveDown(2.5);
        }

        // Shipping Details Section
        isShippingDetailsSection = true; // Set the flag
        doc
          .fontSize(16)
          .fillColor("#2E7D32")
          .text("Shipping Details", 30, doc.y, leftMargin, doc.y, {
            underline: true,
          });
        doc.moveDown(0.5);
        doc.fillColor("black").fontSize(10);

        shippingDetails.forEach((item, index) => {
          // Estimate the height of the shipping detail block
          const lineHeight = 15; // Approximate height per line (including spacing)
          const lines = 9; // Base number of lines (Order ID, Order Date, etc.)
          // Account for potential text wrapping in the address field
          const addressLines =
            doc.heightOfString(`Address: ${item.customerAddress}`, {
              width: doc.page.width - 60,
            }) / lineHeight;
          const totalLines = lines + Math.max(0, addressLines - 1); // Add extra lines for wrapping
          const blockHeight = totalLines * lineHeight; // Total height of the block
          const sectionHeaderHeight = 30; // Height of the "Shipping Details" header (approximate)

          // Check if the current block will fit on the page
          if (
            doc.y + blockHeight + (index === 0 ? sectionHeaderHeight : 0) >
            doc.page.height - 50
          ) {
            doc.addPage(); // Add a new page if the block won't fit
          }

          let formattedDate = formatDate(item.O_date);
          doc.text(`Order ID: ${item.O_id}`, 30, doc.y);
          doc.moveDown(0.2);
          doc.text(`Order Date: ${formattedDate}`, 30, doc.y);
          doc.moveDown(0.2);
          doc.text(`Customer Name: ${item.customerName}`, 30, doc.y);
          doc.moveDown(0.2);
          doc.text(`Phone: ${item.customerphone || "N/A"}`, 30, doc.y);
          doc.moveDown(0.2);
          doc.text(`Address: ${item.customerAddress}`, 30, doc.y, {
            width: doc.page.width - 60,
          }); // Allow wrapping
          doc.moveDown(0.2);
          doc.text(`Pincode: ${item.customerPincode || "N/A"}`, 30, doc.y);
          doc.moveDown(0.2);
          doc.text(
            `Delivery Person: ${item.deliveryPerson || "N/A"}`,
            30,
            doc.y
          );
          doc.moveDown(0.2);
          doc.text(`Payment Status: ${item.paymentstatus || "N/A"}`, 30, doc.y);
          doc.moveDown(0.2);
          doc.text(`Status: ${item.status || "N/A"}`, 30, doc.y);
          doc.moveDown(0.2);

          // Add a separator line between orders (except for the last one)
          if (index < shippingDetails.length - 1) {
            doc.moveDown(0.5);
            doc
              .moveTo(30, doc.y)
              .lineTo(doc.page.width - 30, doc.y)
              .stroke();
            doc.moveDown(0.5);
          }
        });

        isShippingDetailsSection = false; // Reset the flag
        doc.end();
      }
    )
    .catch((err) => {
      console.error("Error exporting order report as PDF:", err);
      res
        .status(500)
        .json({ error: "Failed to export PDF", details: err.message });
    });
};
