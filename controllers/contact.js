var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
  service: 'Mailgun',
  auth: {
    user: process.env.MAILGUN_USERNAME,
    pass: process.env.MAILGUN_PASSWORD
  }
});

/** GET To /contact **/
exports.contactGet = function(req, res) {
  res.render('contact', {
    title: '<%= __('Hello, ')%>Contact'
  });
};

/** POST /contact **/
exports.contactPost = function(req, res) {
  req.assert('name', '<%= __('Name cannot be blank')%>').notEmpty();
  req.assert('email', '<%= __('Email is not valid')%>').isEmail();
  req.assert('email', '<%= __('Email cannot be blank')%>').notEmpty();
  req.assert('message', '<%= __('Message cannot be blank')%>').notEmpty();
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  var errors = req.validationErrors();

  if (errors) {
    req.flash('error', errors);
    return res.redirect('/contact');
  }

  var mailOptions = {
    from: req.body.name + ' ' + '<'+ req.body.email + '>',
    to: 'your@email.com',
    subject: '✔ <%= __('Contact Form')%> | Beatriks.Com',
    text: req.body.message
  };

  transporter.sendMail(mailOptions, function(err) {
    req.flash('success', { msg: '<%= __('Thank you! Your feedback has been submitted')%>.' });
    res.redirect('/contact');
  });
};
