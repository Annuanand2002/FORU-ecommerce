const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
},
cartId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Cart',
  required: true
},
items: [{
  productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
  },
  productName: { 
    type: String,
    required: true
  },
  image: { 
    type: String,
    required: true
  },
  quantity: {
      type: Number,
      required: true
  },
  price: {
      type: Number,
      required: true
  },
  size: {
     type: String,
     required: true },
}],
totalPrice: {
  type: Number,
  default:0,
  required: true
},
shippingFee: {
  type: Number,
  default:0,
  required: true
},
discountCouponFee : {
  type:Number,
  default:0,
  required:true
},
newTotal:{
  type:Number,
  default:0,
  required:true
},
walletAmountUsed :{
  type : Number,
  default:0
},
finalwalletAmountUsed :{
  type : Number,
  default:0
},
deliveryAddress: {
  type: mongoose.Schema.Types.Mixed, 
  required: true
},
status: {
  type: String,
  default: 'Pending'
},
payment: {
  type : String,
  required :true
},
paymentId: { 
  type: String,
  default: null
},
razorpayOrderId: { 
  type: String,
  default: null,
},
paymentStatus: { 
  type: String,
  default: 'Pending'
},
createdAt: {
  type: Date,
  default: Date.now
},
cancellationReason: [{
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  reason: {
    type: String,
    required: true
  }
}],
completionDate: { type: Date },
returnReason: [{
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  reason: {
    type: String,
    required: true
  }
}]
})

module.exports = mongoose.model('Order', orderSchema);