const User = require('../models/user-schema');

async function updateProfile(req, res) {
  if (!req.session.user) {
    return res.status(401).redirect('/login'); 
  }

  const { name, phone, gender, email, dateOfBirth } = req.body;
  const userId = req.session.user._id; 
  console.log(req.body)
  try {
    await User.findByIdAndUpdate(userId, {
      name,
      phone,
      gender,
      dateOfBirth,
      email,
    });

    req.session.user = { ...req.session.user, name, phone, gender, dateOfBirth, email };
    console.log(req.session.user)

    res.redirect('/account');
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).send('An error occurred while updating your profile.');
  }
}

async function deleteAccount(req,res){
  if(!req.session.user){
    return res.status(401).json({success:false,message:"You are not logged in"})
  }
  const userId = req.session.user._id;
  try{
    await User.findByIdAndDelete(userId);
    req.session.destroy(err=>{
      if (err) {
        return res.status(500).json({ success: false, message: 'Error destroying session' });
      }
      res.json({success:true})
    })
  }catch(error){
    console.error('Error deleting account:', error);
    res.status(500).json({ success: false, message: 'Error deleting account' });
  }
}


module.exports = {updateProfile,deleteAccount}