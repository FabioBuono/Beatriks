const formidable = require('formidable');
const path = require('path');
const fs = require('fs');
const helper = require('../helper/uploadHelper');

// Multiple Files Upload Get 
exports.getFileUpload = (req, res) => {
  //Redundant Security Control
  if (req.isAuthenticated()) {
    res.render('account/upload', {
      user: req.user
    });
  } else res.redirect('/');
};

// Single Files Upload Get 
exports.getFileUploadOne = (req, res) => {
  //Redundant Security Control
  if (req.isAuthenticated()) {
    res.render('account/uploaded', {
      user: req.user
    });
  } else res.redirect('/');
};

// Multiple Files Upload Post 
exports.postFileUpload = async (req, res) => {
  await helper.upHelper(req, res, true);
};
// Single Files Upload Post 
exports.postFileUploadOne = (req, res) => {
  helper.upHelper(req, res, false);
}


/*

 exports.uploadFile = (req, res) => {
  let mtd = req.method;
  let url = req.url;
  if (isAuthenticated) {
    switch (mtd) {
      case "POST":{
        await helper.upHelper(req, res, (url == "/upload") ? true : false);
      }
        break;
      case "GET":
        if (url == "/upload") {
          res.render('account/upload', {
            user: req.user
          })
        } else {
          res.render('account/uploaded', {
            user: req.user
          })
        }
        break;
      default:
        break;
    } // switch
  } //Is not authenticated !!
}
*/

/*
exports.postFileUpload = async (req, res) => {
  try {
    const userUpdate = { filename: req.filename , originalFileName: req.originalname};
    user = await new Promise((resolve, reject) => {
      User.findOneAndUpdate({ email: req.user.email }, userUpdate, { upsert: true, new: true }, (error, obj) => {
        if (error) {
          console.error(JSON.stringify(error));
          return reject(error);
        }
        resolve(obj);
      });
    })
      .then(() => {
        res.render('account/uploaded', { user: req.user, fileName: data.filename, originalName: data.originalname });
      });
  } catch (err) {
    req.flash('error', {msg: 'Server Problems -- Try Later' });
    res.render("/upload");
  }
};
*/
