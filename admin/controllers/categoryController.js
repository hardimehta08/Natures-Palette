const mysql = require("mysql");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Database connection
const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hardi@sql8705",
  database: "project(1)",
});

const getCategories = (req, res) => {
  const query = `
    SELECT 
      cy_id AS category_id,
      cy_name AS category_name,
      cy_desc AS category_desc,
      cy_image AS category_image
    FROM 
      category
  `;

  conn.query(query, (err, results) => {
    if (err) {
      console.error("❌ Error fetching categories:", err);
      return res.status(500).json({ error: "Database error: " + err.message });
    }

    // No need for complex hierarchy if frontend only expects flat data
    const categories = results.map((row) => ({
      category_id: row.category_id,
      category_name: row.category_name,
      category_desc: row.category_desc,
      category_image: row.category_image,
    }));

    console.log("✅ Categories fetched:", categories); // Debug output
    res.json(categories);
  });
};

const getSubcategoriesByCategory = (req, res) => {
  const { categoryId } = req.params;

  if (!categoryId) {
    return res.status(400).json({ error: "Category ID is required" });
  }

  const query = "SELECT * FROM subcategory WHERE cy_id = ? AND is_deleted = 0";
  conn.query(query, [categoryId], (err, results) => {
    if (err) {
      console.error("❌ Error fetching subcategories:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
};

const getSubSubcategories = (req, res) => {
  const { subcategoryId } = req.params;

  if (!subcategoryId) {
    return res.status(400).json({ error: "Subcategory ID is required" });
  }

  const query =
    "SELECT * FROM subsubcategory WHERE sub_id = ? AND is_deleted = 0";
  conn.query(query, [subcategoryId], (err, results) => {
    if (err) {
      console.error("❌ Error fetching sub-subcategories:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
};

const addCategory = (req, res) => {
  const { cy_name, cy_desc } = req.body;
  const cy_image = req.file;

  if (!cy_name || !cy_desc) {
    return res
      .status(400)
      .json({ error: "Category name and description are required." });
  }

  const directoryPath = path.join(__dirname, "../../public/Database");
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  const getMaxCategoryIdQuery = `SELECT MAX(cy_id) AS maxId FROM category`;
  conn.query(getMaxCategoryIdQuery, (err, result) => {
    if (err) {
      console.error("❌ Error fetching max category ID:", err);
      return res.status(500).json({ error: "Database error: " + err.message });
    }

    let newCategoryId;
    if (result[0].maxId) {
      const lastIdNumber = parseInt(result[0].maxId.replace(/\D/g, ""), 10) + 1;
      newCategoryId = `CY${String(lastIdNumber).padStart(2, "0")}`;
    } else {
      newCategoryId = "CY01";
    }

    let imagePath = null;
    if (cy_image) {
      const extension = path.extname(cy_image.originalname) || ".jpg";
      const imageFileName = `${newCategoryId}${extension}`;
      const tempPath = cy_image.path;
      const targetPath = path.join(directoryPath, imageFileName);
      imagePath = `Database/${imageFileName}`;

      try {
        if (!fs.existsSync(tempPath)) {
          console.error("❌ Temp file not found:", tempPath);
          return res.status(500).json({ error: "Temporary file not found" });
        }
        fs.renameSync(tempPath, targetPath);
      } catch (err) {
        console.error("❌ Error handling image:", err);
        return res
          .status(500)
          .json({ error: "Image processing failed: " + err.message });
      }
    }

    const insertQuery = `INSERT INTO category (cy_id, cy_name, cy_desc, cy_image) VALUES (?, ?, ?, ?)`;
    const params = [newCategoryId, cy_name, cy_desc || null, imagePath || null];

    conn.query(insertQuery, params, (err) => {
      if (err) {
        console.error("❌ Error inserting category:", err);
        return res
          .status(500)
          .json({ error: "Database error: " + err.message });
      }

      console.log("✅ Category added successfully:", newCategoryId);
      res.json({
        message: "Category added successfully",
        id: newCategoryId,
        imagePath: imagePath || null,
      });
    });
  });
};

const addSubCategory = (req, res) => {
  const { sub_name, sub_desc, cy_id } = req.body;
  const sub_image = req.file; // File from multer

  if (!sub_name || !sub_desc || !cy_id) {
    return res
      .status(400)
      .json({ error: "All fields except image are required" });
  }

  const directoryPath = path.join(__dirname, "../../public/Database");

  // Ensure the "Database" folder exists
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  conn.beginTransaction((err) => {
    if (err) {
      console.error("❌ Error starting transaction:", err);
      return res.status(500).json({ error: "Database transaction error" });
    }

    // Fetch the maximum subcategory ID
    const getMaxSubIdQuery = `SELECT MAX(CAST(SUBSTRING(sub_id, 4) AS UNSIGNED)) AS maxId FROM subcategory`;

    conn.query(getMaxSubIdQuery, (err, results) => {
      if (err) {
        console.error("❌ Error fetching max subcategory ID:", err);
        return rollbackTransaction(
          res,
          "Database error while fetching subcategory ID"
        );
      }

      let newSubId =
        results.length > 0 && results[0].maxId !== null
          ? `SUB${String(results[0].maxId + 1).padStart(2, "0")}`
          : "SUB01";

      // Handle the image file
      let imagePath = null;
      if (sub_image) {
        const extension = path.extname(sub_image.originalname) || ".jpg";
        const imageFileName = `${newSubId}${extension}`; // e.g., SUB01.jpg
        const tempPath = sub_image.path; // Temporary path from multer (e.g., public/temp/123456.jpg)
        const targetPath = path.join(directoryPath, imageFileName); // Final path (e.g., public/Database/SUB01.jpg)
        imagePath = `Database/${imageFileName}`; // Relative path for database storage

        try {
          // Verify temp file exists before moving
          if (!fs.existsSync(tempPath)) {
            console.error("❌ Temp file not found:", tempPath);
            return rollbackTransaction(res, "Temporary file not found");
          }
          fs.renameSync(tempPath, targetPath); // Move file synchronously
          console.log("✅ Image moved to:", targetPath);
        } catch (err) {
          console.error("❌ Error moving image:", err);
          return rollbackTransaction(
            res,
            "Image upload failed: " + err.message
          );
        }
      }

      // Insert new subcategory
      const insertQuery = `INSERT INTO subcategory (sub_id, sub_name, sub_desc, cy_id, sub_image) VALUES (?, ?, ?, ?, ?)`;
      conn.query(
        insertQuery,
        [newSubId, sub_name, sub_desc, cy_id, imagePath || null],
        (err, result) => {
          if (err) {
            console.error("❌ Error inserting subcategory:", err);
            return rollbackTransaction(
              res,
              "Database error while inserting subcategory"
            );
          }

          // Commit transaction
          conn.commit((err) => {
            if (err) {
              console.error("❌ Error committing transaction:", err);
              return rollbackTransaction(res, "Error committing transaction");
            }

            console.log("✅ Subcategory added successfully:", newSubId);
            res.json({
              message: "Subcategory added successfully",
              sub_id: newSubId,
              imagePath: imagePath || null, // Include imagePath in response
            });
          });
        }
      );
    });
  });
};

// Utility function to rollback transaction
function rollbackTransaction(res, message) {
  conn.rollback(() => {
    res.status(500).json({ error: message });
  });
}

const addSubSubCategory = (req, res) => {
  const { ss_name, ss_desc, sub_id } = req.body;
  const ss_image = req.file; // File from multer

  if (!ss_name || !ss_desc || !sub_id) {
    return res.status(400).json({
      error: "All fields (name, description, subcategory ID) are required",
    });
  }

  const directoryPath = path.join(__dirname, "../../public/Database");

  // Ensure the "Database" folder exists
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  const getMaxSsIdQuery = `SELECT MAX(CAST(SUBSTRING(ss_id, 3) AS UNSIGNED)) AS maxId FROM subsubcategory`;

  conn.query(getMaxSsIdQuery, (err, result) => {
    if (err) {
      console.error("❌ Error fetching max sub-subcategory ID:", err);
      return res.status(500).json({ error: "Database error: " + err.message });
    }

    let newSsId = result[0].maxId
      ? `SS${String(result[0].maxId + 1).padStart(2, "0")}`
      : `SS01`;

    // Handle the image file
    let imagePath = null;
    if (ss_image) {
      const extension = path.extname(ss_image.originalname) || ".jpg";
      const imageFileName = `${newSsId}${extension}`; // e.g., SS01.jpg
      const tempPath = ss_image.path; // Temporary path from multer (e.g., public/temp/123456.jpg)
      const targetPath = path.join(directoryPath, imageFileName); // Final path (e.g., public/Database/SS01.jpg)
      imagePath = `Database/${imageFileName}`; // Relative path for database storage

      try {
        // Verify temp file exists before moving
        if (!fs.existsSync(tempPath)) {
          console.error("❌ Temp file not found:", tempPath);
          return res.status(500).json({ error: "Temporary file not found" });
        }
        fs.renameSync(tempPath, targetPath); // Move file synchronously
        console.log("✅ Image moved to:", targetPath);
      } catch (err) {
        console.error("❌ Error moving image:", err);
        return res
          .status(500)
          .json({ error: "Image upload failed: " + err.message });
      }
    }

    const insertQuery = `INSERT INTO subsubcategory (ss_id, ss_name, ss_desc, sub_id, ss_image) VALUES (?, ?, ?, ?, ?)`;
    conn.query(
      insertQuery,
      [newSsId, ss_name, ss_desc, sub_id, imagePath || null],
      (err, result) => {
        if (err) {
          console.error("❌ Error inserting sub-subcategory:", err);
          return res
            .status(500)
            .json({ error: "Database error: " + err.message });
        }
        console.log("✅ Sub-Subcategory added successfully:", newSsId);
        res.json({
          message: "Sub-Subcategory added successfully",
          ss_id: newSsId,
          imagePath: imagePath || null, // Include imagePath in response
        });
      }
    );
  });
};

// ✅ Update Category with Image
const updateCategory = (req, res) => {
  const categoryId = req.params.id;
  const { cy_name, cy_desc } = req.body;
  const cy_image = req.file; // File from multer

  if (!cy_name) {
    return res.status(400).json({ error: "Category name is required" });
  }

  // Define the directory path (public/Database)
  const directoryPath = path.join(__dirname, "../../public/Database/");

  // Ensure the "Database" folder exists
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  // Step 1: Get old image path (if exists)
  const getImageQuery = "SELECT cy_image FROM category WHERE cy_id = ?";
  conn.query(getImageQuery, [categoryId], (err, result) => {
    if (err) {
      console.error("❌ Error fetching old image:", err);
      return res.status(500).json({ error: "Database error: " + err.message });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    const oldImagePath = result[0].cy_image;

    // Step 2: Handle the new image file (if provided)
    let newImagePath = oldImagePath; // Default to old image if no new one is uploaded
    if (cy_image) {
      const extension = path.extname(cy_image.originalname) || ".jpg"; // Default to .jpg
      const imageFileName = `${categoryId}${extension}`; // e.g., CY01.jpg
      const tempPath = cy_image.path; // Temporary path from multer
      const targetPath = path.join(directoryPath, imageFileName); // Full path to save the file
      newImagePath = `Database/${imageFileName}`; // Relative path for database

      try {
        // Move the new image to the target location
        fs.renameSync(tempPath, targetPath);

        // Delete the old image if it exists and is different
        if (oldImagePath && oldImagePath !== newImagePath) {
          const oldImageFullPath = path.join(
            directoryPath,
            path.basename(oldImagePath)
          );
          if (fs.existsSync(oldImageFullPath)) {
            fs.unlinkSync(oldImageFullPath);
          }
        }
      } catch (err) {
        console.error("❌ Error handling image:", err);
        return res.status(500).json({ error: "Image processing failed" });
      }
    }

    // Step 3: Update category in the database
    const query =
      "UPDATE category SET cy_name = ?, cy_desc = ?, cy_image = ? WHERE cy_id = ?";
    const params = [cy_name, cy_desc || null, newImagePath || null, categoryId];

    conn.query(query, params, (err, result) => {
      if (err) {
        console.error("❌ Error updating category:", err);
        return res
          .status(500)
          .json({ error: "Database error: " + err.message });
      }

      console.log("✅ Category updated successfully:", categoryId);
      res.json({ message: "Category updated successfully" });
    });
  });
};

const updateSubcategory = (req, res) => {
  const subcategoryId = req.params.id;
  const { sub_name, sub_desc } = req.body;
  const sub_image = req.file; // File from multer

  if (!sub_name || !sub_desc) {
    return res
      .status(400)
      .json({ error: "Subcategory name and description are required" });
  }

  // Define the directory path (public/Database)
  const directoryPath = path.join(__dirname, "../../public/Database/");

  // Ensure the "Database" folder exists
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  // Step 1: Get old image path (if exists)
  const getImageQuery = "SELECT sub_image FROM subcategory WHERE sub_id = ?";
  conn.query(getImageQuery, [subcategoryId], (err, result) => {
    if (err) {
      console.error("❌ Error fetching old image:", err);
      return res.status(500).json({ error: "Database error: " + err.message });
    }

    const oldImagePath = result.length > 0 ? result[0].sub_image : null;

    // Step 2: Handle the new image file (if provided)
    let newImagePath = oldImagePath; // Default to old image if no new one is uploaded
    if (sub_image) {
      const extension = path.extname(sub_image.originalname) || ".jpg"; // Default to .jpg
      const imageFileName = `${subcategoryId}${extension}`; // e.g., SUB01.jpg
      const tempPath = sub_image.path; // Temporary path from multer
      const targetPath = path.join(directoryPath, imageFileName); // Full path to save the file
      newImagePath = `Database/${imageFileName}`; // Relative path for database

      try {
        // Move the new image to the target location
        fs.renameSync(tempPath, targetPath);

        // Delete the old image if it exists and is different
        if (oldImagePath && oldImagePath !== newImagePath) {
          const oldImageFullPath = path.join(
            directoryPath,
            path.basename(oldImagePath)
          );
          if (fs.existsSync(oldImageFullPath)) {
            fs.unlinkSync(oldImageFullPath);
          }
        }
      } catch (err) {
        console.error("❌ Error handling image:", err);
        return res.status(500).json({ error: "Image processing failed" });
      }
    }

    // Step 3: Update subcategory in the database
    const query =
      "UPDATE subcategory SET sub_name = ?, sub_desc = ?, sub_image = ? WHERE sub_id = ?";
    const params = [sub_name, sub_desc, newImagePath || null, subcategoryId];

    conn.query(query, params, (err, result) => {
      if (err) {
        console.error("❌ Error updating subcategory:", err);
        return res
          .status(500)
          .json({ error: "Database error: " + err.message });
      }

      console.log("✅ Subcategory updated successfully:", subcategoryId);
      res.json({ message: "Subcategory updated successfully" });
    });
  });
};

const updateSubSubcategory = (req, res) => {
  const subsubcategoryId = req.params.id;
  const { ss_name, ss_desc } = req.body;
  const ss_image = req.file; // File from multer

  if (!ss_name) {
    return res.status(400).json({ error: "Sub-Subcategory name is required" });
  }

  // Define the directory path (public/Database)
  const directoryPath = path.join(__dirname, "../../public/Database/");

  // Ensure the "Database" folder exists
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  // Step 1: Get old image path (if exists)
  const getImageQuery = "SELECT ss_image FROM subsubcategory WHERE ss_id = ?";
  conn.query(getImageQuery, [subsubcategoryId], (err, result) => {
    if (err) {
      console.error("❌ Error fetching old image:", err);
      return res.status(500).json({ error: "Database error: " + err.message });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "Sub-Subcategory not found" });
    }

    const oldImagePath = result[0].ss_image;

    // Step 2: Handle the new image file (if provided)
    let newImagePath = oldImagePath; // Default to old image if no new one is uploaded
    if (ss_image) {
      const extension = path.extname(ss_image.originalname) || ".jpg"; // Default to .jpg
      const imageFileName = `${subsubcategoryId}${extension}`; // e.g., SS01.jpg
      const tempPath = ss_image.path; // Temporary path from multer
      const targetPath = path.join(directoryPath, imageFileName); // Full path to save the file
      newImagePath = `Database/${imageFileName}`; // Relative path for database

      try {
        // Move the new image to the target location
        fs.renameSync(tempPath, targetPath);

        // Delete the old image if it exists and is different
        if (oldImagePath && oldImagePath !== newImagePath) {
          const oldImageFullPath = path.join(
            directoryPath,
            path.basename(oldImagePath)
          );
          if (fs.existsSync(oldImageFullPath)) {
            fs.unlinkSync(oldImageFullPath);
          }
        }
      } catch (err) {
        console.error("❌ Error handling image:", err);
        return res.status(500).json({ error: "Image processing failed" });
      }
    }

    // Step 3: Update sub-subcategory in the database
    const query =
      "UPDATE subsubcategory SET ss_name = ?, ss_desc = ?, ss_image = ? WHERE ss_id = ?";
    const params = [
      ss_name,
      ss_desc || null,
      newImagePath || null,
      subsubcategoryId,
    ];

    conn.query(query, params, (err, result) => {
      if (err) {
        console.error("❌ Error updating sub-subcategory:", err);
        return res
          .status(500)
          .json({ error: "Database error: " + err.message });
      }

      console.log("✅ Sub-Subcategory updated successfully:", subsubcategoryId);
      res.json({ message: "Sub-Subcategory updated successfully" });
    });
  });
};

const removeCategory = (req, res) => {
  const categoryId = req.params.id;

  const query = "UPDATE category SET is_deleted = 1 WHERE CY_ID = ?";

  conn.query(query, [categoryId], (err, result) => {
    if (err) {
      console.error("❌ Error marking category as deleted:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ message: "✅ Category removed successfully (soft delete)" });
  });
};

const activateCategory = (req, res) => {
  const categoryId = req.params.id;

  const query = "UPDATE category SET is_deleted = 0 WHERE CY_ID = ?";

  conn.query(query, [categoryId], (err, result) => {
    if (err) {
      console.error("❌ Error activating category:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ message: "✅ Category activated successfully" });
  });
};

const removeSubCategory = (req, res) => {
  const subcategoryId = req.params.id;

  if (!subcategoryId) {
    return res.status(400).json({ error: "Subcategory ID is required" });
  }

  const query = "UPDATE subcategory SET is_deleted = 1 WHERE sub_id = ?";
  conn.query(query, [subcategoryId], (err, result) => {
    if (err) {
      console.error("❌ Error marking subcategory as deleted:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Subcategory not found" });
    }
    res.json({ message: "✅ Subcategory removed successfully (soft delete)" });
  });
};

const activateSubCategory = (req, res) => {
  const subcategoryId = req.params.id;

  if (!subcategoryId) {
    return res.status(400).json({ error: "Subcategory ID is required" });
  }

  const query = "UPDATE subcategory SET is_deleted = 0 WHERE sub_id = ?";
  conn.query(query, [subcategoryId], (err, result) => {
    if (err) {
      console.error("❌ Error activating subcategory:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Subcategory not found" });
    }
    res.json({ message: "✅ Subcategory activated successfully" });
  });
};

const removeSubSubCategory = (req, res) => {
  const subsubcategoryId = req.params.id;

  if (!subsubcategoryId) {
    return res.status(400).json({ error: "Sub-subcategory ID is required" });
  }

  const query = "UPDATE subsubcategory SET is_deleted = 1 WHERE ss_id = ?";
  conn.query(query, [subsubcategoryId], (err, result) => {
    if (err) {
      console.error("❌ Error marking sub-subcategory as deleted:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Sub-subcategory not found" });
    }
    res.json({
      message: "✅ Sub-subcategory removed successfully (soft delete)",
    });
  });
};

const activateSubSubCategory = (req, res) => {
  const subsubcategoryId = req.params.id;

  if (!subsubcategoryId) {
    return res.status(400).json({ error: "Sub-subcategory ID is required" });
  }

  const query = "UPDATE subsubcategory SET is_deleted = 0 WHERE ss_id = ?";
  conn.query(query, [subsubcategoryId], (err, result) => {
    if (err) {
      console.error("❌ Error activating sub-subcategory:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Sub-subcategory not found" });
    }
    res.json({ message: "✅ Sub-subcategory activated successfully" });
  });
};

// ✅ Function to Reorder Subcategory IDs
function reorderSubcategoryIDs(callback) {
  const fetchQuery = `SELECT sub_id FROM subcategory ORDER BY LENGTH(sub_id), sub_id`;

  conn.query(fetchQuery, (err, rows) => {
    if (err) {
      console.error("❌ Error fetching subcategories:", err);
      return callback(err);
    }

    let idMapping = {};
    let queries = rows.map((row, index) => {
      let newId = `SUB${String(index + 1).padStart(2, "0")}`;
      idMapping[row.sub_id] = newId;
      return [newId, row.sub_id];
    });

    if (queries.length === 0) {
      console.log("✅ No subcategories to reorder.");
      return callback(null, {});
    }

    const updateQuery = `UPDATE subcategory SET sub_id = CASE 
            ${queries
              .map(
                ([newId, oldId]) => `WHEN sub_id = '${oldId}' THEN '${newId}'`
              )
              .join(" ")}
            ELSE sub_id END`;

    conn.query(updateQuery, (err) => {
      if (err) {
        console.error("❌ Error updating subcategory IDs:", err);
        return callback(err);
      }
      console.log("✅ All subcategory IDs reordered successfully");
      return callback(null, idMapping);
    });
  });
}

// ✅ Function to Update Sub-Subcategory sub_id Based on New Mapping
function updateSubSubcategoryIDs(idMapping, callback) {
  if (!Object.keys(idMapping).length) {
    console.log("✅ No sub-subcategories to update.");
    return callback(null);
  }

  const updateQueries = Object.entries(idMapping)
    .map(([oldId, newId]) => `WHEN sub_id = '${oldId}' THEN '${newId}'`)
    .join(" ");

  const updateQuery = `UPDATE subsubcategory SET sub_id = CASE ${updateQueries} ELSE sub_id END`;

  conn.query(updateQuery, (err) => {
    if (err) {
      console.error("❌ Error updating sub-subcategory sub_ids:", err);
      return callback(err);
    }
    console.log("✅ Sub-subcategory sub_ids updated successfully");
    return callback(null);
  });
}

// ✅ New Function to Reorder `ss_id` in `subsubcategory`
function reorderSubSubcategoryIDs(callback) {
  const fetchQuery = `SELECT ss_id FROM subsubcategory ORDER BY LENGTH(ss_id), ss_id`;

  conn.query(fetchQuery, (err, rows) => {
    if (err) {
      console.error("❌ Error fetching sub-subcategories:", err);
      return callback(err);
    }

    let queries = rows.map((row, index) => {
      let newId = `SS${String(index + 1).padStart(2, "0")}`;
      return [newId, row.ss_id];
    });

    if (queries.length === 0) {
      console.log("✅ No sub-subcategories to reorder.");
      return callback(null);
    }

    const updateQuery = `UPDATE subsubcategory SET ss_id = CASE 
            ${queries
              .map(
                ([newId, oldId]) => `WHEN ss_id = '${oldId}' THEN '${newId}'`
              )
              .join(" ")}
            ELSE ss_id END`;

    conn.query(updateQuery, (err) => {
      if (err) {
        console.error("❌ Error updating sub-subcategory IDs:", err);
        return callback(err);
      }
      console.log("✅ All sub-subcategory IDs reordered successfully");
      return callback(null);
    });
  });
}

const getAllCategories = (req, res) => {
  const query = "SELECT * FROM category WHERE is_deleted = 0"; // ✅ Fetch all categories

  conn.query(query, (err, results) => {
    if (err) {
      console.error("❌ Error fetching categories:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results);
  });
};

const createTableAndView = async (req, res) => {
  try {
    const { categoryName, fields } = req.body;

    if (!categoryName || !Array.isArray(fields) || fields.length === 0) {
      return res.json({
        success: false,
        error: "Category name or fields are missing/invalid",
      });
    }

    const tableName = categoryName.replace(/\s+/g, "_").toLowerCase(); // Normalize table name
    const viewName = `${tableName}`;

    // **Step 1: Fetch CY_ID from category table**
    const getCategorySQL = `SELECT cy_id FROM category WHERE cy_name = ? LIMIT 1`;
    conn.query(getCategorySQL, [categoryName], (err, categoryResult) => {
      if (err || categoryResult.length === 0) {
        console.error("❌ Error fetching category ID:", err);
        return res.json({ success: false, error: "Category not found" });
      }

      const cy_id = categoryResult[0].cy_id;

      // **Step 2: Define valid SQL types**
      const fieldDefinitions = fields
        .map((field) => {
          let type = field.type.toUpperCase();

          if (type === "VARCHA") type = "VARCHAR(255)"; // Fix typo
          if (type === "DECIMA") type = "DECIMAL(10,2)";

          if (type.startsWith("VARCHAR")) {
            type = `VARCHAR(255)`;
          } else if (type === "TEXT") {
            type = "TEXT";
          } else if (type === "INT") {
            type = "INT";
          } else if (type === "CHAR") {
            type = "CHAR(5)";
          } else if (type === "DECIMAL") {
            type = "DECIMAL(10,2)";
          } else {
            console.warn(
              `⚠️ Invalid field type '${field.type}' for column '${field.name}'`
            );
            return null;
          }
          return `\`${field.name}\` ${type}`;
        })
        .filter(Boolean);

      if (fieldDefinitions.length === 0) {
        return res.json({
          success: false,
          error: "No valid fields found. Please check field types.",
        });
      }

      fieldDefinitions.unshift("id CHAR(5) PRIMARY KEY"); // Add ID column
      fieldDefinitions.push("CY_ID CHAR(4) NOT NULL"); // Add CY_ID

      // **Step 3: Construct CREATE TABLE Query**
      const createTableSQL = `CREATE TABLE IF NOT EXISTS \`${tableName}_table\` (${fieldDefinitions.join(
        ", "
      )})`;

      conn.query(createTableSQL, (err, result) => {
        if (err) {
          console.error("❌ Table Creation Error:", err);
          return res.json({
            success: false,
            error: "SQL Table Error: " + err.message,
          });
        }

        console.log(`✅ Table '${tableName}' created successfully.`);

        // **Step 4: Find the Correct Table Name**
        setTimeout(() => {
          const checkTableSQL = `SHOW TABLES LIKE ?`;
          conn.query(checkTableSQL, [`${tableName}%`], (err, tables) => {
            if (err || tables.length === 0) {
              console.error("❌ Error finding table:", err);
              return res.json({
                success: false,
                error: "Table not found in database.",
              });
            }

            // ✅ Extract the correct table name
            const correctTableName = Object.values(tables[0])[0]; // Get actual table name

            console.log(`🟢 Correct Table Name Found: '${correctTableName}'`);

            // **Step 5: Fetch Columns from the Correct Table**
            const checkColumnsSQL = `SHOW COLUMNS FROM \`${correctTableName}\``;
            conn.query(checkColumnsSQL, (err, columns) => {
              if (err || columns.length === 0) {
                console.error("❌ Error fetching table columns:", err);
                return res.json({
                  success: false,
                  error: "Error fetching table columns. Table may not exist.",
                });
              }

              const validColumns = columns.map((col) => col.Field);
              console.log(
                `🟢 Valid Columns in '${correctTableName}':`,
                validColumns
              );

              // **Step 6: Construct CREATE VIEW Query**
              const selectFields = fields
                .map((field) =>
                  validColumns.includes(field.name) ? `\`${field.name}\`` : null
                )
                .filter(Boolean)
                .join(", ");

              let additionalField = validColumns.includes("CY_ID")
                ? ", CY_ID AS category_id"
                : "";

              if (!selectFields) {
                console.error(
                  `❌ No valid columns for creating the view '${viewName}'`
                );
                return res.json({
                  success: false,
                  error: `No valid columns available to create view '${viewName}'.`,
                });
              }

              const createViewSQL = `CREATE VIEW \`${viewName}\` AS 
                                                   SELECT id, ${selectFields} ${additionalField} 
                                                   FROM \`${correctTableName}\``;

              conn.query(createViewSQL, (err, result) => {
                if (err) {
                  console.error("❌ View Creation Error:", err);
                  return res.json({
                    success: false,
                    error: "SQL View Error: " + err.message,
                  });
                }

                console.log(`✅ View '${viewName}' created successfully.`);
                res.json({
                  success: true,
                  message: `Table '${correctTableName}' and View '${viewName}' created successfully.`,
                });
              });
            });
          });
        }, 500); // Delay before checking table name
      });
    });
  } catch (error) {
    console.error("❌ Server Error:", error);
    res.status(500).json({ success: false, error: "Server error occurred." });
  }
};

module.exports = {
  createTableAndView,
  getCategories,
  addCategory,
  addSubCategory,
  addSubSubCategory,
  updateCategory,
  updateSubcategory,
  updateSubSubcategory,
  removeCategory,
  removeSubCategory,
  removeSubSubCategory,
  getSubcategoriesByCategory,
  getAllCategories,
  getSubSubcategories,
  activateCategory,
  activateSubCategory,
  activateSubSubCategory,
};
