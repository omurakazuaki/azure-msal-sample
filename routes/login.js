const express = require('express');
const router = express.Router();
const { wrap } = require('../utils');
const passport = require('passport');

router.get('/', wrap(async(req, res, next) => {
  if (req.user) {
    res.redirect(req.query.redirect || '/');
  } else {
    res.render('loginForm', {
      title: 'Login',
      action: `/login?redirect=${req.query.redirect || '/'}`,
      beforeLogin: true,
      alert: req.flash( 'error' )
    })
  }
}));

router.post('/', passport.authenticate('local',
  { failureRedirect: '/login', failureFlash: true }),
  (req, res) => res.redirect(req.query.redirect || '/')
);

module.exports = router;
