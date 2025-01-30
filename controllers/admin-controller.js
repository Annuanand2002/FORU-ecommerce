const Admin = require('../models/admin-schema'); 
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer')

const addAdmin = async (username, password) => {
  const existingAdmin = await Admin.findOne({ username: username }); 

  if (existingAdmin) {
    throw new Error("Username is already registered");  
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newAdmin = new Admin({
    username: username, 
    password: hashedPassword,
  });

  await newAdmin.save();
  return 'Admin added successfully';
};


const sendResetEmail = async (admin, resetLink) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'annuanand219@gmail.com', 
      pass: 'lvav wfrh kuwx mabz' 
    }
  });

  const mailOptions = {
    from: 'annuanand219@gmail.com',
    to: admin.username,
    subject: 'Password Reset',
    text: `Click the link to reset your password: ${resetLink}`
  };

  await transporter.sendMail(mailOptions);
};

const handleForgotPassword = async (username) => {
  try {
    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      throw new Error('Username not found');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = Date.now() + 3600000; 

    admin.resetToken = resetToken;
    admin.resetTokenExpires = resetTokenExpires;
    await admin.save();

    const resetLink = `http://localhost:3000/admin/reset-password/${resetToken}`;

    await sendResetEmail(admin, resetLink);

    return { message: 'Check your email for the password reset link' };

  } catch (err) {
    throw new Error('Server Error');
  }
};


const handleResetPassword = async (token, password, confirmPassword) => {
  if (password !== confirmPassword) {
    throw new Error('Passwords do not match');
  }

  try {
    const admin = await Admin.findOne({ resetToken: token, resetTokenExpires: { $gt: Date.now() } });

    if (!admin) {
      throw new Error('Invalid or expired token');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    admin.password = hashedPassword;
    admin.resetToken = null;
    admin.resetTokenExpires = null;
    await admin.save();

    return { message: 'Password reset successful' };

  } catch (err) {
    throw new Error('Server Error');
  }
};

module.exports = {
  addAdmin,handleForgotPassword,
  handleResetPassword
};


