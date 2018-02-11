var express          = require('express');
var path             = require('path');
var logger           = require('morgan');
var compression      = require('compression');
var methodOverride   = require('method-override');
var session          = require('express-session');
var flash            = require('express-flash');
var bodyParser       = require('body-parser');
var expressValidator = require('express-validator');
var dotenv           = require('dotenv');
var exphbs           = require('express-handlebars');
var mongoose         = require('mongoose');
var passport         = require('passport');
const cors           = require('cors');
const fs             = require('fs');
const chalk          = require('chalk');
const os             = require('os');
const helmet         = require('helmet');
const i18n           = require('i18n');
/************************************/
/**       Basic Configuration     **/
/************************************/
const log  = console.log;
const info = chalk.bold.yellow;
const ok   = chalk.green('✓');
const ex   = chalk.red('✗');
// Load configuration from .env file
dotenv.load();
// Controllers
var HomeController = require('./controllers/home');
var userController = require('./controllers/user');
var contactController = require('./controllers/contact');
var uploadController = require('./controllers/upload');
// Express
var app = express();
// Passport OAuth strategies
require('./config/passport');
/*********************************/
/**  Mongoose CONFIGURATION     **/
/*********************************/
//set global promises for mongo
mongoose.Promise = global.Promise;
//connection to mongo db
mongoose.connect(process.env.MONGODB)
  .then(log('\n-- %s MongoDb Connection Established ', ok));
//mongodb connection error handler
mongoose.connection.on('error', function () {
  console.error(err);
  log('%s MongoDB: connection error - Check for service running.', ex);
  process.exit(1);
});
/*********************************/
/**      Handlebars setup       **/
/*********************************/
var hbs = exphbs.create({
  defaultLayout: 'main',
  helpers: {
    ifeq: function(a, b, options) {
      if (a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
    },
    toJSON : function(object) {
      return JSON.stringify(object);
    }
  }
});
/*********************************/
/**     EXPRESS CONFIGURATION   **/
/*********************************/
//Cross-Origin Middleware
app.use(cors());
// SeT Application Title
app.set('title', 'Title');
//Set Template Engine
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
//Set i18n Middleware
app.use(i18n);
// JSON Spaces setting
app.set('json spaces', 2);
//Set Host and Port
app.set('host', os.hostname());
app.set('port', process.env.PORT || 3000);
//Disable Server Information (Disabled: We use Helmet)
//app.disable('x-powered-by'); 
//Use compressed header
app.use(compression());
//Set a logger
app.use(logger('dev'));
//body-parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//Express Validator Middleware
app.use(expressValidator());
//Override HTTP verbs where are not avaible
app.use(methodOverride('_method'));
//Set up a session for Flash message and passport
app.use(session({ secret: process.env.SESSION_SECRET, resave: true, saveUninitialized: true }));
app.use(flash());
//login helper middleware
app.use(passport.initialize());
app.use(passport.session());
// Set Local variable 
app.use(function (req, res, next) {
  res.locals.user = req.user;
  next();
});
//Set Etag - By default, Express.js uses “weak” ETag. 
app.set('etag', 'strong');
/* 
1. true: weak ETag, e.g., app.enable('etag'); that produces a response with ETag
2. false: no ETag at all (IMHO not recommended), e.g., app.disable('etag'); that 
  produces a response without ETag
3. weak: weak ETag, e.g., app.set('etag', 'weak');
4. strong: strong ETag, e.g., app.set('etag', 'strong');

An identical strong ETag guarantees the response is byte-for-byte the same, 
while an identical weak ETag indicates that the response is semantically the same.
app.disable('etag');  
*/

/*********************************/
/**  Staic Files Configuration  **/
/*********************************/
//Serve Static File
app.use(express.static(path.join(__dirname, 'public')));

/*********************************/
/**    HELMET CONFIGURATION    **/
/*********************************/
app.use(helmet());
app.use(helmet.noCache());
// Sets "Referrer-Policy: same-origin".
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
// Frame of pages ONLY from sameOrigin
app.use(helmet.frameguard({ action: 'sameorigin' }));
// Sets "X-XSS-Protection: 1; mode=block".
app.use(helmet.xssFilter());
// Sets "X-Content-Type-Options: nosniff".
app.use(helmet.noSniff());
// Sets "X-Download-Options: noopen"
// prevent Internet Explorer from executing downloads in site’s context
app.use(helmet.ieNoOpen());
// Sets "X-DNS-Prefetch-Control: on".
app.use(helmet.dnsPrefetchControl());
// Hide Server Information and set a Fake data
//app.use(helmet.hidePoweredBy());
app.use(helmet.hidePoweredBy({ setTo: 'PHP 4.2.0' }));
//FrameGuard SameOrigin - Deny Frame
app.use(helmet({
  frameguard: {
    action: 'deny'  //Optional: 'sameorigin'
  }
})); 
/*
// Content Security Policy Per Risorse Esterne
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: 
    styleSrc: 
  }
}))
*/

/*********************************/
/**    Application Routes       **/
/*********************************/
app.get(    '/',                 HomeController.index);
app.get(    '/contact',          contactController.contactGet);
app.post(   '/contact',          contactController.contactPost);
app.get(    '/account',          userController.ensureAuthenticated, userController.accountGet);
app.put(    '/account',          userController.ensureAuthenticated, userController.accountPut);
app.delete( '/account',          userController.ensureAuthenticated, userController.accountDelete);
app.get(    '/signup',           userController.signupGet);
app.post(   '/signup',           userController.signupPost);
app.get(    '/login',            userController.loginGet);
app.post(   '/login',            userController.loginPost);
app.get(    '/forgot',           userController.forgotGet);
app.post(   '/forgot',           userController.forgotPost);
app.get(    '/reset/:token',     userController.resetGet);
app.post(   '/reset/:token',     userController.resetPost);
app.get(    '/logout',           userController.logout);
app.get(    '/unlink/:provider', userController.ensureAuthenticated, userController.unlink);
app.get(    '/auth/facebook',          passport.authenticate('facebook', { scope: ['email', 'user_location'] }));
app.get(    '/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/login' }));
app.get(    '/auth/google',            passport.authenticate('google', { scope: 'profile email' }));
app.get(    '/auth/google/callback',   passport.authenticate('google', { successRedirect: '/', failureRedirect: '/login' }));
app.get(    '/upload',           uploadController.getFileUpload);
app.post(   '/upload',           uploadController.postFileUpload);
app.get(    '/uploaded',         uploadController.getFileUploadOne);
app.post(   '/uploaded',         uploadController.postFileUploadOne);

app.all('*', (req, res) => {
   res.status(404).sendFile(path.join(__dirname + '/public/404.html'));
});

// Error handler
if (app.get('env') === 'production') {
  app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.sendStatus(err.status || 500);
  });
}

app.listen(app.get('port'), () => {
  log('-- %s App is running at %s:%d in %s mode', ok, info(os.hostname().toString()), app.get('port'), app.get('env'));
  log("-- %s User: %s on platform: %s",           ok, os.userInfo().username, os.platform().toString());
  log("-- %s Beatriks - Full Self Localization System ITA/ENG (Enabled)", ok);
  log('-- %s Press %s to stop\n',                 ok, info('CTRL-C'));
});
module.exports = app;
