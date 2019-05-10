
const path = require('path');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser')
const passport = require('passport');
const logging = require('./lib/logging');

const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
  extended: true
}))
// parse application/json
app.use(bodyParser.json())


app.disable('etag');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('trust proxy', true);

// Add the request logger before anything else so that it can
// accurately log requests.
app.use(logging.requestLogger);

// Configure the session and session storage.
const sessionConfig = {
  resave: false,
  saveUninitialized: false,
  secret: "keyboardcat",
  signed: true,
};

app.use(session(sessionConfig));

// OAuth2
app.use(passport.initialize());
app.use(passport.session());
app.use(require('./lib/oauth2').router);

//private
app.use('/private/device', require('./router/private/device'));

// Redirect root to /device
app.get('/', (req, res) => {
  res.redirect('/private/device');
});

// Add the error logger after all middleware and routes so that
// it can log errors from the whole application. Any custom error
// handlers should go after this.
app.use(logging.errorLogger);



// Basic 404 handler
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Basic error handler
app.use((err, req, res) => {
  /* jshint unused:false */
  // If our routes specified a specific response, then send that. Otherwise,
  // send a generic message so as not to leak anything.
  res.status(500).send(err.response || 'Something broke!');
});



if (module === require.main) {
  // Start the server
  const server = app.listen("8080", () => {
    const port = server.address().port;
    console.log(`App listening on port ${port}`);
  });
}

module.exports = app;