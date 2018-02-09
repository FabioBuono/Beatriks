const bluebird = require('bluebird');
const request = bluebird.promisifyAll(require('request'), { multiArgs: true });


exports.getFileUpload = (req, res) => {
  if (req.isAuthenticated()) {
    res.render('account/upload', {
      user: req.user
    });
 } else res.redirect('/');
};

/*
exports.postFileUpload = (req, res) => {
  if (req.isAuthenticated()) {
    res.render('account/upload', {
      user: req.user,
       mess: "file " + req.fileName + " Salvato" + req.File
    })
  } else res.redirect('/');
};
*/
