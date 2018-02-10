/**  GET To "/"  **/
exports.index = (req, res) => {
  let usr = undefined;
  if (req.isAuthenticated()) {
     usr = req.user;
  }
  res.render('home', {
    user: usr
  });
};
