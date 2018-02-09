var crypto = require('crypto');
var bcrypt = require('bcrypt-nodejs');
var mongoose = require('mongoose');

var schemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true
  }
};
/*
https://groups.google.com/forum/?fromgroups#!topic/mongoose-orm/HjrPAP_WXYs
*/
const userSchema = new mongoose.Schema({  //var o let o const??? 
  name: String,
  surname :String,
  email: { type: String, unique: true},
  password: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  gender: String,
  location: String,
  university: Number, //id of university da tabella ad hoc
  website: String,
  picture: String,
  facebook: String,
  google: String,
  noteList : [{ 
    title: String, 
    originalFileName: String,
    description: String, 
    fileId: String, 
    date: Date, 
    refToComment: String, //sostituire con array di riferimenti a commenti
    private: Boolean,
    teacherName: String,
    topicName: String,
    university: Number,
    refToLikeID: Number //sostituire con array di id utente che hanno messo like
  }],
  buddyList : [ { id: String } ]
},schemaOptions);

userSchema.pre('save', function(next) {
  var user = this;
  if (!user.isModified('password')) { return next(); }
  bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(user.password, salt, null, function(err, hash) {
      user.password = hash;
      next();
    });
  });
});

userSchema.methods.comparePassword = function(password, cb) {
  bcrypt.compare(password, this.password, function(err, isMatch) {
    cb(err, isMatch);
  });
};

userSchema.virtual('gravatar').get(function() {
  if (!this.get('email')) {
    return 'https://gravatar.com/avatar/?s=200&d=retro';
  }
  var md5 = crypto.createHash('md5').update(this.get('email')).digest('hex');
  return 'https://gravatar.com/avatar/' + md5 + '?s=200&d=retro';
});

userSchema.options.toJSON = {
  transform: function(doc, ret, options) {
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
  }
};

var User = mongoose.model('User', userSchema);

module.exports = User;
