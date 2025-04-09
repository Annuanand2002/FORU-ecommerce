const Offer = require('../models/offer-schema')
const Product = require('../models/product-schema')
const Category = require('../models/cateogory-schema')

/**render offer listing page */
const getOfferPage = async (req,res)=>{
  try{
    const offers = await Offer.find({}).lean();
    res.render('admin/offers',{isAdminLogin: false,
      admin: true,offers})
  }catch(error){
    console.log("error occured",error)
    return res.status(500).json({message:"internal server error"})
  }
}
const updateOfferStatus = async (req,res,next)=>{
  try{
    const offers = await Offer.find({})
  const currentDate = new Date();
  for(let offer of offers){
    if(new Date(offer.endDate)< currentDate && offers.isActive){
      offer.isActive = false;
      await offer.save();
    }
    
  }
  next()
  }catch(error){
    console.error("Error updating offer status:", error);
    res.status(500).json({ message: "An error occurred while updating offer status." });
  }
}

/*render add offer page*/
const getAddOfferPage = async (req,res)=>{
  res.render('admin/addOffer',{isAdminLogin: false,
    admin: true
  })
}
const addOffer = async (req, res) => {
  console.log("req.body", req.body);
  const { name, description, discountType, discountValue, applicableTo, startDate, endDate } = req.body;

  if (!name || !discountType || !discountValue || !applicableTo || !startDate || !endDate) {
      return res.status(400).json({ message: "All fields are required." });
  }

  if (discountValue <= 0) {
      return res.status(400).json({ message: "Discount value must be greater than 0." });
  }

  if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: "End date must be greater than start date." });
  }

  try {
      // Check if an offer with the same name already exists
      const existingOffer = await Offer.findOne({ name });
      if (existingOffer) {
          return res.status(400).json({ message: "Offer already exists." });
      }

      const offer = new Offer({
          name,
          description,
          discountType,
          discountValue,
          applicableTo,
          startDate,
          endDate,
      });

      await offer.save();
      return res.status(200).json({ message: "Offer created successfully" });
  } catch (error) {
      console.error("Error creating offer:", error);
      res.status(500).json({ message: "An error occurred while creating the offer." });
  }
};

/**render edit offer page */
const getEditOfferPage = async (req,res)=>{
  try{
    const offerId = req.params.id;
    const offer = await Offer.findById(offerId).lean()
    if(!offer){
      return res.status(404).json({ message: "Offer not found." });
    }
    res.render('admin/editOffer',{isAdminLogin: false,
      admin: true,offer})
  }catch(error){
    console.error("Error fetching offer:", error);
        res.status(500).json({ message: "An error occurred while fetching the offer." });
  }
}

/**logic to edit offer */
const editOffer = async(req,res)=>{
  try{
    const offerId = req.params.id;
    const {name,description,discountType,discountValue,applicableTo,startDate,endDate} = req.body
    const updatedOffer = await Offer.findByIdAndUpdate(offerId,{
      name,
      description,
      discountType,
      discountValue,
      applicableTo,
      startDate,
      endDate
    }, {new: true })
    if (!updatedOffer) {
      return res.status(404).json({ message: "Offer not found." });
  }
  res.status(200).json({ message: "Offer updated successfully", offer: updatedOffer });
}catch(error){
  console.error("Error updating offer:", error);
        res.status(500).json({ message: "An error occurred while updating the offer." });
}
}

/**logic to delete offer */
const deletOffer = async(req,res)=>{
  try{
    const offerId = req.params.id
    const deletedOffer = await Offer.findByIdAndDelete(offerId);
    if (!deletedOffer) {
      return res.status(404).json({ message: "Offer not found." });
  }
  res.redirect("/admin/offers");
  }catch(error){
    console.error("Error deleting offer:", error);
        res.status(500).json({ message: "An error occurred while deleting the offer." });
  }
}

/**show product offer listed page */
const showOfferPage = async(req,res)=>{
  try{
   const productId = req.params.id;
   const offers = await Offer.find({ applicableTo: "product" ,isActive: true}).lean();
   res.render('admin/showOffer',{isAdminLogin: false,
    admin: true,productId,offers})
  }
catch(error){
  console.error("Error fetching offers:", error);
  res.status(500).json({ message: "An error occurred while fetching offers." });
}
}
/**show category offer listed page */
const showCategoryOfferPage = async (req,res)=>{
  try{
    const categoryId = req.params.id;
  const offers = await Offer.find({ applicableTo: "category" ,isActive: true}).lean();
  res.render('admin/showcategoryOffer',{isAdminLogin: false,
    admin: true,categoryId,offers})
  }catch(error){
    console.error("Error fetching offers:", error);
  res.status(500).json({ message: "An error occurred while fetching offers." });
  }
  }

  /**apply the offer in product */
const applyOffer = async (req, res) => {
  try {
    const { productId, offerId } = req.body;
    const product = await Product.findById(productId);
    const offer = await Offer.findById(offerId);

    if (!product || !offer) {
      return res.status(404).json({ message: "Product or Offer not found." });
    }

    if (product.offers.includes(offerId)) {
      return res.status(400).json({ message: "Offer is already applied to this product." });
    }

    let newOfferAmount;
    if (offer.discountType === "percentage") {
      newOfferAmount = product.price - (product.price * offer.discountValue) / 100;
    } else if (offer.discountType === "fixed") {
      newOfferAmount = product.price - offer.discountValue;
    }

    if (product.offers.length > 0) {
      const existingOfferId = product.offers[0]; 
      const existingOffer = await Offer.findById(existingOfferId);

      let existingOfferAmount;
      if (existingOffer.discountType === "percentage") {
        existingOfferAmount = product.price - (product.price * existingOffer.discountValue) / 100;
      } else if (existingOffer.discountType === "fixed") {
        existingOfferAmount = product.price - existingOffer.discountValue;
      }


      if (newOfferAmount < existingOfferAmount) {

        product.offers = product.offers.filter((id) => id.toString() !== existingOfferId);
        await product.save();
        existingOffer.products = existingOffer.products.filter((id) => id.toString() !== productId);
        await existingOffer.save();
      } else {
        return res.status(400).json({ message: "Existing offer provides a greater discount." });
      }
    }

    product.offerAmount = newOfferAmount;
    product.offers.push(offerId);
    await product.save();

    offer.products.push(productId);
    await offer.save();

    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error applying offer:", error);
    res.status(500).json({ message: "An error occurred while applying the offer." });
  }
};

/**remove the offer from product */
const removeOffer = async (req,res)=>{
  try{
    const {productId,offerId} = req.body;
    const product = await Product.findById(productId);
    const offer = await Offer.findById(offerId);
    if (!product || !offer) {
      return res.status(404).json({ message: "Product or Offer not found." });
    }
    product.offerAmount = 0;
    product.offers = product.offers.filter((id) => id.toString() !== offerId);
    await product.save();

    offer.products = offer.products.filter((id) => id.toString() !== productId);
    await offer.save();
    res.redirect("/admin/products");

  }catch(error){
    console.error("Error removing offer:", error);
    res.status(500).json({ message: "An error occurred while removing the offer." });
  }
}

/**apply the offer in category */
const applyCategoryOffer = async (req,res)=>{
  try{
    const {categoryId,offerId} = req.body;
    console.log('req.body',req.body)
  const category = await Category.findById(categoryId)
  console.log("category",category)
  const offer = await Offer.findById(offerId)
  console.log("offer",offer)
  if(!category ||! offer){
    return res.status(404).json({success: false,
      error: 'Category or offer not found'})
  }
  const products = await Product.find({category:category.name})
  console.log("products",products)
  for(const product of products){
    let shouldApplyCategoryOffer = true
    let bestOffer = offer 
    let bestDiscountValue = calculateDiscountValue(offer,product.price)

    if(product.offers && product.offers.length > 0){
      const productOffers = await Offer.find({_id: { $in: product.offers },isActive: true,endDate: { $gte: new Date() }})
      for (const productOffer of productOffers) {
        const currentValue = calculateDiscountValue(productOffer, product.price);
        if (currentValue > bestDiscountValue) {
          bestDiscountValue = currentValue;
          bestOffer = productOffer;
          shouldApplyCategoryOffer = false;
        }
      }
    }if(shouldApplyCategoryOffer){
      product.offers = [offer._id];
    }else{
      product.offers = [bestOffer._id];
    }
    product.offerAmount = bestDiscountValue;
    await product.save();

  }
  category.offers = [offer._id];
  await category.save();
  res.redirect("/admin/category");
  }catch(error){
    console.error('Error applying category offer:', error);
    return res.status(500).json({success:false,error:error.message})
  }
  
}
/**to caluclate the offer discount */
function calculateDiscountValue (offer,price){
  if (!offer || !offer.isActive) return 0;
  if(offer.discountType === "percentage"){
    return price * (offer.discountValue / 100);
  }
  return Math.min(offer.discountValue, price);
}

/**remove offer from catgeory */
const removeCategoryOffer = async(req,res)=>{
 try{
  const {categoryId,offerId} = req.body;
  const category = await Category.findById(categoryId)
  const offer = await Offer.findById(offerId)

  if(!category || !offer){
    return res.status(404).json({success:false,error:"category or offer not found"})
  }
  const offerIndex = category.offers.indexOf(offerId)
  if(offerIndex === -1){
    return res.status(404).json({success:false,error:"this offer is not applied to the catgeory"})
  }

  const products = await Product.find({category:category.name,offers:offerId})
  for(const product of products){
    product.offers = product.offers.filter(id=>id.toString()!==offerId.toString())
    product.offerAmount = 0;
    await product.save()
  }
  category.offers = category.offers.filter(id=>id.toString() !== offerId.toString())
  await category.save()
  res.redirect('/admin/category')
 }catch(error){
  console.error('Error removing category offer:', error);
  res.status(500).json({success:false,error:error.message})
 }
}

module.exports = {getOfferPage,getAddOfferPage,addOffer,updateOfferStatus,getEditOfferPage,editOffer,deletOffer,showOfferPage,
  applyOffer,removeOffer,showCategoryOfferPage,applyCategoryOffer,removeCategoryOffer}