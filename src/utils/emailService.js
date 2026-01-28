const nodemailer = require('nodemailer');

// Create reusable transporter
let transporter = null;

const initializeEmailService = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });

  return transporter;
};

// @desc    Send email
// @param   {Object} options - Email options
// @param   {String} options.to - Recipient email
// @param   {String} options.subject - Email subject
// @param   {String} options.text - Plain text content
// @param   {String} options.html - HTML content
// @param   {Array} options.attachments - File attachments
exports.sendEmail = async (options) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('Email service not configured. Skipping email send.');
      return { success: false, message: 'Email service not configured' };
    }

    const transporter = initializeEmailService();

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'School Management System'}" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments || []
    };

    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// @desc    Send notification email
exports.sendNotificationEmail = async (userEmail, notification) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>${notification.title}</h2>
        </div>
        <div class="content">
          <p>${notification.message}</p>
          ${notification.link ? `<p><a href="${notification.link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Details</a></p>` : ''}
        </div>
        <div class="footer">
          <p>This is an automated notification from School Management System.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await exports.sendEmail({
    to: userEmail,
    subject: notification.title,
    text: notification.message,
    html: html
  });
};

// @desc    Send password reset email
exports.sendPasswordResetEmail = async (userEmail, resetToken, resetUrl) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .button { background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Password Reset Request</h2>
        </div>
        <div class="content">
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this link in your browser:</p>
          <p>${resetUrl}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>This is an automated email from School Management System.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await exports.sendEmail({
    to: userEmail,
    subject: 'Password Reset Request',
    text: `Click this link to reset your password: ${resetUrl}`,
    html: html
  });
};

// @desc    Send welcome email
exports.sendWelcomeEmail = async (userEmail, userName, password) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .credentials { background-color: #fff; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Welcome to School Management System</h2>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Your account has been created successfully. Here are your login credentials:</p>
          <div class="credentials">
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          <p><strong>Please change your password after first login.</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated email from School Management System.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await exports.sendEmail({
    to: userEmail,
    subject: 'Welcome to School Management System',
    text: `Welcome! Your account has been created. Email: ${userEmail}, Password: ${password}`,
    html: html
  });
};

module.exports = exports;

