const mysql = require("mysql");
const fs = require("fs");
const path = require("path");
const formidable = require("formidable");
// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hetalsql@1405",
  database: "main_project",
});

const getProductsByTable = (req, res) => {
  const viewName = req.params.tableName;
  const page = parseInt(req.query.page) || 1;
  const productId = req.query.productId || ""; // Get the productId from query parameters
  const limit = 10;
  const offset = (page - 1) * limit;

  if (!/^[a-z_]+$/.test(viewName)) {
    return res.status(400).json({ error: "Invalid view name" });
  }

  db.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_NAME = ?`,
    [viewName],
    (err, viewResult) => {
      if (err) {
        console.error("Error checking view existence:", err);
        return res
          .status(500)
          .json({ error: "Database error", details: err.message });
      }
      if (viewResult.length === 0) {
        return res
          .status(404)
          .json({ error: `View '${viewName}' does not exist.` });
      }

      db.query(`SHOW COLUMNS FROM ${viewName}`, (err, columns) => {
        if (err) {
          console.error("Error fetching view schema:", err);
          return res
            .status(500)
            .json({ error: "Database error", details: err.message });
        }

        const columnMap = {
          id: null,
          name: null,
          desc: null,
          price: null,
          stock: null,
        };

        columns.forEach((col) => {
          const field = col.Field.toLowerCase();
          if (field.includes("id")) columnMap.id = col.Field;
          else if (field.includes("name")) columnMap.name = col.Field;
          else if (field.includes("desc")) columnMap.desc = col.Field;
          else if (field.includes("price")) columnMap.price = col.Field;
          else if (field.includes("stock")) columnMap.stock = col.Field;
        });

        if (!columnMap.id || !columnMap.name || !columnMap.price) {
          return res.status(400).json({
            error: `Required columns (id, name, price) not found in view '${viewName}'`,
          });
        }

        // Base query
        let productQuery = `
          SELECT 
            v.id AS Product_id, 
            v.name AS product_name, 
            v.description, 
            v.price, 
            v.stock,
            i.PATH1 AS image,
            c.CY_NAME AS category
          FROM ${viewName} v
          LEFT JOIN image i ON v.id = i.product_id
          LEFT JOIN category c ON v.Category_id = c.CY_ID
        `;

        const queryParams = [];

        // Add WHERE clause for productId if provided
        if (productId) {
          productQuery += ` WHERE v.id = ?`;
          queryParams.push(productId);
        }

        // Add LIMIT and OFFSET for pagination (only if no productId is provided)
        if (!productId) {
          productQuery += ` LIMIT ${limit} OFFSET ${offset}`;
        }

        // Query to get total count (for pagination, only needed if no productId)
        const countQuery = `SELECT COUNT(*) as total FROM ${viewName} v`;
        let totalCount = 0;

        db.query(countQuery, (err, countResult) => {
          if (err) {
            console.error("Error fetching total count:", err);
            return res
              .status(500)
              .json({ error: "Database error", details: err.message });
          }
          totalCount = countResult[0].total;

          // Fetch the products
          db.query(productQuery, queryParams, (err, results) => {
            if (err) {
              console.error("Error fetching products:", err);
              return res
                .status(500)
                .json({ error: "Internal server error", details: err.message });
            }

            // Process BLOB data to Base64
            const processedResults = results.map((row) => {
              if (row.image) {
                row.image = Buffer.from(row.image).toString();
              }
              return row;
            });

            // If searching by productId, pagination is not needed
            const totalPages = productId ? 1 : Math.ceil(totalCount / limit);
            res.json({
              products: processedResults,
              totalPages: totalPages,
              currentPage: page,
            });
          });
        });
      });
    }
  );
};

const getCategories = (req, res) => {
  db.query("SELECT CY_ID,CY_NAME FROM category", (err, results) => {
    if (err) {
      console.error("Error fetching categories:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
};

const getAllCategories = (req, res) => {
  db.query("SELECT CY_ID,CY_NAME FROM category", (err, results) => {
    if (err) {
      console.error("Error fetching categories:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
};

// Fetch Subcategories for a Category
const getSubcategories = (req, res) => {
  const categoryId = req.params.cy_id;
  db.query(
    "SELECT * FROM subcategory WHERE cy_id = ?",
    [categoryId],
    (err, results) => {
      if (err) {
        console.error("Error fetching subcategories:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(results);
    }
  );
};

// Fetch Sub-Subcategories for a Subcategory
const getSubSubcategories = (req, res) => {
  const subcategoryId = req.params.sub_id;
  db.query(
    "SELECT * FROM subsubcategory WHERE sub_id = ?",
    [subcategoryId],
    (err, results) => {
      if (err) {
        console.error("Error fetching sub-subcategories:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(results);
    }
  );
};

const getField = async (req, res) => {
  const { category } = req.query;

  if (!category) {
    return res
      .status(400)
      .json({ success: false, error: "Category is required" });
  }

  try {
    // Fetch column details
    db.query(`SHOW COLUMNS FROM \`${category}\``, (error, results) => {
      if (error) {
        console.error("Error fetching fields:", error);
        return res.json({ success: false, error: "Database error" });
      }

      const formattedFields = results.map((field) => ({
        name: field.Field,
        type: field.Type.includes("int") ? "INT" : "VARCHAR",
      }));

      // Fetch the last ID from the table
      db.query(
        `SELECT MAX(id) AS lastId FROM \`${category}\``,
        (idError, idResult) => {
          if (idError) {
            console.error("Error fetching last ID:", idError);
            return res.json({ success: false, error: "Database error" });
          }

          const lastId = idResult[0]?.lastId || null; // Handle cases with no records

          res.json({
            success: true,
            fields: formattedFields,
            lastId: lastId,
          });
        }
      );
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

const addProduct = (req, res) => {
  const form = new formidable.IncomingForm({ multiples: true, keepExtensions: true });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error("🔴 Form Parsing Error:", err);
      return res.status(400).json({ success: false, error: "Invalid form data" });
    }

    console.log("🟢 Received Fields:", fields);
    console.log("🟢 Received Files:", files);

    let { category_id, productData } = fields;
    if (!category_id || !productData) {
      return res.status(400).json({ success: false, error: "Missing required product details." });
    }

    productData = JSON.parse(productData); // ✅ Convert productData JSON string back to object
    delete productData.prod_img1;
    delete productData.prod_img2;
    delete productData.prod_img3;
    delete productData.CY_ID;

    db.query("SELECT CY_NAME FROM category WHERE CY_ID = ?", [category_id], (err, rows) => {
      if (err) {
        console.error("🔴 Database Error Fetching Category:", err);
        return res.status(500).json({ success: false, error: "Database error" });
      }

      if (rows.length === 0) {
        return res.status(400).json({ success: false, error: "Invalid category ID" });
      }

      const categoryName = rows[0].CY_NAME;
      console.log("🟢 Resolved Category Name:", categoryName);
      let tableName = categoryName.toLowerCase().replace(/\s+/g, "_");

      db.query(`SHOW KEYS FROM ${tableName}_table WHERE Key_name = 'PRIMARY'`, (err, keyResults) => {
        if (err) {
          console.error("🔴 Error Fetching Primary Key:", err);
          return res.status(500).json({ success: false, error: "Database error" });
        }

        if (keyResults.length === 0) {
          return res.status(500).json({ success: false, error: "No primary key found for the category table" });
        }

        const query = `INSERT INTO ${tableName} SET ?`; // Adjusted table name to include "_table"
        db.query(query, productData, (err, result) => {
          if (err) {
            console.error("🔴 Error Inserting Product:", err);
            return res.status(500).json({ success: false, error: "Database error" });
          }

          console.log("🟢 Product Inserted Successfully:", productData);

          // ✅ Process Images, passing categoryName
          const uploadedFiles = files.images instanceof Array ? files.images : [files.images];
          if (uploadedFiles.length > 0) {
            insertImages(productData.id, uploadedFiles, categoryName, res); // Pass categoryName
          } else {
            res.json({ success: true, message: "Product added successfully (no images provided).", productId: productData.id });
          }
        });
      });
    });
  });
};

// ✅ Function to Insert Images
async function insertImages(productId, uploadedFiles, categoryName, res) {
  console.log("🟢 Function insertImages Called");

  // Ensure categoryName is a valid string
  if (!categoryName || typeof categoryName !== "string") {
    console.error("🔴 Error: categoryName is invalid:", categoryName);
    return res.status(400).json({ error: "Invalid category name" });
  }

  // Format category name for file path
  const formattedCategoryName = categoryName.toLowerCase().replace(/\s+/g, "_"); // e.g., "Bouquet"
  const directoryPath = path.join(
    __dirname,
    "../../public/Database",
    formattedCategoryName,
    productId
  );

  // Ensure the directory exists
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  console.log("🟡 Target Directory:", directoryPath);

  // Delete old images before adding new ones
  db.query(`SELECT * FROM image WHERE PRODUCT_ID = ?`, [productId], (err, result) => {
    if (err) {
      console.error("🔴 Error Fetching Existing Images:", err);
      return res.status(500).json({ error: "Failed to fetch existing images" });
    }

    if (result.length > 0) {
      const oldImagePaths = Object.values(result[0]).filter((path) => path && path.startsWith("Database"));
      
      oldImagePaths.forEach((imagePath) => {
        const fullPath = path.join(__dirname, "../../public", imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath); // Delete old image
          console.log(`🗑️ Deleted Old Image: ${fullPath}`);
        }
      });

      // Delete the existing database record
      db.query(`DELETE FROM image WHERE PRODUCT_ID = ?`, [productId], (err) => {
        if (err) {
          console.error("🔴 Error Deleting Old Image Records:", err);
        } else {
          console.log("✅ Old Image Records Deleted Successfully");
        }
      });
    }

    // Now, Insert New Images
    saveNewImages(productId, uploadedFiles, formattedCategoryName, directoryPath, res);
  });
}

// Helper Function to Save New Images
function saveNewImages(productId, uploadedFiles, formattedCategoryName, directoryPath, res) {
  db.query(
    `SELECT IMG_ID FROM image ORDER BY CAST(SUBSTRING(IMG_ID, 4) AS UNSIGNED) DESC LIMIT 1`,
    (err, imgResult) => {
      if (err) {
        console.error("🔴 Database Error Fetching Last IMG_ID:", err);
        return res.status(500).json({ error: "Database error" });
      }

      let newImgId =
        imgResult.length > 0
          ? `IMG${String(parseInt(imgResult[0].IMG_ID.replace(/\D/g, ""), 10) + 1).padStart(3, "0")}`
          : "IMG001";

      console.log("🟢 Generated New Image ID:", newImgId);

      const imageInsertData = [];
      let saveCount = 0;

      uploadedFiles.forEach((file, idx) => {
        if (!file || !file.filepath) {
          console.error(`🔴 Image ${idx + 1} is missing or invalid format:`, file);
          return;
        }

        const extension = path.extname(file.originalFilename) || ".jpg"; // Default to .jpg
        const imageFileName = `${idx + 1}${extension}`; // e.g., "1.jpg", "2.jpg"
        const targetPath = path.join(directoryPath, imageFileName);

        // Construct the database path
        const relativePath = `Database/${formattedCategoryName}/${productId}/${imageFileName}`;

        console.log(`🟡 Saving File: ${targetPath}`);

        // Move the file to the target directory
        fs.rename(file.filepath, targetPath, (err) => {
          if (err) {
            console.error(`🔴 Error Moving Image ${file.filepath}:`, err);
            return;
          }

          imageInsertData.push(relativePath);
          saveCount++;

          if (saveCount === uploadedFiles.length) {
            console.log("🟢 All Images Processed, Preparing to Insert into Database");

            if (imageInsertData.length === 0) {
              return res.status(500).json({ error: "No images were saved." });
            }

            // Insert into DB
            const columns = imageInsertData.map((_, i) => `PATH${i + 1}`).join(", ");
            const values = imageInsertData.map((path) => `'${path}'`).join(", ");
            const imageQuery = `INSERT INTO image (IMG_ID, PRODUCT_ID, ${columns}) VALUES ('${newImgId}', '${productId}', ${values})`;

            console.log("🟢 Running SQL Query:", imageQuery);

            db.query(imageQuery, [], (err) => {
              if (err) {
                console.error("🔴 Database Insert Error:", err);
                return res.status(500).json({ error: "Image insertion failed" });
              }

              console.log("✅ Database Insertion Successful!");
              res.json({
                success: true,
                message: "Product and images updated successfully",
                insertedProductId: productId,
                imagePaths: imageInsertData, // Return the paths for user access
              });
            });
          }
        });
      });
    }
  );
}

const getPK = (req, res) => {
  const { tableName } = req.query;
  if (!tableName) return res.status(400).json({ error: "Missing table name" });

  db.query(
    `SHOW KEYS FROM ${tableName} WHERE Key_name = 'PRIMARY'`,
    (error, keyResults) => {
      if (error) {
        console.error("Database error:", error);
        return res.status(500).json({ error: "Database error" });
      }

      if (keyResults.length === 0) {
        return res
          .status(400)
          .json({ error: "No primary key found for this table" });
      }

      res.json({ primaryKey: keyResults[0].Column_name });
    }
  );
};

function generateProductId(lastId, primaryKey) {
  let prefix = primaryKey.split("_")[0];

  if (!lastId) return `${prefix}0001`;

  const numericPartMatch = lastId.match(/\d+/);
  const numericPart = numericPartMatch
    ? parseInt(numericPartMatch[0], 10) + 1
    : 1;

  return `${prefix}${String(numericPart).padStart(4, "0")}`;
}

// Update product details
const updateProduct = (req, res) => {
  let { tableName, productId, productData, images, stock } = req.body;
  tableName = tableName + "_table";
  if (
    !tableName ||
    !productId ||
    !productData ||
    Object.keys(productData).length === 0
  ) {
    return res.status(400).json({
      error: "Missing required fields: tableName, productId, or productData",
    });
  }

  // Check if table exists
  db.query(`SHOW TABLES LIKE ?`, [tableName], (err, tableResult) => {
    if (err || tableResult.length === 0) {
      return res
        .status(404)
        .json({ error: `Table '${tableName}' does not exist` });
    }

    // Get primary key
    db.query(
      `SHOW KEYS FROM ${tableName} WHERE Key_name = 'PRIMARY'`,
      (err, keyResults) => {
        if (err || keyResults.length === 0) {
          return res.status(500).json({ error: "No primary key found" });
        }

        const primaryKey = keyResults[0].Column_name;

        // Get table schema to map fields
        db.query(`SHOW COLUMNS FROM ${tableName}`, (err, columns) => {
          if (err) {
            console.error("Error fetching table schema:", err);
            return res
              .status(500)
              .json({ error: "Database error", details: err.message });
          }

          // Map generic field names to actual column names
          const columnMap = {
            product_name: null,
            description: null,
            price: null,
            stock: null,
          };

          columns.forEach((col) => {
            const field = col.Field.toLowerCase();
            if (field.includes("name")) columnMap.product_name = col.Field;
            else if (field.includes("desc")) columnMap.description = col.Field;
            else if (field.includes("price")) columnMap.price = col.Field;
            else if (field.includes("stock")) columnMap.stock = col.Field;
          });

          // Check if required columns exist
          if (!columnMap.product_name || !columnMap.price) {
            return res.status(400).json({
              error: `Required columns (name, price) not found in table '${tableName}'`,
            });
          }

          // Transform productData to match table column names
          const updatedProductData = {};
          if (productData.product_name)
            updatedProductData[columnMap.product_name] =
              productData.product_name;
          if (productData.description && columnMap.description)
            updatedProductData[columnMap.description] = productData.description;
          if (productData.price)
            updatedProductData[columnMap.price] = productData.price;
          if (productData.stock)
            updatedProductData[columnMap.stock] = productData.stock;

          // Remove fields that shouldn't be updated (e.g., primary key, category ID)
          delete updatedProductData[primaryKey];
          delete updatedProductData.categoryId;

          const updateQuery = `UPDATE ${tableName} SET ? WHERE ${primaryKey} = ?`;
          db.query(
            updateQuery,
            [updatedProductData, productId],
            (err, result) => {
              if (err) {
                console.error("Error updating product:", err);
                return res
                  .status(500)
                  .json({ error: "Database error", details: err.message });
              }

              if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Product not found" });
              }

              // Update images if provided
              if (images && images.length > 0) {
                updateImages(productId, images, res);
              } else {
                res.json({
                  success: true,
                  message: "Product updated successfully",
                });
              }
            }
          );
        });
      }
    );
  });
};

// Function to update images
function updateImages(productId, images, res) {
  // First, delete existing images for this product
  db.query(`DELETE FROM image WHERE PRODUCT_ID = ?`, [productId], (err) => {
    if (err) {
      return res.status(500).json({ error: "Error deleting old images" });
    }

    // Then insert new images
    insertImages(productId, images, res);
  });
}
// Delete product
const deleteProduct = (req, res) => {
  let { tableName, productId } = req.params;
  tableName = tableName + "_table";
  if (!tableName || !productId) {
    return res.status(400).json({ error: "Missing tableName or productId" });
  }

  // Check if table exists
  db.query(`SHOW TABLES LIKE ?`, [tableName], (err, tableResult) => {
    if (err || tableResult.length === 0) {
      return res
        .status(404)
        .json({ error: `Table '${tableName}' does not exist` });
    }

    // Get primary key
    db.query(
      `SHOW KEYS FROM ${tableName} WHERE Key_name = 'PRIMARY'`,
      (err, keyResults) => {
        if (err || keyResults.length === 0) {
          return res.status(500).json({ error: "No primary key found" });
        }

        const primaryKey = keyResults[0].Column_name;

        // Delete associated images first
        db.query(
          `DELETE FROM image WHERE PRODUCT_ID = ?`,
          [productId],
          (err) => {
            if (err) {
              return res
                .status(500)
                .json({ error: "Error deleting product images" });
            }

            // Delete the product
            const deleteQuery = `DELETE FROM ${tableName} WHERE ${primaryKey} = ?`;
            db.query(deleteQuery, [productId], (err, result) => {
              if (err) {
                console.error("Error deleting product:", err);
                return res
                  .status(500)
                  .json({ error: "Database error", details: err.message });
              }

              if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Product not found" });
              }

              res.json({
                success: true,
                message: "Product deleted successfully",
              });
            });
          }
        );
      }
    );
  });
};

module.exports = {
  generateProductId,
  getCategories,
  getField,
  getAllCategories,
  getSubcategories,
  getSubSubcategories,
  addProduct,
  getPK,
  getProductsByTable,
  updateProduct,
  deleteProduct,
};
