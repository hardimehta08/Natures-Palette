const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'Natures.Palette099@gmail.com',
    pass: 'edtf trae flab nrit',
  },
});

async function sendMail(to, subject, text, retries = 3) {
  const mailOptions = {
    from: 'Natures.Palette099@gmail.com',
    to: to,
    subject: subject,
    html: text, // Use HTML to ensure clickable link
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.response);
      return info;
    } catch (error) {
      console.log('Error sending email:', error);
      if (attempt < retries) {
        console.log(`Retrying... (${retries - attempt} retries left)`);
      } else {
        throw error;
      }
    }
  }
}

module.exports = { sendMail };