const Cart = require('../models/cart-schema')
const Coupon = require('../models/coupon-schema')
const Wishlist = require('../models/wishlist-schema');
const Product = require('../models/product-schema')
const User = require('../models/user-schema')
const Wallet = require('../models/wallet-schema')

  const addToCart =  async (req, res) => {
    const { productId, size } = req.body;
    const userId = req.session.user._id;
  
    try {
      let cart = await Cart.findOne({ userId });
  
      if (!cart) {
        cart = new Cart({ userId, items: [] });
      }
      const existingItem = cart.items.find(
        (item) => item.productId.toString() === productId && item.size === size
      );
  
      if (existingItem) {
        existingItem.quantity += 1;
        await cart.save();
        return res.status(200).json({ action: 'increased', message: 'Quantity increased' });
      } else {
        cart.items.push({ productId, size, quantity: 1 });
        await cart.save();
        return res.status(200).json({ action: 'added', message: 'Product added to cart' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'An error occurred while adding to cart' });
    }
  };
  
  const getCart = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const cart = await Cart.findOne({ userId })
            .populate('items.productId')
            .populate('appliedCoupons') // Populate the appliedCoupons field
            .lean();

        const user = await User.findById(userId).populate('addresses').lean();

        let totalPrice = 0;
        cart.items.forEach(item => {
          const price = item.productId.offerAmount > 0 ? item.productId.offerAmount : item.productId.price;
          totalPrice += price * item.quantity;
      });

        
        let discountAmount = 0;
        if (cart.appliedCoupons) {
            const coupon = await Coupon.findById(cart.appliedCoupons);
            if (coupon && coupon.minPurchaseAmount <= totalPrice) {
                discountAmount = coupon.discountAmount;
            }
        }

        // Calculate shipping fee
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
        totalPrice = totalPrice - shippingFee
       
        const newTotalPrice = totalPrice - discountAmount + shippingFee;

        await Cart.updateOne({userId},{$set:{totalPrice,shippingFee,newTotalAmount:newTotalPrice,discountAmount}})

        const coupons = await Coupon.find({
              minPurchaseAmount: { $lte: newTotalPrice },
              isActive: true,
              expiryDate: { $gte: new Date() },
            }).lean();

          

        res.render('user/cart', {
            cart,
            user,
            totalPrice, 
            shippingFee,
            coupons,
            newTotalPrice,
            discountAmount,
            isUser: true,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const removeCart = async (req,res)=>{
  const userId = req.session.user._id;
  const{productId,size} = req.body;
  try{
    const cart = await Cart.findOne({userId})
    if(!cart){
      return res.status(404).json({success:false,message:'Cart not found'})
    }
    const itemIndex = cart.items.findIndex(
      (item)=>item.productId.toString() === productId && item.size === size
    )
    if(itemIndex!==-1){
      cart.items.splice(itemIndex,1)
      await cart.save()
      return res.status(200).json({success:true,message:"Product removed from the cart"})
    }else{
      return res.status(404).json({success:false,message:"Product not found in cart"})
    }
  }catch(error){
    console.error(error);
    res.status(500).json({ success: false, message: 'An error occurred while removing from cart' });
  }
}
const updateCartQunatity = async (req, res) => {
  const { productId, size, quantity } = req.body;
  const userId = req.session.user._id;

  try {
      const cart = await Cart.findOne({ userId }).populate('items.productId');
      if (!cart) {
          return res.status(404).json({ success: false, message: 'Cart not found' });
      }

      const itemIndex = cart.items.findIndex(
          (item) => item.productId._id.toString() === productId && item.size === size
      );

      if (itemIndex !== -1) {
          cart.items[itemIndex].quantity = quantity;

          let totalPrice = 0;
          cart.items.forEach(item => {
            const price = item.productId.offerAmount > 0 ? item.productId.offerAmount : item.productId.price;
            totalPrice += price * item.quantity;
        });

          let shippingFee = totalPrice >= 2000 ? "FREE" : 80;
          if (shippingFee !== "FREE") {
              totalPrice += shippingFee;
          }

          await cart.save();
          return res.status(200).json({
              success: true,
              message: 'Quantity updated',
              cart,
              totalPrice,
              shippingFee,
          });
      } else {
          return res.status(404).json({ success: false, message: 'Product not found in cart' });
      }
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'An error occurred while updating quantity' });
  }
};

const addressCart = async (req,res)=>{
  try{
    const userId = req.session.user._id;
  const cart = await Cart.findOne({userId}).populate('items.productId').lean()
  const user = await User.findById(userId).populate('addresses').lean();
  res.render('user/address-cart',{cart,user,isUser:true})
  }catch(error){
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}

const getAddressCart = async (req,res)=>{
  res.render('user/addAddressCart',{isUser:true})
}
const removeCartAddress =  async (req, res) => {
  const { addressId } = req.params;
  const userId = req.session.user._id; // Assuming you have user authentication

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found.');
    }

    // Remove the address from the user's addresses array
    user.addresses = user.addresses.filter(address => address._id.toString() !== addressId);
    await user.save();

    res.status(200).json({ success: true, message: 'Address removed successfully.' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove address.' });
  }
};
const cartQuantityCheck =  async (req, res) => {
  const { productId, size } = req.params;

  try {
      const product = await Product.findById(productId);
      const sizeInfo = product.sizes.find(s => s.size === size);

      if (sizeInfo) {
          res.json({ quantity: sizeInfo.quantity });
      } else {
          res.status(404).json({ message: 'Size not found' });
      }
  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'An error occurred' });
  }
};

// const applyCoupon = async (req, res) => {
//   try {
//     const { couponId } = req.body;
//     const userId = req.session.user._id;

//     // 1. Validate coupon exists and is active
//     const coupon = await Coupon.findOne({
//       _id: couponId,
//       isActive: true,
//       expiryDate: { $gt: new Date() }
//     });

//     if (!coupon) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Coupon not found or expired.' 
//       });
//     }

//     // 2. Get cart with populated products
//     const cart = await Cart.findOne({ userId })
//       .populate('items.productId')
//       .populate('appliedCoupons'); // If you want to check existing coupons

//     // 3. Calculate cart total (considering offers)
//     const totalPrice = cart.items.reduce((total, item) => {
//       const price = item.productId.offerAmount > 0 
//         ? item.productId.offerAmount +cart.shippingFee
//         : item.productId.price;
//       return total + (price * item.quantity) + cart.shippingFee;
//     }, 0);

//     // 4. Validate minimum purchase amount
//     if (coupon.minPurchaseAmount > totalPrice) {
//       return res.status(400).json({ 
//         success: false, 
//         message: `Minimum purchase of ₹${coupon.minPurchaseAmount} required for this coupon.` 
//       });
//     }

//     // 5. Check if coupon is already applied
//     if (cart.appliedCoupons && cart.appliedCoupons._id.equals(coupon._id)) {
//       return res.status(400).json({
//         success: false,
//         message: 'This coupon is already applied.'
//       });
//     }

//     // 6. Apply coupon and calculate discount
//     cart.appliedCoupons = coupon._id;
//     cart.discountAmount = Math.min(
//       coupon.discountAmount, 
//       coupon.maxDiscount || Infinity
//     );
    
//     // 7. Save and respond
//     await cart.save();
    
//     res.json({ 
//       success: true, 
//       message: 'Coupon applied successfully.',
//       discountAmount: cart.discountAmount,
//       newTotal: totalPrice - cart.discountAmount
//     });

//   } catch (error) {
//     console.error('Error applying coupon:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Internal server error' 
//     });
//   }
// };

const applyCoupon = async (req, res) => {
  try {
      const { couponId } = req.body; // Single coupon ID
      const userId = req.session.user._id;

      console.log('Coupon ID:', couponId); // Debugging

      // Fetch the coupon
      const coupon = await Coupon.findById(couponId);
      if (!coupon) {
          return res.status(404).json({ success: false, message: 'Coupon not found.' });
      }

      // Fetch the cart
      const cart = await Cart.findOne({ userId }).populate('items.productId');
      console.log('Cart Before Update:', cart); // Debugging

      // Validate the coupon against the cart total
      let totalPrice = 0;
      cart.items.forEach(item => {
        const price = item.productId.offerAmount > 0 ? item.productId.offerAmount : item.productId.price;
        totalPrice += price * item.quantity;
    });

      if (coupon.minPurchaseAmount > totalPrice) {
          return res.status(400).json({ success: false, message: 'Coupon not applicable for this order.' });
      }
      // Apply the coupon (store as a reference)
      cart.appliedCoupons = coupon._id;
      await cart.save()

      res.json({ success: true, message: 'Coupon applied successfully.'});
  } catch (error) {
      console.error('Error applying coupon:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
const getAddAddressCart = async (req,res)=>{
  res.render('user/addAddressCart',{isUser:true})
}
const addAddressCart = async (req, res) => {
  try {
    const { name, phone, house, postalCode, city, state } = req.body;
    const userId = req.session.user._id;

    // Find the user by ID
    const user = await User.findById(userId);

    // If user is not found, redirect to login
    if (!user) {
      return res.redirect('/login');
    }

    // Create a new address object
    const newAddress = {
      name,
      phone,
      house,
      postalCode,
      city,
      state,
      isDefault: user.addresses.length === 0 // Set as default if it's the first address
    };
    console.log("final",newAddress)
    // Optional: Check if the address already exists
    const isDuplicate = user.addresses.some(address => 
      address.name === name &&
      address.phone === phone &&
      address.house === house 
    );
    if (isDuplicate) {
      return res.status(400).send('Address already exists');
    }

    // Add the new address to the user's addresses array
    user.addresses.push(newAddress);

    // Save the user document with the new address
    await user.save();

    // Redirect back to the address-cart page
    res.redirect('/address-cart');

  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).send('Internal Server Error');
  }
};
/**remove coupon from cart */

const removeCoupon = async (req,res)=>{
  try{
    const userId = req.session.user._id;
    console.log("userId ",userId )
    const cart = await Cart.findOneAndUpdate({userId},{
      $set : {
        discountAmount : 0,
        appliedCoupons : null,
        newTotalAmount : 0
      }
    },{ new: true }
  ).populate('items.productId')
  if(cart){
    cart.newTotalAmount = cart.totalPrice + cart.shippingFee
    await cart.save();
  }
  res.json({ success: true, message: 'Coupon removed successfully' });

  }catch(error){
    console.error(error);
        res.status(500).json({ success: false, message: 'Failed to remove coupon' });
  }
}

module.exports = {addToCart,getCart,removeCoupon,removeCart,updateCartQunatity,addressCart,getAddressCart,removeCartAddress,cartQuantityCheck,applyCoupon,getAddAddressCart,addAddressCart}