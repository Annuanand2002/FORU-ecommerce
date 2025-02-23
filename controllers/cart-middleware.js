const Cart = require('../models/cart-schema')
const Wishlist = require('../models/wishlist-schema');
const Product = require('../models/product-schema')
const User = require('../models/user-schema')

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
  
const getCart = async (req,res)=>{
  try{
    const userId = req.session.user._id;
  const cart = await Cart.findOne({userId}).populate('items.productId').lean()
  const user = await User.findById(userId).populate('addresses').lean();
  let totalPrice = 0;
  cart.items.forEach(item=>{
    totalPrice += item.productId.price *item.quantity
  })
  let shippingFee;
  if(totalPrice>=2000){
     shippingFee = "FREE"
  }else if(totalPrice>0 && totalPrice<2000  ){
     shippingFee = 80
    totalPrice = totalPrice + shippingFee
  }else{
    totalPrice= 0
    shippingFee = "FREE"
  }
  res.render('user/cart',{cart,user,totalPrice,shippingFee,isUser:true})
  }catch(error){
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}

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
              totalPrice += item.productId.price * item.quantity;
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
  let totalPrice = 0;
  cart.items.forEach(item=>{
    totalPrice += item.productId.price *item.quantity
  })
  let shippingFee;
  if(totalPrice>=2000){
     shippingFee = "FREE"
  }else if(totalPrice>0 && totalPrice<2000  ){
     shippingFee = 80
    totalPrice = totalPrice + shippingFee
  }else{
    totalPrice= 0
    shippingFee = "FREE"
  }
  res.render('user/address-cart',{cart,user,totalPrice,shippingFee,isUser:true})
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

module.exports = {addToCart,getCart,removeCart,updateCartQunatity,addressCart,getAddressCart,removeCartAddress,cartQuantityCheck}