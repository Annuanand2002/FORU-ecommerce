const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable');
const Order = require("../models/order-schema");
const Cart = require("../models/cart-schema");
const User = require("../models/user-schema");
const Product = require("../models/product-schema");
const Razorpay = require("razorpay");
const Sales = require("../models/sales-schema");
const Wallet = require("../models/wallet-schema")
require("dotenv").config();

require('jspdf-autotable'); 
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: "rzp_test_buXTHPZB2Eujic",
  key_secret: "EkjlLSQaKVSeKDV7qWZQRIBR",
});

/**render payment page */
const getPaymentPage = async (req, res) => {
  try {
    const { addressId } = req.query;
    const userId = req.session.user._id;

    if (!addressId) {
      return res.status(400).json({ error: "Address ID is required" });
    }
    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const cart = await Cart.findOne({ userId: userId }).populate(
      "items.productId"
    ).lean()
    if (!cart) {
      return res.status(404).json({ message: "Cart not found." });
    }

    const items = cart.items.map((item) => ({
      productId: item.productId._id,
      quantity: item.quantity,
      price: item.productId.price,
    }));

    const address = user.addresses.find(
      (addr) => addr._id.toString() === addressId
    );
    if (!address) {
      return res.status(404).json({ error: "Address not found" });
    }
    const addressObj = address.toObject();
    const wallet = await Wallet.findOne({userId}).lean()
    res.render("user/payment", {
      addressObj,
      cart,
      wallet,
      isUser: true,
    });
  } catch (error) {
    console.error("Error fetching address:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**payment using COD?onlinepayment? wallet*/
const placeOrder = async (req, res) => {
  const { paymentMethod, addressId } = req.body;
  const userId = req.session.user._id;

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) {
      return res.status(400).json({ message: "Cart not found." });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }

    const deliveryAddress = user.addresses.find(
      (add) => add._id.toString() === addressId
    );
    if (!deliveryAddress) {
      return res.status(400).json({ message: "Selected address not found." });
    }
    const isFullWalletPayment = cart.isFullWalletPayment;
    const finalPaymentMethod = isFullWalletPayment ? "Wallet" : paymentMethod;


    const order = new Order({
      userId: userId,
      cartId: cart._id,
      items: cart.items.map((item) => ({
        productId: item.productId._id,
        quantity: item.quantity,
        price: item.productId.offerAmount > 0 ? item.productId.offerAmount : item.productId.price, 
        size: item.size,
        productName : item.productId.name,
        image : item.productId.images[0],
        status : "Pending"
      })),
      totalPrice: cart.totalPrice,
      shippingFee: cart.shippingFee,
      discountCouponFee : cart.discountAmount,
      newTotal:cart.newTotalAmount,
      walletAmountUsed : cart.walletAmountUsed,
      deliveryAddress: {
        name: deliveryAddress.name,
        house: deliveryAddress.house,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        postalCode: deliveryAddress.postalCode,
      },
      payment: finalPaymentMethod,
    });
    await order.save();

    if(cart.walletAmountUsed>0){
      const wallet = await Wallet.findOne({userId})
      if (!wallet || wallet.balance < cart.walletAmountUsed) {
        return res.status(400).json({ message: "Insufficient wallet balance." });
      }
      wallet.balance -= cart.walletAmountUsed;
      wallet.transactions.push({
        type : "debit",
        amount :cart.walletAmountUsed,
        description : `Deducted for order ${order._id}`
      })
      await wallet.save()
    }
    const salesEntry = new Sales({
      userId: userId,
      orderId: order._id,
      items: order.items.map(item => ({
        itemId: item._id, 
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        status: item.status || 'Pending', 
      })),
      totalAmount: cart.newTotalAmount,
      discountCouponFee : cart.discountAmount,
      payment: finalPaymentMethod,
      paymentStatus:
        paymentMethod === "Online Payment" ? "Pending" : "Completed",
    });

    await salesEntry.save();
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        const sizeIndex = product.sizes.findIndex(
          (size) => size.size === item.size
        );
        if (sizeIndex !== -1) {
          product.sizes[sizeIndex].quantity -= item.quantity;
          await product.save();
        }
      }
    }

    await Cart.updateOne(
      { userId },
      { $set: { items: [], appliedCoupons: null ,totalPrice: 0,shippingFee:0,discountAmount:0,newTotalAmount:0,isFullWalletPayment:0,walletAmountUsed:0} }
    );

    if (finalPaymentMethod === "Online Payment") {
      const razorpayOrder = await razorpay.orders.create({
        amount: order.newTotal * 100,
        currency: "INR",
        receipt: `order_${order._id}`,
      });
      console.log("razorpayOrder", razorpayOrder);
      order.razorpayOrderId = razorpayOrder.id;
      await order.save();

      return res.status(200).json({
        orderId: order._id,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
      });
    }
    return res.status(201).json({ orderId: order._id });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Failed to place order." });
  }
};

/**function to handle razorpay payment */
const handlePaymentResponse = async (req, res) => {
  const userId = req.session.user._id;
  const { orderId, paymentId, signature, status, order } = req.body;
  try {
    if (status === "success") {
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      if (generatedSignature !== signature) {
        return res
          .status(400)
          .json({ message: "Payment verification failed." });
      }
    }
    const orders = await Order.findOne({ _id: order });
    if (!orders) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (status === "success") {
      orders.paymentId = paymentId;
      orders.paymentStatus = "Completed";
      await orders.save();
      await Sales.updateOne(
        { userId: userId },
        { $set: { paymentStatus: "Completed" } }
      );
    } else if (status === "failed") {
      const failedPaymentId = paymentId || `failed_${Date.now()}`;
      orders.paymentId = failedPaymentId
      orders.paymentStatus = "Failed";
      orders.paymentAttempts = (orders.paymentAttempts || 0) +1;
      orders.lastPaymentAttempt = new Date()
      await orders.save();
      await Sales.updateOne(
        { userId: userId },
        { $set: { paymentStatus: "Failed" } }
      );

      return res.json({ 
        success: false,
        orderId: orders._id,
        paymentFailed: true,
        razorpayOrderId: orders.razorpayOrderId,
        redirectUrl: `/payment-failed/${orders._id}`
      });
    }
    
    res.status(200).json({ message: `Payment ${status}.` });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Failed to process payment." });
  }
};

/**render order-confirm page */
const orderConfirmed = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("userId")
      .populate("items.productId")
      .lean();

    if (!order) {
      return res.status(404).send("Order not found.");
    }

    res.render("user/order-confirmed", {
      order,
      paymentMethod: order.payment,
      deliveryAddress: order.deliveryAddress,
      isAdminLogin: true,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("An error occurred while fetching order details.");
  }
};

/**render order-page in admin */
const orderAdmin = async (req, res) => {
  try {
    const orders = await Order.find().populate("userId", "name").sort({ createdAt: -1 }).lean();

    res.render("admin/order", {
      isAdminLogin: false,
      admin: true,
      orders,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Failed to fetch orders");
  }
};


/**change the status of the order from admin-side */
const orderPageUpdate = async (req, res) => {
  const { orderId, itemId } = req.params;
  const { status } = req.body;
  try {
    const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        previousStatus = item.status
        item.status = status;
        if(status === "Completed" && previousStatus!=="Completed"){
          item.completionDate = new Date();
        }
        await order.save();

        const salesRecord = await Sales.findOne({ orderId: orderId });
        if (!salesRecord) {
            return res.status(404).json({ message: 'Sales record not found' });
        }

        const salesItem = salesRecord.items.find(item => item.itemId.toString() === itemId);
        if (!salesItem) {
            return res.status(404).json({ message: 'Sales item not found' });
        }

        salesItem.status = status;
        await salesRecord.save();

        res.json({ message: 'Status updated successfully', order, salesRecord });
  } catch (error) {
    console.error("Error updating order status:", error);
    res
      .status(500)
      .json({ message: "An error occurred while updating the order status." });
  }
};

/**render the order-details page in admin */
const orderDetails = async (req, res) => {
  const orderId = req.params.id;
  const order = await Order.findById(orderId)
    .populate("userId", "name")
    .populate("items.productId", "name images")
    .lean();

  res.render("admin/order-details", {
    order,
    admin: true,
    isAdminLogin: false,
  });
};

/**render the order page in user-side */
const getOrderPage = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const startIndex = (page - 1) * limit;

    const orders = await Order.find({ userId })
      .populate("items.productId")
      .sort({ createdAt: -1 }) 
      .skip(startIndex)
      .limit(limit)
      .lean();

    const totalOrders = await Order.countDocuments({ userId });

    const totalPages = Math.ceil(totalOrders / limit);

    res.render("user/orders", {
      orders,
      currentPage: page,
      totalPages,
      limit,
      isUser: true,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
};

/**render order-details page in user-side */
const getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const itemId = req.params.itemId;
    const order = await Order.findById(orderId)
      .populate("items.productId")
      .lean();
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const item = await order.items.find(
      (item) => item._id.toString() === itemId
    );
    res.render("user/order-details", { order, item, isUser: true });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ message: "Failed to fetch order details." });
  }
};


/** Cancelling the order */
const orderCancel = async (req, res) => {
  const { orderId, itemId, reason } = req.body;

  try {

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const item = order.items.find((item) => item._id.toString() === itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found in order" });
    }

    if (item.status === "Cancelled") {
      return res.status(400).json({ message: "Item is already cancelled" });
    }

    if (item.status !== "Pending") {
      return res.status(400).json({ message: "Only pending items can be cancelled" });
    }

    const product = await Product.findById(item.productId);
    if (product) {
      const sizeIndex = product.sizes.findIndex(
        (size) => size.size === item.size
      );
      if (sizeIndex !== -1) {
        product.sizes[sizeIndex].quantity += item.quantity;
        await product.save();
      }
    }

    const calculateRefundAmount = ()=>{
      const orderTotalBeforeDiscount = order.items.reduce((sum,item)=>sum + (item.price * item.quantity),0)
      const discountRatio = order.discountCouponFee/orderTotalBeforeDiscount;
      const itemSubTotal = item.price * item.quantity
      const itemDiscount = Math.round(itemSubTotal * discountRatio)
      return itemSubTotal - itemDiscount;
    }

    const refundAmount = calculateRefundAmount();

     if ( order.payment === "Wallet") {
      const wallet = await Wallet.findOne({ userId: order.userId });
      if (!wallet) {
        const newWallet = new Wallet({
          userId: order.userId,
          balance: refundAmount,
          transactions: [
            {
              type: "credit",
              amount:  refundAmount,
              description: `Refund for cancelled item ${item.productName} in order ${order._id}`,
            },
          ],
        });
        await newWallet.save();
      } else {
        wallet.balance += refundAmount;
        wallet.transactions.push({
          type: "credit",
          amount:  refundAmount/100,
          description: `Refund for cancelled item ${item.productName} in order ${order._id}`,
        });
        await wallet.save();
      }
    } else if (order.payment === "Online Payment") {
      if (!order.paymentId) {
        return res.status(400).json({ message: "Payment ID not found" });
      }

      try {
        const razorpayRefundAmount =  refundAmount * 100;
        console.log("razorpayRefundAmount",razorpayRefundAmount)
        const refund = await razorpay.payments.refund(order.paymentId, {
          amount: razorpayRefundAmount,
          speed: "normal",
        });

        const wallet = await Wallet.findOne({ userId: order.userId });
        if (!wallet) {
          const newWallet = new Wallet({
            userId: order.userId,
            balance:  refundAmount,
            transactions: [
              {
                type: "credit",
                amount:  refundAmount,
                description: `Refund for cancelled item ${item.productName} in order ${order._id}`,
              },
            ],
          });
          await newWallet.save();
        } else {

          wallet.balance +=  refundAmount;
          wallet.transactions.push({
            type: "credit",
            amount:  refundAmount,
            description: `Refund for cancelled item ${item.productName} in order ${order._id}`,
          });
          await wallet.save();
        }
      } catch (razorpayError) {
        console.error("Razorpay refund error:", razorpayError);
        return res.status(500).json({
          message: "Failed to initiate refund. Please contact support.",
          error: razorpayError.message,
        });
      }
    }

    item.status = "Cancelled";
    item.cancellationReason.push({ 
      itemId: item._id, 
      reason,
      cancelledAt: new Date()
    });


    const allItemsCancelled = order.items.every((i) => i.status === "Cancelled");
    if (allItemsCancelled) {
      order.status = "Cancelled";
      order.paymentStatus = "Refunded";
    }


    await order.save();
    const sales = await Sales.findOne({ orderId: order._id });
    if (sales) {
      const salesItem = sales.items.find((i) => i.itemId.toString() === itemId);
      if (salesItem) {
        salesItem.status = "Cancelled";
        await sales.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Item cancelled and refund processed successfully",
    });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "An error occurred. Please try again." });
  }
};

/** returning the order */
// const orderReturn = async (req, res) => {
//   const { orderId, itemId, reason } = req.body;

//   try {

//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ success: false, message: "Order not found" });
//     }

//     const item = order.items.find((item) => item._id.toString() === itemId);
//     if (!item) {
//       return res.status(404).json({ success: false, message: "Item not found in order" });
//     }

//     if (item.status === "Returned") {
//       return res.status(400).json({ success: false, message: "Item is already returned" });
//     }
//     if (item.status !== "Completed") {
//       return res.status(400).json({ success: false, message: "Only completed items can be returned" });
//     }
//     if (!item.completionDate) {
//       return res.status(400).json({ success: false, message: "Completion date not found" });
//     }

//     const completionDate = new Date(item.completionDate);
//     const returnEndDate = new Date(completionDate);
//     returnEndDate.setDate(returnEndDate.getDate() + 7);

//     if (new Date() > returnEndDate) {
//       return res.status(400).json({ success: false, message: "The return period for this item has ended" });
//     }

//     const product = await Product.findById(item.productId);
//     if (product) {
//       const sizeIndex = product.sizes.findIndex(
//         (size) => size.size === item.size
//       );
//       if (sizeIndex !== -1) {
//         product.sizes[sizeIndex].quantity += item.quantity;
//         await product.save();
//       }
//     }

//     const calculateRefundAmount = ()=>{
//       const orderTotalBeforeDiscount = order.items.reduce((sum,item)=>sum + (item.price * item.quantity),0)
//       const discountRatio = order.discountCouponFee/orderTotalBeforeDiscount;
//       const itemSubTotal = item.price * item.quantity
//       const itemDiscount = Math.round(itemSubTotal * discountRatio)
//       return itemSubTotal - itemDiscount;
//     }

//     const refundAmount = calculateRefundAmount();

    
//     if (order.payment === "Cash on Delivery" || order.payment === "Wallet") {

//       const wallet = await Wallet.findOne({ userId: order.userId });
//       if (!wallet) {

//         const newWallet = new Wallet({
//           userId: order.userId,
//           balance: refundAmount,
//           transactions: [
//             {
//               type: "credit",
//               amount: refundAmount,
//               description: `Refund for returned item ${item.productName} in order ${order._id}`,
//             },
//           ],
//         });
//         await newWallet.save();
//       } else {

//         wallet.balance += itemTotal;
//         wallet.transactions.push({
//           type: "credit",
//           amount: refundAmount,
//           description: `Refund for returned item ${item.productName} in order ${order._id}`,
//         });
//         await wallet.save();
//       }
//     } else if (order.payment === "Online Payment") {
//       if (!order.paymentId) {
//         return res.status(400).json({ success: false, message: "Payment ID not found" });
//       }

//       try {

//         const razorpayRefundAmount = refundAmount * 100;


//         const refund = await razorpay.payments.refund(order.paymentId, {
//           amount: razorpayRefundAmount,
//           speed: "normal",
//         });


//         const wallet = await Wallet.findOne({ userId: order.userId });
//         if (!wallet) {
 
//           const newWallet = new Wallet({
//             userId: order.userId,
//             balance: refund/100,
//             transactions: [
//               {
//                 type: "credit",
//                 amount: refund/100,
//                 description: `Refund for returned item ${item.productName} in order ${order._id}`,
//               },
//             ],
//           });
//           await newWallet.save();
//         } else {

//           wallet.balance += refundAmount;
//           wallet.transactions.push({
//             type: "credit",
//             amount: refundAmount,
//             description: `Refund for returned item ${item.productName} in order ${order._id}`,
//           });
//           await wallet.save();
//         }
//       } catch (razorpayError) {
//         console.error("Razorpay refund error:", razorpayError);
//         return res.status(500).json({
//           success: false,
//           message: "Failed to initiate refund. Please contact support.",
//           error: razorpayError.message,
//         });
//       }
//     }

//     item.status = "Returned";
//     item.returnReason.push({ 
//       itemId: item._id, 
//       reason,
//       returnedAt: new Date()
//     });


//     const allItemsReturned = order.items.every((i) => i.status === "Returned");
//     if (allItemsReturned) {
//       order.status = "Returned";
//       order.paymentStatus = "Refunded";
//     }

//     await order.save();

//     const sales = await Sales.findOne({ orderId: order._id });
//     if (sales) {
//       const salesItem = sales.items.find((i) => i.itemId.toString() === itemId);
//       if (salesItem) {
//         salesItem.status = "Returned";
//         await sales.save();
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Item returned and refund processed successfully",
//     });
//   } catch (error) {
//     console.error("Error:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "An error occurred. Please try again." });
//   }
// };



const requestReturn = async (req, res) => {
  const { orderId, itemId, reason } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    // Validate return eligibility
    if (item.status !== "Completed") {
      return res.status(400).json({ 
        success: false, 
        message: "Only completed items can be returned" 
      });
    }

    if (!item.completionDate) {
      return res.status(400).json({ 
        success: false, 
        message: "Completion date not found" 
      });
    }

    const returnEndDate = new Date(item.completionDate);
    returnEndDate.setDate(returnEndDate.getDate() + 7);

    if (new Date() > returnEndDate) {
      return res.status(400).json({ 
        success: false, 
        message: "Return period (7 days) has ended" 
      });
    }

    // Set return request
    item.returnRequest = {
      requested: true,
      reason,
      requestedAt: new Date()
    };

    // Change status to "Return Processing"
    item.status = "Return Processing";

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Return request submitted for admin approval"
    });

  } catch (error) {
    console.error("Return request error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error processing return request" 
    });
  }
};

/**add address from the  choosing delivery-address page */
const addAddressses = async (req, res) => {
  const { name, phone, house, city, state, postalCode, isDefault } = req.body;
  const userId = req.session.user._id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const newAddress = {
      name,
      phone,
      house,
      city,
      state,
      postalCode,
      isDefault,
    };

    user.addresses.push(newAddress);

    if (isDefault) {
      user.addresses.forEach((address) => {
        address.isDefault = false;
      });
      newAddress.isDefault = true;
    }

    await user.save();

    res.status(201).json({ message: "Address added successfully." });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Failed to add address." });
  }
};

/**invoice download */
const invoiceDownload = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('userId', 'email phone');

    if (!order) {
      return res.status(404).send('Order not found');
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Set document metadata
    doc.setProperties({
      title: `Invoice #${order._id}`,
      subject: 'Order Invoice',
      creator: 'FORU'
    });

    // Constants for layout
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const rightColX = pageWidth - margin - 50;

    // Invoice header
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text(`INVOICE #${order._id}`, pageWidth / 2, 25, { align: 'center' });

    // Seller info (left column)
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('FORU', margin, 35);
    doc.text('123 Business Street', margin, 40);
    doc.text('Varkala, Kerala, 695142', margin, 45);
    doc.text('GSTIN: XXXXXXXXXXXXXX', margin, 50);

    // Order info (right column)
    doc.setFontSize(10);
    doc.text(`Invoice Date: ${order.createdAt.toLocaleDateString('en-IN')}`, rightColX, 35);
    doc.text(`Order ID: ${order._id}`, rightColX, 40);
    doc.text(`Payment Method: ${order.payment}`, rightColX, 45);
    doc.text(`Status: ${order.paymentStatus}`, rightColX, 50);

    // Customer info
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Bill To:', margin, 65);
    doc.setFontSize(10);
    doc.text(`${order.deliveryAddress.name}`, margin, 70);
    doc.text(`${order.deliveryAddress.house}`, margin, 75);
    doc.text(`${order.deliveryAddress.city}, ${order.deliveryAddress.state}`, margin, 80);
    doc.text(`PIN: ${order.deliveryAddress.postalCode}`, margin, 85);
    doc.text(`Phone: ${order.userId?.phone || order.deliveryAddress.phone}`, margin, 90);

    // Items table
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Order Details:', margin, 105);

    const columns = [
      { header: 'Product', dataKey: 'product' },
      { header: 'Qty', dataKey: 'qty' },
      { header: 'Unit Price', dataKey: 'price' },
      { header: 'Total', dataKey: 'total' },
      { header: 'Status', dataKey: 'status' }
    ];

    const rows = order.items.map(item => ({
      product: item.productName,
      qty: item.quantity,
      price: `₹${item.price.toFixed(2)}`,
      total: `₹${(item.price * item.quantity).toFixed(2)}`,
      status: item.status || 'Completed' // Default status if not provided
    }));

    doc.autoTable({
      startY: 110,
      head: [columns.map(col => col.header)],
      body: rows.map(row => columns.map(col => row[col.dataKey])),
      headStyles: {
        fillColor: [228, 178, 117],
        textColor: [255, 255, 255],
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 'auto' }, // Product
        1: { cellWidth: 20, halign: 'center' }, // Qty
        2: { cellWidth: 30, halign: 'left' }, // Price
        3: { cellWidth: 30, halign: 'left' }, // Total
        4: { cellWidth: 30, halign: 'center' } // Status
      },
      styles: {
        fontSize: 8,
        cellPadding: 4
      },
      margin: { left: margin, right: margin }
    });

    // Totals section
    const finalY = doc.lastAutoTable.finalY + 10;
    
    // Right-aligned totals
    const totals = [
      { label: 'Subtotal:', value: order.totalPrice },
      { label: 'Shipping:', value: order.shippingFee },
      { label: 'Discount:', value: -order.discountCouponFee },
      { label: 'Wallet Used:', value: -order.walletAmountUsed }
    ];

    totals.forEach((item, index) => {
      doc.setFontSize(8);
      doc.text(item.label, rightColX, finalY + (index * 8));
      doc.text(`₹${Math.abs(item.value).toFixed(2)}`, rightColX + 40, finalY + (index * 8), { align: 'right' });
    });

    // Grand Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Total Amount:', rightColX, finalY + 40);
    doc.text(`₹${order.newTotal.toFixed(2)}`, rightColX + 40, finalY + 40, { align: 'right' });

    // Terms and conditions
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Terms & Conditions:', margin, finalY + 60);
    doc.text('1. Goods once sold will not be taken back.', margin, finalY + 65);
    doc.text('2. Warranty as per manufacturer terms.', margin, finalY + 70);

    // Output the PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${order._id}.pdf`);
    res.send(Buffer.from(doc.output('arraybuffer')));

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).send('Error generating invoice');
  }
};

const paymentFailPage = async (req,res)=>{
  console.log("req.params.orderId",req.params.orderId)
  const order = await Order.findById(req.params.orderId)
  .populate("userId")
  .populate("items.productId")
  .lean();
  console.log("order",order)
  res.render("user/payment-fail", { order,paymentMethod: order.payment,
    deliveryAddress: order.deliveryAddress,
    isAdminLogin: true,});
}
/**retry payment */
const retryPayment = async (req,res)=>{
  try{
    const {orderId} = req.body
    console.log("req.body of retry",req.body)
    const userId = req.session.user._id
    const order = await Order.findOne({_id : orderId,userId})
    
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }
    if (order.paymentStatus === "Completed") {
      return res.status(400).json({ message: "Payment already completed." });
    }
    if (order.paymentAttempts >= 3) {
      return res.status(400).json({ 
        message: "Maximum payment attempts reached. Please contact support." 
      });
    }
    // Create new Razorpay order
    console.log("heyyyy")
    const razorpayOrder = await razorpay.orders.create({
      amount: order.newTotal * 100,
      currency: "INR",
      receipt: `order_${order._id}_retry_${order.paymentAttempts + 1}`,
    });
console.log("razorpayOrder",razorpayOrder)
    // Update order with new attempt
    order.razorpayOrderId = razorpayOrder.id;
    order.paymentAttempts += 1;
    order.lastPaymentAttempt = new Date();
    await order.save();
console.log("sucesss")
    return res.status(200).json({
      success: true,
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount
    });
  }catch(error){
    console.log(error)
    res.status(500).json({  success: false,message: "Retry failed" });
  }
}

const processReturnRequest = async (req, res) => {
  const { orderId, itemId, action } = req.body; // action: 'approve' or 'reject'

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    if (item.status !== "Return Processing") {
      return res.status(400).json({ 
        success: false, 
        message: "Item is not in return processing state" 
      });
    }

    if (action === 'approve') {
      // Process refund and update status
      const refundAmount = calculateRefundAmount(order, item);
      
      if (["Cash on Delivery", "Wallet"].includes(order.payment)) {
        await processWalletRefund(order.userId, order._id, item, refundAmount);
      } else if (order.payment === "Online Payment") {
        await processRazorpayRefund(
          order.paymentId, 
          order.userId, 
          order._id, 
          item, 
          refundAmount
        );
      }
      
      // Restore product stock
      const product = await Product.findById(item.productId);
      if (product) {
        const sizeIndex = product.sizes.findIndex(s => s.size === item.size);
        if (sizeIndex !== -1) {
          product.sizes[sizeIndex].quantity += item.quantity;
          await product.save();
        }
      }

      item.status = "Returned";
      item.returnRequest.approved = true;
      item.returnRequest.approvedAt = new Date();
      
      // Check if all items are returned
      const allItemsReturned = order.items.every(i => 
        i.status === "Returned" || i.status === "Cancelled"
      );
      
      if (allItemsReturned) {
        order.status = "Returned";
        order.paymentStatus = "Refunded";
      }
      
      await order.save();
      
      return res.status(200).json({ 
        success: true, 
        message: "Return approved and refund processed",
        refundAmount
      });
      
    } else if (action === 'reject') {
      item.status = "Completed";
      item.returnRequest = undefined;
      await order.save();
      
      return res.status(200).json({ 
        success: true, 
        message: "Return request rejected" 
      });
    }

  } catch (error) {
    console.error("Process return error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error processing return request",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper functions
function calculateRefundAmount(order, item) {
  const orderTotalBeforeDiscount = order.items.reduce(
    (sum, item) => sum + (item.price * item.quantity), 0
  );
  
  if (orderTotalBeforeDiscount === 0) return 0;
  
  const discountRatio = order.discountCouponFee / orderTotalBeforeDiscount;
  const itemSubTotal = item.price * item.quantity;
  const itemDiscount = Math.round(itemSubTotal * discountRatio);
  return itemSubTotal - itemDiscount;
}

async function processWalletRefund(userId, orderId, item, amount) {
  if (amount <= 0) return;

  const wallet = await Wallet.findOne({ userId }) || 
    new Wallet({ userId, balance: 0, transactions: [] });

  wallet.balance += amount;
  wallet.transactions.push({
    type: "credit",
    amount,
    description: `Refund for returned ${item.productName} (Order: ${orderId})`
  });

  await wallet.save();
}

async function processRazorpayRefund(paymentId, userId, orderId, item, amount) {
  if (amount <= 0) return;

  const razorpayRefundAmount = Math.round(amount * 100); // Convert to paise

  const refund = await razorpay.payments.refund(paymentId, {
    amount: razorpayRefundAmount,
    speed: "normal",
    notes: {
      reason: "Item return",
      item: item.productName,
      orderId: orderId.toString()
    }
  });

  // Credit to wallet even for Razorpay refunds
  await processWalletRefund(userId, orderId, item, amount);
}
module.exports = {
  invoiceDownload,
  placeOrder,
  getPaymentPage,
  orderConfirmed,
  orderAdmin,
  orderPageUpdate,
  orderDetails,
  getOrderPage,
  getOrderDetails,
  orderCancel,
  handlePaymentResponse,
  addAddressses,
  paymentFailPage,
  retryPayment,
  requestReturn,
  processReturnRequest
};
