const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  couponName : {type:String,require:true,unique:true},
  createdDate:{type:Date,default:Date.now},
  expiryDate : {type:Date,require:true},
  minPurchaseAmount:{type:Number,require:true},
  discountAmount:{type:Number,require:true},
  description: { type: String },
  isActive:{type:Boolean,default:true}
})

module.exports = mongoose.model('Coupon',couponSchema)