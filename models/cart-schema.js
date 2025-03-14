const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId : {type : mongoose.Schema.Types.ObjectId, ref:"User"},
  items : [{
    productId : {type : mongoose.Schema.ObjectId, ref:"Product"},
    quantity : {type : Number, default : 1},
    size: { type: String, required: true },
  }],
  appliedCoupons: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    default: null
},
totalPrice:{type:Number,default:0},
shippingFee:{type:Number,default:0},
discountAmount:{type:Number,default:0},
newTotalAmount:{type:Number,default:0},
});

module.exports = mongoose.model('Cart',cartSchema);