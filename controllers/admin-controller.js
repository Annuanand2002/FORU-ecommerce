const Admin = require('../models/admin-schema'); 
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer')
const Sales = require('../models/sales-schema')
const Order = require('../models/order-schema')


/**logic to add admin */
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


/**logic to send email for forget password */
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

//**logic of forget password */
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

/**login page rendering */
const login =  async (req, res, next) =>{
  if(req.session.admin){
    return res.redirect('/admin/dashboard')
  }
  res.render('admin/login',{admin:true,isAdminLogin:true})
}

/**login logic */
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

/**render dashboard */
const dashboard = async (req, res, next) => {
  try {
    // Helper function now defined inside the controller
    const getSalesData = async (interval) => {
      const groupBy = {
        day: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
        week: { $dateToString: { format: "%Y-%U", date: "$orderDate" } },
        month: { $dateToString: { format: "%Y-%m", date: "$orderDate" } }
      };

      const results = await Sales.aggregate([
        { $unwind: "$items" },
        { $match: { "items.status": "Completed" } },
        {
          $group: {
            _id: "$_id",
            orderDate: { $first: "$orderDate" },
            orderTotal: { $first: "$totalAmount" },
            completedItemsRevenue: { 
              $sum: { $multiply: ["$items.quantity", "$items.price"] } 
            }
          }
        },
        {
          $group: {
            _id: groupBy[interval],
            totalRevenue: { $sum: "$completedItemsRevenue" },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Transform data for chart
      return {
        labels: results.map(item => item._id),
        data: results.map(item => item.totalRevenue)
      };
    };

    // Get sales data for different time periods
    const salesData = {
      daily: await getSalesData('day'),
      weekly: await getSalesData('week'), 
      monthly: await getSalesData('month')
    };

    // Calculate total sales (only completed items)
    const totalSales = await Sales.aggregate([
      { $unwind: "$items" },
      { $match: { 'items.status': "Completed" } },
      { 
        $group: { 
          _id: null, 
          total: { $sum: { $multiply: ["$items.quantity", "$items.price"] } } 
        } 
      }
    ]);

    // Get total orders count
    const totalOrders = await Order.countDocuments().lean();

    // Calculate total products sold (only completed)
    const totalProductSold = await Sales.aggregate([
      { $unwind: "$items" },
      { $match: { 'items.status': "Completed" } },
      { $group: { _id: null, total: { $sum: "$items.quantity" } } }
    ]);

    // Get pending orders count
    const pendingOrders = await Order.countDocuments({ 'items.status': "Pending" }).lean();

    // Get recent orders
    const orders = await Order.find()
      .sort({ orderDate: -1 })
      .limit(5)
      .populate("userId", "name")
      .lean();

    // Get top selling products (only completed)
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

    // Get sales by category (only completed)
    const categorySales = await Sales.aggregate([
      { $unwind: "$items" },
      { $match: { 'items.status': "Completed" } },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$productDetails.category",
          totalSales: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
        }
      },
      { $sort: { totalSales: -1 } }
    ]);

    res.render("admin/dashboard", {
      salesData: JSON.stringify(salesData),
      categorySales: JSON.stringify(categorySales),
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

/**logout logic */
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


