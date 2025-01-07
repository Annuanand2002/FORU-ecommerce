const Category = require('../models/cateogory-schema');
const Product = require('../models/product-schema');

exports.getAllcategories = async ()=>{
  return await Category.find({}).lean()
}

exports.checkCategoryExists = async (name)=>{
  return await Category.findOne({name});
}

exports.addCategory = async (data)=>{
  const category = new Category(data)
   await category.save() 
}

exports.deleteCategory = async (id)=>{
   await Category.findByIdAndDelete(id);
   await Product.deleteMany({categoryId:id})
 

}
