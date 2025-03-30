const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
    offers : [
      {
        type : mongoose.Schema.Types.ObjectId,
        ref: "Offer",
      }
    ]
});

module.exports = mongoose.model('Category', categorySchema);
