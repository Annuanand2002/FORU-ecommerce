var express = require('express');
var router = express.Router();
const userHelper = require('../controllers/user-helper');
const productHelper = require('../controllers/product-helper');
const {upload} = require('../controllers/multer-middleware');
const adminHelper = require('../controllers/admin-helper');
const Category = require('../models/cateogory-schema');
const Admin = require('../models/admin-schema');
const categoryHelper = require('../controllers/cateogory-helper');
const bcrypt = require('bcrypt')

/*admin-login*/
router.get('/login', function(req, res, next) {
  res.render('admin/login',{admin:true,isAdminLogin:true})
});
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }
    res.status(200).json({ message: 'Login successful!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error, please try again later.' });
  }
});

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
router.get('/dashboard', function(req, res, next) {
  res.render('admin/dashboard',{admin:true,isAdminLogin:false})
});
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
router.get('/products', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;
  const searchQuery = req.query.searchQuery || '';
  console.log('Search Query:', searchQuery);
  console.log('Page:', page);
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
router.get('/add-product', async (req, res, next)=>{
  const categories = await categoryHelper.getAllcategories();
  res.render('admin/add-product',{categories,admin:true,isAdminLogin:false})
});
router.post('/add-product', upload, async (req, res) => {
  try {
    const productData = req.body;
    const files = req.files
    const result = await productHelper.addProduct(productData,files);
    if (result.success) {
      res.redirect('/admin/products'); 
    } else {
      throw result.error; 
    }
  } catch (err) {
    console.error('Error in add-product route:', err);
    res.status(500).send('Internal Server Error');
  }
});

/*product-edit*/
router.get('/edit-product/:id', async (req, res) => {
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
router.get('/category',async (req,res)=>{
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
router.get('/user', async (req, res) => {
  try{
    const users = await userHelper.getUsers();
    res.render('admin/user', { users ,admin:true,isAdminLogin:false});
  }
  catch{
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


module.exports = router;
