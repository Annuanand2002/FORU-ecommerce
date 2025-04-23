const Sales = require('../models/sales-schema')
const Order = require("../models/order-schema");


/**render sales report page */
const getSalesReportPage = async (req, res) => {
  try {
    const salesData = await Order.aggregate([
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
      {
        $unwind: '$product'
      },
      // Calculate item-level values
      {
        $addFields: {
          'itemTotal': {
            $multiply: ['$items.price', '$items.quantity']
          },
          // Calculate the proportion of this item to the order total
          'itemProportion': {
            $cond: [
              { $gt: ['$totalPrice', 0] },
              { $divide: [
                  { $multiply: ['$items.price', '$items.quantity'] },
                  '$totalPrice'
                ]
              },
              0
            ]
          }
        }
      },
      // Calculate item's share of discount and final price
      {
        $addFields: {
          'itemDiscount': {
            $multiply: ['$discountCouponFee', '$itemProportion']
          },
          'itemFinalPrice': {
            $subtract: [
              { $multiply: ['$items.price', '$items.quantity'] },
              { $multiply: ['$discountCouponFee', '$itemProportion'] }
            ]
          }
        }
      },
      // Project final output
      {
        $project: {
          orderId: '$_id',
          username: '$user.name',
          productname: '$product.name',
          quantity: '$items.quantity',
          unitPrice: '$items.price',
          itemTotal: 1,
          itemDiscount: 1,
          itemFinalPrice: 1,
          orderTotal: '$totalPrice',       // For reference
          orderDiscount: '$discountCouponFee', // For reference
          orderNewTotal: '$newTotal'       // For reference
        }
      }
    ]);

    // Calculate grand totals
    const grandTotals = salesData.reduce((acc, item) => ({
      totalQuantity: acc.totalQuantity + item.quantity,
      grossSales: acc.grossSales + item.itemTotal,
      totalDiscount: acc.totalDiscount + item.itemDiscount,
      netSales: acc.netSales + item.itemFinalPrice
    }), {
      totalQuantity: 0,
      grossSales: 0,
      totalDiscount: 0,
      netSales: 0
    });

    res.render('admin/sales-report', {
      isAdminLogin: false,
      admin: true,
      sales: salesData,
      grandTotals,
      helpers: {
        formatCurrency: function(amount) {
          return '₹' + amount.toFixed(2);
        }
      }
    });
  } catch (error) {
    console.error("Error in sales report:", error);
    res.status(500).send("Internal Server Error");
  }
};

/**logic to filter sales data in sales report page */
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
        $addFields: {
          'itemTotal': {
            $multiply: ['$items.price', '$items.quantity']
          },
          // Calculate the proportion of this item to the order total
          'itemProportion': {
            $cond: [
              { $gt: ['$totalPrice', 0] },
              { $divide: [
                  { $multiply: ['$items.price', '$items.quantity'] },
                  '$totalPrice'
                ]
              },
              0
            ]
          }
        }
      },
      // Calculate item's share of discount and final price
      {
        $addFields: {
          'itemDiscount': {
            $multiply: ['$discountCouponFee', '$itemProportion']
          },
          'itemFinalPrice': {
            $subtract: [
              { $multiply: ['$items.price', '$items.quantity'] },
              { $multiply: ['$discountCouponFee', '$itemProportion'] }
            ]
          }
        }
      },
      // Project final output
      {
        $project: {
          orderId: '$_id',
          username: '$user.name',
          productname: '$product.name',
          quantity: '$items.quantity',
          unitPrice: '$items.price',
          itemTotal: 1,
          itemDiscount: 1,
          itemFinalPrice: 1,
          orderTotal: '$totalPrice',       // For reference
          orderDiscount: '$discountCouponFee', // For reference
          orderNewTotal: '$newTotal'       // For reference
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