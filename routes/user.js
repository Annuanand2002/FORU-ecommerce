var express = require('express');
var router = express.Router();
const { registerUser,loginUser } = require('../controllers/user-helper'); 

/* GET home page. */
router.get('/',(req,res,next)=>{
  let products = [
    {
      name:"Men Round Neck Pure Cotton T-shirt",
      price:500,
      image:'images/p_img1.png'
    },
    {
      name:"Men Round Neck Pure Cotton T-shirt",
      price:500,
      image:'images/p_img1.png'
    },
    {
      name:"Men Round Neck Pure Cotton T-shirt",
      price:500,
      image:'images/p_img2_2.png'
    },
    {
      name:"Anu",
      price:500,
      image:'images/p_img3.png'
    },
    {
      name:"Anu",
      price:500,
      image:'images/p_img3.png'
    },
    {
      name:"Anu",
      price:500,
      image:'images/p_img3.png'
    },
    {
      name:"Anu",
      price:500,
      image:'images/p_img3.png'
    },
    {
      name:"Anu",
      price:500,
      image:'images/p_img3.png'
    }
  ];
  let bestseller =[
    {
      name:"Men Round Neck Pure Cotton T-shirt",
      price:500,
      image:'images/p_img1.png'
    },
    {
      name:"Men Round Neck Pure Cotton T-shirt",
      price:500,
      image:'images/p_img1.png'
    },
    {
      name:"Men Round Neck Pure Cotton T-shirt",
      price:500,
      image:'images/p_img2_2.png'
    },
    {
      name:"Anu",
      price:500,
      image:'images/p_img3.png'
    }
  ]
  res.render('user/home',{products,bestseller,admin:false})
})

router.get('/register',(req,res,next)=>{
  res.render('user/register',{isAdminLogin : true})
})

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const result = await registerUser({name, email, password});

  if (result.success) {
    return res.json({ success: true, message: 'Registration successful' });
  } else {
    console.log('error')
    res.status(500).send(result.message);
  }
});



router.get('/login',(req,res,next)=>{
  res.render('user/login',{isAdminLogin:true})
})
router.post('/login',async (req,res,next)=>{
  const {email,password} = req.body;
  const result = await loginUser({email, password});
  if (!result.success) {
    return res.redirect('/');
  }
  else {
    console.log('error')
      return res.status(400).json({ success: false, message: result.message });
    
  }

})

module.exports = router;
