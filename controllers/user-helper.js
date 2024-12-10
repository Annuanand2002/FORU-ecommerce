const bcrypt = require('bcrypt');
const User = require('../models/user-schema');

const registerUser = async (userData) => {
  try {

    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      return { success: false, exists: true, message: 'Email ID already exists' };
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = new User({
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
    });

    await user.save();
    return { success: true, message: 'User registered successfully' };
  } catch (err) {
    return { success: false, message: err.message };
  }
};
const loginUser = async (email,password)=>{
  try{
    const user = await User.findOne({email})
    if(!user){
      return { success: false, message: 'Invalid email or password' };
    }

    const isPasswordMatch = await bcrypt.compare(password,user.password)
    if(!isPasswordMatch){
      return { success: false, message: 'Invalid email or password' };
    }
    return {
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    };
  }
  catch(err){
    console.error('Error in loginUser helper:', err);
      return { success: false, message: 'Internal server error' };
  }
}
const getUsers = async ()=>{
  try{
    const users = await User.find({}, { name: 1, email: 1 ,blocked:1}).lean();
    return users
  }
  catch (err) {
    console.error('Error fetching users:', err);
  }
}

const blockUser = async (userId)=>{
  try{
    const user = await User.findById(userId); 
    if (user) {
      user.blocked = true; 
      await user.save(); 
      return true; 
    }
    return false;
  }
  catch(err){
    console.error('Error blocking user:', err);
  }
}

const unblockUser = async (userId)=>{
  try{
    const user = await User.findById(userId);
    if(user){
      user.blocked = false;
      await user.save(); 
      return true;
    }
    return false;
  }
  catch(err){
    console.error('Error unblocking user:', err);
  }
}
module.exports = { registerUser,loginUser,getUsers,blockUser,
  unblockUser};

