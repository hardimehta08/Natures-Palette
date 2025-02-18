const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // Use your preferred email service
  auth: {
    user: "Natures.Palette099@gmail.com", // Your email address
    pass: "edtf trae flab nrit", // Your email password or app password
  },
});

function sendMail(to, subject, text) {
  const mailOptions = {
    from: "Natures.Palette099@gmail.com",
    to: to,
    subject: subject,
    text: text,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("Error sending email:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
}

module.exports = { sendMail };
