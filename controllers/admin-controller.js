const Admin = require('../models/admin-schema'); 
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer')
const Sales = require('../models/sales-schema')
const Order = require('../models/order-schema')

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

const login =  async (req, res, next) =>{
  if(req.session.admin){
    return res.redirect('/admin/dashboard')
  }
  res.render('admin/login',{admin:true,isAdminLogin:true})
}

const adminLogin =  async (req, res) => {
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

    req.session.admin = admin;
    res.status(200).json({ message: 'Login successful!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error, please try again later.' });
  }
}

const dashboard = async (req, res, next) => {
  try {
    const salesData = {
      daily: await getSalesData('day'),
      weekly: await getSalesData('week'), 
      monthly: await getSalesData('month')
    };
    const totalSales = await Sales.aggregate([
      { $unwind: "$items" },
      { $match: { 'items.status': "Completed" } },
      { 
        $group: { 
          _id: null, 
          total: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } 
        } 
      }
    ]);

    const totalOrders = await Order.countDocuments().lean();

    const totalProductSold = await Sales.aggregate([
     
      { $unwind: "$items" },
      { $match: { 'items.status': "Completed" } },

      { $group: { _id: null, total: { $sum: "$items.quantity" } } }
    ]);

    const pendingOrders = await Order.countDocuments({ 'items.status': "Pending" }).lean();

    const orders = await Order.find().sort({ createdAt: -1 }).limit(5).populate("userId", "name").lean();

    const topSellingProducts = await Sales.aggregate([
      
      { $unwind: "$items" },
      { $match: { 'items.status': "Completed" } },
      {
        $group: {
          _id: "$items.productId",
          unitsSold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

   

    res.render("admin/dashboard", {
      salesData: JSON.stringify(salesData),
      admin: true,
      isAdminLogin: false,
      totalSales: totalSales[0]?.total || 0,
      totalOrders,
      totalProductSold: (totalProductSold.length > 0) ? totalProductSold[0].total : 0,
      pendingOrders,
      orders,
      topSellingProducts,

    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

async function getSalesData(interval) {
  const groupBy = {
    day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
    week: { $dateToString: { format: "%Y-%U", date: "$createdAt" } },
    month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }
  };

  return await Order.aggregate([
    // 1. Unwind items to process individually
    { $unwind: "$items" },

    // 2. Filter only completed items
    { $match: { "items.status": "Completed" } },

    // 3. Group by order to calculate revenue per order
    {
      $group: {
        _id: "$_id", // Group by order ID
        createdAt: { $first: "$createdAt" }, // Keep order date
        orderTotal: { $first: "$newTotal" }, // Use 'newTotal' (includes discounts/shipping)
        completedItemsRevenue: { 
          $sum: { $multiply: ["$items.price", "$items.quantity"] } 
        },
      }
    },

    // 4. Group by time interval (day/week/month)
    {
      $group: {
        _id: groupBy[interval],
        totalRevenue: { $sum: "$orderTotal" }, // Sum of all order totals
        completedItemsRevenue: { $sum: "$completedItemsRevenue" }, // Revenue from items only
        orderCount: { $sum: 1 }, // Count of orders
      }
    },

    // 5. Sort chronologically
    { $sort: { _id: 1 } }
  ]);
}
const logoutAdmin = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Unable to log out');
    }
    res.redirect('/admin/login');
  });
};

module.exports = {
  addAdmin,handleForgotPassword,
  handleResetPassword,adminLogin,login,dashboard,logoutAdmin
};


