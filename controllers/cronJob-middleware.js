const cron = require("node-cron");
const Product = require("../models/product-schema");
const Offer = require("../models/offer-schema");

const setupCronJobs = ()=>{
  cron.schedule("0 * * * *",async()=>{
    try{
      console.log("Running scheduled task to check for expired offers...");
      const currentDate = new Date();
      const expiredOffers = await Offer.find({ endDate: { $lt: currentDate } });
      for(let offer of expiredOffers){
        const products = await Product.find({ offers: offer._id });
        for(let product of products){
          product.offerAmount = 0;
          product.offers = product.offers.filter(
            (id) => id.toString() !== offer._id.toString()
          );
          await product.save();
        }
        offer.products = [];
        await offer.save();
        console.log(`Removed expired offer ${offer._id} from products.`);
      }
      console.log("Scheduled task completed.");

    }catch(error){
      console.error("Error in scheduled task:", error);

    }
  })
}
module.exports = setupCronJobs;