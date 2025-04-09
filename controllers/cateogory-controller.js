const Category = require('../models/cateogory-schema');
const Product = require('../models/product-schema');


/**render the category page list */
exports.getAllcategories = async ()=>{
  return await Category.find({}).lean()
}

/**check the category exist */
exports.checkCategoryExists = async (name)=>{
  return await Category.findOne({name});
}

/**add category */
exports.addCategory = async (data)=>{
  const category = new Category(data)
   await category.save() 
}


/**delete category */
exports.deleteCategory = async (id)=>{
   await Category.findByIdAndDelete(id);
 

}
