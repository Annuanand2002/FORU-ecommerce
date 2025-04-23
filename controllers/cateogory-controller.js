const Category = require('../models/cateogory-schema');
const Product = require('../models/product-schema');


/**render the category page list */
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).lean();
    res.render('admin/category', {
      categories,
      admin: true,
      isAdminLogin: false
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).send('Internal server error');
  }
};

/**add category */
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;

  
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Category name is required and must be a string'
      });
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Category name must be at least 2 characters'
      });
    }

    if (trimmedName.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Category name cannot exceed 50 characters'
      });
    }

    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists'
      });
    }

    const newCategory = new Category({
      name: trimmedName
    });

    await newCategory.save();

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: {
        _id: newCategory._id,
        name: newCategory.name,
        createdAt: newCategory.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating category:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**delete category */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("id",id)
    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    await Category.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
      deletedCategory: {
        id: category._id,
        name: category.name
      }
    });

  } catch (error) {
    console.error('Error deleting category:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
