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
const multer         = require('multer');
const cors           = require('cors');
const fs             = require('fs');
const chalk          = require('chalk');
const os             = require('os');
const Loki           = require('lokijs');
const helmet         = require('helmet');


/************************************/
/**       Basic Configuration     **/
/************************************/
// Used for upload
const User = require('./models/User');

/** Syntactic Sugar **/
const log  = console.log;
const info = chalk.bold.yellow;
const ok   = chalk.green('✓');
const ex   = chalk.red('✗');

//File Database Setup
const DB_NAME         = 'db.json';
const COLLECTION_NAME = 'lessons';
const UPLOAD_PATH     = 'uploads';
const upload          = multer({ dest: `${UPLOAD_PATH}/` });
const db              = new Loki(`${UPLOAD_PATH}/${DB_NAME}`, { persistenceMethod: 'fs' });

/* Memory DB Helper */
var loadCollection = function (colName, db) {
  return new Promise(function (resolve) {
    db.loadDatabase({}, function () {
      var _collection = db.getCollection(colName) || db.addCollection(colName);
      resolve(_collection);
    });
  });
};

// Load variables from .env file to process.env
dotenv.load();

// Controllers
var HomeController    = require('./controllers/home');
var userController    = require('./controllers/user');
var contactController = require('./controllers/contact');
var uploadController  = require('./controllers/upload');


//Instanciate Express
const app = express();

// Passport OAuth strategies (after app=express; !!!)
require('./config/passport');



/*********************************/
/**  Mongoose CONFIGURATION     **/
/*********************************/

//set global promises for mongo
mongoose.Promise = global.Promise;

//connection to mongo db
mongoose.connect(process.env.MONGODB)
  .then(log('\n-- %s Connessione a Mongo eseguita ', ok));

//mongodb connection error handler
mongoose.connection.on('error', function () {
  console.error(err);
  log('%s MongoDB: errore di connessione. Controlla se il servizio è attivo.', ex);
  process.exit(1);
});


/*********************************/
/**      Handlebars setup       **/
/*********************************/

var hbs = exphbs.create({
  defaultLayout: 'main',
  helpers: {
    ifeq: function (a, b, options) {
      if (a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
    },
    toJSON: function (object) {
      return JSON.stringify(object);
    }
  }
});

/*********************************/
/**     EXPRESS CONFIGURATION   **/
/*********************************/
// https://blog.openshift.com/run-your-nodejs-projects-on-openshift-in-two-simple-steps/

//Cross-Origin Middleware
app.use(cors());
// SeT Application Title
app.set('title', 'Beatriks');
//Set Template Engine
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
//Set Host and Port
app.set('host', os.hostname());
app.set('port', process.env.PORT || 3000);
//Disable Server Information
app.disable('x-powered-by');
//Use compressed header
app.use(compression());
//Set a logger
app.use(logger('dev'));
//body-parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//Express Validator Middleware
app.use(expressValidator());
//Override HTTP verbs where are not availe
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
app.use(helmet.hidePoweredBy());
app.use(helmet.hidePoweredBy({ setTo: 'PHP 4.2.0' }));
//FrameGuard SameOrigin - Deny Frame
app.use(helmet.frameguard({ action: 'sameorigin' }));
app.use(helmet({
  frameguard: {
    action: 'deny'
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
app.post(   '/upload',           upload.single('File'), 
async (req, res) => {
  try {
    const col = await loadCollection(COLLECTION_NAME, db);
    const data = col.insert(req.file);
    const userUpdate = { noteList: [{ fileId: data.filename, originalFileName: data.originalname }] };

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
        db.saveDatabase(); //ancora non ho deciso che farci
        res.render('account/uploaded', { user: req.user, id: data.$loki, fileName: data.filename, originalName: data.originalname });
      });
  } catch (err) {
    req.flash('error', { msg: 'Server Problems -- Try Later' });
    res.render("/");
  }
});


// per qualcosa del tipo /appunti/:id
/*
const loadFile = async (req, res) => {
  try {
    const col = await loadCollection(COLLECTION_NAME, db);
    const result = col.get(req.params.id);

    if (!result) {
      res.sendStatus(404);
      return;
    };

    res.setHeader('Content-Type', result.mimetype);
    fs.createReadStream(path.join(UPLOAD_PATH, result.filename)).pipe(res);
  } catch (err) {
    res.sendStatus(400);
  }
}
*/
/*
app.get('/list All', async (req, res) => {
    try {
        const col = await loadCollection(COLLECTION_NAME, db);
        res.send(col.data);
    } catch (err) {
        res.sendStatus(400);
    }
})

*/



//Defalut route
app.all('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname + '/public/404.html'));
});

if (app.get('env') === 'production') {
  
} else { //devlopment

  //Clear all files in /uploads
  const clearFiles = function (folderPath) {
    del.sync([`${folderPath}/**`, `!${folderPath}`]);
  };
}

app.listen(app.get('port'), () => {
  log('-- %s App is running at %s:%d in %s mode', ok, info(os.hostname().toString()), app.get('port'), app.get('env'));
  log("-- %s User: %s on platform: %s",           ok, os.userInfo().username, os.platform().toString());
  log('-- %s Press %s to stop\n',                 ok, info('CTRL-C'));
});


module.exports = app;



// modo figo di fare le cose:
// http://blog.robertonodi.me/managing-files-with-node-js-and-mongodb-gridfs/

/** Set Upload Folder **/
//const upload = multer({ dest: path.join(__dirname, '/uploads') });

/*
function setHost() {
  var host =
    process.env.npm_config_host ||
    process.env.OPENSHIFT_SLS_IP ||
    process.env.OPENSHIFT_NODEJS_IP ||
    process.env.HOST ||
    process.env.VCAP_APP_HOST ||
    instructions.config.host ||
    process.env.npm_package_config_host ||
    app.get('host');

  if (host !== undefined) {
    assert(typeof host === 'string', 'app.host must be a string');
    app.set('host', host);
  }
}
*/

// res.sendFile(path.join(__dirname + '/index.html'));

