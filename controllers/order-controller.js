const Order = require('../models/order-schema')
const Cart = require('../models/cart-schema')
const User = require('../models/user-schema')
const Product = require('../models/product-schema');



const getPaymentPage =  async (req, res) => {
        try {
            const { addressId } = req.query; 
            const userId = req.session.user._id; 
    
            if (!addressId) {
                return res.status(400).json({ error: 'Address ID is required' });
            }
            const user = await User.findById(req.session.user._id);
            if(!user){
                return res.status(404).json({ error: 'User not found' });
            }
            const cart = await Cart.findOne({ userId: userId }).populate('items.productId');
            if (!cart) {
                return res.status(404).json({ message: 'Cart not found.' });
            }

            const items = cart.items.map(item => ({
                productId: item.productId._id,
                quantity: item.quantity,
                price: item.productId.price
            }));

            let totalPrice = cart.items.reduce((total, item) => total + item.quantity * item.productId.price, 0);
        let shippingFee = 0;
  if(totalPrice>=2000){
     shippingFee = "FREE"
  }else if(totalPrice>0 && totalPrice<2000  ){
     shippingFee = 80
    totalPrice = totalPrice + shippingFee
  }else{
    totalPrice= 0
    shippingFee = "FREE"
  }
            const address = user.addresses.find(addr => addr._id.toString() === addressId);
            if (!address) {
                return res.status(404).json({ error: 'Address not found' });
            }
            const addressObj = address.toObject();
            res.render('user/payment', { addressObj,totalPrice,shippingFee ,isUser:true});
        } catch (error) {
            console.error('Error fetching address:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    };
    
    const placeOrder = async (req, res) => {
        const { paymentMethod, addressId } = req.body;
        const userId = req.session.user._id;
    
        try {
            // Fetch the user's cart
            const cart = await Cart.findOne({ userId }).populate('items.productId');
            if (!cart) {
                return res.status(400).json({ message: 'Cart not found.' });
            }
    
            // Fetch the user
            const user = await User.findById(userId); // Fix: Pass userId directly
            if (!user) {
                return res.status(400).json({ message: 'User not found.' });
            }
    
            // Find the selected address
            const deliveryAddress = user.addresses.find((add) => add._id.toString() === addressId);
            if (!deliveryAddress) {
                return res.status(400).json({ message: 'Selected address not found.' });
            }
    
            // Calculate total price and shipping fee
            let totalPrice = 0;
            cart.items.forEach((item) => {
                totalPrice += item.productId.price * item.quantity;
            });
    
            let shippingFee;
            if (totalPrice >= 2000) {
                shippingFee = 0;
            } else if (totalPrice > 0 && totalPrice < 2000) {
                shippingFee = 80;
                totalPrice += shippingFee;
            } else {
                totalPrice = 0;
                shippingFee = 0;
            }
    
            // Create the order
            const order = new Order({
                userId: userId,
                cartId: cart._id,
                items: cart.items.map((item) => ({
                    productId: item.productId._id,
                    quantity: item.quantity,
                    price: item.productId.price,
                })),
                totalPrice: totalPrice,
                shippingFee: shippingFee,
                deliveryAddress: {
                    name: deliveryAddress.name,
                    house: deliveryAddress.house,
                    city: deliveryAddress.city,
                    state: deliveryAddress.state,
                    postalCode: deliveryAddress.postalCode,
                },
                payment: paymentMethod,
                status: 'Pending',
            });
    
            await order.save();
    
            // Update product quantities
            for (const item of cart.items) {
                const product = await Product.findById(item.productId); // Fix: Pass item.productId directly
                if (product) {
                    const sizeIndex = product.sizes.findIndex((size) => size.size === item.size); // Fix: Use findIndex
                    if (sizeIndex !== -1) {
                        product.sizes[sizeIndex].quantity -= item.quantity;
                        await product.save();
                    }
                }
            }
    
            // Clear the user's cart after placing the order
            await Cart.updateOne({ userId }, { $set: { items: [] } });

    
            res.status(201).json({ orderId: order._id });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Failed to place order.' });
        }
    };
const orderConfirmed = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId)
            .populate('userId')
            .populate('items.productId').lean();

        if (!order) {
            return res.status(404).send('Order not found.');
        }

        res.render('user/order-confirmed', {
            order,
            paymentMethod: order.payment,
            deliveryAddress: order.deliveryAddress,isAdminLogin:true
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while fetching order details.');
    }
};



// Fetch orders with pagination
const orderAdmin = async (req, res) => {
  
    try {
      const orders = await Order.find()
        .populate('userId', 'name')
        .lean();
  console.log(orders)

  
      res.render('admin/order', { 
        isAdminLogin: false, 
        admin: true,
        orders,
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Failed to fetch orders');
    }
  };

 const orderPageUpdate =  async (req, res) => {
    try {
        const orderId = req.params.id;
        console.log(orderId,"hai")
        const { status } = req.body;

        const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json({ message: 'Order status updated successfully!', order });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'An error occurred while updating the order status.' });
    }
}


module.exports = {placeOrder,getPaymentPage,orderConfirmed,orderAdmin,orderPageUpdate}