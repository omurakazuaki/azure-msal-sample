const express = require('express');
const router = express.Router();
const msal = require('../msal');
const { wrap, kv } = require('../utils');

router.get('/', wrap(async(req, res, next) => {
  const token = await msal.acquireToken({ homeAccountId: req.session.homeAccountId })
  res.render('index', { title: 'Home', username: token.account.name });
}));

router.get('/token', wrap(async(req, res, next) => {
  const token = await msal.acquireToken({ homeAccountId: req.session.homeAccountId });
  const props = kv({...token, raw: token});
  res.render('token', { title: 'Token', props, backUrl: `/` });
}));

router.get('/logout', wrap(async(req, res, next) => {
  req.session.homeAccountId = undefined;
  res.redirect('/');
}));

module.exports = router;
