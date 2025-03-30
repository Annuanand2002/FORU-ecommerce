var createError = require('http-errors');
var express = require('express');
const bodyParser = require('body-parser');
var path = require('path');
const session = require('express-session');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const passport = require('./config/passport');
const setupCronJobs = require("./controllers/cronJob-middleware");
var hbs = require('express-handlebars')
const handlebars = require('handlebars');
var db = require('./config/connection');
var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');

var app = express();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');                                

setupCronJobs();

hbs.create({}).handlebars.registerHelper('ifEquals', function(value1, value2, options) {
  
  if (value1 === value2) {
    return options.fn(this); 
  } else {
    return options.inverse(this); 
  }
});
hbs.create({}).handlebars.registerHelper('formatDate', function (date) {
  return new Date(date).toLocaleDateString(); // Format the date
});
hbs.create({}).handlebars.registerHelper('isGreaterThan', function (a, b, options) {
  if (a > b) {
    return options.fn(this); // Execute the block if a > b
  } else {
    return options.inverse(this); // Execute the else block if a <= b
  }
});
hbs.create({}).handlebars.registerHelper('subtract', function (a, b) {
  return a - b;
});

hbs.create({}).handlebars.registerHelper('add', function (a, b) {
  return a + b;
});
hbs.create({}).handlebars.registerHelper('times', function (n, block) {
  let accum = '';
  for (let i = 1; i <= n; i++) {
    accum += block.fn(i);
  }
  return accum;
});
handlebars.registerHelper('gt', function (a, b) {
  return a > b;
});
handlebars.registerHelper('lt', function (a, b) {
  return a < b;
});
handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});
handlebars.registerHelper('range', function (start, end) {
  const result = [];
  for (let i = start; i <= end; i++) {
      result.push(i);
  }
  return result;
});
handlebars.registerHelper('neq', function (a, b) {
  return a !== b;
});
handlebars.registerHelper('getStatusCounts', function(items) {
  const counts = {};
  items.forEach(item => {
    counts[item.status] = (counts[item.status] || 0) + 1;
  });
  return counts;
});
handlebars.registerHelper('getMostCommonStatus', function(items) {
  const statusCounts = {};
  items.forEach(item => {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
  });
  return Object.keys(statusCounts).reduce((a, b) => 
    statusCounts[a] > statusCounts[b] ? a : b
  );
});
handlebars.registerHelper('json', function(context) {
  return JSON.stringify(context);
});
handlebars.registerHelper('arrayContains', function(array, value) {
  return array.indexOf(value) !== -1;
});
handlebars.registerHelper('or', function () {
  const args = Array.prototype.slice.call(arguments, 0, -1);
  return args.some(Boolean);
});
handlebars.registerHelper('statusColor', function (status) {
  switch (status) {
    case 'Pending':
      return 'warning';
    case 'Shipped':
      return 'primary'; 
    case 'Completed':
      return 'success'; 
    case 'Cancelled':
      return 'danger'; 
    default:
      return 'secondary'; 
  }
});
handlebars.registerHelper('gte', function (a, b, options) {
  if (a >= b) {
    return options.fn(this);
  }
  return options.inverse(this);
});
handlebars.registerHelper('add', function (a, b) {
  return a + b;
});
handlebars.registerHelper("formatDiscount", function (discountType, discountValue) {
  if (discountType === "percentage") {
    return `${discountValue}%`; // Add % for percentage
  } else if (discountType === "fixed") {
    return `₹${discountValue}`; // Add ₹ for fixed amount
  }
  return discountValue; // Default fallback
});
handlebars.registerHelper("calculateDiscount", function (price, offerAmount) {
  const discount = ((price - offerAmount) / price) * 100;
  return Math.round(discount); // Round to the nearest integer
});
handlebars.registerHelper("calculateDeductedAmount", function (price, offerAmount) {
  return price - offerAmount; // Amount deducted
});
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json())
app.use(cookieParser());
app.use(session({
  secret:process.env.SESSION_SECRET,
  resave:false,
  saveUninitialized:true,
  cookie:{maxAge:600000}
}))

app.use(passport.initialize());
app.use(passport.session())
app.use((req, res, next) => {
  res.locals.user = req.session.user || null; 
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.engine('hbs',hbs.engine({extname:'hbs',defaultLayout:'layout',layoutsDir:__dirname+'/views/layout/',partialsDir:__dirname+'/views/partials/'}))
db.connect((err)=>{
  if(err){
    console.log('database connection failed',err)
    process.exit(1)
  }
  console.log('server is running') 
})

app.use('/', userRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
