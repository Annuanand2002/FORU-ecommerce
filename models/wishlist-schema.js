const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  userId : { type : mongoose.Schema.Types.ObjectId, ref : "User",require:true},
  productId : [{
    type : mongoose.Schema.Types.ObjectId, ref : "Product",unique:true
  }]
});

module.exports = mongoose.model("Wishlist", wishlistSchema)