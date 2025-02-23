const Wishlist = require('../models/wishlist-schema');

const getWishlistData = async (req, res) => {
  const userId = req.session.user._id;

  try {
    const wishlist = await Wishlist.findOne({ userId }).populate('productId').lean();
    if (wishlist) {
      res.json({ success: true, wishlist: wishlist.productId });
    } else {
      res.json({ success: true, wishlist: [] });
     
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'An error occurred' });
  }
};
const getWishlist = async (req, res) => {
  const userId = req.session.user._id;

  try {
    const wishlist = await Wishlist.findOne({ userId }).populate('productId').lean();
    if (wishlist) {
      res.render('user/wishlist',{products:wishlist.productId,isUser:true});
    } else {
      res.render('user/wishlist',{products:[],isUser:true})
     
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'An error occurred' });
  }
};
const fetchProductWishlist = async (req,res)=>{
  const userId = req.session.user._id
  try{
    const wishlist = await Wishlist.findOne({userId}).populate('productId').lean();
    if(wishlist){
      res.json({success:true,product:wishlist.productId})
    }else{
      res.json({success:true,product:[]})
    }
  }catch(error){
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'An error occurred' });
  }
}
const wishlistMangement = async (req, res) => {
  try {
    const { productId } = req.body;
    console.log(productId)
    const userId = req.session.user._id; 

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({ userId, productId: [productId] });
      await wishlist.save();
      return res.json({ action: 'added', message: 'Product added to wishlist' });
    }

    const productIndex = wishlist.productId.indexOf(productId);

    if (productIndex === -1) {
      wishlist.productId.push(productId);
      await wishlist.save();
      res.json({ action: 'added', message: 'Product added to wishlist' });
    } else {
      wishlist.productId.splice(productIndex, 1);
      await wishlist.save();
      res.json({ action: 'removed', message: 'Product removed from wishlist' });
    }
  } catch (error) {
    console.error("Wishlist update error:", error);
    res.status(500).json({message: "Server error" });
  }
};
module.exports = {wishlistMangement,getWishlistData,fetchProductWishlist,getWishlist}