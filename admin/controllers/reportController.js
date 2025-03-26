const mysql = require("mysql");
const { Parser } = require("json2csv");
const path = require("path");
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
        WHERE om.O_status = 'DELIVERED' AND om.O_date >= ?
    `;
  const weeklySalesQuery = `
        SELECT SUM(od.Odetails_price * od.Odetails_Qty) as totalSales
        FROM order_details od
        JOIN order_master om ON od.O_id = om.O_id
        WHERE om.O_status = 'DELIVERED' AND om.O_date >= ?
    `;
  const monthlySalesQuery = `
        SELECT SUM(od.Odetails_price * od.Odetails_Qty) as totalSales
        FROM order_details od
        JOIN order_master om ON od.O_id = om.O_id
        WHERE om.O_status = 'DELIVERED' AND om.O_date >= ?
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
  const { startDate, endDate, status, compareStartDate, compareEndDate } = req.query;

  // Input validation
  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: "Start date and end date are required",
    });
  }

  if (status && !["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value. Must be one of: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED",
    });
  }

  // Validate date formats (basic check for YYYY-MM-DD)
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  const datesToValidate = [startDate, endDate, compareStartDate, compareEndDate].filter(Boolean);
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
  const compareWhereClausesWithNotCancelled = [...compareWhereClauses, notCancelledClause];

  // Construct WHERE clause strings
  const whereClause = whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : "";
  const whereClauseWithNotCancelled = whereClausesWithNotCancelled.length > 0 ? " WHERE " + whereClausesWithNotCancelled.join(" AND ") : "";
  const compareWhereClauseWithNotCancelled = compareWhereClausesWithNotCancelled.length > 0 ? " WHERE " + compareWhereClausesWithNotCancelled.join(" AND ") : "";

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

  // Log queries for debugging
  Object.entries(queries).forEach(([key, { sql, params }]) => {
    console.log(`${key} Query:`, sql);
    console.log(`${key} Params:`, params);
  });

  // Execute all queries in parallel
  Promise.all(
    Object.entries(queries).map(([key, { sql, params }]) =>
      new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
          if (err) {
            console.error(`Error executing ${key} query:`, err);
            reject(new Error(`Failed to execute ${key} query: ${err.sqlMessage || err.message}`));
          } else {
            resolve(result);
          }
        });
      })
    )
  )
    .then(([statusSummary, shippingDetails, orderCountResult, totalRevenueResult, ordersOverTime, compareOrdersOverTime, compareOrderCountResult]) => {
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
    })
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
  let { startDate, endDate, status, compareStartDate, compareEndDate } = req.query;

  // Define default dates
  const defaultStartDate = "2024-01-01";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const defaultEndDate = yesterday.toISOString().split("T")[0]; // e.g., "2025-03-25"

  // Set effective dates
  const effectiveStartDate = startDate || defaultStartDate;
  const effectiveEndDate = endDate || defaultEndDate;

  // Current date for "Downloaded on"
  const currentDate = today.toISOString().split("T")[0]; // e.g., "2025-03-26"

  // Input validation
  if (status && !["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value. Must be one of: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED",
    });
  }

  // Validate date formats (basic check for YYYY-MM-DD)
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  const datesToValidate = [effectiveStartDate, effectiveEndDate, compareStartDate, compareEndDate].filter(Boolean);
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
  const compareWhereClausesWithNotCancelled = [...compareWhereClauses, notCancelledClause];

  // Construct WHERE clause strings
  const whereClause = whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : "";
  const whereClauseWithNotCancelled = whereClausesWithNotCancelled.length > 0 ? " WHERE " + whereClausesWithNotCancelled.join(" AND ") : "";
  const compareWhereClauseWithNotCancelled = compareWhereClausesWithNotCancelled.length > 0 ? " WHERE " + compareWhereClausesWithNotCancelled.join(" AND ") : "";

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
    Object.entries(queries).map(([key, { sql, params }]) =>
      new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
          if (err) {
            console.error(`Error executing ${key} query:`, err);
            reject(new Error(`Failed to execute ${key} query: ${err.sqlMessage || err.message}`));
          } else {
            resolve(result);
          }
        });
      })
    )
  )
    .then(([statusSummary, shippingDetails, orderCountResult, totalRevenueResult, ordersOverTime, compareOrdersOverTime, compareOrderCountResult]) => {
      const orderCount = orderCountResult[0]?.orderCount || 0;
      const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;
      const compareOrderCount = compareOrderCountResult[0]?.compareOrderCount || 0;
      const refundCount = statusSummary.find((item) => item.status === "CANCELLED")?.count || 0;

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
      csvContent.push(`"Downloaded on: ${currentDate}"`); // Updated to "Downloaded on"
      csvContent.push(`"Period: ${effectiveStartDate} to ${effectiveEndDate}"`);
      if (compareStartDate && compareEndDate) {
        csvContent.push(`"Comparison Period: ${compareStartDate} to ${compareEndDate}"`);
      }
      csvContent.push(""); // Empty row for spacing

      // Order Summary Report Section
      csvContent.push("Order Summary Report");
      csvContent.push("Order Count,Total Revenue,Average Order Value,Refunds,Comparison Order Count");
      csvContent.push(
        `"${orderCount}","${totalRevenue.toLocaleString()}","${orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : 0}","${refundCount}","${compareOrderCount}"`
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
        csvContent.push(`"${item.orderDate}","${item.orderCount}"`);
      });
      csvContent.push(""); // Empty row for spacing

      // Orders Over Time (Comparison Period)
      if (compareStartDate && compareEndDate) {
        csvContent.push("Orders Over Time (Comparison Period)");
        csvContent.push("Date,Order Count");
        compareOrdersOverTime.forEach((item) => {
          csvContent.push(`"${item.orderDate}","${item.orderCount}"`);
        });
        csvContent.push(""); // Empty row for spacing
      }

      // Shipping Details Section
      csvContent.push("Shipping Details");
      csvContent.push("Order ID,Order Date,Customer Name,Phone,Address,Pincode,Delivery Person,Payment Status,Status");
      shippingDetails.forEach((item) => {
        let formattDate=formatDate(item.O_date);
        csvContent.push(
          `"${item.O_id}","${formattDate}","${item.customerName.replace(/"/g, '""')}","${item.customerphone || "N/A"}","${item.customerAddress.replace(/"/g, '""')}","${item.customerPincode || "N/A"}","${item.deliveryPerson || "N/A"}","${item.paymentstatus || "N/A"}","${item.status || "N/A"}"`
        );
      });

      // Join the CSV content with newlines
      const csv = csvContent.join("\n");

      res.header("Content-Type", "text/csv");
      res.header(
        "Content-Disposition",
        `attachment; filename="order_report_${currentDate}.csv"` // Updated to use currentDate
      );
      res.send(csv);
    })
    .catch((err) => {
      console.error("Error exporting order report as CSV:", err);
      res.status(500).json({ error: "Database error", details: err.message });
    });
};

exports.exportOrderReportPDF = (req, res) => {
  let { startDate, endDate, status, compareStartDate, compareEndDate } = req.query;

  // Define default dates
  const defaultStartDate = "2024-01-01";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const defaultEndDate = yesterday.toISOString().split("T")[0]; // e.g., "2025-03-25"

  // Set effective dates
  const effectiveStartDate = startDate || defaultStartDate;
  const effectiveEndDate = endDate || defaultEndDate;

  // Current date for "Downloaded on"
  const currentDate = today.toISOString().split("T")[0]; // e.g., "2025-03-26"

  // Input validation
  if (status && !["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value. Must be one of: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED",
    });
  }

  // Validate date formats (basic check for YYYY-MM-DD)
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  const datesToValidate = [effectiveStartDate, effectiveEndDate, compareStartDate, compareEndDate].filter(Boolean);
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
  const compareWhereClausesWithNotCancelled = [...compareWhereClauses, notCancelledClause];

  // Construct WHERE clause strings
  const whereClause = whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : "";
  const whereClauseWithNotCancelled = whereClausesWithNotCancelled.length > 0 ? " WHERE " + whereClausesWithNotCancelled.join(" AND ") : "";
  const compareWhereClauseWithNotCancelled = compareWhereClausesWithNotCancelled.length > 0 ? " WHERE " + compareWhereClausesWithNotCancelled.join(" AND ") : "";

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
    Object.entries(queries).map(([key, { sql, params }]) =>
      new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
          if (err) {
            console.error(`Error executing ${key} query:`, err);
            reject(new Error(`Failed to execute ${key} query: ${err.sqlMessage || err.message}`));
          } else {
            resolve(result);
          }
        });
      })
    )
  )
    .then(([statusSummary, shippingDetails, orderCountResult, totalRevenueResult, ordersOverTime, compareOrdersOverTime, compareOrderCountResult]) => {
      const orderCount = orderCountResult[0]?.orderCount || 0;
      const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;
      const compareOrderCount = compareOrderCountResult[0]?.compareOrderCount || 0;
      const refundCount = statusSummary.find((item) => item.status === "CANCELLED")?.count || 0;

      const doc = new PDFDocument({ margin: 30 });
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
      const logoPath = path.join(__dirname, "../public/ad-images/logo/logo.png");
      const logoWidth = 100;
      const logoHeight = 100;
      const logoX = 30; // Start at the left margin
      const logoY = 30; // Start at the top margin
      const textX = logoX + logoWidth + 20; // 20 units padding between logo and text
      const textY = logoY + (logoHeight / 2) - 10; // Center vertically relative to the logo
      const headerHeight = logoY + logoHeight + 20; // Total height of the header

      // Function to add the header (logo and "Nature’s Palette") on a page
      const addHeader = () => {
        try {
          doc.image(logoPath, logoX, logoY, { width: logoWidth, height: logoHeight });
        } catch (err) {
          console.error("Error adding logo to PDF:", err);
          doc.fontSize(12).fillColor("red").text("Logo not found", logoX, logoY, { width: logoWidth, align: "center" });
        }
        doc.fontSize(24).fillColor("#2E7D32").text("Nature’s Palette", textX, textY);
      };

      // Add page numbers to the footer and header on every page
      doc.on("pageAdded", () => {
        pageNumber++;
        addHeader(); // Add the header on the new page
        doc.fontSize(10).fillColor("black").text(`Page ${pageNumber}`, doc.page.width - 100, doc.page.height - 50, { align: "right" });
        doc.y = headerHeight; // Reset the cursor position below the header
        // If we're in the Shipping Details section, re-add the section header
        if (isShippingDetailsSection) {
          doc.fontSize(16).fillColor("#2E7D32").text("Shipping Details (continued)", { underline: true });
          doc.moveDown(0.5);
          doc.fillColor("black").fontSize(10);
        }
      });

      // Add the header and page number to the first page
      addHeader();
      doc.fontSize(10).fillColor("black").text(`Page ${pageNumber}`, doc.page.width - 100, doc.page.height - 50, { align: "right" });
      doc.y = headerHeight; // Move the cursor below the header

      // Subheader: Order Report and Details
      doc.fillColor("black");
      doc.fontSize(16).text("Order Report", { align: "center" });
      doc.fontSize(12).text(`Downloaded on: ${currentDate}`, { align: "center" });
      doc.fontSize(12).text(`Period: ${effectiveStartDate} to ${effectiveEndDate}`, { align: "center" });
      if (compareStartDate && compareEndDate) {
        doc.fontSize(12).text(`Comparison Period: ${compareStartDate} to ${compareEndDate}`, { align: "center" });
      }
      doc.moveDown(2);

      // Order Summary Report Section
      doc.fontSize(16).fillColor("#2E7D32").text("Order Summary Report", { underline: true });
      doc.moveDown(0.5);
      doc.fillColor("black").fontSize(12);
      doc.text(`Order Count: ${orderCount}`);
      doc.text(`Total Revenue: Rs. ${totalRevenue.toLocaleString()}`);
      doc.text(`Average Order Value: Rs. ${orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : 0}`);
      doc.text(`Refunds: ${refundCount}`);
      doc.text(`Comparison Order Count: ${compareOrderCount}`);
      doc.moveDown(1.5);

      // Order Status Summary Section
      doc.fontSize(16).fillColor("#2E7D32").text("Order Status Summary", { underline: true });
      doc.moveDown(0.5);
      doc.fillColor("black").fontSize(12);
      statusSummary.forEach(item => {
        doc.text(`- ${item.status}: ${item.count}`);
      });
      doc.moveDown(1.5);

      // Orders Over Time (Current Period)
      doc.fontSize(16).fillColor("#2E7D32").text("Orders Over Time (Current Period)", { underline: true });
      doc.moveDown(0.5);
      doc.fillColor("black").fontSize(12);
      ordersOverTime.forEach(item => {
        let formattedDate = formatDate(item.orderDate);
        doc.text(`- ${formattedDate}: ${item.orderCount} orders`);
      });
      doc.moveDown(1.5);

      // Orders Over Time (Comparison Period)
      if (compareStartDate && compareEndDate) {
        doc.fontSize(16).fillColor("#2E7D32").text("Orders Over Time (Comparison Period)", { underline: true });
        doc.moveDown(0.5);
        doc.fillColor("black").fontSize(12);
        compareOrdersOverTime.forEach(item => {
          let formattedDate = formatDate(item.orderDate);
          doc.text(`- ${formattedDate}: ${item.orderCount} orders`);
        });
        doc.moveDown(1.5);
      }

      // Shipping Details Section
      isShippingDetailsSection = true; // Set the flag
      doc.fontSize(16).fillColor("#2E7D32").text("Shipping Details", { underline: true });
      doc.moveDown(0.5);
      doc.fillColor("black").fontSize(10);

      shippingDetails.forEach((item, index) => {
        // Estimate the height of the shipping detail block
        const lineHeight = 15; // Approximate height per line (including spacing)
        const lines = 9; // Base number of lines (Order ID, Order Date, etc.)
        // Account for potential text wrapping in the address field
        const addressLines = doc.heightOfString(`Address: ${item.customerAddress}`, { width: doc.page.width - 60 }) / lineHeight;
        const totalLines = lines + Math.max(0, addressLines - 1); // Add extra lines for wrapping
        const blockHeight = totalLines * lineHeight; // Total height of the block
        const sectionHeaderHeight = 30; // Height of the "Shipping Details" header (approximate)

        // Check if the current block will fit on the page
        if (doc.y + blockHeight + (index === 0 ? sectionHeaderHeight : 0) > doc.page.height - 50) {
          doc.addPage(); // Add a new page if the block won't fit
        }

        let formattedDate = formatDate(item.O_date);
        doc.text(`Order ID: ${item.O_id}`);
        doc.moveDown(0.2);
        doc.text(`Order Date: ${formattedDate}`);
        doc.moveDown(0.2);
        doc.text(`Customer Name: ${item.customerName}`);
        doc.moveDown(0.2);
        doc.text(`Phone: ${item.customerphone || "N/A"}`);
        doc.moveDown(0.2);
        doc.text(`Address: ${item.customerAddress}`, { width: doc.page.width - 60 }); // Allow wrapping
        doc.moveDown(0.2);
        doc.text(`Pincode: ${item.customerPincode || "N/A"}`);
        doc.moveDown(0.2);
        doc.text(`Delivery Person: ${item.deliveryPerson || "N/A"}`);
        doc.moveDown(0.2);
        doc.text(`Payment Status: ${item.paymentstatus || "N/A"}`);
        doc.moveDown(0.2);
        doc.text(`Status: ${item.status || "N/A"}`);
        doc.moveDown(0.2);

        // Add a separator line between orders (except for the last one)
        if (index < shippingDetails.length - 1) {
          doc.moveDown(0.5);
          doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke();
          doc.moveDown(0.5);
        }

        // Debug: Log the cursor position and page number
        console.log(`Shipping Detail ${index + 1}: doc.y = ${doc.y}, Page = ${pageNumber}`);
      });

      isShippingDetailsSection = false; // Reset the flag
      doc.end();
    })
    .catch((err) => {
      console.error("Error exporting order report as PDF:", err);
      res.status(500).json({ error: "Failed to export PDF", details: err.message });
    });
};
