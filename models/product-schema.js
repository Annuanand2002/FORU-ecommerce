const mongoose = require('mongoose');


const productSchema =new mongoose.Schema({
  name: { type: String, required: true,index:true },
  category: { type: String, required: true },
  price: { type: Number, required: true,},
  gender: { type: String, required: true },
  sizes: [
    {
      size: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 0
      }
    }
  ], 
  description: { type: String },
  images: [String],
  latestCollection: { type: Boolean, default: false },
  bestSeller: { type: Boolean, default: false },
})
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ price: 1, category:1,gender:1 });
productSchema.index({ bestSeller: 1, category: 1 });
productSchema.index({ latestCollection: 1, category: 1 });



const Product = mongoose.model("Product", productSchema);
module.exports = Product;