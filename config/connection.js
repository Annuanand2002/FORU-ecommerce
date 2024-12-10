const mongoose = require('mongoose')
const url = 'mongodb://localhost:27017/FORU'

module.exports.connect = function(done){
  mongoose.connect(url)
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