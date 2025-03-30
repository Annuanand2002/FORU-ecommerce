const mongoose = require("mongoose");

const salesSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  orderId:{type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true},
  items: [
    {
      itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true }, 
      quantity: { type: Number, required: true }, 
      price: { type: Number, required: true },
      status: { type: String, default: 'Pending' },  
    }
  ],
  totalAmount: { type: Number, required: true }
  ,
discountCouponFee : {
  type:Number,
  default:0,
  required:true
},
  payment: { type: String, required: true }, 
  paymentStatus: { type: String, default: 'Pending' }, 
 
  orderDate: { type: Date, default: Date.now } 
});

module.exports = mongoose.model("Sales", salesSchema);
