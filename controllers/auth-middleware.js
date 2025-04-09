const User = require('../models/user-schema');


/**user */
function checkAuthentication(req,res,next){
  if(req.session.user){
    next()
  }
  else{
    res.redirect('/login')
  }
}
function checkUserBlocked(req,res,next){
  if(req.session.user){
    User.findById(req.session.user._id)
    .then((user)=>{
      if(!user||user.blocked){
        req.session.message = "Your account has been blocked please contact customer support!";
        req.session.destroy(()=>{
          res.redirect('/login')
        })
      }
      else{
        next()
      }
    })
    .catch((error)=>{
      console.log("error is",error)
      res.redirect('/login')
    })
  }
  else{
    next()
  }
}

/**admin */
const adminAuth = (req,res,next)=>{
  if(!req.session.admin){
    return res.redirect('/admin/login')
  }
  next()
}
module.exports = {checkAuthentication,checkUserBlocked,adminAuth};

