const formidable = require('formidable');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
var filen;

exports.getFileUpload = (req, res) => {
  if (req.isAuthenticated()) {
    res.render('account/upload', {
      user: req.user
    });
 } else res.redirect('/');
};



exports.postFileUpload = async (req, res) => {
  // create an incoming form object
  var form = new formidable.IncomingForm();
  // specify that we want to allow the user to upload multiple files in a single request
  form.multiples = true;
  // store all uploads in the /uploads directory
  form.uploadDir = path.join(__dirname, '../uploads');
  // every time a file has been uploaded successfully,
  // rename it to it's orignal name
  form.on('file', function(field, file) {
    fs.rename(file.path, path.join(form.uploadDir, file.name));
  });
  // log any errors that occur
  form.on('error', function(err) {
    console.log('An error has occured: \n' + err);
  });
  // once all the files have been uploaded, send a response to the client
  form.on('end', function() {
    res.end('success');
  });
  // parse the incoming request containing the form data
  form.parse(req);
};

exports.getFileUploadOne = (req, res) => {
  if (req.isAuthenticated()) {
    res.render('account/uploaded', {
      user: req.user
    });
 } else res.redirect('/');
};

exports.postFileUploadOne = (req, res) => {
// create an incoming form object
var form = new formidable.IncomingForm();
// parse the incoming request containing the form data
form.parse(req);

    form.on('fileBegin', function (name, file){
        file.path = path.join(__dirname, '../uploads/'); 
        file.path += file.name;
    });

    form.on('file', function (name, file){
        console.log('Uploaded ' + file.name);
    });
    res.render('account/uploaded', {
      user: req.user
    });
  }

//https://evdokimovm.github.io/javascript/nodejs/expressjs/multer/2016/11/03/Upload-files-to-server-using-NodeJS-and-Multer-package-filter-upload-files-by-extension.html


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