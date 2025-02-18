const mysql = require("mysql");

// Database connection
const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hardi@sql8705",
  database: "main_project",
});

// Generate a unique cart ID
const generateCartId = (callback) => {
  const sql = "SELECT MAX(ca_id) AS maxId FROM cart";
  conn.query(sql, (err, result) => {
    if (err) return callback(err);

    const maxId = result[0].maxId;
    let newId;

    if (maxId) {
      const numericPart = parseInt(maxId.slice(2)) + 1;
      newId = `CA${String(numericPart).padStart(3, "0")}`;
    } else {
      newId = "CA001";
    }

    callback(null, newId);
  });
};

// Add Item to Cart
const addItemToCart = (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send("Please login to add items to the cart.");
  }

  const { productId } = req.body;

  // Validate the product ID against all category tables
  const checkProductSql = `
    SELECT 'PLANTS' AS category FROM PLANTS WHERE P_ID = ?
    UNION ALL
    SELECT 'BOUQUET' AS category FROM BOUQUET WHERE B_ID = ?
    UNION ALL
    SELECT 'POTS' AS category FROM POTS WHERE PT_ID = ?
    UNION ALL
    SELECT 'FERTILIZERS' AS category FROM FERTILIZERS WHERE Ft_ID = ?
    UNION ALL
    SELECT 'TOOLS' AS category FROM TOOLS WHERE T_ID = ?
  `;
  const quantity = 1;
  conn.query(
    checkProductSql,
    [productId, productId, productId, productId, productId],
    (err, productResult) => {
      if (err) throw err;

      if (productResult.length === 0) {
        return res.status(400).send("Invalid product ID.");
      }

      generateCartId((err, newCartId) => {
        if (err) return res.status(500).send("Error generating cart ID.");

        const sql =
          "INSERT INTO cart (ca_id, c_id, product_id, ca_qty) VALUES (?, ?, ?, ?)";
        conn.query(
          sql,
          [newCartId, req.session.userId, productId, quantity],
          (err, result) => {
            if (err) throw err;
            res.status(200).send("Item added to cart.");
          }
        );
      });
    }
  );
};

// Add Item to Cart from Product Detail Page
const addItemToCartFromProduct = (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send("Please login to add items to the cart.");
  }
  // console.log(req.body);
  const { prodname: productName, quantity } = req.body;

  // Get the product ID based on the product name
  const getProductIDSql = `
    SELECT P_ID AS id FROM PLANTS WHERE P_NAME = ? 
    UNION ALL 
    SELECT B_ID AS id FROM BOUQUET WHERE B_NAME = ? 
    UNION ALL 
    SELECT PT_ID AS id FROM POTS WHERE PT_NAME = ? 
    UNION ALL 
    SELECT Ft_ID AS id FROM FERTILIZERS WHERE Ft_NAME = ? 
    UNION ALL 
    SELECT T_ID AS id FROM TOOLS WHERE T_NAME = ?
  `;

  conn.query(
    getProductIDSql,
    [productName, productName, productName, productName, productName],
    (err, result) => {
      if (err) return res.status(500).send("Error executing query");

      if (result.length === 0) {
        return res.status(404).send("Product not found");
      }

      const productId = result[0].id;

      generateCartId((err, newCartId) => {
        if (err) return res.status(500).send("Error generating cart ID.");

        const sql =
          "INSERT INTO cart (ca_id, c_id, product_id, ca_qty) VALUES (?, ?, ?, ?)";
        conn.query(
          sql,
          [newCartId, req.session.userId, productId, quantity],
          (err, result) => {
            if (err) throw err;
            res.status(200).send("Item added to cart.");
          }
        );
      });
    }
  );
};

// Get User Cart
const getUserCart = (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send("Please login to view your cart.");
  }

  const sql = `SELECT c.ca_id, c.c_id, c.product_id, c.ca_qty, p.P_NAME AS name, p.P_PRICE AS price, img.PATH1 AS image
FROM cart c
JOIN PLANTS p ON c.product_id = p.P_ID
JOIN IMAGE img ON p.P_ID = img.PRODUCT_ID
WHERE c.c_id = ?
UNION ALL
SELECT c.ca_id, c.c_id, c.product_id, c.ca_qty, b.B_NAME AS name, b.B_PRICE AS price, img.PATH1 AS image
FROM cart c
JOIN BOUQUET b ON c.product_id = b.B_ID
JOIN IMAGE img ON b.B_ID = img.PRODUCT_ID
WHERE c.c_id = ?
UNION ALL
SELECT c.ca_id, c.c_id, c.product_id, c.ca_qty, pt.PT_NAME AS name, pt.PT_PRICE AS price, img.PATH1 AS image
FROM cart c
JOIN POTS pt ON c.product_id = pt.PT_ID
JOIN IMAGE img ON pt.PT_ID = img.PRODUCT_ID
WHERE c.c_id = ?
UNION ALL
SELECT c.ca_id, c.c_id, c.product_id, c.ca_qty, f.Ft_NAME AS name, f.Ft_PRICE AS price, img.PATH1 AS image
FROM cart c
JOIN FERTILIZERS f ON c.product_id = f.Ft_ID
JOIN IMAGE img ON f.Ft_ID = img.PRODUCT_ID
WHERE c.c_id = ?
UNION ALL
SELECT c.ca_id, c.c_id, c.product_id, c.ca_qty, t.T_NAME AS name, t.T_PRICE AS price, img.PATH1 AS image
FROM cart c
JOIN TOOLS t ON c.product_id = t.T_ID
JOIN IMAGE img ON t.T_ID = img.PRODUCT_ID
WHERE c.c_id = ?
    `;
  conn.query(
    sql,
    [
      req.session.userId,
      req.session.userId,
      req.session.userId,
      req.session.userId,
      req.session.userId,
    ],
    (err, result) => {
      if (err) throw err;
      result.forEach((result) => {
        if (result.image) {
          result.image = result.image.toString();
        }
        result.total = result.ca_qty * result.price;
      });
      res.status(200).json(result);
    }
  );
};

// Update Cart Item
const updateCartItem = (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send("Please login to update your cart.");
  }
  // console.log(req.body)
  const cartId = req.body.ca_id;
  const quantity = req.body.qty;
  const sql = "UPDATE cart SET ca_qty = ? WHERE ca_id = ?";
  conn.query(sql, [quantity, cartId], (err, result) => {
    if (err) throw err;
    res.status(200).send({ message: "Cart item updated." });
  });
};

// Remove Item from Cart
const removeItemFromCart = (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send("Please login to remove items from your cart.");
  }
  const { cartId } = req.body;
  const sql = "DELETE FROM cart WHERE ca_id = ? AND c_id=?";
  conn.query(sql, [cartId, req.session.userId], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).send("Database error.");
    }
    if (result.affectedRows === 0) {
      return res.status(404).send("Item not found.");
    }

    res.status(200).send({ message: "Item removed from cart." });
  });
};

const getCartCount = (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send("Please login to view your cart count.");
  }

  const sql = "SELECT COUNT(*) AS count FROM cart WHERE c_id = ?";
  conn.query(sql, [req.session.userId], (err, result) => {
    if (err) return res.status(500).send("Database error.");

    const count = result[0].count;
    res.status(200).json({ count });
  });
};

module.exports = {
  addItemToCart,
  addItemToCartFromProduct,
  getUserCart,
  updateCartItem,
  removeItemFromCart,
  getCartCount,
};
