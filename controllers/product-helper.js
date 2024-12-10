const Product = require('../models/product-schema');
const path = require('path');
const fs = require('fs');

const addProduct = async (productData,files)=>{
  try{
    const {name,price,piece,category,gender,size,description} = productData;
    const sizes = productData['size[]'] || [];
    let image = '';

    if (files && files['image']) {
      const uploadDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const file = files['image']; 
      const uploadPath = path.join(uploadDir, file.name);
      await file.mv(uploadPath); 
      image = file.name; 
    } else {
      console.log('No image file provided');
    }
    

    const newProduct = new Product({
      name,
      category,
      price,
      piece,
      gender,
      size: sizes,
      description,
      images:image,
    })
    await newProduct.save();
    return { success: true };
  }
  catch(err){
    console.error('Error adding product:', err);
    return { success: false, error: err };
  }
}

module.exports = { addProduct};