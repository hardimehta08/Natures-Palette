const mysql = require("mysql2");

// ✅ Connect to MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hetalsql@1405",
  database: "main_project",
});

// Fetch all payments with optional status filter
exports.getPayments = (req, res) => {
    const status = req.query.status || '';
    let query = 'SELECT * FROM payment';
    let queryParams = [];

    if (status) {
        query += ' WHERE FIND_IN_SET(?, PY_STATUS)';
        queryParams.push(status);
    }

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching payments:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(200).json(results); // Ensure this matches frontend expectation
    });
};

// Update payment details (transaction ID and OTP)
exports.updatePayment = (req, res) => {
    const { PY_ID } = req.params;
    const { PY_TRANSACTION_ID, PY_OTP } = req.body;

    if (!PY_TRANSACTION_ID || !PY_OTP) {
        return res.status(400).json({ error: 'Transaction ID and OTP are required' });
    }

    const query = `
        UPDATE payment
        SET PY_TRANSACTION_ID = ?, PY_OTP = ?
        WHERE PY_ID = ?
    `;
    const queryParams = [PY_TRANSACTION_ID, PY_OTP, PY_ID];

    db.query(query, queryParams, (err, result) => {
        if (err) {
            console.error('Error updating payment:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        console.log(`Payment ${PY_ID} updated`);
        res.status(200).json({ message: 'Payment updated successfully' });
    });
};


