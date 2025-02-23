const Coupon = require('../models/coupon-schema');

const showCouponPage = async (req,res)=>{
  try{
    let page = parseInt(req.query.page) || 1;
    let limit = 5;
    let totalCoupons = await Coupon.countDocuments();
    let totalPages = Math.ceil(totalCoupons / limit);
    let skip = (page - 1) * limit;
    let coupons = await Coupon.find()
    .sort({expiryDate:-1})
    .skip(skip)
    .limit(limit)
    .lean()

    const currentDate = new Date();
    for(let coupon of coupons){
      let isExpired = coupon.expiryDate <= currentDate;
      if(coupon.isActive && isExpired){
        await Coupon.findById(coupon._id,{isActive:false})
        coupon.isActive = false;
      }else if(!coupon.isActive && !expiryDate){
        await Coupon.findById(coupon._id,{isActive:true})
        coupon.isActive = true
      }
    }
    res.render('admin/coupon', {
      coupons,
      currentPage: page,
      totalPages,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
      admin:true,
      isAdminLogin:false
  });

  }catch(error){
    console.log(error)
    res.status(500).send("Server Error");
  }
}

const getaddCoupon = async (req,res)=>{
  res.render('admin/add-coupon',{admin:true,isAdminLogin:false})
}

const addCoupon = async (req,res)=>{
  try{
    const {couponName,discountAmount,minPurchaseAmount,expiryDate,description} = req.body;
    console.log(req.body)
  const existingCoupon = await Coupon.findOne({couponName})
  if(existingCoupon){
     return res.status(400).json({ errors: { couponName: 'Coupon with this name already exists.' } });
  }
  const coupon = new Coupon({
    couponName,
    discountAmount,
    minPurchaseAmount,
    expiryDate,
    description
  })
  await coupon.save()
  res.redirect('/admin/coupon');
  }catch(error){
    console.log(error);
    res.status(500).json({ message: 'An error occurred while processing your request.' });
  }
}

const getEditPage = async (req,res)=>{
  try{
    const couponId = req.params.id;
    console.log('Coupon ID:', couponId);
    const coupon = await Coupon.findById(couponId)
    console.log('Coupon:', coupon);
    if(!coupon){
      return res.status(404).json({message:"Coupon noyt found"})
    }
    res.render('admin/editCoupon',{admin:true,
      isAdminLogin:false})

  }catch(error){
    console.log(error)
    res.status(500).json({ message: 'An error occurred while fetching coupon details.' });
  }
}

const deleteCoupon = async (req,res)=>{
  try{
    const couponId = req.params.id;
    const coupon = await Coupon.findByIdAndDelete(couponId)
    if(!coupon){
      res.status(404).json({message:"coupon not found"})
    }
  }catch(error){
    console.log(error)
    res.status(500).json({message:"Error occured while deleting the coupon"})
  }
}
module.exports = {showCouponPage,getaddCoupon,addCoupon,getEditPage,deleteCoupon}