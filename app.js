var createError = require('http-errors');
var express = require('express');
const bodyParser = require('body-parser');
var path = require('path');
const session = require('express-session');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const passport = require('./config/passport');

var hbs = require('express-handlebars')
const handlebars = require('handlebars');
var db = require('./config/connection');
var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');

var app = express();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

hbs.create({}).handlebars.registerHelper('ifEquals', function(value1, value2, options) {
  if (value1 === value2) {
    return options.fn(this); 
  } else {
    return options.inverse(this); 
  }
});
handlebars.registerHelper('json', function(context) {
  return JSON.stringify(context);
});
handlebars.registerHelper('arrayContains', function(array, value) {
  return array.indexOf(value) !== -1;
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
