var async = require('async');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var passport = require('passport');
var User = require('../models/User');

/**
 * Login required middleware
 */
exports.ensureAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect('/login');
  }
};

/**
 * GET /login
 */
exports.loginGet = function(req, res) {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('account/login', {
    title: 'Log in'
  });
};

/**
 * POST /login
 */
exports.loginPost = function(req, res, next) {
  req.assert('email', 'Email non valida').isEmail();
  req.assert('email', 'Email vuota').notEmpty();
  req.assert('password', 'Password vuota').notEmpty();
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

/**
 * GET /logout
 */
exports.logout = function(req, res) {
  req.logout();
  res.redirect('/');
};

/**
 * GET /signup
 */
exports.signupGet = function(req, res) {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('account/signup', {
    title: 'Sign up'
  });
};

/**
 * POST /signup
 */
exports.signupPost = function(req, res, next) {
  req.assert('name', 'Name vuoto').notEmpty();
  req.assert('email', 'Email non valida').isEmail();
  req.assert('email', 'Email email vuota').notEmpty();
  req.assert('password', 'Password password troppo corta (minimo 4 caratteri)').len(4);
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  var errors = req.validationErrors();

  if (errors) {
    req.flash('error', errors);
    return res.redirect('/signup');
  }

  User.findOne({ email: req.body.email }, function(err, user) {
    if (user) {
      req.flash('error', { msg: 'email già registrata' });
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

/**
 * GET /account
 */
exports.accountGet = function(req, res) {
  res.render('account/profile', {
    title: 'Account'
  });
};

/**
 * PUT /account
 */
exports.accountPut = function(req, res, next) {
  if ('password' in req.body) {
    req.assert('password', 'Password troppo corta').len(4);
    req.assert('confirm', 'Passwords diversew').equals(req.body.password);
  } else {
    req.assert('email', 'Email non valida').isEmail();
    req.assert('email', 'Email vuota').notEmpty();
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
        req.flash('success', { msg: 'password cambiata' });
      } else if (err && err.code === 11000) {
        req.flash('error', { msg: 'email già registrata.' });
      } else {
        req.flash('success', { msg: 'informazioni aggiornate.' });
      }
      res.redirect('/account');
    });
  });
};

/**
 * DELETE /account
 */
exports.accountDelete = function(req, res, next) {
  User.remove({ _id: req.user.id }, function(err) {
    req.logout();
    req.flash('info', { msg: 'Account Eliminato.' });
    res.redirect('/');
  });
};

/**
 * GET /unlink/:provider
 */
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
        req.flash('error', { msg: 'Invalid OAuth Provider' });
        return res.redirect('/account');
    }
    user.save(function(err) {
      req.flash('success', { msg: 'Account Scollegato' });
      res.redirect('/account');
    });
  });
};

/**
 * GET /forgot
 */
exports.forgotGet = function(req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render('account/forgot', {
    title: 'Recupera Password'
  });
};

/**
 * POST /forgot
 */
exports.forgotPost = function(req, res, next) {
  req.assert('email', 'Email non valida').isEmail();
  req.assert('email', 'Email vuota').notEmpty();
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
          req.flash('error', { msg: 'L\'indirizzo email  ' + req.body.email + ' non è registrato' });
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
        from: 'support@beatriks.com',
        subject: '✔ Reset your password on Beatriks.com',
        text: 'Hai ricevuto questa mail per via del sito Beatriks.....\n\n' +
        'Clicca sul seguente link:\n\n' +
        'http://' + req.headers.host + '/reset/' + token + '\n\n' +
        'Se non hai fatto questa richiesta ignora il messaggio.\n'
      };
      transporter.sendMail(mailOptions, function(err) {
        req.flash('info', { msg: 'il link di recupero è stato inviato a ' + user.email + '. Controlla la mail.' });
        res.redirect('/forgot');
      });
    }
  ]);
};

/**
 * GET /reset
 */
exports.resetGet = function(req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  User.findOne({ passwordResetToken: req.params.token })
    .where('passwordResetExpires').gt(Date.now())
    .exec(function(err, user) {
      if (!user) {
        req.flash('error', { msg: 'Token non valido o sessione scaduta.' });
        return res.redirect('/forgot');
      }
      res.render('account/reset', {
        title: 'Password Reset'
      });
    });
};

/**
 * POST /reset
 */
exports.resetPost = function(req, res, next) {
  req.assert('password', 'Password troppo corta').len(4);
  req.assert('confirm', 'Passwords diverse').equals(req.body.password);

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
            req.flash('error', { msg: 'Token non valido o sessione scaduta.' });
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
        subject: 'La password di Beatriks è stata cambiata',
        text: 'Ciao,\n\n' +
        'questa è la password di conferma per l\'account ' + user.email + '.\n'
      };
      transporter.sendMail(mailOptions, function(err) {
        req.flash('success', { msg: 'Password cambiata con successo.' });
        res.redirect('/account');
      });
    }
  ]);
};


