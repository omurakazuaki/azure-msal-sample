const express = require('express');
const router = express.Router();
const msal = require('../msal');
const { wrap } = require('../utils');

const errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(400).render('loginForm', { title: 'Login', action: `/login?redirect=${req.query.redirect}`, beforeLogin: true, alert: err.errorMessage })
};

router.get('/', wrap(async(req, res, next) => {
  if (await msal.getAccount(req.session.homeAccountId)) {
    res.redirect(req.query.redirect || '/');
  } else {
    res.render('loginForm', { title: 'Login', action: `/login?redirect=${req.query.redirect}`, beforeLogin: true })
  }
}));

router.post('/', wrap(async(req, res, next) => {
  const token = await msal.acquireToken(req.body);
  req.session.homeAccountId = token.account.homeAccountId;
  res.redirect(req.query.redirect || '/');
}), errorHandler);


module.exports = router;
