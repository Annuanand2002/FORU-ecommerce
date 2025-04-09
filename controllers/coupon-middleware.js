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
    console.log(req.body);
    const existingCoupon = await Coupon.findOne({ couponName });
    if (existingCoupon) {
      return res
        .status(400)
        .json({
          errors: { couponName: "Coupon with this name already exists." },
        });
    }
    const coupon = new Coupon({
      couponName,
      discountAmount,
      minPurchaseAmount,
      expiryDate,
      description,
    });
    await coupon.save();
    res.redirect("/admin/coupon");
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "An error occurred while processing your request." });
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
    const couponId = req.params.id;
    const {
      couponName,
      discountAmount,
      minPurchaseAmount,
      expiryDate,
      description,
    } = req.body;
    const coupon = await Coupon.findByIdAndUpdate(
      couponId,
      {
        couponName,
        discountAmount,
        minPurchaseAmount,
        expiryDate,
        description,
      },
      { new: true }
    );
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    res.redirect("/admin/coupon");
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).send("Internal Server Error");
  }
};

/*logic for delete coupon*/
const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    await Coupon.findByIdAndDelete(couponId);
    res.redirect("/admin/coupon");
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).send("Internal Server Error");
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
