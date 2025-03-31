const mysql = require("mysql");
const QRCode = require("qrcode");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");

// MySQL connection configuration
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hardi@sql8705",
  database: "project(1)",
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
});
const generateQRCode = async (paymentDetails) => {
  try {
    const qrCodeData = `upi://pay?pa=${paymentDetails.recipient}&pn=Nature's Palette&mc=&tid=${paymentDetails.orderId}&tn=${paymentDetails.purpose}&am=${paymentDetails.amount}&cu=INR`;
    return await QRCode.toDataURL(qrCodeData);
  } catch (error) {
    console.error("QR Code generation error:", error);
    throw error;
  }
};

exports.generateQRCodeForOrder = (req, res) => {
  const { orderId } = req.body;
  const sql = `
    SELECT om.O_ID AS orderId, c.C_USERNAME AS customerName, od.ODETAILS_PRICE AS amount
    FROM ORDER_MASTER om
    JOIN ORDER_DETAILS od ON om.O_ID = od.O_ID
    JOIN CUSTOMER c ON om.C_ID = c.C_ID
    WHERE om.O_ID = ?
  `;

  db.query(sql, [orderId], async (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!result.length)
      return res.status(404).json({ error: "Order not found" });

    try {
      const paymentDetails = {
        ...result[0],
        recipient: "mehtahardi084@okicici",
        purpose: "Purchase Payment",
        currency: "INR",
      };
      res.json({ qrCodeURL: await generateQRCode(paymentDetails) });
    } catch (error) {
      res.status(500).json({ error: "QR Code generation failed" });
    }
  });
};

exports.createPaymentWithQRCode = (req, res) => {
  const { O_ID, PY_AMOUNT } = req.body;
  const PY_MODE = "QR",
    PY_DATE = new Date().toISOString().slice(0, 10),
    PY_STATUS = "UNPAID",
    PY_OTP = generateOTP();

  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: "Transaction error" });

    db.query("SELECT MAX(PY_ID) AS maxId FROM PAYMENT", (err, result) => {
      if (err)
        return db.rollback(() =>
          res.status(500).json({ error: "Database error" })
        );

      const newPyId = generateUniquePyId(result);

      db.query(
        "INSERT INTO PAYMENT (PY_ID, PY_MODE, PY_DATE, PY_STATUS, PY_AMOUNT, O_ID, PY_OTP) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [newPyId, PY_MODE, PY_DATE, PY_STATUS, PY_AMOUNT, O_ID, PY_OTP],
        (err) => {
          if (err)
            return db.rollback(() =>
              res.status(500).json({ error: "Payment insert failed" })
            );

          // Generate QR code
          generateQRCode({
            recipient: "mehtahardi084@okicici",
            orderId: O_ID,
            amount: PY_AMOUNT,
            purpose: "Purchase order",
          })
            .then((qrCodeURL) => {
              db.commit((err) => {
                if (err)
                  return res
                    .status(500)
                    .json({ error: "Transaction commit failed" });

                res.json({
                  message: "QR Code generated. Scan to pay.",
                  qrCodeURL,
                  PY_ID: newPyId,
                });
              });
            })
            .catch((error) =>
              db.rollback(() =>
                res.status(500).json({ error: "QR Code generation failed" })
              )
            );
        }
      );
    });
  });
};

exports.confirmQRCodePayment = (req, res) => {
  const { PY_ID, transactionId } = req.body;

  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: "Transaction error" });

    // Update payment status
    db.query(
      "UPDATE PAYMENT SET PY_TRANSACTION_ID = ?, PY_STATUS = 'PAID' WHERE PY_ID = ? AND PY_STATUS = 'UNPAID'",
      [transactionId, PY_ID],
      (err, result) => {
        if (err)
          return db.rollback(() =>
            res.status(500).json({ error: "Payment update failed" })
          );
        if (!result.affectedRows)
          return db.rollback(() =>
            res
              .status(404)
              .json({ error: "Invalid payment ID or already confirmed" })
          );

        // Fetch PY_OTP and O_ID from PAYMENT table
        db.query(
          "SELECT PY_OTP, O_ID FROM PAYMENT WHERE PY_ID = ?",
          [PY_ID],
          (err, paymentResult) => {
            if (err || paymentResult.length === 0)
              return db.rollback(() =>
                res
                  .status(500)
                  .json({ error: "Failed to fetch payment details" })
              );

            const PY_OTP = paymentResult[0].PY_OTP;
            const O_ID = paymentResult[0].O_ID;

            // Update order status
            db.query(
              "UPDATE ORDER_MASTER SET O_STATUS = 'PLACED' WHERE O_ID = ?",
              [O_ID],
              (err) => {
                if (err)
                  return db.rollback(() =>
                    res.status(500).json({ error: "Order update failed" })
                  );

                // Fetch order details
                const orderQuery = `
                  SELECT o.O_ID, o.O_DATE, o.O_STATUS, o.C_ID, od.ODETAILS_QTY, od.PRODUCT_ID, 
                         s.S_ADDRESS, s.S_PINCODE, s.S_CONTACTNO, c.C_EMAIL, c.C_USERNAME
                  FROM ORDER_MASTER o
                  JOIN ORDER_DETAILS od ON o.O_ID = od.O_ID
                  JOIN ORDER_SHIPPING_ADDRESS s ON o.O_ID = s.O_ID
                  JOIN CUSTOMER c ON o.C_ID = c.C_ID
                  WHERE o.O_ID = ?`;
                db.query(orderQuery, [O_ID], (err, orderResult) => {
                  if (err || orderResult.length === 0)
                    return db.rollback(() =>
                      res
                        .status(500)
                        .json({ error: "Failed to fetch order details" })
                    );

                  const order = orderResult[0];
                  const customerEmail = order.C_EMAIL;
                  const customerName = order.C_USERNAME;

                  // Fetch product details dynamically from views
                  const productDetails = [];
                  let completed = 0;

                  const viewsQuery = `
                    SELECT table_name
                    FROM INFORMATION_SCHEMA.views
                    WHERE table_schema = 'project(1)';`;
                  db.query(viewsQuery, (err, viewsResult) => {
                    if (err || viewsResult.length === 0)
                      return db.rollback(() =>
                        res.status(500).json({ error: "Failed to fetch views" })
                      );

                    for (let item of orderResult) {
                      let found = false;
                      for (const view of viewsResult) {
                        if (found) break;

                        const checkProductIdQuery = `SELECT COUNT(*) AS count FROM ${view.TABLE_NAME} WHERE id = ?;`;
                        db.query(
                          checkProductIdQuery,
                          [item.PRODUCT_ID],
                          (err, result) => {
                            if (err)
                              return db.rollback(() =>
                                res
                                  .status(500)
                                  .json({ error: "Failed to check product" })
                              );

                            if (result[0].count > 0) {
                              const productQuery = `SELECT pd.name, pd.price FROM ${view.TABLE_NAME} AS pd WHERE pd.id = ?;`;
                              db.query(
                                productQuery,
                                [item.PRODUCT_ID],
                                (err, productResult) => {
                                  if (err || productResult.length === 0)
                                    return db.rollback(() =>
                                      res.status(500).json({
                                        error:
                                          "Failed to fetch product details",
                                      })
                                    );

                                  productDetails.push({
                                    ...item,
                                    name: productResult[0].name,
                                    price: productResult[0].price,
                                  });

                                  // Delete item from cart
                                  const deleteCartQuery =
                                    "DELETE FROM CART WHERE PRODUCT_ID = ? AND C_ID = ?";
                                  db.query(
                                    deleteCartQuery,
                                    [item.PRODUCT_ID, req.session.userId],
                                    (err) => {
                                      if (err)
                                        return db.rollback(() =>
                                          res.status(500).json({
                                            error: "Failed to delete cart item",
                                          })
                                        );
                                    }
                                  );

                                  completed++;
                                  if (completed === orderResult.length) {
                                    // Commit transaction and generate PDF bill
                                    db.commit((err) => {
                                      if (err)
                                        return db.rollback(() =>
                                          res.status(500).json({
                                            error: "Transaction commit failed",
                                          })
                                        );

                                      // Generate PDF bill and send final response
                                      generatePDFBill(
                                        order,
                                        productDetails,
                                        customerName,
                                        PY_OTP,
                                        customerEmail,
                                        res
                                      );
                                    });

                                    console.log(
                                      "✅ PDF bill generated successfully."
                                    );
                                  }
                                  found = true; // Stop checking once product is found
                                }
                              );
                            }
                          }
                        );
                      }
                    }
                  });
                });
              }
            );
          }
        );
      }
    );
  });
};
// Get payment details for an order
exports.getPaymentDetails = (req, res) => {
  const orderId = req.params.orderId;
  const query = `SELECT 
      om.O_ID, om.O_DATE, om.O_STATUS, om.C_ID, 
      sa.S_ADDRESS, sa.S_PINCODE, sa.S_CONTACTNO, od.ODETAILS_ID, od.ODETAILS_QTY, od.ODETAILS_PRICE,
      (od.ODETAILS_QTY * od.ODETAILS_PRICE) AS Total_Product_Cost
      FROM ORDER_MASTER om LEFT JOIN ORDER_SHIPPING_ADDRESS sa ON om.O_ID = sa.O_ID
      LEFT JOIN ORDER_DETAILS od ON om.O_ID = od.O_ID
      WHERE om.O_ID = ? and om.O_STATUS IN ('PLACED','PROCESSING')`;

  db.query(query, [orderId], (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    if (results.length === 0) {
      console.error("Order not found for ID:", orderId);
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json(results[0]);
  });
};

// Helper function to generate a random 6-digit OTP

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// Generate a unique PY_ID
const generateUniquePyId = (result) => {
  let newPyId = "PY001"; // Default ID
  if (result && result.length > 0 && result[0].maxId) {
    const maxId = result[0].maxId;
    const numericPart = parseInt(maxId.slice(2), 10) || 0;
    const incrementedPart = (numericPart + 1).toString().padStart(3, "0");
    newPyId = `PY${incrementedPart}`;
  }
  return newPyId;
};

// Create a new payment
exports.createPaymentWithBill = (req, res) => {
  console.log("Processing payment and generating bill:", req.body);
  const { PY_MODE, PY_DATE, PY_STATUS, PY_AMOUNT, O_ID } = req.body;
  const PY_OTP = generateOTP(); // Generate OTP

  db.beginTransaction((err) => {
    if (err) {
      console.error("Error starting transaction:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    db.query("SELECT MAX(PY_ID) AS maxId FROM PAYMENT", (err, result) => {
      if (err)
        return db.rollback(() =>
          res.status(500).json({ error: "Database Error" })
        );
      let newPyId = generateUniquePyId(result);

      db.query(
        "SELECT COUNT(*) AS count FROM PAYMENT WHERE PY_ID = ?",
        [newPyId],
        (err, checkResult) => {
          if (err)
            return db.rollback(() =>
              res.status(500).json({ error: "Database Error" })
            );
          if (checkResult[0].count > 0)
            return db.rollback(() =>
              res.status(500).json({ error: "Duplicate Payment ID" })
            );
          // 3️⃣ Insert Payment
          const insertQuery = `INSERT INTO PAYMENT (PY_ID, PY_MODE, PY_DATE, PY_STATUS, PY_AMOUNT, O_ID, PY_OTP) 
                             VALUES (?, ?, ?, ?, ?, ?, ?)`;
          db.query(
            insertQuery,
            [newPyId, PY_MODE, PY_DATE, PY_STATUS, PY_AMOUNT, O_ID, PY_OTP],
            (err) => {
              if (err)
                return db.rollback(() =>
                  res.status(500).json({ error: "Payment Insert Error" })
                );

              // 4️⃣ Fetch Order & Product Details
              const orderQuery = `
            SELECT o.O_ID, o.O_DATE, o.O_STATUS, o.C_ID, od.ODETAILS_QTY, od.PRODUCT_ID, 
                   s.S_ADDRESS, s.S_PINCODE, s.S_CONTACTNO, c.C_EMAIL, c.C_USERNAME
            FROM ORDER_MASTER o
            JOIN ORDER_DETAILS od ON o.O_ID = od.O_ID
            JOIN ORDER_SHIPPING_ADDRESS s ON o.O_ID = s.O_ID
            JOIN CUSTOMER c ON o.C_ID = c.C_ID
            WHERE o.O_ID = ?`;

              db.query(orderQuery, [O_ID], (err, orderResult) => {
                if (err || orderResult.length === 0)
                  return db.rollback(() =>
                    res.status(500).json({ error: "Order Fetch Error" })
                  );

                const order = orderResult[0];
                const customerEmail = order.C_EMAIL;
                const customerName = order.C_USERNAME;

                // 5️⃣ Fetch Product Details
                const productDetails = [];
                let completed = 0;

                const viewsQuery = `
              SELECT table_name
              FROM INFORMATION_SCHEMA.views
              WHERE table_schema = 'project(1)';
            `;

                db.query(viewsQuery, (err, viewsResult) => {
                  if (err || viewsResult.length === 0)
                    return db.rollback(() =>
                      res.status(500).json({ error: "Product Views Error" })
                    );

                  for (let item of orderResult) {
                    let found = false;
                    for (const view of viewsResult) {
                      if (found) break;
                      const checkProductIdQuery = `SELECT COUNT(*) AS count FROM ${view.TABLE_NAME} WHERE id = ?;`;

                      db.query(
                        checkProductIdQuery,
                        [item.PRODUCT_ID],
                        (err, result) => {
                          if (err)
                            return db.rollback(() =>
                              res
                                .status(500)
                                .json({ error: "Product Check Error" })
                            );

                          if (result[0].count > 0) {
                            const productQuery = `SELECT pd.name, pd.price FROM ${view.TABLE_NAME} AS pd WHERE pd.id = ?;`;

                            db.query(
                              productQuery,
                              [item.PRODUCT_ID],
                              (err, productResult) => {
                                if (err || productResult.length === 0)
                                  return db.rollback(() =>
                                    res
                                      .status(500)
                                      .json({ error: "Product Fetch Error" })
                                  );

                                productDetails.push({
                                  ...item,
                                  name: productResult[0].name,
                                  price: productResult[0].price,
                                });

                                // Cart Deletion Query
                                const deleteCartQuery =
                                  "DELETE FROM CART WHERE PRODUCT_ID = ? AND C_ID = ?";
                                db.query(
                                  deleteCartQuery,
                                  [item.PRODUCT_ID, req.session.userId],
                                  (err) => {
                                    if (err) {
                                      return db.rollback(() =>
                                        res.status(500).json({
                                          error: "Cart Deletion Error",
                                        })
                                      );
                                    }
                                    console.log(
                                      `Cart item with Product ID: ${item.PRODUCT_ID} deleted for User ID: ${req.session.userId}`
                                    );
                                  }
                                );

                                completed++;
                                if (completed === orderResult.length) {
                                  // All operations are successful, commit the transaction
                                  db.commit((err) => {
                                    if (err) {
                                      return db.rollback(() =>
                                        res.status(500).json({
                                          error: "Transaction Commit Error",
                                        })
                                      );
                                    }
                                    console.log(
                                      "Transaction successfully committed!"
                                    );

                                    // Generate the PDF bill
                                    generatePDFBill(
                                      order,
                                      productDetails,
                                      customerName,
                                      PY_OTP,
                                      customerEmail,
                                      res
                                    );
                                  });
                                }
                                found = true; // Stop checking once product is found
                              }
                            );
                          }
                        }
                      );
                    }
                  }
                });
              });
            }
          );
        }
      );
    });
  });
};

// ✅ Function to Generate PDF Bill
function generatePDFBill(
  order,
  productDetails,
  customerName,
  PY_OTP,
  customerEmail,
  res
) {
  const doc = new PDFDocument();
  const filePath = `bill_${order.O_ID}.pdf`;

  doc.pipe(fs.createWriteStream(filePath));
  const name = customerName;
  const capitalized = name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
  customerName = capitalized;

  doc.fontSize(20).text("Invoice", { align: "center" });
  doc.text(`Date: ${new Date(order.O_DATE).toLocaleDateString("en-GB")}`);
  doc.text(`Customer: ${customerName}`);
  doc.text(`Shipping Address: ${order.S_ADDRESS}, Pincode: ${order.S_PINCODE}`);
  doc.text(`Contact: ${order.S_CONTACTNO}`);
  doc.text("-----------------------------------");
  doc.text(`Verification OTP: ${PY_OTP}`);
  doc.text("-----------------------------------");

  let totalCost = 0;
  productDetails.forEach((product) => {
    doc.text(`Product: ${product.name}`);
    doc.text(`Quantity: ${product.ODETAILS_QTY}`);
    doc.text(`Price: ₹${product.price}`);
    doc.text(`Subtotal: ₹${product.ODETAILS_QTY * product.price}`);
    totalCost += product.ODETAILS_QTY * product.price;
    doc.text("-----------------------------------");
  });

  doc.text(`Total Amount: ₹${totalCost}`);
  doc.end();

  try {
    console.log("✅ Starting invoice generation...");
    sendInvoiceEmail(order, customerEmail, filePath, res);

    console.log("✅ Committing transaction...");
    db.commit((err) => {
      if (err) {
        console.error("❌ Transaction Commit Error:", err);
        return res.status(500).json({ error: "Transaction Commit Error" });
      }

      console.log("✅ Sending final response...");
      res.json({
        message: "Payment successful and bill generated!",
      });
    });
  } catch (error) {
    console.error("❌ Unexpected Error:", error);
    res.status(500).json({ error: "Unexpected Server Error" });
  }
}

// ✅ Function to Send Invoice via Email
function sendInvoiceEmail(order, customerEmail, filePath, res) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: "natures.palette099@gmail.com", pass: "edtf trae flab nrit" },
  });
  const mailOptions = {
    from: "natures.palette099@gmail.com",
    to: customerEmail,
    subject: "Your Invoice",
    text: "Thank you for your order! Please find your invoice attached.",
    attachments: [{ path: filePath }],
  };

  transporter.sendMail(mailOptions, (emailErr) => {
    if (emailErr) return res.status(500).json({ error: "Email Sending Error" });

    db.query(
      "UPDATE ORDER_MASTER SET O_STATUS = 'PROCESSING' WHERE O_ID = ?",
      [order.O_ID],
      (err) => {
        if (err) return res.status(500).json({ error: "Order Update Error" });

        db.commit((err) => {
          if (err)
            return res.status(500).json({ error: "Transaction Commit Error" });
        });
      }
    );
  });
}
exports.generateBillAndRedirect = (req, res) => {
  console.log("Generating bill and redirecting to order placed page...");
  const { O_ID } = req.body;
  let PY_OTP;

  // 1️⃣ Fetch Order & Product Details
  const orderQuery = `
    SELECT o.O_ID, o.O_DATE, o.O_STATUS, o.C_ID, od.ODETAILS_QTY, od.PRODUCT_ID,
       s.S_ADDRESS, s.S_PINCODE, s.S_CONTACTNO, c.C_EMAIL, c.C_USERNAME, p.PY_OTP
FROM ORDER_MASTER o
JOIN ORDER_DETAILS od ON o.O_ID = od.O_ID
JOIN ORDER_SHIPPING_ADDRESS s ON o.O_ID = s.O_ID
JOIN CUSTOMER c ON o.C_ID = c.C_ID
JOIN PAYMENT p ON o.O_ID = p.O_ID
WHERE o.O_ID = ?
`;

  db.query(orderQuery, [O_ID], (err, orderResult) => {
    if (err || orderResult.length === 0) {
      return res.status(500).json({ error: "Order Fetch Error" });
    }

    const order = orderResult[0];
    PY_OTP = order.PY_OTP;
    const customerEmail = order.C_EMAIL;
    const customerName = order.C_USERNAME;

    // 2️⃣ Fetch Product Details
    const productDetails = [];
    let completed = 0;

    const viewsQuery = `
      SELECT table_name
      FROM INFORMATION_SCHEMA.views
      WHERE table_schema = 'project(1)';`;

    db.query(viewsQuery, (err, viewsResult) => {
      if (err || viewsResult.length === 0) {
        return res.status(500).json({ error: "Product Views Error" });
      }

      for (let item of orderResult) {
        let found = false;
        for (const view of viewsResult) {
          if (found) break;
          const checkProductIdQuery = `SELECT COUNT(*) AS count FROM ${view.TABLE_NAME} WHERE id = ?;`;

          db.query(checkProductIdQuery, [item.PRODUCT_ID], (err, result) => {
            if (err) {
              return res.status(500).json({ error: "Product Check Error" });
            }

            if (result[0].count > 0) {
              const productQuery = `SELECT pd.name, pd.price FROM ${view.TABLE_NAME} AS pd WHERE pd.id = ?;`;

              db.query(
                productQuery,
                [item.PRODUCT_ID],
                (err, productResult) => {
                  if (err || productResult.length === 0) {
                    return res
                      .status(500)
                      .json({ error: "Product Fetch Error" });
                  }

                  productDetails.push({
                    ...item,
                    name: productResult[0].name,
                    price: productResult[0].price,
                  });

                  completed++;
                  if (completed === orderResult.length) {
                    generatePDFBill(
                      order,
                      productDetails,
                      customerName,
                      PY_OTP,
                      customerEmail,
                      res
                    );
                  }
                  found = true; // Stop checking once product is found
                }
              );
            }
          });
        }
      }
    });
  });
};
