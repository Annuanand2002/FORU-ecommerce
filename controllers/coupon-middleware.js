const Coupon = require("../models/coupon-schema")


/**render the coupon page */
const showCouponPage = async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = 5;
    let totalCoupons = await Coupon.countDocuments();
    let totalPages = Math.ceil(totalCoupons / limit);
    let skip = (page - 1) * limit;
    let coupons = await Coupon.find()
      .sort({ expiryDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const currentDate = new Date();
    for (let coupon of coupons) {
      let isExpired = coupon.expiryDate <= currentDate;
      if (coupon.isActive && isExpired) {
        await Coupon.findById(coupon._id, { isActive: false });
        coupon.isActive = false;
      } else if (!coupon.isActive && !expiryDate) {
        await Coupon.findById(coupon._id, { isActive: true });
        coupon.isActive = true;
      }
    }
    res.render("admin/coupon", {
      coupons,
      currentPage: page,
      totalPages,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
      admin: true,
      isAdminLogin: false,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Server Error");
  }
};

/**get add coupon page */
const getaddCoupon = async (req, res) => {
  res.render("admin/add-coupon", { admin: true, isAdminLogin: false });
};


/*logic to add coupn*/
const addCoupon = async (req, res) => {
  try {
    const {
      couponName,
      discountAmount,
      minPurchaseAmount,
      expiryDate,
      description,
    } = req.body;

    const errors = {};

    const nameRegex = /^[A-Z0-9]{4,}$/;
    if (!couponName) {
      errors.couponName = 'Coupon name is required.';
    } else if (!nameRegex.test(couponName)) {
      errors.couponName = 'Coupon name must contain at least 4 uppercase letters and numbers (no spaces or special characters).';
    }


    if (!discountAmount) {
      errors.discountAmount = 'Discount amount is required.';
    } else if (isNaN(discountAmount) || parseFloat(discountAmount) <= 0) {
      errors.discountAmount = 'Discount amount must be a number greater than 0.';
    }

    if (!minPurchaseAmount) {
      errors.minPurchaseAmount = 'Minimum purchase amount is required.';
    } else if (isNaN(minPurchaseAmount) || parseFloat(minPurchaseAmount) <= 0) {
      errors.minPurchaseAmount = 'Minimum purchase amount must be a number greater than 0.';
    } else if (parseFloat(minPurchaseAmount) < 200) {
      errors.minPurchaseAmount = 'Minimum purchase must be at least 200.';
    }


    if (!errors.discountAmount && !errors.minPurchaseAmount) {
      if (parseFloat(discountAmount) >= parseFloat(minPurchaseAmount)) {
        errors.discountAmount = 'Discount must be less than minimum purchase amount.';
      }
    }


    if (!expiryDate) {
      errors.expiryDate = 'Expiry date is required.';
    } else if (new Date(expiryDate) < new Date()) {
      errors.expiryDate = 'Expiry date must be in the future.';
    } else {

      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      if (new Date(expiryDate) > oneYearLater) {
        errors.expiryDate = 'Expiry date cannot be more than 1 year in the future.';
      }
    }

    if (!description) {
      errors.description = 'Description is required.';
    } else if (description.length > 500) {
      errors.description = 'Description cannot exceed 500 characters.';
    }

    if (!errors.couponName) {
      const existingCoupon = await Coupon.findOne({ 
        couponName: { $regex: new RegExp(`^${couponName}$`, 'i') }
      });
      if (existingCoupon) {
        errors.couponName = 'A coupon with this name already exists.';
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    const coupon = new Coupon({
      couponName: couponName.toUpperCase(), 
      discountAmount: parseFloat(discountAmount),
      minPurchaseAmount: parseFloat(minPurchaseAmount),
      expiryDate: new Date(expiryDate),
      description,
    });

    await coupon.save();
    res.status(200).json({ 
      success: true,
      redirect: "/admin/coupon",
      message: "Coupon added successfully!"
    });

  } catch (error) {
    console.error("Error adding coupon:", error);
    res.status(500).json({ 
      message: "An error occurred while processing your request.",
      error: error.message 
    });
  }
};

/**render edit coupon page */
const getEditPage = async (req, res) => {
  try {
    const couponId = req.params.id;
    console.log("Coupon ID:", couponId);
    const coupon = await Coupon.findById(couponId).lean();
    console.log("Coupon:", coupon);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon noyt found" });
    }
    res.render("admin/edit-coupon", {
      coupon,
      admin: true,
      isAdminLogin: false,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching coupon details." });
  }
};


/**logic for edit coupon */
const editCoupon = async (req, res) => {
  try {
    const couponId = req.body.id;
    const {
      couponName,
      discountAmount,
      minPurchaseAmount,
      expiryDate,
      description,
    } = req.body;

    const errors = {};

    if (!couponName || couponName.trim() === '') {
      errors.couponName = 'Coupon name is required';
    } else if (couponName.length > 50) {
      errors.couponName = 'Coupon name must be less than 50 characters';
    }

    if (!discountAmount || isNaN(discountAmount)) {
      errors.discountAmount = 'Valid discount amount is required';
    } else if (parseFloat(discountAmount) < 1) {
      errors.discountAmount = 'Discount must be at least 1';
    }

    if (!minPurchaseAmount || isNaN(minPurchaseAmount)) {
      errors.minPurchaseAmount = 'Valid minimum amount is required';
    } else if (parseFloat(minPurchaseAmount) < 200) {
      errors.minPurchaseAmount = 'Minimum purchase must be at least 200';
    }

    if (!errors.discountAmount && !errors.minPurchaseAmount) {
      if (parseFloat(discountAmount) >= parseFloat(minPurchaseAmount)) {
        errors.discountAmount = 'Discount must be less than minimum purchase amount';
      } else if (parseFloat(discountAmount) > (parseFloat(minPurchaseAmount) * 0.5)) {
        errors.discountAmount = 'Discount cannot exceed 50% of minimum purchase amount';
      }
    }

    if (!expiryDate) {
      errors.expiryDate = 'Expiry date is required';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const inputExpiryDate = new Date(expiryDate);
      
      if (inputExpiryDate <= today) {
        errors.expiryDate = 'Expiry date must be in the future';
      } else {
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        if (inputExpiryDate > oneYearLater) {
          errors.expiryDate = 'Expiry date cannot be more than 1 year in the future';
        }
      }
    }


    if (description && description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }

    if (!errors.couponName) {
      const existingCoupon = await Coupon.findOne({
        couponName: { $regex: new RegExp(`^${couponName}$`, 'i') },
        _id: { $ne: couponId }
      });
      
      if (existingCoupon) {
        errors.couponName = 'A coupon with this name already exists';
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        errors
      });
    }

    const coupon = await Coupon.findByIdAndUpdate(
      couponId,
      {
        couponName,
        discountAmount: parseFloat(discountAmount),
        minPurchaseAmount: parseFloat(minPurchaseAmount),
        expiryDate: new Date(expiryDate),
        description,
      },
      { new: true }
    );

    if (!coupon) {
      return res.status(404).json({ 
        success: false,
        message: "Coupon not found" 
      });
    }

    res.json({
      success: true,
      redirect: "/admin/coupon"
    });
    
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};
/*logic for delete coupon*/
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.body; // Destructure id from body
    
    if (!id) {
      return res.status(400).json({ 
        success: false,
        message: "Coupon ID is required" 
      });
    }

    const deletedCoupon = await Coupon.findByIdAndDelete(id);
    
    if (!deletedCoupon) {
      return res.status(404).json({ 
        success: false,
        message: "Coupon not found" 
      });
    }

    res.status(200).json({ 
      success: true,
      message: "Coupon deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal Server Error" 
    });
  }
};
/**user-side */
const getApplyCouponPage = async (req, res) => {
  try {
    const totalPrice = parseFloat(req.query.totalPrice);
    const coupons = await Coupon.find({
      minPurchaseAmount: { $lte: totalPrice },
      isActive: true,
      expiryDate: { $gte: new Date() },
    }).lean();
    res.render("user/apply-coupon", { coupons, totalPrice, isUser: true });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).send("Internal Server Error");
  }
};



module.exports = {
  showCouponPage,
  getaddCoupon,
  addCoupon,
  getEditPage,
  editCoupon,
  deleteCoupon,
  getApplyCouponPage,
};
