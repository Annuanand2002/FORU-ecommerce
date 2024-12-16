const multer = require('multer')
const path = require('path')
const fs = require('fs')
const Product = require('../models/product-schema')

const storage = multer.diskStorage({
  destination:(req,file,cb)=>{
    const uploadPath = path.join(__dirname,'..','public','uploads')
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null,uploadPath)
  },
  filename:(req,file,cb)=>{
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))

  }
})

const upload = multer({ storage: storage }).array('images', 5);

module.exports = {upload}