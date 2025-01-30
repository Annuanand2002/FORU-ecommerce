const Product = require('../models/product-schema');
const path = require('path');
const fs = require('fs');
const categoryHelper = require('./cateogory-controller');

const getAllProduct = async(page,perPage,searchQuery)=>{
  try{
    
    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts/perPage)
    const products = await Product.find().skip((page-1)*perPage).limit(perPage).lean()

    const pages = Array.from({length:totalPages},(_,i)=>i+1)
    const prevPage = page > 1 ? page - 1 : null;
    const nextPage = page < totalPages ? page + 1 : null;
    return {products,totalPages,currentPage : page,prevPage,nextPage,pages}
  }
  catch(error){
    console.log(`error fetching produts,${error.message}`)
    throw new Error(`error fetching produts,${error.message}`)
  }
}

const addProduct = async (productData,files)=>{
  try{
    const {name,price,category,gender,sizes,description} = productData;
    const sizeQuantities = Object.keys(sizes).map(size => ({
      size,
      quantity: parseInt(sizes[size], 10) || 0
    }));
    const latestCollection = productData.latestCollection === 'true'; 
    const bestSeller = productData.bestSeller === 'true';
    let imagePath = [];

    if(files && files.length > 0){
      imagePath = files.map(file=>'/uploads/' + file.filename)
    }
    const newProduct = new Product({
      name,
      category,
      price,
      gender,
      sizes: sizeQuantities,
      description,
      images:imagePath,
      latestCollection,
      bestSeller,
    })
    await newProduct.save();
    return { success: true};
  }
  catch(err){
    console.error('Error adding product:', err);
    return { success: false, error: err };
  }
}
async function getEditProduct(productId) {
  try {
    const product = await Product.findById(productId).lean();
    const categories = await categoryHelper.getAllcategories();
    return { product, categories };
  } catch (error) {
    console.error('Error fetching product for editing:', error);
    throw new Error('Error fetching product for editing');
  }
}

const updateProduct = async (productId, productData, files) => {
  try {
    const { name, price, piece, category, bestSeller, latestCollection } = productData;
    const existingProduct = await Product.findById(productId);
    let updatedImages = existingProduct.images || [];
    if (files && files.length > 0) {
      const newImages = files.map(file => '/uploads/' + file.filename);
      updatedImages = updatedImages.concat(newImages); 
    }

    const updatedData = {
      name,
      price,
      piece,
      category,
      images: updatedImages, 
      bestSeller: bestSeller === 'on',
      latestCollection: latestCollection === 'on',
    };

    const updatedProduct = await Product.findByIdAndUpdate(productId, updatedData, { new: true });
    return { success: true, product: updatedProduct };
  } catch (err) {
    console.error('Error updating product:', err);
    return { success: false, error: err };
  }
};



const deleteProduct = async (productId)=>{
  try{
    await Product.findByIdAndDelete(productId)
  }
  catch(error){
    throw new Error ("Error deleting product",error)
  }
}

module.exports = { getAllProduct,getEditProduct,addProduct,updateProduct,deleteProduct,};