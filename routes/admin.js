var express = require('express');
var router = express.Router();
const userHelper = require('../controllers/user-helper');
const productHelper = require('../controllers/product-helper');
const adminHelper = require('../controllers/admin-helper');
const Product = require('../models/product-schema');


/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('admin/login',{admin:true,isAdminLogin:true})
});
router.post('/', async (req, res) => {
  console.log(req.body)
  const { username, password } = req.body;

  try {
    const admin = await adminHelper.authenticateAdmin(username, password);
    res.redirect('/admin/dashboard');

  } 
  catch (error) {
    console.error('Login error:', error);
    res.redirect('/admin/')
  }
});

router.get('/dashboard', function(req, res, next) {
  res.render('admin/dashboard',{admin:true,isAdminLogin:false})
});

router.get('/products', async (req, res, next)=>{
  const products = await Product.find().lean();
  res.render('admin/products',{products,admin:true,isAdminLogin:false})
});

router.get('/add-product', function(req, res, next) {
  res.render('admin/add-product',{admin:true,isAdminLogin:false})
});
router.post('/add-product', async (req, res) => {
  try {
    const result = await productHelper.addProduct(req.body, req.files);

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

router.get('/admin/edit-product/:id', async (req, res)=>{
    res.render('admin/edit-product', {admin:true,isAdminLogin:false});
})

router.get('/user', async (req, res) => {
  try{
    const users = await userHelper.getUsers();
    res.render('admin/user', { users ,admin:true,isAdminLogin:false});
  }
  catch{
    res.status(500).send('Internal Server Error');
  }
});











module.exports = router;
