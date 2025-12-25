const nodemailer = require('nodemailer');

// Check if email credentials are configured
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

if (!EMAIL_USER || !EMAIL_PASS) {
  console.warn('⚠️  EMAIL_USER or EMAIL_PASS not configured. Email functionality will not work.');
  console.warn('⚠️  Please set EMAIL_USER and EMAIL_PASS in your .env file.');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

module.exports = transporter;

