const Category = require("../models/cateogory-schema");
const Product = require("../models/product-schema");

const getFilteredProducts = async (req, res, next) => {
  try {
    const categories = await Category.find().lean();
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    let selectedCategories = req.query.categories || [];
    const selectedGender = req.query.gender || null;
    const searchQuery = req.query.query || "";
    const sortOption = req.query.sort || "popularity";

    if (typeof selectedCategories === "string") {
      selectedCategories = selectedCategories.split(",");
    }

    let productQuery = {};

    if (searchQuery) {
      productQuery.gender = { $regex: searchQuery, $options: "i" };
    }

    if (selectedCategories.length > 0) {
      productQuery.category = { $in: selectedCategories };
    }

    if (selectedGender) {
      productQuery.gender = selectedGender;
    }

    let sortCriteria = {};

    switch (sortOption) {
      case "price-asc":
        sortCriteria.price = 1;
        break;
      case "price-desc":
        sortCriteria.price = -1;
        break;
      case "new-arrivals":
        sortCriteria.latestCollection = -1;
        break;
      case "A-Z":
        sortCriteria.name = 1;
        break;
      case "Z-A":
        sortCriteria.name = -1;
        break;
      case "popularity":
      default:
        sortCriteria.bestSeller = -1;
        break;
    }

    const products = await Product.find(productQuery)
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .lean();

    const totalProducts = await Product.countDocuments(productQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    const prevPage = page > 1 ? page - 1 : null;
    const nextPage = page < totalPages ? page + 1 : null;
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    res.render("user/collections", {
      admin: false,
      categories,
      products,
      prevPage,
      nextPage,
      pages,
      currentPage: page,
      selectedCategories,
      selectedGender,
      searchQuery,
      sortOption,
    });
  } catch (error) {
    next(error);
  }
};
module.exports = { getFilteredProducts };
