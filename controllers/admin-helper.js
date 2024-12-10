const bcrypt = require('bcrypt');
const Admin = require('../models/admin-schema');

const createAdmin = async () => {
  const username = 'admin@gmail.com';
  const password = 'admin@123';


  const existingAdmin = await Admin.findOne({ username });

  if (existingAdmin) {
    console.log('Admin already exists.');
    return; 
  }


  const hashedPassword = await bcrypt.hash(password, 10);

  const newAdmin = new Admin({
    username,
    password: hashedPassword
  });

  await newAdmin.save();
  console.log('Admin created successfully!');
};
const authenticateAdmin = async (username, password) => {

  const admin = await Admin.findOne({ username });
  if (!admin) {
    throw new Error('Admin does not exist');
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  return admin; 
};

module.exports = { createAdmin, authenticateAdmin };

