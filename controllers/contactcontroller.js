const mysql = require("mysql");

const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Hardi@sql8705",
  database: "project(1)",
});

exports.createContact = (req, res) => {
  const { name, email, subject, message } = req.body;
  const sql =
    "INSERT INTO contact (name, email, subject, message) VALUES (?, ?, ?, ?)";

  conn.query(sql, [name, email, subject, message], (err, result) => {
    if (err) {
      res
        .status(500)
        .send("Failed to submit your message. Please try again later.");
    } else {
      res.status(201).send("Thank you! Your message has been received.");
    }
  });
};
