const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  discountType: { type: String, enum: ["percentage", "fixed"], required: true },
  discountValue: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (endDate) {
        return endDate > this.startDate;
      },
      message: "End date must be greater than start date.",
    },
  },
  isActive: { type: Boolean, default: true },
  applicableTo: { type: String, enum: ["product", "category"], required: true },
  products :[
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    }
  ],
  categories : [
    {
      type : String,
    }
  ]
});

const Offer = mongoose.model("Offer", offerSchema);
module.exports = Offer;