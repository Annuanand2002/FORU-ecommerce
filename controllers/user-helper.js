const bcrypt = require('bcrypt');
const User = require('../models/user-schema');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

async function registerUser({ name, email, password, phone }) {
  try {
    const existingUser = await User.findOne({ email });
if (existingUser) {
    throw new Error('Email already in use. Please use a different email address.');
}
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = Date.now() + 10 * 60 * 1000; 

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      verificationToken,
      verificationTokenExpires,
    });

    await user.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail', 
      auth: {
        user: 'annuanand219@gmail.com', 
        pass: 'lvav wfrh kuwx mabz', 
      },
    });

    const verificationLink = `http://localhost:3000/verify?token=${verificationToken}`;

    await transporter.sendMail({
      to: email,
      subject: 'Email Verification',
      text: `Click on the link to verify your email: ${verificationLink}`,
    });

    return { success: true, message: 'Registration successful. Please check your email to verify your account.' };
  } catch (error) {
    console.error(error);
    throw new Error('Server error. Please try again later.');
  }
}

async function verifyEmail(token) {
  try {
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      throw new Error('Invalid verification token.');
    }

    if (user.verificationTokenExpires < Date.now()) {
      throw new Error('Verification link has expired.');
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    
    await user.save();
    return { success: true, message: 'Your email has been verified. You can now log in.' };
  } catch (error) {
    console.error(error);
    throw new Error(error.message || 'An error occurred during email verification.');
  }
}


const loginUser = async (email, password) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return { success: false, error: "Invalid username or password." };
    }
    if (user.blocked) {
      return { success: false,blocked:true};
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { success: false, error: "Invalid username or password." };
    }

    return { success: true, user };
  } catch (error) {
    console.error("Error in loginUser helper:", error);
    return { success: false, error: "Internal server error." };
  }
};


const generateResetToken = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error('Invalid email address');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpires = Date.now() + 5 * 60 * 1000; 

 
  user.resetToken = resetToken;
  user.resetTokenExpires = resetTokenExpires;
  await user.save();

  
  return resetToken;
};


const resetPassword = async (password, token) => {
  const user = await User.findOne({ resetToken: token });

  
  if (!user || user.resetTokenExpires < Date.now()) {
    throw new Error('Reset link expired or invalid');
  }


  const hashedPassword = await bcrypt.hash(password, 12);
  user.password = hashedPassword;
  user.resetToken = undefined; 
  user.resetTokenExpires = undefined; 
  await user.save();
};
const getUsers = async ()=>{
  try{
    const users = await User.find({}, { name: 1, email: 1 ,blocked:1,phone:1,isVerified:1}).lean();
    return users
  }
  catch (err) {
    console.error('Error fetching users:', err);
  }
}
const blockUser = async(userId)=>{
  try{
    return await User.findByIdAndUpdate(userId,{blocked:true})
  }
  catch(error){
    throw new Error("Error blocking user",error)
  }
}

const unblockUser = async(userId)=>{
  try{
    return await User.findByIdAndUpdate(userId,{blocked:false})
  }
  catch(error){
    throw new Error("Error unblocking the user",error)
  }
}

module.exports = { registerUser,loginUser,getUsers,blockUser,
  unblockUser,verifyEmail,generateResetToken,
  resetPassword};

