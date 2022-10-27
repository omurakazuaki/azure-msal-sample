const express = require('express');
const router = express.Router();
const { wrap, kv } = require('../utils');

router.get('/', wrap(async(req, res, next) => {
  const token = req.user;
  res.render('index', { title: 'Home', username: token.account.name });
}));

router.get('/token', wrap(async(req, res, next) => {
  const token = req.user;
  const props = kv({...token, raw: token});
  res.render('token', { title: 'Token', props, backUrl: `/` });
}));

router.get('/logout', wrap(async(req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
}));

module.exports = router;
