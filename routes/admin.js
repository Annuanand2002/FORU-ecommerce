var express = require('express');
var router = express.Router();
const userHelper = require('../controllers/user-controller');
const productHelper = require('../controllers/product-controller');
const {upload} = require('../controllers/multer-middleware');
const adminHelper = require('../controllers/admin-controller');
const Category = require('../models/cateogory-schema');
const Admin = require('../models/admin-schema');
const categoryHelper = require('../controllers/cateogory-controller');
const bcrypt = require('bcrypt');
const {adminAuth} = require('../controllers/auth-middleware')
const {orderAdmin,updateOrderAdmin,orderPageUpdate,orderDetails} = require('../controllers/order-controller')
const couponHelper = require('../controllers/coupon-middleware')
const offerHelper = require('../controllers/offers-middleware')
const salesHelper = require('../controllers/sales-middleware')

/*admin-login*/
router.get('/login',adminHelper.login);
router.post('/login',adminHelper.adminLogin);
router.get('/forgot-password', (req, res) => {
  res.render('admin/forgot-password',{isAdminLogin:true});
});
router.post('/forgot-password', async (req, res) => {
  const { username } = req.body;
  
  try {
    const result = await adminHelper.handleForgotPassword(username);
    res.render('admin/forgot-password', { message: result.message ,isAdminLogin:true});
  } catch (err) {
    res.status(400).render('admin/forgot-password', { error: err.message ,isAdminLogin:true});
  }
});

router.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const admin = await Admin.findOne({ resetToken: token, resetTokenExpires: { $gt: Date.now() } });
    if (!admin) {
      return res.status(400).render('admin/reset-password', { error: 'Invalid or expired token' ,isAdminLogin:true});
    }
    res.render('admin/reset-password', { token ,isAdminLogin:true});

  } catch (err) {
    res.status(500).send('Server Error');
  }
});
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  try {
    const result = await adminHelper.handleResetPassword(token, password, confirmPassword);
    res.redirect('/admin/login');
  } catch (err) {
    res.status(400).render('admin/reset-password', { error: err.message, token,isAdminLogin:true });
  }
});

/*admin-dashboard*/
router.get('/dashboard',adminAuth,adminHelper.dashboard);
router.post('/add-admin', async (req, res) => {
  const { username, password } = req.body;
  

  try {
    const message = await adminHelper.addAdmin(username, password);
    res.status(201).json({ message: message });  
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });  
  }
});

/*admin-product*/
router.get('/products', adminAuth,async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;
  const searchQuery = req.query.searchQuery || '';
  try {
    const data = await productHelper.getAllProduct(page,perPage,searchQuery);
    
    res.render('admin/products',{products:data.products,currentPage :data.currentPage,prevPage:data.prevPage,
      totalPages:data.totalPages,pages:data.pages,searchQuery: searchQuery,
      admin:true,isAdminLogin:false})
  }
  catch(error){
    console.log("error occured",error);
    res.status(500).send('Internal Server Error');
  }
});



/*add-product*/
router.get('/add-product', adminAuth,async (req, res, next)=>{
  const categories = await categoryHelper.getAllcategories();
  res.render('admin/add-product',{categories,admin:true,isAdminLogin:false})
});
router.post('/add-product', upload, async (req, res) => {
  try {
    const productData = req.body;
    const files = req.files;

    const sizeNames = productData.sizeName || [];
    const sizeQuantities = productData.sizeQuantity || [];

    const sizes = sizeNames.map((size, index) => ({
      size: size,
      quantity: parseInt(sizeQuantities[index], 10) || 0
    }));
    productData.sizes = sizes;
    
    if (!files || files.length === 0) {
      throw new Error('No files uploaded.');
    }

    const result = await productHelper.addProduct(productData, files);
    if (result.success) {
      res.redirect('/admin/products');
    } else {
      throw result.error;
    }
  } catch (err) {
    console.error('Error in add-product route:', err);
    res.status(500).send(err.message || 'Internal Server Error');
  }
});

/*product-edit*/
router.get('/edit-product/:id', adminAuth,async (req, res) => {
  try {
    const productId = req.params.id; 
    const { product,categories} = await productHelper.getEditProduct(productId); 

    res.render('admin/edit-products', { product, categories, admin: true, isAdminLogin: false });
  } catch (error) {
    console.error('Error fetching product for editing:', error);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/edit-product/:id', upload, async (req, res) => {
  const productId = req.params.id;
  const productData = req.body;
  const files = req.files;

  try {
    const result = await productHelper.updateProduct(productId, productData, files);
    if (result.success) {
      res.redirect('/admin/products');
    } else {
      throw result.error;
    }
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).send('Internal Server Error');
  }
});



/*delete-product*/
router.post('/delete-product/:id', async (req, res) => {
  try {
    const productId = req.params.id; 
    await productHelper.deleteProduct(productId) 
    res.redirect('/admin/products'); 
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).send('Internal Server Error');y
  }
})

/*category-mangement*/
router.get('/category',adminAuth,async (req,res)=>{
  try{
    const categories = await categoryHelper.getAllcategories();
    res.render('admin/category',{categories,admin:true,isAdminLogin:false})
  }
  catch{
    res.status(500).send('Internal server error')
  }
})
/*add-category*/
router.post('/add-category', async (req, res) => {
  try {
    const { name } = req.body;
    const existing = await categoryHelper.checkCategoryExists(name);
    if (existing) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    await categoryHelper.addCategory({ name });
    res.status(200).json({ message: 'Category added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

/*delete-category*/
router.delete('/delete-category/:id', async (req, res) => {
  try {
    const categoryId = req.params.id;
    await categoryHelper.deleteCategory(categoryId);
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

/*user-management */



router.get('/user',adminAuth, async (req, res) => {
  try{
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    console.log(`Page: ${page}, Limit: ${limit}`); // Log the values
    const { users, totalPages } = await userHelper.getUsers(page, limit);
    const pagination = {
      currentPage: page,
      next: page < totalPages ? page + 1 : null,
      previous: page > 1 ? page - 1 : null,
      pages: Array.from({ length: totalPages }, (_, i) => i + 1),
    };
    res.render('admin/user', { users ,pagination,admin:true,isAdminLogin:false});
  }
  catch{
    console.error('Error in /user route:', err);
    res.status(500).send('Internal Server Error');
  }
});
/**block users */
router.post("/user/block/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    await userHelper.blockUser(userId)
    res.redirect("/admin/user"); 
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).send("Internal Server Error");
  }
});
/**unblock users */
router.post("/user/unblock/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    await userHelper.unblockUser(userId)
    res.redirect("/admin/user"); 
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).send("Internal Server Error");
  }
});
router.get('/order',adminAuth,orderAdmin)
router.post('/update-order-status/:id',adminAuth,orderPageUpdate);
router.get('/order-details/:id',orderDetails)

/**coupon */
router.get('/coupon',adminAuth,couponHelper.showCouponPage)
router.get('/add-coupon',adminAuth,couponHelper.getaddCoupon)
router.post('/add-coupon',couponHelper.addCoupon)
router.get('/edit-coupon/:id',adminAuth,couponHelper.getEditPage)
router.post('/edit-coupon/:id',couponHelper.editCoupon)
router.post('/delete-coupon/:id', couponHelper.deleteCoupon)

/**offer management */
router.get('/offers',adminAuth,offerHelper.updateOfferStatus,offerHelper.getOfferPage)
router.get('/add-offers',adminAuth,offerHelper.getAddOfferPage)
router.post('/add-offers',offerHelper.addOffer)
router.get('/edit-offer/:id',adminAuth,offerHelper.getEditOfferPage)
router.post('/edit-offer/:id',offerHelper.editOffer)
router.post('/delete-offer/:id',offerHelper.deletOffer)
router.get('/show-offer/:id',adminAuth,offerHelper.showOfferPage)
router.post("/apply-offer", offerHelper.applyOffer);
router.post("/remove-offer", offerHelper.removeOffer);

/***sales-report */
router.get('/sales-report',adminAuth,salesHelper.getSalesReportPage)
router.post('/filter-sales',salesHelper.filterSalesData)

router.get('/logout',adminHelper.logoutAdmin)


module.exports = router;
