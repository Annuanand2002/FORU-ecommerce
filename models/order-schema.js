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
  quantity: {
      type: Number,
      required: true
  },
  price: {
      type: Number,
      required: true
  }
}],
totalPrice: {
  type: Number,
  required: true
},
shippingFee: {
  type: Number,
  required: true
},
deliveryAddress: {
  type: mongoose.Schema.Types.Mixed, 
  required: true
},
status: {
  type: String,
  enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
  default: 'Pending'
},
payment: {
  type : String,
  required :true
},
createdAt: {
  type: Date,
  default: Date.now
}
})

module.exports = mongoose.model('Order', orderSchema);