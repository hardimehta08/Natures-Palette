const mysql = require("mysql");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const { constrainedMemory } = require("process");

// Database connection
const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hardi@sql8705",
  database: "project(1)",
});

exports.generateBill = (req, res) => {
  const doc = new PDFDocument();
  const filePath = "bill.pdf";
  doc.pipe(fs.createWriteStream(filePath));

  let cname, cemail;
  const query1 = "SELECT c_email, c_username FROM CUSTOMER WHERE c_id=?";

  // Step 1: Get customer name and email
  conn.query(query1, [req.session.userId], (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      throw err;
    }
    cname = result[0].c_username;
    cemail = result[0].c_email;

    // Step 2: Get order details based on userId and O_STATUS="PLACED"
    const query2 = `SELECT o.O_ID, o.O_DATE, o.O_STATUS, o.C_ID, 
        od.ODETAILS_ID, od.O_ID, od.ODETAILS_QTY, od.ODETAILS_PRICE, od.PRODUCT_ID, 
        s.S_ADDRESS, s.S_PINCODE, s.S_CONTACTNO, s.O_ID, p.PY_OTP
        FROM order_master o
        JOIN order_details od ON o.O_ID = od.O_ID
        JOIN order_shipping_address s ON o.O_ID = s.O_ID
        JOIN payment p ON o.O_ID = p.O_ID
        WHERE o.C_ID = ? AND o.O_STATUS = 'PLACED'`;

    conn.query(query2, [req.session.userId], (err, orderResult) => {
      console.log("Order result:", orderResult);
      if (err) {
        console.error("Error executing query:", err);
        throw err;
      }

      if (orderResult.length === 0) {
        return res.status(404).json({ message: "No orders found" });
      }

      const order = orderResult;
      const py_otp = order[0].PY_OTP;

      // Step 3: Get product details for each product in the order
      const viewsQuery = `
          SELECT table_name
          FROM INFORMATION_SCHEMA.views
          WHERE table_schema = 'project(1)';
        `;

      conn.query(viewsQuery, (err, viewsResult) => {
        if (err) {
          console.error("Error executing query:", err);
          throw err;
        }

        if (viewsResult.length === 0) {
          throw new Error("No views found in the database");
        }

        const productDetails = [];
        let completed = 0;

        for (let item of order) {
          let found = false;
          for (const view of viewsResult) {
            if (found) break;
            const checkProductIdQuery = `
                SELECT COUNT(*) AS count
                FROM ${view.TABLE_NAME}
                WHERE id = ?;
              `;

            conn.query(
              checkProductIdQuery,
              [item.PRODUCT_ID],
              (err, result) => {
                if (err) {
                  console.error("Error executing query:", err);
                  throw err;
                }

                if (result[0].count > 0) {
                  const productQuery = `
                    SELECT pd.name, pd.price
                    FROM ${view.TABLE_NAME} AS pd
                    WHERE pd.id = ?;
                  `;

                  conn.query(
                    productQuery,
                    [item.PRODUCT_ID],
                    (err, productResult) => {
                      if (err) {
                        console.error("Error executing query:", err);
                        throw err;
                      }

                      if (productResult.length === 0) {
                        return res
                          .status(404)
                          .json({ message: "Product not found" });
                      }

                      productDetails.push({
                        ...item,
                        name: productResult[0].name,
                        price: productResult[0].price,
                      });

                      completed++;
                      if (completed === order.length) {
                        // All product details fetched, generate PDF
                        generatePDFBill(
                          doc,
                          order,
                          productDetails,
                          cname,
                          order[0],
                          py_otp,
                          filePath,
                          cemail,
                          res
                        );
                      }
                      found = true; // Exit the inner loop once the product is found
                    }
                  );
                }
              }
            );
          }
        }
      });
    });
  });
};

function generatePDFBill(
  doc,
  order,
  productDetails,
  cname,
  shippingDetails,
  py_otp,
  filePath,
  cemail,
  res
) {
  const orderDate = new Date(order[0].O_DATE).toLocaleDateString("en-GB"); // "en-GB" for dd/mm/yyyy format

  doc.fontSize(20).text("Invoice", { align: "center" });
  doc.text(`Date: ${orderDate}`);
  doc.text(`Customer Name: ${cname}`);
  doc.text(`Shipping Address: ${shippingDetails.S_ADDRESS}`);
  doc.text(`Pincode: ${shippingDetails.S_PINCODE}`);
  doc.text(`Mobile Number: ${shippingDetails.S_CONTACTNO}`);
  doc.text("-----------------------------------");
  doc.text(`Please remember to verify your OTP during the delivery: ${py_otp}`);

  productDetails.forEach((product) => {
    doc.text(`Product Name: ${product.name}`);
    doc.text(`Quantity: ${product.ODETAILS_QTY}`);
    doc.text(`Price: ${product.price}`);
    doc.text(`Subtotal: ₹${product.ODETAILS_QTY * product.price}`);
  });

  const totalCost = productDetails.reduce(
    (total, product) => total + product.ODETAILS_QTY * product.price,
    0
  );

  doc.text("-----------------------------------");
  doc.text(`Total: $${totalCost}`);
  doc.text(`Verification OTP: ${py_otp}`);

  doc.end();

  // Send the generated bill via email
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "natures.palette099@gmail.com",
      pass: "edtf trae flab nrit",
    },
  });

  const mailOptions = {
    from: "natures.palette099@gmail.com",
    to: cemail, // Send to customer's email
    subject: "Your Invoice",
    text: `Thank you for purchasing from Nature's Palette. Please find your invoice attached.`,
    attachments: [
      {
        path: filePath,
      },
    ],
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error("Error sending email:", err);
      return res.status(500).send("Error sending email");
    }
    res.send("Bill generated and sent successfully");
  });
}
