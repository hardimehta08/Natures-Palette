const mysql = require("mysql");
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hetalsql@1405",
  database: "main_project",
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

    // console.log("Category Table Map:", Array.from(categoryTableMap.entries()));

    // Dynamic Total Inventory
    const inventoryPromises = [];
    for (const [categoryName, tableName] of categoryTableMap) {
      inventoryPromises.push(
        new Promise((resolve, reject) => {
          db.query(`SHOW TABLES LIKE ?`, [tableName], (err, result) => {
            if (err) {
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
              reject(err);
              return;
            }
            if (result.length === 0) {
              console.log(`Table ${tableName} does not exist.`);
              resolve([]);
              return;
            }
            const query = `
                    SELECT 
    od.Product_id,
    ${tableName}.name as productName,
    '${tableName}' as category,
    od.Odetails_Qty as totalSold,
    (od.Odetails_price * od.Odetails_Qty) as totalRevenue
FROM order_details od
JOIN order_master om ON od.O_id = om.O_id
LEFT JOIN ${tableName} ON od.Product_id = ${tableName}.id
WHERE om.O_status = 'Delivered'
                `;
            db.query(query, (err, result) => {
              if (err) {
                reject(err);
                return;
              }
              resolve(result);
            });
          });
        })
      );
    }

    // Wait for all promises to resolve
    Promise.all(bestSellersPromises)
      .then((results) => {
        // Consolidate the results from all categories
        const consolidatedResults = results.flat();
        const productsWithName = consolidatedResults.filter(
          (item) => item.productName !== null
        );
        console.log("All best sellers:", productsWithName);
        // Assuming you are sending this data to the frontend
        // e.g., res.json(consolidatedResults);
      })
      .catch((err) => {
        // Handle errors here
        console.error("Error fetching best sellers:", err);
      });

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
            db.query(dailySalesQuery, [startOfDay], (err, result) =>
              err ? reject(err) : resolve(result)
            )
          ),
          new Promise((resolve, reject) =>
            db.query(weeklySalesQuery, [startOfWeek], (err, result) =>
              err ? reject(err) : resolve(result)
            )
          ),
          new Promise((resolve, reject) =>
            db.query(monthlySalesQuery, [startOfMonth], (err, result) =>
              err ? reject(err) : resolve(result)
            )
          ),
          new Promise((resolve, reject) =>
            db.query(totalOrdersQuery, (err, result) =>
              err ? reject(err) : resolve(result)
            )
          ),
          new Promise((resolve, reject) =>
            db.query(totalActiveCustomersQuery, (err, result) =>
              err ? reject(err) : resolve(result)
            )
          ),
          new Promise((resolve, reject) =>
            db.query(salesTrendQuery, (err, result) =>
              err ? reject(err) : resolve(result)
            )
          ),
          new Promise((resolve, reject) =>
            db.query(orderStatusQuery, (err, result) =>
              err ? reject(err) : resolve(result)
            )
          ),
          new Promise((resolve, reject) =>
            db.query(recentActivityQuery, (err, result) =>
              err ? reject(err) : resolve(result)
            )
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
  console.log("Fetching categories from database...");
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching inventory categories:", err);
      return res
        .status(500)
        .json({ error: "Database error", details: err.message });
    }
    console.log("Categories fetched:", results);
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

  // Default date range if not provided
  const defaultStartDate = "2020-01-01";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const defaultEndDate = yesterday.toISOString().split("T")[0]; // e.g., "2025-03-22"

  const effectiveStartDate = startDate || defaultStartDate;
  const effectiveEndDate = endDate || defaultEndDate;

  console.log("Effective startDate:", effectiveStartDate); // Debug: Log the startDate
  console.log("Effective endDate:", effectiveEndDate); // Debug: Log the endDate

  // Calculate the number of days between startDate and endDate
  const start = new Date(effectiveStartDate);
  const end = new Date(effectiveEndDate);
  const timeDiff = Math.abs(end - start);
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // Convert milliseconds to days

  // Determine the grouping based on the date range
  let groupByFormat, dateFormat;
  if (daysDiff === 0 || daysDiff === 1) {
    groupByFormat = "hourly";
    dateFormat = "%Y-%m-%d %H:00"; // e.g., "2025-03-22 14:00"
  } else if (daysDiff <= 7) {
    groupByFormat = "daily";
    dateFormat = "%Y-%m-%d"; // e.g., "2025-03-22"
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
      return res.status(500).json({ error: "Database error", details: err.sqlMessage });
    }

    // Map CY_NAME to table name (lowercase, replace spaces with underscores)
    const tablePromises = categories.map(category => {
      const tableName = category.CY_NAME.trim().toLowerCase().replace(/\s+/g, "_");
      return new Promise((resolve) => {
        // Check if the table exists
        db.query(`SHOW TABLES LIKE ?`, [tableName], (err, result) => {
          if (err || result.length === 0) {
            console.warn(`Table ${tableName} does not exist for category ${category.CY_NAME}`);
            resolve(null); // Skip this table
          } else {
            resolve({ tableName, categoryId: category.CY_ID, categoryName: category.CY_NAME });
          }
        });
      });
    });

    Promise.all(tablePromises).then(tableResults => {
      // Filter out null results (tables that don't exist)
      const validTables = tableResults.filter(table => table !== null);

      if (validTables.length === 0) {
        return res.status(500).json({ error: "No valid category tables found" });
      }

      // Build the UNION query for the product tables
      const unionQuery = validTables
        .map(table => `SELECT id, name, category_id FROM \`${table.tableName}\``)
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

      const queryParams = [dateFormat]; // First parameter for DATE_FORMAT

      // Add date filters
      if (startDate) {
        salesQuery += ` AND om.O_date >= ?`;
        salesByProductQuery += ` AND om.O_date >= ?`;
        salesByCategoryQuery += ` AND om.O_date >= ?`;
        queryParams.push(startDate);
      }
      if (endDate) {
        salesQuery += ` AND om.O_date <= ?`;
        salesByProductQuery += ` AND om.O_date <= ?`;
        salesByCategoryQuery += ` AND om.O_date <= ?`;
        queryParams.push(endDate);
      }

      // Add GROUP BY and ORDER BY to salesQuery
      if (groupByFormat === "hourly") {
        salesQuery += ` GROUP BY DATE_FORMAT(om.O_date, '%Y-%m-%d %H:00')`;
      } else if (groupByFormat === "daily") {
        salesQuery += ` GROUP BY DATE_FORMAT(om.O_date, '%Y-%m-%d')`;
      } else if (groupByFormat === "weekly") {
        salesQuery = salesQuery.replace(
          "DATE_FORMAT(om.O_date, ?)",
          "DATE_FORMAT(om.O_date, '%Y-%u') "
        );
        queryParams[0] = "%Y-%u"; // Update the dateFormat parameter
        salesQuery += ` GROUP BY DATE_FORMAT(om.O_date, '%Y-%u')`;
      } else {
        salesQuery += ` GROUP BY DATE_FORMAT(om.O_date, '%Y-%m')`;
      }
      salesQuery += ` ORDER BY period`;

      salesByProductQuery += ` GROUP BY od.Product_id, p.name, c.CY_NAME ORDER BY totalRevenue DESC LIMIT 5`;
      salesByCategoryQuery += ` GROUP BY c.CY_NAME ORDER BY totalRevenue DESC`;

      console.log("Sales query:", salesQuery); // Debug: Log the query
      console.log("Sales by Product query:", salesByProductQuery); // Debug: Log the query
      console.log("Sales by Category query:", salesByCategoryQuery); // Debug: Log the query
      console.log("Query parameters:", queryParams); // Debug: Log the parameters

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
          db.query(salesByCategoryQuery, queryParams.slice(1), (err, result) =>
            err ? reject(err) : resolve(result)
          )
        ),
      ])
        .then(([totalSales, salesByProduct, salesByCategory]) => {
          console.log("Total Sales:", totalSales);
          console.log("Sales by Product:", salesByProduct);
          console.log("Sales by Category:", salesByCategory);

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

  // Logging for debugging
  console.log("demographicsQuery:", demographicsQuery);
  console.log("purchaseHistoryQuery:", purchaseHistoryQuery, queryParams);

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
      console.log("Demographics Data:", demographics);
      console.log("Purchase History Data:", purchaseHistory);
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
            if (field.includes("id") && !field.includes("cy_id"))
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
              '${categoryName}' as category
            FROM \`${tableName}\` 
            WHERE \`${tableName}\`.${columnMap.stock} <= ? AND \`${tableName}\`.${columnMap.stock} >= 0
          `);
          queryParams.push(lowStockThreshold);

          turnoverQueries.push(`
            SELECT 
              \`${tableName}\`.${columnMap.id} as productId,
              \`${tableName}\`.${columnMap.name} as productName,
              \`${tableName}\`.${columnMap.stock} as stock,
              COALESCE(SUM(od.Odetails_Qty), 0) as totalSold,
              '${categoryName}' as category
            FROM \`${tableName}\`
            LEFT JOIN order_details od ON \`${tableName}\`.${columnMap.id} = od.Product_id
            LEFT JOIN order_master om ON od.O_id = om.O_id AND om.O_status = 'Delivered'
            GROUP BY \`${tableName}\`.${columnMap.id}, \`${tableName}\`.${columnMap.name}, \`${tableName}\`.${columnMap.stock}
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
          const slowMoving = turnover.filter((item) => item.totalSold <= 5);
          res.json({
            stockLevels: stockLevels || [],
            turnover: turnover || [],
            slowMoving: slowMoving || [],
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

// Order Report Data
exports.getOrderReport = (req, res) => {
  const { startDate, endDate, status } = req.query;

  // Query for status summary (already exists)
  let statusQuery = `
    SELECT 
      O_status as status,
      COUNT(*) as count
    FROM order_master om
  `;

  // Query for shipping details (already exists)
  let shippingDetailsQuery = `
    SELECT 
      om.O_id,
      om.C_id,
      c.C_address as customerAddress,
      c.C_pincode as customerPincode,
      dp.D_NAME as deliveryPerson
    FROM order_master om
    JOIN customer c ON om.C_id = c.C_id
    LEFT JOIN deliveries d ON om.O_id = d.O_id
    LEFT JOIN delivery_persons dp ON d.D_id = dp.D_id
  `;

  // New query for order count
  let orderCountQuery = `
    SELECT 
      COUNT(DISTINCT om.O_id) as orderCount
    FROM order_master om
  `;

  // New query for total revenue
  let totalRevenueQuery = `
    SELECT 
      SUM(od.ODETAILS_PRICE * od.ODETAILS_QTY) as totalRevenue
    FROM order_master om
    JOIN order_details od ON om.O_id = od.O_id
  `;

  const queryParams = [];
  let whereClauses = [];

  // Build WHERE clauses for all queries
  if (startDate) {
    whereClauses.push("om.O_date >= ?");
    queryParams.push(startDate);
  }
  if (endDate) {
    whereClauses.push("om.O_date <= ?");
    queryParams.push(endDate);
  }
  if (
    status &&
    ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].includes(status)
  ) {
    whereClauses.push("om.O_status = ?");
    queryParams.push(status);
  }

  // Append WHERE clauses to all queries
  if (whereClauses.length > 0) {
    const whereClause = " WHERE " + whereClauses.join(" AND ");
    statusQuery += whereClause;
    shippingDetailsQuery += whereClause;
    orderCountQuery += whereClause;
    totalRevenueQuery += whereClause;
  }

  // Finalize queries
  statusQuery += ` GROUP BY O_status`;
  shippingDetailsQuery += ` LIMIT 10`;

  console.log("statusQuery:", statusQuery, queryParams);
  console.log("shippingDetailsQuery:", shippingDetailsQuery, queryParams);
  console.log("orderCountQuery:", orderCountQuery, queryParams);
  console.log("totalRevenueQuery:", totalRevenueQuery, queryParams);

  // Execute all queries in parallel
  Promise.all([
    new Promise((resolve, reject) =>
      db.query(statusQuery, queryParams, (err, result) =>
        err ? reject(err) : resolve(result)
      )
    ),
    new Promise((resolve, reject) =>
      db.query(shippingDetailsQuery, queryParams, (err, result) =>
        err ? reject(err) : resolve(result)
      )
    ),
    new Promise((resolve, reject) =>
      db.query(orderCountQuery, queryParams, (err, result) =>
        err ? reject(err) : resolve(result)
      )
    ),
    new Promise((resolve, reject) =>
      db.query(totalRevenueQuery, queryParams, (err, result) =>
        err ? reject(err) : resolve(result)
      )
    ),
  ])
    .then(([statusSummary, shippingDetails, orderCountResult, totalRevenueResult]) => {
      // Extract orderCount and totalRevenue from results
      const orderCount = orderCountResult[0]?.orderCount || 0;
      const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;

      res.json({
        statusSummary: statusSummary || [],
        shippingDetails: shippingDetails || [],
        orderCount: orderCount,
        totalRevenue: totalRevenue,
      });
    })
    .catch((err) => {
      console.error("Error fetching order report:", err);
      res.status(500).json({
        error: "Database error",
        details: err.sqlMessage || err.message,
      });
    });
};

// Export Sales Report as CSV
exports.exportSalesReportCSV = (req, res) => {
  const { startDate, endDate, groupBy } = req.query;

  // Default date range if not provided
  const defaultStartDate = "2020-01-01";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const defaultEndDate = yesterday.toISOString().split("T")[0]; // e.g., "2025-03-22"

  const effectiveStartDate = startDate || defaultStartDate;
  const effectiveEndDate = endDate || defaultEndDate;

  // Current date for "Downloaded on"
  const currentDate = today.toISOString().split("T")[0]; // e.g., "2025-03-24"

  // Fetch categories to build the UNION query
  db.query("SELECT CY_ID, CY_NAME FROM category", (err, categories) => {
    if (err) {
      console.error("Error fetching categories:", err);
      return res.status(500).json({ error: "Database error", details: err.sqlMessage });
    }

    // Map CY_NAME to table name (lowercase, replace spaces with underscores)
    const tablePromises = categories.map(category => {
      const tableName = category.CY_NAME.trim().toLowerCase().replace(/\s+/g, "_");
      return new Promise((resolve) => {
        // Check if the table exists
        db.query(`SHOW TABLES LIKE ?`, [tableName], (err, result) => {
          if (err || result.length === 0) {
            console.warn(`Table ${tableName} does not exist for category ${category.CY_NAME}`);
            resolve(null); // Skip this table
          } else {
            resolve({ tableName, categoryId: category.CY_ID, categoryName: category.CY_NAME });
          }
        });
      });
    });

    Promise.all(tablePromises).then(tableResults => {
      // Filter out null results (tables that don't exist)
      const validTables = tableResults.filter(table => table !== null);

      if (validTables.length === 0) {
        return res.status(500).json({ error: "No valid category tables found" });
      }

      // Build the UNION query for the product tables
      const unionQuery = validTables
        .map(table => `SELECT id, name, category_id FROM \`${table.tableName}\``)
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
            { Title: "Sales Report", Value: "" },
            { Title: "Date: ", Value: currentDate },
            { Title: "", Value: "" }, // Spacer
            { Title: "", Value: "" }, // Spacer
          ];

          // Total Sales by Period Section
          const totalSalesHeader = [
            { Title: "Total Sales by Period", Value: "" },
            { Title: "Period", Value: "Total Sales (Rs.)" },
          ];
          const totalSalesData = totalSales.map((item) => ({
            Title: item.period,
            Value: item.totalSales ? item.totalSales.toFixed(2) : "0.00",
          }));
          const totalSalesSection = [
            ...totalSalesHeader,
            ...totalSalesData,
            { Title: "", Value: "" }, // Spacer
            { Title: "", Value: "" }, // Spacer
            { Title: "", Value: "" }, // Spacer
          ];

          // Top 5 Products by Revenue Section
          const productsHeader = [
            { Title: "Top 5 Products by Revenue", Value: "" },
            { Title: "Product ID", Value: "Product Name", Category: "Category", UnitsSold: "Units Sold", Revenue: "Revenue (Rs.)" },
          ];
          const productsData = salesByProduct.map((item) => ({
            Title: item.Product_id,
            Value: item.productName || "Unknown Product",
            Category: item.categoryName || "Not Specified",
            UnitsSold: item.totalUnitsSold || 0,
            Revenue: item.totalRevenue ? item.totalRevenue.toFixed(2) : "0.00",
          }));
          const productsSection = [
            ...productsHeader,
            ...productsData,
            { Title: "", Value: "" }, // Spacer
            { Title: "", Value: "" }, // Spacer
            { Title: "", Value: "" }, // Spacer
          ];

          // Sales by Category Section
          const categoriesHeader = [
            { Title: "Sales by Category", Value: "" },
            { Title: "Category Name", Value: "Units Sold", Revenue: "Revenue (Rs.)" },
          ];
          const categoriesData = salesByCategory.map((item) => ({
            Title: item.categoryName || "Not Specified",
            Value: item.totalUnitsSold || 0,
            Revenue: item.totalRevenue ? item.totalRevenue.toFixed(2) : "0.00",
          }));
          const categoriesSection = [
            ...categoriesHeader,
            ...categoriesData,
            { Title: "", Value: "" }, // Spacer
            { Title: "", Value: "" }, // Spacer
          ];

          // Combine all sections into the final CSV data
          const csvData = [
            ...headerData,
            ...totalSalesSection,
            ...productsSection,
            ...categoriesSection,
          ];

          // Define fields for the CSV
          const fields = [
            { label: "Title", value: "Title" },
            { label: "Value", value: "Value" },
            { label: "Category", value: "Category", default: "" },
            { label: "Units Sold", value: "UnitsSold", default: "" },
            { label: "Revenue (Rs.)", value: "Revenue", default: "" },
          ];

          const json2csvParser = new Parser({ fields });
          const csv = json2csvParser.parse(csvData);

          res.header("Content-Type", "text/csv");
          res.header(
            "Content-Disposition",
            'attachment; filename="sales_report.csv"'
          );
          res.send(csv);
        })
        .catch((err) => {
          console.error("Error exporting sales report as CSV:", err);
          res.status(500).json({ error: "Database error", details: err.message });
        });
    });
  });
};
// Export Sales Report as PDF
exports.exportSalesReportPDF = (req, res) => {
  const { startDate, endDate, groupBy } = req.query;

  // Default date range if not provided
  const defaultStartDate = "2020-01-01";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const defaultEndDate = yesterday.toISOString().split("T")[0]; // e.g., "2025-03-22"

  const effectiveStartDate = startDate || defaultStartDate;
  const effectiveEndDate = endDate || defaultEndDate;

  // Current date for "Downloaded on"
  const currentDate = today.toISOString().split("T")[0]; // e.g., "2025-03-24"

  // Fetch categories to build the UNION query
  db.query("SELECT CY_ID, CY_NAME FROM category", (err, categories) => {
    if (err) {
      console.error("Error fetching categories:", err);
      return res.status(500).json({ error: "Database error", details: err.sqlMessage });
    }

    // Map CY_NAME to table name (lowercase, replace spaces with underscores)
    const tablePromises = categories.map(category => {
      const tableName = category.CY_NAME.trim().toLowerCase().replace(/\s+/g, "_");
      return new Promise((resolve) => {
        // Check if the table exists
        db.query(`SHOW TABLES LIKE ?`, [tableName], (err, result) => {
          if (err || result.length === 0) {
            console.warn(`Table ${tableName} does not exist for category ${category.CY_NAME}`);
            resolve(null); // Skip this table
          } else {
            resolve({ tableName, categoryId: category.CY_ID, categoryName: category.CY_NAME });
          }
        });
      });
    });

    Promise.all(tablePromises).then(tableResults => {
      // Filter out null results (tables that don't exist)
      const validTables = tableResults.filter(table => table !== null);

      if (validTables.length === 0) {
        return res.status(500).json({ error: "No valid category tables found" });
      }

      // Build the UNION query for the product tables
      const unionQuery = validTables
        .map(table => `SELECT id, name, category_id FROM \`${table.tableName}\``)
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
          const doc = new PDFDocument();
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

          // Header
          doc.fontSize(20).text("Sales Report", { align: "center" });
          doc.fontSize(12).text(
            `Downloaded on: ${currentDate}`,
            { align: "center" }
          );
          doc.moveDown(2);


          // Total Sales by Period
          doc.fontSize(14).text("Total Sales by Period", { underline: true });
          doc.moveDown(0.5);
          if (totalSales.length > 0) {
            totalSales.forEach((item) => {
              doc.fontSize(12).text(`Period: ${item.period}`);
              doc.fontSize(12).text(`Total Sales (Rs.): ${item.totalSales ? item.totalSales.toFixed(2) : "0.00"}`);
              doc.moveDown(0.5);
            });
          } else {
            doc.fontSize(12).text("No sales data available for the selected period.");
          }
          doc.moveDown(2);

          // Top 5 Products by Revenue
          doc.fontSize(14).text("Top 5 Products by Revenue", { underline: true });
          doc.moveDown(0.5);
          if (salesByProduct.length > 0) {
            salesByProduct.forEach((item) => {
              doc.fontSize(12).text(`Product ID: ${item.Product_id}`);
              doc.fontSize(12).text(`Product Name: ${item.productName || "Unknown Product"}`);
              doc.fontSize(12).text(`Category: ${item.categoryName || "Not Specified"}`);
              doc.fontSize(12).text(`Units Sold: ${item.totalUnitsSold || 0}`);
              doc.fontSize(12).text(`Revenue (Rs.): ${item.totalRevenue ? item.totalRevenue.toFixed(2) : "0.00"}`);
              doc.moveDown(0.5);
            });
          } else {
            doc.fontSize(12).text("No product sales data available.");
          }
          doc.moveDown(2);

          // Sales by Category
          doc.fontSize(14).text("Sales by Category", { underline: true });
          doc.moveDown(0.5);
          if (salesByCategory.length > 0) {
            salesByCategory.forEach((item) => {
              doc.fontSize(12).text(`Category Name: ${item.categoryName || "Not Specified"}`);
              doc.fontSize(12).text(`Units Sold: ${item.totalUnitsSold || 0}`);
              doc.fontSize(12).text(`Revenue (Rs.): ${item.totalRevenue ? item.totalRevenue.toFixed(2) : "0.00"}`);
              doc.moveDown(0.5);
            });
          } else {
            doc.fontSize(12).text("No category sales data available.");
          }

          doc.end();
        })
        .catch((err) => {
          console.error("Error exporting sales report as PDF:", err);
          res.status(500).json({ error: "Database error", details: err.message });
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

  console.log("demographicsQuery:", demographicsQuery);
  console.log("purchaseHistoryQuery:", purchaseHistoryQuery, queryParams);

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
      console.log("demographics:", demographics);
      console.log("purchaseHistory:", purchaseHistory);

      let csvContent = "";

      csvContent += "Customer Report\n";
      csvContent += `Date: ${downloadDate}\n`;
      csvContent += `Between: ${startDate || "N/A"} to ${endDate || "N/A"}\n\n`;

      csvContent += "Customer Demographics\n";
      const demographicsHeader = "Area ID,Customer Count\n";
      const demographicsRows = demographics.map(
        (item) => `${item.areaId || "N/A"},${item.customerCount || 0}`
      ).join("\n");
      csvContent += demographicsHeader + demographicsRows + "\n\n";

      csvContent += "Purchase History\n";
      const purchaseHistoryHeader = "Customer ID,Customer Name,Total Orders,Total Spent (Rs.)\n";
      const purchaseHistoryRows = purchaseHistory.map(
        (item) => `${item.C_id || "N/A"},${item.customername || "Unknown"},${item.totalOrders || 0},${item.totalSpent ? item.totalSpent.toFixed(2) : "0.00"}`
      ).join("\n");
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

  console.log("demographicsQuery:", demographicsQuery);
  console.log("purchaseHistoryQuery:", purchaseHistoryQuery, queryParams);

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
      const doc = new PDFDocument({ margin: 50 });
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
      doc.on("pageAdded", () => {
        pageNumber++;
      });

      // Function to add page numbers to all pages
    

      // Header
      doc.fontSize(20).text("Customer Report", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(12).text(` Date: ${downloadDate}`, { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Between: ${startDate || "N/A"} to ${endDate || "N/A"}`, { align: "center" });
      doc.moveDown(0.8); // Reduced spacing to ensure content starts on the first page

      // Customer Demographics Section
      doc.fontSize(14).text("Customer Demographics", { underline: true });
      doc.moveDown(0.5);

      demographics.forEach((item) => {
        doc.fontSize(12).text(`Area ID: ${item.areaId || "N/A"}`);
        doc.moveDown(0.2);
        doc.fontSize(12).text(`Customer Count: ${item.customerCount || 0}`);
        doc.moveDown(1); // Blank line after each entry
      });

      doc.moveDown(0.8); // Reduced spacing between sections

      // Purchase History Section
      doc.fontSize(14).text("Purchase History", { underline: true });
      doc.moveDown(0.5);

      purchaseHistory.forEach((item) => {
        doc.fontSize(12).text(`Customer: ${capitalizeName(item.customername)}`);
        doc.moveDown(0.2);
        doc.fontSize(12).text(`Customer ID: ${item.C_id || "N/A"}`);
        doc.moveDown(0.2);
        doc.fontSize(12).text(`Total Orders: ${item.totalOrders || 0}`);
        doc.moveDown(0.2);
        doc.fontSize(12).text(
          `Total Spent: ${
            item.totalSpent
              ? `Rs. ${item.totalSpent.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "Rs. 0.00"
          }`
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

// Export Inventory Report as CSV
exports.exportInventoryReportCSV = (req, res) => {
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
            if (field.includes("id") && !field.includes("cy_id"))
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
                            '${categoryName}' as category
                        FROM \`${tableName}\` 
                        WHERE \`${tableName}\`.${columnMap.stock} <= ? AND \`${tableName}\`.${columnMap.stock} >= 0
                    `);
          queryParams.push(lowStockThreshold);

          turnoverQueries.push(`
                        SELECT 
                            \`${tableName}\`.${columnMap.id} as productId,
                            \`${tableName}\`.${columnMap.name} as productName,
                            \`${tableName}\`.${columnMap.stock} as stock,
                            COALESCE(SUM(od.ODETAILS_Qty), 0) as totalSold,
                            '${categoryName}' as category
                        FROM \`${tableName}\`
                        LEFT JOIN order_details od ON \`${tableName}\`.${columnMap.id} = od.Product_id
                        LEFT JOIN order_master om ON od.O_id = om.O_id AND om.O_status = 'Delivered'
                        GROUP BY \`${tableName}\`.${columnMap.id}, \`${tableName}\`.${columnMap.name}, \`${tableName}\`.${columnMap.stock}
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
      const finalTurnoverQuery = turnoverQueries.join(" UNION ");

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
          const slowMoving = turnover.filter((item) => item.totalSold <= 5);

          const stockLevelsData = stockLevels.map((item) => ({
            Section: "Stock Levels",
            ProductID: item.productId,
            ProductName: item.productName,
            Stock: item.stock,
            Category: item.category,
          }));
          const turnoverData = turnover.map((item) => ({
            Section: "Inventory Turnover",
            ProductID: item.productId,
            ProductName: item.productName,
            Stock: item.stock,
            TotalSold: item.totalSold,
            Category: item.category,
          }));
          const slowMovingData = slowMoving.map((item) => ({
            Section: "Slow Moving Products",
            ProductID: item.productId,
            ProductName: item.productName,
            Stock: item.stock,
            TotalSold: item.totalSold,
            Category: item.category,
          }));

          const csvData = [
            ...stockLevelsData,
            { Section: "" },
            ...turnoverData,
            { Section: "" },
            ...slowMovingData,
          ];

          const fields = [
            "Section",
            "ProductID",
            "ProductName",
            "Stock",
            "TotalSold",
            "Category",
          ];
          const json2csvParser = new Parser({ fields });
          const csv = json2csvParser.parse(csvData);

          res.header("Content-Type", "text/csv");
          res.header(
            "Content-Disposition",
            'attachment; filename="inventory_report.csv"'
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

// Export Inventory Report as PDF
exports.exportInventoryReportPDF = (req, res) => {
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
            if (field.includes("id") && !field.includes("cy_id"))
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
                            '${categoryName}' as category
                        FROM \`${tableName}\` 
                        WHERE \`${tableName}\`.${columnMap.stock} <= ? AND \`${tableName}\`.${columnMap.stock} >= 0
                    `);
          queryParams.push(lowStockThreshold);

          turnoverQueries.push(`
                        SELECT 
                            \`${tableName}\`.${columnMap.id} as productId,
                            \`${tableName}\`.${columnMap.name} as productName,
                            \`${tableName}\`.${columnMap.stock} as stock,
                            COALESCE(SUM(od.ODETAILS_Qty), 0) as totalSold,
                            '${categoryName}' as category
                        FROM \`${tableName}\`
                        LEFT JOIN order_details od ON \`${tableName}\`.${columnMap.id} = od.Product_id
                        LEFT JOIN order_master om ON od.O_id = om.O_id AND om.O_status = 'Delivered'
                        GROUP BY \`${tableName}\`.${columnMap.id}, \`${tableName}\`.${columnMap.name}, \`${tableName}\`.${columnMap.stock}
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
      const finalTurnoverQuery = turnoverQueries.join(" UNION ");

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
          const slowMoving = turnover.filter((item) => item.totalSold <= 5);

          const doc = new PDFDocument();
          let buffers = [];
          doc.on("data", buffers.push.bind(buffers));
          doc.on("end", () => {
            const pdfData = Buffer.concat(buffers);
            res.writeHead(200, {
              "Content-Type": "application/pdf",
              "Content-Disposition":
                'attachment; filename="inventory_report.pdf"',
              "Content-Length": pdfData.length,
            });
            res.end(pdfData);
          });

          doc.fontSize(20).text("Inventory Report", { align: "center" });
          doc.moveDown();

          doc
            .fontSize(14)
            .text("Stock Levels (Low and Out of Stock)", { underline: true });
          doc.moveDown(0.5);
          stockLevels.forEach((item) => {
            doc
              .fontSize(12)
              .text(
                `Product: ${item.productName}, Stock: ${item.stock}, Category: ${item.category}`
              );
          });
          doc.moveDown();

          doc.fontSize(14).text("Inventory Turnover", { underline: true });
          doc.moveDown(0.5);
          turnover.forEach((item) => {
            doc
              .fontSize(12)
              .text(
                `Product: ${item.productName}, Stock: ${item.stock}, Total Sold: ${item.totalSold}, Category: ${item.category}`
              );
          });
          doc.moveDown();

          doc
            .fontSize(14)
            .text("Slow Moving Products (Total Sold ≤ 5)", { underline: true });
          doc.moveDown(0.5);
          slowMoving.forEach((item) => {
            doc
              .fontSize(12)
              .text(
                `Product: ${item.productName}, Stock: ${item.stock}, Total Sold: ${item.totalSold}, Category: ${item.category}`
              );
          });

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

// Export Order Report as CSV
exports.exportOrderReportCSV = (req, res) => {
  const { startDate, endDate, status } = req.query;

  let statusQuery = `
    SELECT 
      O_status as status,
      COUNT(*) as count
    FROM order_master om
  `;
  let shippingDetailsQuery = `
    SELECT 
      om.O_id,
      om.C_id,
      c.C_address as customerAddress,
      c.C_pincode as customerPincode,
      dp.D_NAME as deliveryPerson
    FROM order_master om
    JOIN customer c ON om.C_id = c.C_id
    LEFT JOIN deliveries d ON om.O_id = d.O_id
    LEFT JOIN delivery_persons dp ON d.D_id = dp.D_id
  `;
  let orderCountQuery = `
    SELECT 
      COUNT(DISTINCT om.O_id) as orderCount
    FROM order_master om
  `;
  let totalRevenueQuery = `
    SELECT 
      SUM(od.ODETAILS_PRICE * od.ODETAILS_QTY) as totalRevenue
    FROM order_master om
    JOIN order_details od ON om.O_id = od.O_id
  `;

  const queryParams = [];
  let whereClauses = [];

  if (startDate) {
    whereClauses.push("O_date >= ?");
    queryParams.push(startDate);
  }
  if (endDate) {
    whereClauses.push("O_date <= ?");
    queryParams.push(endDate);
  }
  if (
    status &&
    ["PLACED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].includes(status)
  ) {
    whereClauses.push("O_status = ?");
    queryParams.push(status);
  }

  if (whereClauses.length > 0) {
    const whereClause = ` WHERE ${whereClauses.join(" AND ")}`;
    statusQuery += whereClause;
    shippingDetailsQuery += whereClause;
    orderCountQuery += whereClause;
    totalRevenueQuery += whereClause;
  }

  statusQuery += ` GROUP BY O_status`;
  shippingDetailsQuery += ` LIMIT 10`;

  Promise.all([
    new Promise((resolve, reject) =>
      db.query(statusQuery, queryParams, (err, result) =>
        err ? reject(err) : resolve(result)
      )
    ),
    new Promise((resolve, reject) =>
      db.query(shippingDetailsQuery, queryParams, (err, result) =>
        err ? reject(err) : resolve(result)
      )
    ),
    new Promise((resolve, reject) =>
      db.query(orderCountQuery, queryParams, (err, result) =>
        err ? reject(err) : resolve(result)
      )
    ),
    new Promise((resolve, reject) =>
      db.query(totalRevenueQuery, queryParams, (err, result) =>
        err ? reject(err) : resolve(result)
      )
    ),
  ])
    .then(([statusSummary, shippingDetails, orderCountResult, totalRevenueResult]) => {
      const orderCount = orderCountResult[0]?.orderCount || 0;
      const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;
      const refundCount = statusSummary.find((item) => item.status === "CANCELLED")?.count || 0;
      const downloadDate = new Date().toISOString().split("T")[0]; // e.g., "2025-03-23"

      // Initialize the CSV content as an array of strings
      let csvContent = [];

      // Header
      csvContent.push("Order Report");
      csvContent.push(`"Date: ${downloadDate}"`);
      csvContent.push(""); // Empty row for spacing

      // Order Summary Report Section
      csvContent.push("Order Summary Report");
      csvContent.push("Order Count,Total Revenue,Average Order Value,Refunds");
      csvContent.push(
        `"${orderCount}","${totalRevenue}","${orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : 0}","${refundCount}"`
      );
      csvContent.push(""); // Empty row for spacing
      csvContent.push(""); // Additional empty row for separation

      // Order Status Summary Section
      csvContent.push("Order Status Summary");
      csvContent.push("Status,Count");
      statusSummary.forEach((item) => {
        csvContent.push(`"${item.status}","${item.count}"`);
      });
      csvContent.push(""); // Empty row for spacing
      csvContent.push(""); // Additional empty row for separation

      // Shipping Details Section
      csvContent.push("Shipping Details");
      csvContent.push("Order ID,Customer ID,Address,Pincode,Delivery Person");
      shippingDetails.forEach((item) => {
        csvContent.push(
          `"${item.O_id}","${item.C_id}","${item.customerAddress.replace(/"/g, '""')}",${item.customerPincode},"${item.deliveryPerson || "N/A"}"`
        );
      });

      // Join the CSV content with newlines
      const csv = csvContent.join("\n");

      res.header("Content-Type", "text/csv");
      res.header(
        "Content-Disposition",
        'attachment; filename="order_report.csv"'
      );
      res.send(csv);
    })
    .catch((err) => {
      console.error("Error exporting order report as CSV:", err);
      res.status(500).json({ error: "Database error", details: err.message });
    });
};

// Export Order Report as PDF
exports.exportOrderReportPDF = (req, res) => {
  const { startDate, endDate, status } = req.query;

  let statusQuery = `
    SELECT 
      O_status as status,
      COUNT(*) as count
    FROM order_master om
  `;
  let shippingDetailsQuery = `
    SELECT 
      om.O_id,
      om.C_id,
      c.C_address as customerAddress,
      c.C_pincode as customerPincode,
      dp.D_NAME as deliveryPerson
    FROM order_master om
    JOIN customer c ON om.C_id = c.C_id
    LEFT JOIN deliveries d ON om.O_id = d.O_id
    LEFT JOIN delivery_persons dp ON d.D_id = dp.D_id
  `;
  let orderCountQuery = `
    SELECT 
      COUNT(DISTINCT om.O_id) as orderCount
    FROM order_master om
  `;
  let totalRevenueQuery = `
    SELECT 
      SUM(od.ODETAILS_PRICE * od.ODETAILS_QTY) as totalRevenue
    FROM order_master om
    JOIN order_details od ON om.O_id = od.O_id
  `;

  const queryParams = [];
  let whereClauses = [];

  if (startDate) {
    whereClauses.push("O_date >= ?");
    queryParams.push(startDate);
  }
  if (endDate) {
    whereClauses.push("O_date <= ?");
    queryParams.push(endDate);
  }
  if (
    status &&
    ["PLACED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].includes(status)
  ) {
    whereClauses.push("O_status = ?");
    queryParams.push(status);
  }

  if (whereClauses.length > 0) {
    const whereClause = ` WHERE ${whereClauses.join(" AND ")}`;
    statusQuery += whereClause;
    shippingDetailsQuery += whereClause;
    orderCountQuery += whereClause;
    totalRevenueQuery += whereClause;
  }

  statusQuery += ` GROUP BY O_status`;
  shippingDetailsQuery += ` LIMIT 10`;

  Promise.all([
    new Promise((resolve, reject) =>
      db.query(statusQuery, queryParams, (err, result) =>
        err ? reject(err) : resolve(result)
      )
    ),
    new Promise((resolve, reject) =>
      db.query(shippingDetailsQuery, queryParams, (err, result) =>
        err ? reject(err) : resolve(result)
      )
    ),
    new Promise((resolve, reject) =>
      db.query(orderCountQuery, queryParams, (err, result) =>
        err ? reject(err) : resolve(result)
      )
    ),
    new Promise((resolve, reject) =>
      db.query(totalRevenueQuery, queryParams, (err, result) =>
        err ? reject(err) : resolve(result)
      )
    ),
  ])
    .then(([statusSummary, shippingDetails, orderCountResult, totalRevenueResult]) => {
      const orderCount = orderCountResult[0]?.orderCount || 0;
      const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;
      const refundCount = statusSummary.find((item) => item.status === "CANCELLED")?.count || 0;

      const doc = new PDFDocument({ margin: 50 });
      let buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="order_report.pdf"',
          "Content-Length": pdfData.length,
        });
        res.end(pdfData);
      });

      // Header
      doc.fontSize(20).text("Order Report", { align: "center" });
      doc.fontSize(12).text(`Date: ${new Date().toISOString().split("T")[0]}`, { align: "center" });
      doc.moveDown(2);

      // Order Summary Report Section
      doc.fontSize(16).text("Order Summary Report", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Order Count: ${orderCount}`, { indent: 20 });
      doc.fontSize(12).text(`Total Revenue: $${totalRevenue.toLocaleString()}`, { indent: 20 });
      doc.fontSize(12).text(`Average Order Value: $${orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : 0}`, { indent: 20 });
      doc.fontSize(12).text(`Refunds: ${refundCount}`, { indent: 20 });
      doc.moveDown(1.5);

      // Order Status Summary Section
      doc.fontSize(16).text("Order Status Summary", { underline: true });
      doc.moveDown(0.5);
      statusSummary.forEach((item) => {
        doc.fontSize(12).text(`Status: ${item.status}, Count: ${item.count}`, { indent: 20 });
      });
      doc.moveDown(1.5);

      // Shipping Details Section
      doc.fontSize(16).text("Shipping Details", { underline: true });
      doc.moveDown(0.5);
      shippingDetails.forEach((item, index) => {
        doc.fontSize(12).text(`Order ID: ${item.O_id}`, { indent: 20 });
        doc.fontSize(12).text(`Customer ID: ${item.C_id}`, { indent: 20 });
        doc.fontSize(12).text(`Address: ${item.customerAddress}`, { indent: 20 });
        doc.fontSize(12).text(`Pincode: ${item.customerPincode}`, { indent: 20 });
        doc.fontSize(12).text(`Delivery Person: ${item.deliveryPerson || "N/A"}`, { indent: 20 });
        // Add space after each record, but not after the last one
        if (index < shippingDetails.length - 1) {
          doc.moveDown(1); // Adds an empty line between records
        }
      });

      doc.end();
    })
    .catch((err) => {
      console.error("Error exporting order report as PDF:", err);
      res.status(500).json({ error: "Database error", details: err.message });
    });
};
