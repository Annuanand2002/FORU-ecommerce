const mongoose = require('mongoose')

const productSchema =new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  piece: { type: Number, required: true },
  gender: { type: String, required: true },
  size: [String], 
  description: { type: String },
  images: [String],
  latestCollection: { type: Boolean, default: false },
  bestSeller: { type: Boolean, default: false },
})
productSchema.index({ name: 'text', description: 'text' });



const Product = mongoose.model("Product", productSchema);
module.exports = Product;