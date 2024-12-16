const Product = require('../models/product-schema');
const path = require('path');
const fs = require('fs');

const addProduct = async (productData,files)=>{
  try{
    const {name,price,piece,category,gender,size,description} = productData;
    const sizes = productData['size[]'] || [];
    let imagePath = [];

    if(files && files.length > 0){
      imagePath = files.map(file=>'/uploads/' + file.filename)
    }
    const newProduct = new Product({
      name,
      category,
      price,
      piece,
      gender,
      size: sizes,
      description,
      images:imagePath
    })
    await newProduct.save();
    return { success: true};
  }
  catch(err){
    console.error('Error adding product:', err);
    return { success: false, error: err };
  }
}

module.exports = { addProduct};