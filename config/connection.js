const mongoose = require('mongoose')
const url = 'mongodb://localhost:27017/FORU'
const username = "foruUser"
const password  = "annujesna@123"

module.exports.connect = function(done){
  mongoose.connect(url,{
    user : username,
    pass : password,
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(()=>{
    console.log('connected')
    done()
  })
  .catch((err)=>{
    console.log('connection error',err)
    done(err)
  })
}

module.exports.get = function(){
  return mongoose.connection;
}