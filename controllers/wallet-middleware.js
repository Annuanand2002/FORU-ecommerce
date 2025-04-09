const Wallet = require('../models/wallet-schema')
const Cart = require('../models/cart-schema')
const Order = require('../models/order-schema')


/*8do payment from wallet*/
const addFromWallet = async (req,res)=>{
  const userId = req.user.id; 
  const {amount} = req.body
  console.log("amount",amount)
  try {
      const wallet = await Wallet.findOne({ userId });
      const cart = await Cart.findOne({ userId });
      if (!wallet || !cart) {
          return res.status(404).json({ message: "Wallet or cart not found." });
      }
      if (amount < 1) {
          return res.status(400).json({ message: "Amount must be greater than or equal to 1." });
      }

      if (amount > wallet.balance) {
          return res.status(400).json({ message: "Insufficient balance in wallet." });
      }

      const isFullWalletPayment = amount>=cart.newTotalAmount
      cart.walletAmountUsed = amount;
      cart.finalwalletAmountUsed = amount
      cart.newTotalAmount -= amount;
      cart.isFullWalletPayment = isFullWalletPayment;
      console.log("cart.newTotalAmount",cart.newTotalAmount)
      console.log('isFullWalletPayment',isFullWalletPayment)
      await cart.save();

      res.status(200).json({ newTotalAmount: cart.newTotalAmount,isFullWalletPayment: isFullWalletPayment, });
  } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "An error occurred. Please try again." });
  }
};

/**render wallet page */
const getWallet = async (req, res) => {
  const userId = req.session.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 4; 

  try {
    const wallet = await Wallet.findOne({ userId }).lean();

    if (!wallet) {
      return res.render('user/wallet', {
        wallet: null,
        isUser: true,
        message: "Wallet not found. Please contact support.",
      });
    }

    // Paginate transactions
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedTransactions = wallet.transactions.slice(startIndex, endIndex);

    // Calculate total pages
    const totalPages = Math.ceil(wallet.transactions.length / limit);

    res.render('user/wallet', {
      wallet: {
        ...wallet,
        transactions: paginatedTransactions, 
      },
      isUser: true,
      pagination: {
        page,
        limit,
        totalPages,
        totalTransactions: wallet.transactions.length,
      },
    });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    res.status(500).render('error', {
      message: "An error occurred while fetching your wallet. Please try again later.",
    });
  }
};
module.exports = {addFromWallet,getWallet}