const User = require('../models/user-schema');

async function addAddress(req,res){
  const {name,phone,house,city,state,postalCode} = req.body;
  if (!name || !phone || !house || !city || !state || !postalCode) {
    return res.status(400).send('All fields are required');
  }

  const userId = req.session.user._id;
  try{

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
  }
  
  const isFirstAddress = user.addresses.length === 0;
  user.addresses.push({
    name,
    phone,
    house,
    city,
    state,
    postalCode,
    isDefault: isFirstAddress || isFirstAddress
});

await user.save();
res.redirect('/address')
  }
    catch (error) {
      console.error(error);
      res.status(500).send('Server error');
  }
}

async function getAddresses(req, res) {
    try {
      const userId = req.session.user._id;
        const user = await User.findById(userId).lean();

        if (!user) {
            return res.status(404).send('User not found');
        }

        res.render('user/showaddress', { addresses: user.addresses ,isUser:true});
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
}

async function removeAddress(req, res) {
  try {
      const userId = req.session.user._id;
      const addressId = req.params.id; 

      const user = await User.findById(userId);

      if (!user) {
          return res.status(404).send('User not found');
      }

      user.addresses = user.addresses.filter(address => address._id.toString() !== addressId);
      await user.save();

      res.redirect('back');
  } catch (error) {
      console.error(error);
      res.status(500).send('Server error');
  }
}
async function getEditAddresses(req, res) {
  try {
    const userId = req.session.user._id;
      const user = await User.findById(userId).lean();

      if (!user) {
          return res.status(404).send('User not found');
      }

      res.render('user/edit-address', { addresses: user.addresses ,isUser:true});
  } catch (error) {
      console.error(error);
      res.status(500).send('Server error');
  }
}
async function editAddress(req, res) {
  const { name, phone, house, city, state, postalCode, addressId } = req.body; // Include addressId
  if (!name || !phone || !house || !city || !state || !postalCode || !addressId) {
    return res.status(400).send('All fields are required');
  }

  const userId = req.session.user._id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Find the address to update by its ID
    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).send('Address not found');
    }

    address.name = name;
    address.phone = phone;
    address.house = house;
    address.city = city;
    address.state = state;
    address.postalCode = postalCode;

    await user.save();
    res.redirect('/address'); 
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
}
async function setDefaultAddress(req, res) {
  const userId = req.session.user._id;
  const addressId = req.params.id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send('User not found');
    }

    user.addresses.forEach(address => address.isDefault = false);

    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).send('Address not found');
    }

    address.isDefault = true;
    await user.save();

    res.redirect('/address');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
}





module.exports = {addAddress,getAddresses,removeAddress,getEditAddresses,editAddress,setDefaultAddress}