var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;


var User = require('../models/User');

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// Sign in with Email and Password
passport.use(new LocalStrategy({ usernameField: 'email' }, function(email, password, done) {
  User.findOne({ email: email }, function(err, user) {
    if (!user) {
      return done(null, false, { msg: 'La mail ' + email + ' non è associata a nessun account. ' +
      'controlla la mail è prova ancora.' });
    }
    user.comparePassword(password, function(err, isMatch) {
      if (!isMatch) {
        return done(null, false, { msg: 'Mail o password errati' });
      }
      return done(null, user);
    });
  });
}));

//Facebook Strategy
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_ID,
  clientSecret: process.env.FACEBOOK_SECRET,
  callbackURL: '/auth/facebook/callback',
  profileFields: ['name', 'email', 'gender', 'location'],
  passReqToCallback: true
}, function(req, accessToken, refreshToken, profile, done) {
  if (req.user) {
    User.findOne({ facebook: profile.id }, function(err, user) {
      if (user) {
        req.flash('error', { msg: 'Esiste già un utente registrato con questo account Facebook.' });
        done(err);
      } else {
        User.findById(req.user.id, function(err, user) {
          user.name = user.name || profile.name.givenName + ' ' + profile.name.familyName;
          user.gender = user.gender || profile._json.gender;
          user.picture = user.picture || 'https://graph.facebook.com/' + profile.id + '/picture?type=large';
          user.facebook = profile.id;
          user.save(function(err) {
            req.flash('success', { msg: 'Account Facebook linkato.' });
            done(err, user);
          });
        });
      }
    });
  } else {
    User.findOne({ facebook: profile.id }, function(err, user) {
      if (user) {
        return done(err, user);
      }
      User.findOne({ email: profile._json.email }, function(err, user) {
        if (user) {
          req.flash('errore! Utente ', { msg: user.email + ' già registrato.' });
          done(err);
        } else {
          var newUser = new User({
            name: profile.name.givenName + ' ' + profile.name.familyName,
            email: profile._json.email,
            gender: profile._json.gender,
            location: profile._json.location && profile._json.location.name,
            picture: 'https://graph.facebook.com/' + profile.id + '/picture?type=large',
            facebook: profile.id
          });
          newUser.save(function(err) {
            done(err, newUser);
          });
        }
      });
    });
  }
}));

// Google
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_ID,
  clientSecret: process.env.GOOGLE_SECRET,
  callbackURL: '/auth/google/callback',
  passReqToCallback: true
}, function(req, accessToken, refreshToken, profile, done) {
  if (req.user) {
    User.findOne({ google: profile.id }, function(err, user) {
      if (user) {
        req.flash('error', { msg: 'Account google già usato.' });
      } else {
        User.findById(req.user.id, function(err, user) {
          user.name = user.name || profile.displayName;
          user.gender = user.gender || profile._json.gender;
          user.picture = user.picture || profile._json.image.url;
          user.google = profile.id;
          user.save(function(err) {
            req.flash('success', { msg: 'Account Google linkato.' });
            done(err, user);
          });
        });
      }
    });
  } else {
    User.findOne({ google: profile.id }, function(err, user) {
      if (user) {
        return done(null, user);
      }
      User.findOne({ email: profile.emails[0].value }, function(err, user) {
        if (user) {
          req.flash('errore! Utente ', { msg: user.email + ' già registrato.' });
          done(err);
        } else {
          var newUser = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            gender: profile._json.gender,
            location: profile._json.location,
            picture: profile._json.image.url,
            google: profile.id
          });
          newUser.save(function(err) {
            done(err, newUser);
          });
        }
      });
    });
  }
}));
