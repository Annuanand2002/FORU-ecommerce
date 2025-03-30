const Sales = require('../models/sales-schema')
const Order = require("../models/order-schema");

const getSalesReportPage = async (req, res) => {
  try {
    const completedOrders = await Order.aggregate([
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.status': 'Completed'
        }
      },
      {
        $lookup: {
          from: 'users', 
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },

      {
        $lookup: {
          from: 'products', 
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      // Stage 6: Unwind the product array (since $lookup returns an array)
      {
        $unwind: '$product'
      },
      // Stage 7: Project the required fields
      {
        $project: {
          orderId: '$_id', 
          username: '$user.name', 
          productname: '$product.name', 
          quantity: '$items.quantity', // Include the quantity from the items array
          totalPrice: 1, // Include the total price
          discountAmount: '$discountCouponFee', // Include the discount amount
          newTotal: 1 // Include the new total
        }
      }
    ]);
console.log("getSalesReportPage",getSalesReportPage)
    // Render the sales-report view with the fetched data
    res.render('admin/sales-report', {
      isAdminLogin: false,
      admin: true,
      sales: completedOrders // Pass the completed orders to the view
    });
  } catch (error) {
    console.log("Error occurred:", error);
    res.status(500).send("Internal Server Error");
  }
};


const filterSalesData = async (req, res) => {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
  }

  const isValidStartDate = !isNaN(new Date(startDate).getTime());
  const isValidEndDate = !isNaN(new Date(endDate).getTime());
  if (!isValidStartDate || !isValidEndDate) {
    return res.status(400).json({ success: false, message: 'Invalid date format' });
  }

  try {
    const start = new Date(new Date(startDate).setHours(0, 0, 0, 0)); 
    const end = new Date(new Date(endDate).setHours(23, 59, 59, 999)); 

    const filteredOrders = await Order.aggregate([
      { $unwind: '$items' },
      { $match :
        {
          'items.status' : "Completed",
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          orderId: '$_id',
          username: '$user.name',
          productname: '$product.name',
          quantity: '$items.quantity',
          totalPrice: 1,
          discountAmount: '$discountCouponFee',
          newTotal: 1
        }
      }
    ]);

    res.status(200).json(filteredOrders);
  } catch (error) {
    console.error('Error filtering sales:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

module.exports = {getSalesReportPage,filterSalesData}