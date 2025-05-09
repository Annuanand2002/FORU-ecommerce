var express = require('express');
var router = express.Router();
const { registerUser,loginUser,verifyEmail,generateResetToken, resetPassword,logoutUser} = require('../controllers/user-controller'); 
const Product = require('../models/product-schema');
const Category = require('../models/cateogory-schema');
const passport = require('passport');
const User = require('../models/user-schema');
const {checkAuthentication,checkUserBlocked}= require('../controllers/auth-middleware')
const pagination= require('../controllers/pagination-middleware')
const nodemailer = require('nodemailer');
const {getFilteredProducts }= require('../controllers/getFilteredProduct');
const {getSingleProduct,search}= require('../controllers/product-controller');
const {updateProfile,deleteAccount}= require('../controllers/userAccount-middleware')
const {wishlistMangement, getWishlistData, fetchProductWishlist,getWishlist}= require('../controllers/wishlist-middleware')
const {addAddress,getAddresses,removeAddress,getEditAddresses,editAddress,setDefaultAddress} = require('../controllers/address-middleware')
const {addToCart,getCart,removeCart,updateCartQunatity,getAddAddressCart,addressCart,addAddressCart,cartQuantityCheck,applyCoupon,removeCoupon} = require('../controllers/cart-middleware')
const {getPaymentPage,placeOrder,orderConfirmed,getOrderPage,retryPayment,getOrderDetails,orderCancel,requestReturn,handlePaymentResponse,addAddressses,invoiceDownload,paymentFailPage} = require('../controllers/order-controller')
const couponHelper = require('../controllers/coupon-middleware')
const walletHelper = require('../controllers/wallet-middleware')

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

    if (result.success) {
      return res.status(200).json({ success: true, message: result.message });
    } else {
      return res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
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
router.get(
  '/auth/google/callback',
  (req, res, next) => {
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
  }
);



/**login */


router.get('/login',(req,res,next)=>{
  const message = req.session.message || '';
  req.session.message = []
  res.render('user/login',{isAdminLogin:true,message})
})
router.post('/login',async (req,res,next)=>{
  const { email, password } = req.body;
 
  if (!email || !password) {
    return res.status(400).json({success:false, error: "Email and password are required." });
  }

  try{
    const result = await loginUser({email,password});
    if (result.blocked) {
      return res.status(403).json({success:false, error: "You have been blocked. Please contact support." });
    }
    if(!result.success){

      return res.status(401).json({ success:false,error: "Invalid username or password." });
    }
    if(result.success){
      req.session.user = ({
        _id:result._id,
        name:result.name,
        email:result.email,
        phone:result.phone,
        dateOfBirth:result.dateOfBirth,
        gender:result.gender,
        blocked:result.blocked
      })
      return res.status(200).json({success:true,message: "Login successful"})
    }
  }
  catch(error){
    console.log("Login error:", error);
   
    return res.status(500).json({success:false,error: "An internal server error occurred." });
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

router.get('/collections',getFilteredProducts);
/**profile-mangement */
router.get('/account',checkAuthentication,(req,res)=>{
  const user = req.session.user;
  res.render('user/user-account',{user,isUser:true})
})
router.get('/edit-profile',checkAuthentication,checkUserBlocked,(req,res)=>{
  const user = req.session.user;
  res.render('user/edit-userProfile',{user,isUser:true})
})
router.post('/edit-profile',updateProfile);

/**address */
router.get('/address',checkAuthentication,getAddresses)
router.get('/add-address',checkAuthentication,(req,res)=>{
  res.render('user/address',{isUser:true})
});
router.post('/add-address',addAddress);
router.post('/address/set-default/:id', setDefaultAddress);
router.post('/address/remove/:id',removeAddress);
router.get('/edit-address',checkAuthentication,getEditAddresses);
router.post('/edit-address',editAddress)

/**delete-account */
router.get('/delete-account',checkAuthentication,(req,res)=>{
  res.render('user/delete-account',{isUser:true})
})
router.post('/delete-account', deleteAccount);

/**order mangement */
router.get('/orders',checkAuthentication,getOrderPage)
router.get('/order-details/:orderId/:itemId',checkAuthentication,getOrderDetails)
router.post('/cancel-order',orderCancel)
router.post('/return-order',requestReturn)
router.get('/payment',checkAuthentication,getPaymentPage)
router.post('/place-order',placeOrder)
router.post('/handle-payment-response',handlePaymentResponse)
router.get('/order-confirmation/:orderId',checkAuthentication,orderConfirmed)
router.post('/add-addresses',checkAuthentication,addAddressses)
router.get('/payment-failed/:orderId',checkAuthentication,paymentFailPage)
router.post('/retry-payment',retryPayment)
/**logout */
router.get('/logout', logoutUser);

/**single-productpage */
router.get('/product/:id',checkAuthentication,getSingleProduct);

/**wishlist mangement */
router.get('/wishlist/products',fetchProductWishlist)
router.get('/wishlist/data',checkAuthentication,getWishlistData)
router.get('/wishlist',checkAuthentication,getWishlist)
router.post('/wishlist/toggle',checkAuthentication,wishlistMangement)

/**cart-mangement */
router.post('/cart/add',checkAuthentication,addToCart)
router.get('/cart',checkAuthentication,getCart)
router.post('/cart/remove',removeCart)
router.post('/cart/update-quantity',updateCartQunatity)
router.get('/address-cart',checkAuthentication,addressCart)
router.get('/addAddressCart',checkAuthentication,getAddAddressCart)
router.post('/addAddressCart',checkAuthentication,addAddressCart)
router.get('/product/:productId/size/:size/quantity',cartQuantityCheck)
router.get('/apply-coupon',couponHelper.getApplyCouponPage)
router.post('/apply-coupon',applyCoupon)
router.post('/wallet/reduce',walletHelper.addFromWallet)
router.post('/remove-coupon',checkAuthentication,removeCoupon)

/**wallet mangement */
router.get("/wallet",checkAuthentication,walletHelper.getWallet)

/**invoice */
router.get('/orders/:orderId/invoice',invoiceDownload)

module.exports = router;
