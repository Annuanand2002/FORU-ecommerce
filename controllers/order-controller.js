const Order = require("../models/order-schema");
const Cart = require("../models/cart-schema");
const User = require("../models/user-schema");
const Product = require("../models/product-schema");
const Razorpay = require("razorpay");
const Sales = require("../models/sales-schema");
const Wallet = require("../models/wallet-schema")
require("dotenv").config();
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: "rzp_test_buXTHPZB2Eujic",
  key_secret: "EkjlLSQaKVSeKDV7qWZQRIBR",
});

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
        image : item.productId.images[0]
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
      status: "Pending",
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
      items: cart.items.map((item) => ({
        productId: item.productId._id,
        quantity: item.quantity,
        price: item.productId.offerAmount > 0 ? item.productId.offerAmount : item.productId.price, 
        size: item.size,
      })),
      totalAmount: cart.newTotalAmount,
      discountCouponFee : cart.discountAmount,
      payment: finalPaymentMethod,
      paymentStatus:
        paymentMethod === "Online Payment" ? "Pending" : "Completed",
      status: "Pending",
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
      orders.paymentStatus = "Failed";
      await orders.save();
      await Sales.updateOne(
        { userId: userId },
        { $set: { paymentStatus: "Failed" } }
      );
    }
    res.status(200).json({ message: `Payment ${status}.` });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Failed to process payment." });
  }
};

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

const orderAdmin = async (req, res) => {
  try {
    const orders = await Order.find().populate("userId", "name").lean();

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

const orderPageUpdate = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );
    if(status === "Completed"){
      order.completionDate = new Date();
    }
    await order.save();
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const salesUpdate = await Sales.findOneAndUpdate(
      { orderId: orderId },
      { status: status },
      { new: true }
    );
    if (!salesUpdate) {
      return res.status(404).json({ message: "Sales record not found" });
    }
    res.json({ message: "Order status updated successfully!", order });
  } catch (error) {
    console.error("Error updating order status:", error);
    res
      .status(500)
      .json({ message: "An error occurred while updating the order status." });
  }
};
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
const getOrderPage = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const startIndex = (page - 1) * limit;

    const orders = await Order.find({ userId })
      .populate("items.productId")
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

    if (order.payment === "Cash on Delivery") {
      if (order.walletAmountUsed > 0) {
        const wallet = await Wallet.findOne({ userId: order.userId });
        const refundAmount = order.walletAmountUsed;

          wallet.balance += refundAmount;
          wallet.transactions.push({
            type: "credit",
            amount: refundAmount,
            description: `Refund for cancelled order ${order._id}`,
          });
          await wallet.save();
        order.walletAmountUsed = 0;
      }
      order.status = "Cancelled";
      order.cancellationReason.push({ itemId, reason });
      await order.save();

      const sales = await Sales.findOne({orderId :order._id})
      if(sales){
        sales.status = "Cancelled";
  await sales.save();
      }

      return res.status(200).json({ message: "Order cancelled successfully" });
    } else if (order.payment === "Online Payment") {
      if (!order.paymentId) {
        return res.status(400).json({ message: "Payment ID not found" });
      }

      try {
        const razorpayRefundAmount = (order.newTotal - order.shippingFee) * 100; 

        const refund = await razorpay.payments.refund(order.paymentId, {
          amount: razorpayRefundAmount,
          speed: "normal",
        });

        if (order.walletAmountUsed >0) {
          const wallet = await Wallet.findOne({ userId: order.userId });
          const walletRefundAmount = order.walletAmountUsed;
          const finalAmount = walletRefundAmount  + (razorpayRefundAmount/100)
          if (!wallet) {
            const newWallet = new Wallet({
              userId: order.userId,
              balance: finalAmount,
              transactions: [
                {
                  type: "credit",
                  amount: finalAmount,
                  description: `Refund for cancelled order ${order._id}`,
                },
              ],
            });
            await newWallet.save();
          } else {
            wallet.balance += finalAmount;
            wallet.transactions.push({
              type: "credit",
              amount: razorpayRefundAmount/100,
              description: `Refund for cancelled order ${order._id}`,
            });
            await wallet.save();
          }

          order.walletAmountUsed = 0;
        }else{
          const wallet = await Wallet.findOne({ userId: order.userId });
          const refundAmount = razorpayRefundAmount/100
          if(!wallet){
            const newWallet = new Wallet({
              userId: order.userId,
              balance: refundAmount,
              transactions: [
                {
                  type: "credit",
                  amount: refundAmount,
                  description: `Refund for cancelled order ${order._id}`,
                },
              ],
            });
            await newWallet.save();
          }else {
            wallet.balance += razorpayRefundAmount/100;
            wallet.transactions.push({
              type: "credit",
              amount: razorpayRefundAmount,
              description: `Refund for cancelled order ${order._id}`,
            });
            await wallet.save();
          }
        }

        // Update order status
        order.status = "Cancelled";
        order.paymentStatus = "Refunded";
        order.cancellationReason.push({ itemId, reason });
        await order.save();
        const sales = await Sales.findOne({orderId :order._id})
      if(sales){
        sales.status = "Cancelled";
  await sales.save();
      }

        return res.status(200).json({
          message: "Order cancelled and refunds processed successfully",
          refund,
        });
      } catch (razorpayError) {
        console.error("Razorpay refund error:", razorpayError);
        return res.status(500).json({
          message: "Failed to initiate refund. Please contact support.",
          error: razorpayError.message,
        });
      }
    } else if (order.payment === "Wallet") {
      const wallet = await Wallet.findOne({ userId: order.userId });
      const refundAmount = order.walletAmountUsed - order.shippingFee;
        wallet.balance += refundAmount;
        wallet.transactions.push({
          type: "credit",
          amount: refundAmount,
          description: `Refund for cancelled order ${order._id}`,
        });
        await wallet.save();
        order.walletAmountUsed = 0;
      order.status = "Cancelled";
      order.paymentStatus = "Refunded";
      order.cancellationReason.push({ itemId, reason });
      await order.save();
      const sales = await Sales.findOne({orderId :order._id})
      if(sales){
        sales.status = "Cancelled";
  await sales.save();
      }
      console.log("order",order)
      return res.status(200).json({
        message: "Order cancelled and wallet refund processed successfully",
      });
    } else {
      return res.status(400).json({ message: "Invalid payment method" });
    }
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred. Please try again." });
  }
};

const orderReturn = async (req, res) => {
  const { orderId, itemId, reason } = req.body;
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "Completed") {
      return res.status(400).json({ message: "This order is not eligible for return" });
    }

    const completionDate = new Date(order.completionDate);
    const returnEndDate = new Date(completionDate);
    returnEndDate.setDate(returnEndDate.getDate() + 7); 

    if (new Date() > returnEndDate) {
      return res.status(400).json({ message: "The return period for this order has ended" });
    }

    // Find the specific item in the order
    const item = order.items.find((item) => item._id.toString() === itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found in the order" });
    }
    const product = await Product.findById(item.productId);
    if (product) {
      const sizeIndex = product.sizes.findIndex(
        (size) => size.size === item.size
      );
      if (sizeIndex !== -1) {
        product.sizes[sizeIndex].quantity += item.quantity; // Restore the quantity
        await product.save();
      }
    }


    if (order.payment === "Cash on Delivery") {
      if(order.walletAmountUsed > 0){
        const wallet = await Wallet.findOne({ userId: order.userId });
        const refundAmount = order.walletAmountUsed;

          wallet.balance += refundAmount;
          wallet.transactions.push({
            type: "credit",
            amount: refundAmount,
            description: `Refund for returned order ${order._id}`,
          });
          await wallet.save();
        order.walletAmountUsed = 0;
      }
      order.returnReason.push({ itemId, reason });
      order.status = "Returned";
      await order.save();
      const sales = await Sales.findOne({orderId :order._id})
      if(sales){
        sales.status = "Returned";
  await sales.save();
      }
      return res.status(200).json({ message: "Order returned successfully" });
    } else if (order.payment === "Online Payment") {
      if (!order.paymentId) {
        return res.status(400).json({ message: "Payment ID not found" });
      }
      console.log("oredered amount",order.newTotal)
      try {
        const razorpayRefundAmount = (order.newTotal - order.shippingFee) * 100; 
        console.log('razorpayRefundAmount',razorpayRefundAmount)
        const refund = await razorpay.payments.refund(order.paymentId, {
          amount:(order.newTotal-order.shippingFee) * 100,
          speed: "normal",
        });
        if (order.walletAmountUsed >0) {
          const wallet = await Wallet.findOne({ userId: order.userId });
          const walletRefundAmount = order.walletAmountUsed;
          const finalAmount = walletRefundAmount  + (razorpayRefundAmount/100)
          if (!wallet) {
            const newWallet = new Wallet({
              userId: order.userId,
              balance: finalAmount,
              transactions: [
                {
                  type: "credit",
                  amount: finalAmount,
                  description: `Refund for returned order ${order._id}`,
                },
              ],
            });
            await newWallet.save();
          } else {
            wallet.balance += finalAmount;
            wallet.transactions.push({
              type: "credit",
              amount: razorpayRefundAmount/100,
              description: `Refund for returned order ${order._id}`,
            });
            await wallet.save();
          }

          order.walletAmountUsed = 0;
        }else{
          const wallet = await Wallet.findOne({ userId: order.userId });
          const refundAmount = razorpayRefundAmount/100
          if(!wallet){
            const newWallet = new Wallet({
              userId: order.userId,
              balance: refundAmount,
              transactions: [
                {
                  type: "credit",
                  amount: refundAmount,
                  description: `Refund for returned order ${order._id}`,
                },
              ],
            });
            await newWallet.save();
          }else {
            wallet.balance += razorpayRefundAmount/100;
            wallet.transactions.push({
              type: "credit",
              amount: razorpayRefundAmount,
              description: `Refund for returned order ${order._id}`,
            });
            await wallet.save();
          }
        }
      
        
        console.log("Refund initiated successfully:", refund);
        order.status = "Returned";
        order.paymentStatus = "Refunded";
        order.returnReason.push({ itemId, reason });
        await order.save();
        const sales = await Sales.findOne({orderId :order._id})
      if(sales){
        sales.status = "Returned";
  await sales.save();
      }

        return res.status(200).json({
          message: "Order returned and refund initiated successfully",
          refund,
        });
      } catch (razorpayError) {
        console.error("Razorpay refund error:", razorpayError);
        console.log("Requested Refund Amount:", order.newTotal);
        if (razorpayError.error && razorpayError.error.description) {
          console.log("Error Description:", razorpayError.error.description);
        }
        try {
          const payment = await razorpay.payments.fetch(order.paymentId);
          const refundableAmount = payment.amount - payment.amount_refunded;
          console.log('payment.amount',payment.amount)
          console.log('payment.amount_refunded',payment.amount_refunded)
          console.log("Remaining Refundable Amount:", refundableAmount);
        } catch (fetchError) {
          console.error("Failed to fetch payment details:", fetchError);
        }
        return res.status(500).json({
          message: "Failed to initiate refund. Please contact support.",
          error: razorpayError.message,
        });
      }
    }else if (order.payment === "Wallet") {
      const wallet = await Wallet.findOne({ userId: order.userId });
      const refundAmount = order.walletAmountUsed - order.shippingFee;
        wallet.balance += refundAmount;
        wallet.transactions.push({
          type: "credit",
          amount: refundAmount,
          description: `Refund for cancelled order ${order._id}`,
        });
        await wallet.save();
        order.walletAmountUsed = 0
      order.status = "Returned";
      order.paymentStatus = "Refunded";
      order.returnReason.push({ itemId, reason });
      await order.save();
      const sales = await Sales.findOne({orderId :order._id})
      if(sales){
        sales.status = "Returned";
  await sales.save();
      }
      console.log("order",order)

      return res.status(200).json({
        message: "Order cancelled and wallet refund processed successfully",
      });
    } else {
      return res.status(400).json({ message: "Invalid payment method" });
    }
  } catch (error) {
    console.error("Error returning order:", error);
    res.status(500).json({ message: "An error occurred while processing the return" });
  }
};
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



module.exports = {
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
  orderReturn
};
