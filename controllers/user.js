var async = require('async');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var passport = require('passport');
var User = require('../models/User');


/** Login  Middleware **/
exports.ensureAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect('/login');
  }
};

/** GET To /login **/
exports.loginGet = function(req, res) {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('account/login', {
    title: 'Log in'
  });
};

/** POST To /login **/
exports.loginPost = function(req, res, next) {
  req.assert('email', '<%= __('Email is not valid')%>').isEmail();
  req.assert('email', '<%= __('Email cannot be blank')%>').notEmpty();
  req.assert('password', '<%= __('Password cannot be blank')%>').notEmpty();
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  var errors = req.validationErrors();

  if (errors) {
    req.flash('error', errors);
    return res.redirect('/login');
  }

  passport.authenticate('local', function(err, user, info) {
    if (!user) {
      req.flash('error', info);
      return res.redirect('/login')
    }
    req.logIn(user, function(err) {
      res.redirect('/');
    });
  })(req, res, next);
};

/** GET /logout **/
exports.logout = function(req, res) {
  req.logout();
  res.redirect('/');
};

/** GET /signup **/
exports.signupGet = function(req, res) {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('account/signup', {
    title: 'Sign up'
  });
};

/** POST To /signup **/
exports.signupPost = function(req, res, next) {
  req.assert('name', '<%= __('Name cannot be blank')%>').notEmpty();
  req.assert('email', '<%= __('Email is not valid')%>').isEmail();
  req.assert('email', '<%= __('Email cannot be blank')%>').notEmpty();
  req.assert('password', '<%= __('Password must be at least 4 characters long')%>').len(4);
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  var errors = req.validationErrors();

  if (errors) {
    req.flash('error', errors);
    return res.redirect('/signup');
  }

  User.findOne({ email: req.body.email }, function(err, user) {
    if (user) {
      req.flash('error', { msg: '<%= __('The email address you have entered is already associated with another account')%>.' });
      return res.redirect('/signup');
    }
    user = new User({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password
    });
    user.save(function(err) {
      req.logIn(user, function(err) {
        res.redirect('/');
      });
    });
  });
};

/** GET To /account **/
exports.accountGet = function(req, res) {
  res.render('account/profile', {
    title: '<%= __('Hello, ')%>My Account'
  });
};

/** Update OR change password. **/
exports.accountPut = function(req, res, next) {
  if ('password' in req.body) {
    req.assert('password', '<%= __('Password must be at least 4 characters long')%>').len(4);
    req.assert('confirm', '<%= __('Passwords must match')%>').equals(req.body.password);
  } else {
    req.assert('email', '<%= __('Email is not valid')%>').isEmail();
    req.assert('email', '<%= __('Email cannot be blank')%>').notEmpty();
    req.sanitize('email').normalizeEmail({ remove_dots: false });
  }

  var errors = req.validationErrors();

  if (errors) {
    req.flash('error', errors);
    return res.redirect('/account');
  }

  User.findById(req.user.id, function(err, user) {
    if ('password' in req.body) {
      user.password = req.body.password;
    } else {
      user.email = req.body.email;
      user.name = req.body.name;
      user.gender = req.body.gender;
      user.location = req.body.location;
      user.website = req.body.website;
    }
    user.save(function(err) {
      if ('password' in req.body) {
        req.flash('success', { msg: '<%= __('Your password has been changed')%>.' });
      } else if (err && err.code === 11000) {
        req.flash('error', { msg: '<%= __('The email address you have entered is already associated with another account')%>.' });
      } else {
        req.flash('success', { msg: '<%= __('Your profile information has been updated')%>.' });
      }
      res.redirect('/account');
    });
  });
};

/** DELETE To /account **/
exports.accountDelete = function(req, res, next) {
  User.remove({ _id: req.user.id }, function(err) {
    req.logout();
    req.flash('info', { msg: '<%= __('Your account has been permanently deleted')%>.' });
    res.redirect('/');
  });
};

/** GET /unlink/:provider **/
exports.unlink = function(req, res, next) {
  User.findById(req.user.id, function(err, user) {
    switch (req.params.provider) {
      case 'facebook':
        user.facebook = undefined;
        break;
      case 'google':
        user.google = undefined;
        break;
      default:
        req.flash('error', { msg: '<%= __('Invalid OAuth Provider')%>' });
        return res.redirect('/account');
    }
    user.save(function(err) {
      req.flash('success', { msg: '<%= __('Your account has been unlinked')%>.' });
      res.redirect('/account');
    });
  });
};

/** GET /forgot **/
exports.forgotGet = function(req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render('account/forgot', {
    title: 'Forgot Password'
  });
};

/** POST /forgot **/
exports.forgotPost = function(req, res, next) {
  req.assert('email', '<%= __('Email is not valid')%>').isEmail();
  req.assert('email', '<%= __('Email cannot be blank')%>').notEmpty();
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  var errors = req.validationErrors();

  if (errors) {
    req.flash('error', errors);
    return res.redirect('/forgot');
  }

  async.waterfall([
    function(done) {
      crypto.randomBytes(16, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', { msg: '<%= __('The email address')%> ' + req.body.email + ' <%= __('is not associated with any account')%>.' });
          return res.redirect('/forgot');
        }
        user.passwordResetToken = token;
        user.passwordResetExpires = Date.now() + 3600000; 
        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var transporter = nodemailer.createTransport({
        service: 'Mailgun',
        auth: {
          user: process.env.MAILGUN_USERNAME,
          pass: process.env.MAILGUN_PASSWORD
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'support@yourdomain.com',
        subject: '✔ <%= __('Reset your password on Beatriks')%>',
        text: '<%= __('Please click on the following link, or paste this into your browser to complete the process:')%>\n\n' +
        'http://' + req.headers.host + '/reset/' + token + '\n\n' +
        '<%= __('It\'s not your request? No problem! You Password will be immutated')%>.\n'
      };
      transporter.sendMail(mailOptions, function(err) {
        req.flash('info', { msg: '<%= __('An email has been sent to')%> ' + user.email + ' <%= __('with further instructions')%>.' });
        res.redirect('/forgot');
      });
    }
  ]);
};

/** GET To /reset **/
exports.resetGet = function(req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  User.findOne({ passwordResetToken: req.params.token })
    .where('passwordResetExpires').gt(Date.now())
    .exec(function(err, user) {
      if (!user) {
        req.flash('error', { msg: '<%= __('Password reset token is invalid or has expired')%>.' });
        return res.redirect('/forgot');
      }
      res.render('account/reset', {
        title: 'Password Reset'
      });
    });
};

/** POST /reset **/
exports.resetPost = function(req, res, next) {
  req.assert('password', '<%= __('Password must be at least 4 characters long')%>').len(4);
  req.assert('confirm', '<%= __('Passwords must match')%>').equals(req.body.password);

  var errors = req.validationErrors();

  if (errors) {
    req.flash('error', errors);
    return res.redirect('back');
  }

  async.waterfall([
    function(done) {
      User.findOne({ passwordResetToken: req.params.token })
        .where('passwordResetExpires').gt(Date.now())
        .exec(function(err, user) {
          if (!user) {
            req.flash('error', { msg: '<%= __('Password reset token is invalid or has expired')%>.' });
            return res.redirect('back');
          }
          user.password = req.body.password;
          user.passwordResetToken = undefined;
          user.passwordResetExpires = undefined;
          user.save(function(err) {
            req.logIn(user, function(err) {
              done(err, user);
            });
          });
        });
    },
    function(user, done) {
      var transporter = nodemailer.createTransport({
        service: 'Mailgun',
        auth: {
          user: process.env.MAILGUN_USERNAME,
          pass: process.env.MAILGUN_PASSWORD
        }
      });
      var mailOptions = {
        from: 'support@yourdomain.com',
        to: user.email,
        subject: '<%= __('Your password has been changed')%>',
        text: '<%= __('Hello, ')%>\n\n' +
        '<%= __('This is a confirmation that the password for your account')%> ' + user.email + ' <%= __('has just been changed')%>.\n'
      };
      transporter.sendMail(mailOptions, function(err) {
        req.flash('success', { msg: '<%= __('Your password has been changed successfully')%>.' });
        res.redirect('/account');
      });
    }
  ]);
};
