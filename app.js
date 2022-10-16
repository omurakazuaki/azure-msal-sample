if (!process.env.NODE_ENV) {
  require('dotenv').config();
}
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const loginRouter = require('./routes/login');
const filesRouter = require('./routes/files');
const downloadRouter = require('./routes/download');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
  }
}));
app.set('trust proxy', true);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const msal = require('./msal');
const isAuthenticated = async (req, res, next) => {
  if (await msal.getAccount(req.session.homeAccountId)) {
    next();
  } else {
    res.redirect(`/login?redirect=${req.url}`);
  }
};

app.use('/login', loginRouter);
app.use('/', isAuthenticated, indexRouter);
app.use('/files', isAuthenticated, filesRouter);
app.use('/download', isAuthenticated, downloadRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.disable('x-powered-by');

module.exports = app;
