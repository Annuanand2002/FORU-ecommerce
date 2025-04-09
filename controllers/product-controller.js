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
      sizes,
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

// const updateProduct = async (productId, productData, files) => {
//   try {
//     const { name, price, category, bestSeller, latestCollection,sizeName,sizeQuantity,description,removedImages } = productData;
//     let sizes = [];
//     if (Array.isArray(sizeName) && Array.isArray(sizeQuantity) && sizeName.length === sizeQuantity.length) {
//       sizes = sizeName.map((size, index) => ({
//         size,
//         quantity: parseInt(sizeQuantity[index], 10), 
//       }));
//     }
    
//     const existingProduct = await Product.findById(productId);
//     if (!existingProduct) {
//       return { success: false, error: 'Product not found' };
//     }

//     let updatedImages = existingProduct.images || [];
//     if (files && files.length > 0) {
//       const newImages = files.map(file => '/uploads/' + file.filename);
//       updatedImages = updatedImages.concat(newImages); 
//     }

//     const updatedData = {
//       name,
//       price,
//       category,
//       images: updatedImages, 
//       bestSeller: bestSeller === 'on',
//       latestCollection: latestCollection === 'on',
//       sizes,
//       description
//     };
    
//     const updatedProduct = await Product.findByIdAndUpdate(productId, updatedData, { new: true });
//     return { success: true, product: updatedProduct };
//   } catch (err) {
//     console.error('Error updating product:', err);
//     return { success: false, error: err };
//   }
// };


const updateProduct = async (productId, productData, files) => {
  try {
      const { 
          name, 
          price, 
          category, 
          description,
          bestSeller, 
          latestCollection,
          sizeName,
          sizeQuantity,
          removedImages
      } = productData;

      // Process sizes
      const sizes = [];
      if (Array.isArray(sizeName) && Array.isArray(sizeQuantity)) {
          sizeName.forEach((size, index) => {
              sizes.push({
                  size,
                  quantity: parseInt(sizeQuantity[index]) || 0
              });
          });
      }

      // Find existing product
      const product = await Product.findById(productId);
      if (!product) {
          return { success: false, error: 'Product not found' };
      }

      // Process removed images
      let updatedImages = [...product.images];
      if (removedImages) {
          const removed = JSON.parse(removedImages);
          updatedImages = updatedImages.filter(img => !removed.includes(img));
          
          // Delete files from server
          removed.forEach(imgPath => {
              const filename = path.basename(imgPath);
              const filePath = path.join(__dirname, '../public/uploads', filename);
              if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
              }
          });
      }

      // Process new images
      if (files && files.length > 0) {
          const newImages = files.map(file => '/uploads/' + file.filename);
          updatedImages = [...updatedImages, ...newImages]
      }

      // Update product
      const updatedProduct = await Product.findByIdAndUpdate(
          productId,
          {
              name,
              price,
              category,
              description,
              images: updatedImages,
              sizes,
              bestSeller: bestSeller === 'on',
              latestCollection: latestCollection === 'on'
          },
          { new: true }
      );

      return { success: true, product: updatedProduct };
  } catch (error) {
      console.error('Error updating product:', error);
      return { success: false, error: error.message };
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
const getSingleProduct = async(req,res)=>{
  try{
    const { id } = req.params;
    const product = await Product.findById(id).lean();
    if(!product){
      return res.status(404).send('product not found');
    }
    const similarProduct = await Product.find({
      category:product.category,
      gender:product.gender,
      _id:{$ne:product._id}
    }).limit(4).lean()
    res.render('user/single-product',{product,similarProduct,admin:false})
  }catch(error){
    console.log("error occured",error);
    res.status(500).send("server error")
  }
}

module.exports = { getAllProduct,getEditProduct,addProduct,updateProduct,deleteProduct,getSingleProduct};