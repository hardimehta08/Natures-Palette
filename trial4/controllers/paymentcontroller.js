const mysql = require("mysql");
const QRCode = require("qrcode");

// MySQL connection configuration
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hardi@sql8705",
  database: "main_project",
});

// Connect to the database
// db.connect(err => {
//   if (err) {
//     console.error('Error connecting to the database:', err);
//     return;
//   }
//   console.log('Connected to the database');
// });

const generateQRCode = async (paymentDetails) => {
  try {
    // Construct the UPI payment URL
    const qrCodeData = `upi://pay?pa=${paymentDetails.recipient}&pn=Nature's Palette&mc=&tid=${paymentDetails.orderId}&tn=${paymentDetails.purpose}&am=${paymentDetails.amount}&cu=INR`;

    const qrCodeURL = await QRCode.toDataURL(qrCodeData);
    return qrCodeURL;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
};

// Controller function to handle QR code generation
exports.generateQRCodeForOrder = (req, res) => {
  const { orderId } = req.body;

  // Fetch dynamic payment details from database
  const sql = `
          SELECT 
            om.O_ID AS orderId,
            om.C_ID AS customerId,
            c.C_USERNAME AS customerName,
            od.ODETAILS_PRICE AS amount
          FROM ORDER_MASTER om
          JOIN ORDER_DETAILS od ON om.O_ID = od.O_ID
          JOIN CUSTOMER c ON om.C_ID = c.C_ID
          WHERE om.O_ID = ?
        `;

  db.query(sql, [orderId], async (err, result) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (result.length === 0) {
      return res.status(400).json({ error: "Order details not found" });
    }

    const paymentDetails = {
      ...result[0],
      currency: "INR", // Currency
      recipient: "mehtahardi084@okicici", // Replace with actual UPI ID
      purpose: "Purchase Payment", // Purpose of the payment
      amount: result[0].amount, // Amount fetched from the database
    };

    try {
      const qrCodeURL = await generateQRCode(paymentDetails);
      res.json({ qrCodeURL });
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ error: "Error generating QR code" });
    }
  });
};

// Get payment details for an order
exports.getPaymentDetails = (req, res) => {
  const orderId = req.params.orderId;
  //   console.log(`Fetching payment details for order ID: ${orderId}`);

  const query = `SELECT 
      om.O_ID, om.O_DATE, om.O_STATUS, om.C_ID, 
      sa.S_ADDRESS, sa.S_PINCODE, sa.S_CONTACTNO, od.ODETAILS_ID, od.ODETAILS_QTY, od.ODETAILS_PRICE,
      (od.ODETAILS_QTY * od.ODETAILS_PRICE) AS Total_Product_Cost
      FROM ORDER_MASTER om LEFT JOIN ORDER_SHIPPING_ADDRESS sa ON om.O_ID = sa.O_ID
      LEFT JOIN ORDER_DETAILS od ON om.O_ID = od.O_ID
      WHERE om.O_ID = ? and om.O_STATUS = 'PLACED'`;

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

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate a unique PY_ID
function generateUniquePyId(result) {
  let newPyId = "PY001"; // Default ID

  if (result && result.length > 0 && result[0].maxId) {
    const maxId = result[0].maxId;

    // Extract numeric part (ignoring "PY")
    const numericPart = parseInt(maxId.slice(2), 10) || 0;

    // Increment and ensure it's always 3 digits
    const incrementedPart = (numericPart + 1).toString().padStart(3, "0");

    newPyId = `PY${incrementedPart}`;
  }

  return newPyId;
}

// Create a new payment
exports.createPayment = (req, res) => {
  const { PY_MODE, PY_DATE, PY_STATUS, PY_AMOUNT, O_ID } = req.body;
  const PY_OTP = generateOTP(); // Generate OTP

  db.beginTransaction((err) => {
    if (err) {
      console.error("Error starting transaction:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    // 1️⃣ Find the max PY_ID
    const maxIdQuery = "SELECT MAX(PY_ID) AS maxId FROM PAYMENT";

    db.query(maxIdQuery, (err, result) => {
      if (err) {
        console.error("Error fetching max PY_ID:", err);
        return db.rollback(() => {
          res.status(500).json({ error: "Internal Server Error" });
        });
      }

      let newPyId = generateUniquePyId(result);

      // 2️⃣ Check if newPyId already exists
      const checkExistingQuery = "SELECT COUNT(*) AS count FROM PAYMENT WHERE PY_ID = ?";
      db.query(checkExistingQuery, [newPyId], (err, checkResult) => {
        if (err) {
          console.error("Error checking for existing PY_ID:", err);
          return db.rollback(() => {
            res.status(500).json({ error: "Internal Server Error" });
          });
        }

        if (checkResult[0].count > 0) {
          console.error(`Duplicate PY_ID detected: ${newPyId}`);
          return db.rollback(() => {
            res.status(500).json({ error: "Duplicate Payment ID, please try again" });
          });
        }

        // 3️⃣ Insert the new payment
        const insertQuery = `
          INSERT INTO PAYMENT (PY_ID, PY_MODE, PY_TRANSACTION_ID, PY_DATE, PY_STATUS, PY_AMOUNT, O_ID, PY_OTP)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
          insertQuery,
          [newPyId, PY_MODE, null, PY_DATE, PY_STATUS, PY_AMOUNT, O_ID, PY_OTP],
          (err, result) => {
            if (err) {
              return db.rollback(() => {
                console.error("Error executing query:", err);
                res.status(500).json({ error: "Internal Server Error" });
              });
            }

            // 4️⃣ Update order status
            const updateOrderStatusQuery = `
              UPDATE ORDER_MASTER
              SET O_STATUS = 'Processing'
              WHERE O_ID = ?
            `;

            db.query(updateOrderStatusQuery, [O_ID], (err, result) => {
              if (err) {
                return db.rollback(() => {
                  console.error("Error updating order status:", err);
                  res.status(500).json({ error: "Internal Server Error" });
                });
              }

              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    console.error("Error committing transaction:", err);
                    res.status(500).json({ error: "Internal Server Error" });
                  });
                }

                res.status(201).json({ message: "Payment created successfully", PY_OTP });
              });
            });
          }
        );
      });
    });
  });
};

exports.updateTransactionId = (req, res) => {
  const { orderId, transactionId } = req.body;

  // Update payment transaction ID
  const updateQuery = `
    UPDATE PAYMENT 
    SET PY_TRANSACTION_ID = ? 
    WHERE O_ID = ?
  `;

  db.query(updateQuery, [transactionId, orderId], (err, result) => {
    if (err) {
      console.error("Error updating transaction ID:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Update order status to "Processing"
    const updateOrderStatusQuery = `
      UPDATE ORDER_MASTER
      SET O_STATUS = 'Processing'
      WHERE O_ID = ?
    `;

    db.query(updateOrderStatusQuery, [orderId], (err, result) => {
      if (err) {
        console.error("Error updating order status:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      res.status(200).json({ message: "Transaction ID updated successfully" });
    });
  });
};
