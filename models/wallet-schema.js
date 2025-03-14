const mongoose = require("mongoose");
const walletSchema = new mongoose.Schema({
  userId : {
    type : mongoose.Schema.Types.ObjectId,
    ref : "User",
    required : true,
    unique : true,
  },
  balance : {
    type : Number,
    default : 0,
    required : true
  },
  transaction : [{
    type : {
      type : String,
      enum : ["credit","debit"],
      required : true
    },
    amount : {
      type : Number,
      required: true
    },
    description : {
      type : String,
      required : true
    },
    createdAt : {
      type : Date,
      default : Date.now,
    }
  }]
})

module.exports = mongoose.model("Wallet",walletSchema)