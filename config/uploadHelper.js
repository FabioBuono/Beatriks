const formidable = require('formidable');
const path = require('path');
const fs = require('fs');


//Formidable UpLoad Helper
exports.upHelper = (req, res, multiple) => {
  // create an incoming form object
  var form = new formidable.IncomingForm();
  // specify IF we want to allow the user to upload multiple files in a single request
  if (multiple) {
    form.multiples = true;
  }
  
  // store all uploads in the /uploads directory
  form.uploadDir = path.join(__dirname, '../uploads');
  // parse the incoming request containing the form data
  form.parse(req);


  // log any errors that occur
  form.on('error', function (err) {
    console.log('An error has occured: \n' + err);
    /**** TO DO *****/
  });
  // once all the files have been uploaded, send a response to the client
  form.on('end', function () {
    res.end('success');
  });
  // every time a file has been uploaded successfully,
  // rename it to it's orignal name
  form.on('file', function (field, file) {
    fs.rename(file.path, path.join(form.uploadDir, file.name));
  });

}