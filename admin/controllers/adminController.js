const mysql = require("mysql2");

// ✅ Connect to MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hetalsql@1405",
  database: "project(1)",
});

//Delivery
exports.getDeliveryPerson = (req, res) => {
  db.query(
    "SELECT d_id, d_name,d_phone,d_status,d_email FROM delivery_persons",
    (err, results) => {
      if (err) {
        console.error("Error fetching delivery persons:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(results);
    }
  );
};

exports.updateDeliveryPersonStatus = (req, res) => {
  const { personId } = req.params;
  const { status } = req.body;

  try {
    if (!["active", "inactive"].includes(status)) {
      return res
        .status(400)
        .json({ error: 'Invalid status. Use "active" or "inactive"' });
    }

    db.query(
      "UPDATE delivery_persons SET d_status = ? WHERE d_id = ?",
      [status, personId],
      (error, result) => {
        if (error) {
          console.error("Error updating delivery person status:", error);
          return res.status(500).json({ error: "Internal server error" });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Delivery person not found" });
        }

        res.json({
          success: true,
          message: `Delivery person ${personId} updated to ${status}`,
        });
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Fetch Orders (With or Without Assigned Delivery Person)
exports.getOrders = (req, res) => {
  const query = `
        SELECT 
            order_master.O_id, 
            customer.c_username AS customer_name, 
            order_master.O_status AS status, 
            payment.py_status as payment_status,
            delivery_persons.d_name AS d_name
        FROM order_master
        LEFT JOIN customer ON order_master.C_id = customer.C_id
        LEFT JOIN deliveries ON order_master.O_id = deliveries.O_id
        LEFT JOIN delivery_persons ON deliveries.d_id = delivery_persons.d_id
        LEFT JOIN payment on order_master.O_id = payment.O_id
    `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching orders:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
};

// ✅ Fetch Available Delivery Persons
exports.getDeliveryPersons = (req, res) => {
  const query = "SELECT D_id, D_NAME FROM delivery_persons WHERE d_status = ?";
  const params = ["active"];

  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Error fetching delivery persons:", err);
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err.message,
      });
    }

    // Log the results for debugging
    console.log("Delivery Persons:", results);

    res.json({
      success: true,
      data: results,
    });
  });
};

// ✅ Assign a Delivery Person
exports.assignDelivery = (req, res) => {
  const { orderId, deliveryPersonId } = req.body;

  db.query(
    "DELETE FROM deliveries WHERE O_id = ?",
    [orderId],
    (err, result) => {
      if (err) {
        console.error("Error deleting existing delivery records:", err);
        return res.status(500).json({ error: "Database error" });
      }
      db.query(
        "INSERT INTO deliveries (O_id, d_id, status) VALUES (?, ?, 'Pending')",
        [orderId, deliveryPersonId],
        (err, result) => {
          if (err) {
            console.error("Error assigning delivery:", err);
            return res.status(500).json({ error: "Database error" });
          }

          // No update to order_master status
          res.json({
            success: true,
            message: "Delivery person assigned successfully",
          });
        }
      );
    }
  );
};

exports.unassignDelivery = (req, res) => {
  const { orderId } = req.body;

  // Delete the delivery record
  db.query(
    "DELETE FROM deliveries WHERE O_id = ?",
    [orderId],
    (err, result) => {
      if (err) {
        console.error("Error unassigning delivery:", err);
        return res.status(500).json({ error: "Database error" });
      }

      // No update to order_master status
      res.json({
        success: true,
        message: "Delivery person unassigned successfully",
      });
    }
  );
};



exports.fetchContactMessages = (req, res) => {
  const query = 'SELECT * FROM contact ORDER BY submitted_at DESC';
  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error fetching contact messages');
    }
    res.json(results); // Send the results to the frontend
  });
};