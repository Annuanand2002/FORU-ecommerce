const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: function(){
    return this.signUpMethod === 'google'
  } },
  name: { type: String, required: true },
  email: { type: String, required: true,},
  password: { type: String, validate: {
    validator: function(v) {
      return this.googleId || v.length > 0; 
    } , message: 'Password is required for manual sign-up'} },
  phone: { type: String,validate: {
    validator: function(v) {
      return this.googleId || v.length > 0;
    },
    message: 'Phone number is required for manual sign-up'
  }},
  blocked: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  verificationToken: {type: String, required: false,},
  verificationTokenExpires: {type: Date,required: false,},
  resetToken: {type:String,default:null},
  resetTokenExpires: {type: Date,default:null,},
  gender: { type: String,enum: ['Male', 'Female'],},
  dateOfBirth: Date,
  cart: {
    type:mongoose.Schema.Types.ObjectId, ref:"Cart"
},
wishlist: {
    type:mongoose.Schema.Types.ObjectId, ref:"Wishlist"
},
addresses: [{
  name:{type: String, required: true},
  phone:{type: String, required: true},
  house : { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
}]
});

const User = mongoose.model('User', userSchema);

module.exports = User;