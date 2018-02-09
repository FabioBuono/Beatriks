/**
 * GET /
 */
exports.index = function(req, res) {
 if (req.isAuthenticated()){
  res.render('home', {
               user: req.user
            }) } else {
        res.render('home', { new: true})}
};
