var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
  service: 'Mailgun',
  auth: {
    user: process.env.MAILGUN_USERNAME,
    pass: process.env.MAILGUN_PASSWORD
  }
});

/**
 * GET /contact
 */
exports.contactGet = function(req, res) {
  res.render('contact', {
    title: 'Contact'
  });
};

/**
 * POST /contact
 */
exports.contactPost = function(req, res) {
  req.assert('name', 'Nome vuoto').notEmpty();
  req.assert('email', 'Email non valida').isEmail();
  req.assert('email', 'Email vuota').notEmpty();
  req.assert('message', 'Message vuoto').notEmpty();
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  var errors = req.validationErrors();

  if (errors) {
    req.flash('error', errors);
    return res.redirect('/contact');
  }

  var mailOptions = {
    from: req.body.name + ' ' + '<'+ req.body.email + '>',
    to: 'indirizzo@beatriks.com',
    subject: '✔ Comntatti | Beatriks',
    text: req.body.message
  };

  transporter.sendMail(mailOptions, function(err) {
    req.flash('success', { msg: 'Grazie! La tua richiesta è stata inviata.' });
    res.redirect('/contact');
  });
};
