var express = require('express');
var router = express.Router();
const { registerUser,loginUser,verifyEmail,generateResetToken, resetPassword} = require('../controllers/user-helper'); 
const Product = require('../models/product-schema');
const Category = require('../models/cateogory-schema');
const passport = require('passport');
const User = require('../models/user-schema');
const nodemailer = require('nodemailer');

/* GET home page. */

router.get('/',async (req,res,next)=>{
  
  const bestseller = await Product.find({ bestSeller: true }).lean();
  const latestCollection = await Product.find({ latestCollection: true }).lean()
  res.render('user/home',{latestCollection,bestseller,admin:false})
})
/**register */

router.get('/register',(req,res,next)=>{
  res.render('user/register',{isAdminLogin : true})
})

router.post('/register', async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    const result = await registerUser({ name, email, password, phone });

    return res.json(result); 
  } catch (error) {
    if (error.message.includes('Email already in use')) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
});
router.get('/verify', async (req, res) => {
  const { token } = req.query;

  try {
    const result = await verifyEmail(token);
    return res.redirect('/login'); 
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'] 
}));
router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }), 
  (req, res) => {
    res.redirect('/'); 
  }
);

/**login */


router.get('/login',(req,res,next)=>{
  res.render('user/login',{isAdminLogin:true})
})
router.post('/login',async (req,res,next)=>{
  const { email, password } = req.body;
  console.log(req.body)

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try{
    const result = await loginUser(email,password);
    if (result.blocked) {
      return res.status(403).json({ error: "You have been blocked. Please contact support." });
    }
    if(!result.success){
      return res.status(401).json({ error: "Invalid username or password." });
    }
    return res.status(200).json({message: "Login successful"})
  }
  catch(error){
    console.log("Login error:", error);
    return res.status(500).json({ error: "An internal server error occurred." });
  }
})

router.get('/forgot-password', (req, res) => {
  res.render('user/forgot-password',{isAdminLogin:true}); 
});
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const resetToken = await generateResetToken(email);
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'annuanand219@gmail.com', 
        pass: 'lvav wfrh kuwx mabz',
      },
    });

    await transporter.sendMail({
      to: email,
      subject: 'Password Reset Request',
      text: `Click the link to reset your password: ${resetLink}`,
    });

    res.render('user/forgot-password', { successMessage: 'A password reset link has been sent to your email.' ,isAdminLogin:true});
  } catch (error) {
    console.error(error);
    res.render('user/forgot-password', { error: 'Invalid email address',isAdminLogin:true });
  }
});
router.get('/reset-password', async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({ resetToken: token });

    if (!user || user.resetTokenExpires < Date.now()) {
      return res.status(400).send('Reset link expired or invalid.');
    }

    res.render('user/reset-password', { token ,isAdminLogin:true});
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/reset-password', async (req, res) => {
  const { password, token } = req.body;

  try {
    await resetPassword(password, token);

    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.status(400).send('Invalid or expired reset link');
  }
});

router.get('/collections', async (req, res) => {
  const categories = await Category.find().lean();
  const page = parseInt(req.query.page) || 1;
  const limit = 9;
  const skip = (page - 1) * limit;

  let selectedCategories = req.query.categories || [];
  let selectedGender = req.query.gender || null;

  if (typeof selectedCategories === 'string') {
    selectedCategories = selectedCategories.split(',');
  }

  let productQuery = {};

  if (selectedCategories.length > 0) {
    productQuery.category = { $in: selectedCategories }; 
  }

  // Apply gender filter
  if (selectedGender) {
    productQuery.gender = selectedGender; 
  }

  const products = await Product.find(productQuery)
    .skip(skip)
    .limit(limit)
    .lean();

  const totalProducts = await Product.countDocuments(productQuery);
  const totalPages = Math.ceil(totalProducts / limit);

  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  res.render('user/collections', {
    admin: false,
    categories: categories,
    products: products,
    prevPage: prevPage,
    nextPage: nextPage,
    pages: pages,
    currentPage: page,
    selectedCategories: selectedCategories,  
    selectedGender: selectedGender         
  });
});



module.exports = router;
