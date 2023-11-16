const nodemailer = require('nodemailer');

 exports.transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: 'your_email_password',
  },
});

