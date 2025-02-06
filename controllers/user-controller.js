const bcrypt = require('bcrypt');
const User = require('../models/user-schema');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { log } = require('console');
const passport = require('passport');
const Product = require('../models/product-schema');
async function registerUser({ name, email, password, phone }) {
  try {
    const existingUser = await User.findOne({ $or:[{email},{phone}]});
if (existingUser) {
  if (existingUser.email === email) {
    return { success: false, message: "Email already in use. Please use a different email address." };
  }
  if (existingUser.phone === phone) {
    return { success: false, message: "Phone number already in use. Please use a different phone number." };
  }
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


async function loginUser({ email, password }) {
  const user = await User.findOne({ email });
  console.log(user)
  if (!user) {
    return { success: false}; 
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return { success: false }; 
  }

  if (user.blocked) {
    return { success: false, blocked: true };
  }
  return {
    success: true,
    _id: user._id,
    name: user.name,
    email: user.email,
    phone:user.phone,
    dateOfBirth:user.dateOfBirth,
    gender:user.gender,
    blocked: false,
  };
}


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
const getUsers = async (page,limit)=>{
  try{
    const skip = (page - 1) * limit;
    const users = await User.find({}, { name: 1, email: 1 ,blocked:1,phone:1,isVerified:1})
    .skip(skip)
    .limit(limit)
    .lean();
    const count = await User.countDocuments()
    return {users,totalPages: Math.ceil(count / limit)}
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


const authenticateGoogle = passport.authenticate('google', {
  scope: ['profile', 'email'],
});


const handleGoogleCallback = (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      req.session.message = info?.message || 'Authentication failed.';
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      req.session.user = user;
      res.redirect('/');
    });
  })(req, res, next);
};

const logoutUser = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Unable to log out');
    }
    res.redirect('/');
  });
};

const addToBag = async (req, res) => {
  try {
      const { productId, size } = req.body;
      const userId = req.session.user._id;

      if (!size) {
          return res.status(400).json({ error: "Please select a size." });
      }

      let user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ error: "User not found." });
      }

      const itemIndex = user.cart.findIndex(item => item.productId == productId && item.size == size);
      if (itemIndex > -1) {
          return res.json({ message: "Already added to bag!" }); 
      } else {
          user.cart.push({ productId, size, quantity: 1 });
      }

      await user.save();
      res.json({ message: "Added to bag successfully!" });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
  }
};



const addToWishlist = async (req, res) => {
  try {
      const { productId, size } = req.body;  
      const userId = req.session.user._id;

      let user = await User.findById(userId);

      if (!user) {
          return res.status(404).json({ error: "User not found." });
      }

      const alreadyWishlisted = user.wishlist.some(item => item.productId == productId)
      if (alreadyWishlisted) {
          return res.json({ message: "Product already in wishlist!" });
      } else {
          user.wishlist.push({ productId});
          await user.save();
      }

      res.json({ message: "Added to wishlist successfully!" });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
  }
};

  
const getWishlist = async (req,res) => {
  try{
    const userId = req.session.user._id;
    const user  = await User.findById(userId);
    if(!user){
      return res.status(404).json({error:"User not found"})
    }
    const wishlistItem = user.wishlist;
    const wishlistProduct = await Promise.all(
      wishlistItem.map(async (item) => {
        const product = await Product.findById(item.productId).lean();
        return {
          ...item,
          product: product,
        };
      })
    );

      res.render('user/wishlist',{wishlistProduct,isUser:true});
    }
  catch(error){
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
const removeFromWishlist = async (req, res) => {
  try {
      const { productId } = req.body;
      const userId = req.session.user._id;

      let user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ error: "User not found." });
      }

      const itemIndex = user.wishlist.findIndex(item => item.productId == productId);
      if (itemIndex > -1) {
          user.wishlist.splice(itemIndex, 1); 
          await user.save();
          res.json({ message: "Item removed from wishlist." });
      } else {
          res.status(404).json({ error: "Item not found in wishlist." });
      }
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
  }
};


module.exports = { registerUser,loginUser,getUsers,blockUser,
  unblockUser,verifyEmail,generateResetToken,
  resetPassword,logoutUser,addToBag,addToWishlist,getWishlist,removeFromWishlist};

