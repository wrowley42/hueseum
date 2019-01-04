const bodyParser = require('body-parser');
const child_process = require("child_process");
const colorMod = require('./color/color.js');
const express = require('express');
const fetch = require("node-fetch");
const fileUpload = require('express-fileupload');
const _ = require('lodash');
const paintingMod = require("./color/painting.js")
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const webpack = require('webpack');
const async = require('async');

require('cross-fetch/polyfill');

var crypto = require('crypto');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var session = require('express-session')
const hostname = (process.argv.length === 3) ? process.argv[2] : '0.0.0.0';
const PORT = process.env.PORT || 8080;

// server config
// const hostname = '127.0.0.1';
// const port = 3000;
const API_KEY = '67669ae0-b77e-11e8-bf0e-e9322ccde4db';

// Initialize Express
var app = express();
app.listen(PORT, () => {
    console.log(`Our app is running on port ${ PORT }`);
});
app.use(express.static('assets'));
app.use(require('serve-static')(__dirname + '/../../public'));
app.use(require('cookie-parser')());
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
}));
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(session({ secret: 'collard greens', cookie: { maxAge: 3600000 }}))
app.use(passport.initialize());
app.use(passport.session());
// app.use(require('./middlewares/populateUserData'));

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname,"public")));
app.set('views', path.join(__dirname, '/views'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// global variables
let recentUploads = ['Example1', 'Example2', 'Example3'];
let featuredColors = ['f4ee42', 'f20ea6', 'dd0000', '5350bf']
const CUTOFF = 15;
const SEARCHRESULTSCUT = 60;

// database startup
let db = new sqlite3.Database('./db/huseum.db', sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the Hueseum database.');
});

// hashes password// Cuttoff for Delta E when comparing two colors in hex search
function hashPassword(password, salt) {
  var hash = crypto.createHash('sha256');
  hash.update(password);
  hash.update(salt);
  return hash.digest('hex');
}

passport.use(new LocalStrategy(function(username, password, done) {
  console.log(username)
  console.log(password)
  db.get('SELECT salt FROM users WHERE username = ?', username, function(err, row) {
    if (!row) return done(null, false);
    var hash = hashPassword(password, row.salt);
    db.get('SELECT username, user_id FROM users WHERE username = ? AND password = ?', username, hash, function(err, row) {
      if (!row) return done(null, false);
      return done(null, row);
    });
  });
}));

passport.serializeUser(function(user, done) {
  console.log(user)
  return done(null, user.user_id);
});

passport.deserializeUser(function(req, id, done) {
  console.log(req.session)
  db.get('SELECT user_id, username FROM users WHERE user_id = ?', id, function(err, row) {
    if (!row) return done(null, false);
    return done(null, row);
  })
  });

// Pic nameing functionality. Helper function for saving a user uploaded painting
// onto the server that can be refernced later. Limited to 100 paintings before
// deleting old paintings out
let PICCOUNTER = 0;
function getCount() {
  if (PICCOUNTER > 100) {
    PICCOUNTER = 0;
  }
  PICCOUNTER++;
  return PICCOUNTER;
}

app.post('/login',
  passport.authenticate(
    'local',
{
  // successRedirect: '/good-login',
  failureRedirect: '/bad-login'
}),
function(req, res){
      req.session.save(function(){
          res.redirect('/good-login');
      });
  }
);

app.get('/logout', function (req, res){
  req.session.destroy(function (err) {
    res.redirect('/');
  });
});

// Random string generator taken from https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
function randomize() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 10; i++)
  text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

app.post('/register', (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  let verifypassword =  req.body.verifypassword
  let passwordsalt = randomize()
  if (req.body.password == req.body.verifypassword) {
    if (password = verifypassword) {
      let hashpass = hashPassword(password, passwordsalt);
      console.log(hashpass)
      db.run(`INSERT INTO users (username, password, salt) VALUES(?,?,?)`, [username, hashpass, passwordsalt], function(err) {
        if(err) {
          console.log(err.message);
        }
        else {
          console.log(`A row has been inserted with rowid ${this.lastID}`);
          req.login(username, function(err) {
            if (err) {
              console.log(err);
            }
            passport.authenticate("local")(req, res, function(){
              console.log(req.user)
              res.redirect('/good-login');
            });
          })
        };
      })
    }
  }
  else {
    res.redirect('/')
  }
});

app.get('/good-login', (req, res) => {
  console.log("here")
  console.log(req.user)
  db.get(`SELECT username FROM users WHERE user_id = '${req.user.user_id}'`, function(err, result){
    if (err) {
      return console.log(err.message);
    }
    let username = result.username
    res.render('index.ejs', {username: username, featuredColors: featuredColors, recentColors: req.session.recentColors, recentUploads: recentUploads, username: username})
  })
  res.redirect('/')
});

// TODO FIX REFRESH
app.get('/', (req, res) => {
    if(req.user) {
        var recentColors = [];
        if (req.session.recentColors == undefined) {
            console.log("clearing")
            req.session.recentColors = recentColors;
        }
        console.log(req.user.user_id)
        console.log("maybexciting")
        let favoritePaintingQuery = (`SELECT * FROM userpaintings WHERE user_id = ?`);
        db.all(favoritePaintingQuery, (req.user.user_id), (err, rows) => {
            if (err) {
                throw err;
            };
            if (rows.length > 0) {
                userLibrary = [];
                async.waterfall([
                  function(callback) {
                    // do some stuff ...
                    callback(null, userLibrary);
                  },
                  function(userLibrary, callback) {
                    let realPaintingQuery = (`SELECT painting_id, title, image_url FROM paintings WHERE painting_id = ?`);

                    rows.forEach(function(row, idx) {
                      db.get(realPaintingQuery, row.painting_id, (err, row) => {
                        favoritecontent = ({paintingid : row.painting_id, paintingtitle : row.title, imageurl : row.image_url});
                        userLibrary.indexOf(favoritecontent) === -1 ? userLibrary.push(favoritecontent) : console.log("This item already exists");
                        // userLibrary.push({paintingid : row.painting_id, paintingtitle : row.title, imageurl : row.image_url});

                        console.log(userLibrary)
                        if(idx === rows.length - 1) {
                          console.log("got here")
                          callback(null, userLibrary);
                        }
                      })
                      // console.log(userLibrary)
                    })
                  },
                  function(userLibrary, callback) {
                    console.log("1")
                    console.log(userLibrary)
                    res.render('index.ejs', {userLibrary: userLibrary, featuredColors: featuredColors, recentColors: req.session.recentColors, recentUploads: recentUploads, username: req.user.username})
                    callback(null);
                  }
                ],
                // optional callback
                function(err, results) {
                  if (err) {return console.log('Something is wrong!');}
                  return console.log('Done!');
                });
            } else {
                let userLibrary = [];
                res.render('index.ejs', {userLibrary: userLibrary, featuredColors: featuredColors, recentColors: req.session.recentColors, recentUploads: recentUploads, username: req.user.username})
            };
    });
    } else {
      let userLibrary = [];
      res.render('index.ejs', {userLibrary: userLibrary, featuredColors: featuredColors, recentColors: req.session.recentColors, recentUploads: recentUploads, username: undefined});
    }
});



app.get('/good-login', (req, res) => {
  console.log("here")
  console.log(req.user)
  db.get(`SELECT username FROM users WHERE user_id = '${req.user.user_id}'`, function(err, result){
    if (err) {
      return console.log(err.message);
    }
    let username = result.username
    res.render('index.ejs', {username: username, featuredColors: featuredColors, recentColors: req.session.recentColors, recentUploads: recentUploads, username: username})
  })
  res.redirect('/')
});

app.get('/bad-login', (req, res) => {
    res.redirect('/')
});

app.get('/search/hex/', (req, res) => {
    res.redirect('/')
});

app.get('/search/keyword/', (req, res) => {
    res.redirect('/')
});

app.get('/search/hex/:hex_code', (req, res) => {
  let locationPlaceArray = []
  let searchResults = [];
  let dict = {};
  let validRows = [];
  // object for the color we are comparing everything against
  if (req.params.hex_code.length === 6) {
    let c = new colorMod.Color(req.params.hex_code);
    // queries AND sorts the data from the database
    console.log(req.session)
    let searchQueryHex = ("SELECT title, image_url, creation_place, paintings.painting_id,"+
    " colors.hex_code, colors.hex_code_percent " +
    "FROM paintings INNER JOIN colors " +
    " ON paintings.painting_id=colors.painting_id " +
    "ORDER BY hex_code_percent desc");
    if (req.user){
      req.session.recentColors.indexOf(req.params.hex_code) === -1 ? req.session.recentColors.push(req.params.hex_code) : console.log("This item already exists");
    }
    db.all(searchQueryHex, (err, rows) => {
      if (err) {
        throw err;
      }
      rows.forEach((row) => {
        // if its a valid row than add it to the dict
        // do a dict
        if(c.difference("#" + row.hex_code) < CUTOFF){
          // push to search results array
          locationPlaceArray.indexOf(row.creation_place) === -1 ? locationPlaceArray.push(row.creation_place) : console.log("This item already exists");
          dict[row.painting_id] = {
            title     : row.title,
            image_url : row.image_url,
            painting_id  : row.painting_id
          }
        }
      });
      // converts the dict into an array for rendering
      for (var key in dict) {
        let row = dict[key];
        searchResults.push({
          title     : row.title,
          image_url : row.image_url,
          painting_id  : row.painting_id,
          creation_place : row.creation_place
        });
      }
      if (req.user){
        searchResults.splice(SEARCHRESULTSCUT)
        res.render('search-results.ejs', {locationPlaceArray: locationPlaceArray, searchResults: searchResults, featuredColors: featuredColors, recentColors: req.session.recentColors, key: req.params.hex_code, hexkey: req.params.hex_code, featuredColors: featuredColors, recentUploads: recentUploads, username: req.user.username, thresholdkey: undefined, textkey: undefined});
      }
      else{
        searchResults.splice(SEARCHRESULTSCUT)
        res.render('search-results.ejs', {locationPlaceArray: locationPlaceArray, searchResults: searchResults, featuredColors: featuredColors, recentColors: undefined, key: req.params.hex_code, hexkey: req.params.hex_code, featuredColors: featuredColors, recentUploads: recentUploads, username: undefined, thresholdkey: undefined, textkey: undefined});
      }
    });
  }
  else {
    res.redirect('/')
  }
});

// TODO FILTER LOCATION
app.get('/search/hex/:hex_code/filter/:location', (req, res) => {
  let locationPlaceArray = []
  let searchResults = [];
  let validRows = [];
  let dict = {};
  // object for the color are comparing everything against
  let c = new colorMod.Color(req.params.hex_code);
  // queries and sorts the data from the database
  let searchQueryHex = ("SELECT title, image_url, creation_place, paintings.painting_id,"+
  " colors.hex_code, colors.hex_code_percent " +
  "FROM paintings INNER JOIN colors " +
  " ON paintings.painting_id=colors.painting_id " +
  "ORDER BY hex_code_percent desc");
  // filters out invalid rows from the DB then adds them to the list
  db.all(searchQueryHex, (err, rows) => {
    if (err) {
      throw err;
    }
    rows.forEach((row) => {
      // if its a valid row then do the thang
      if(row.creation_place){
        console.log(locationPlaceArray)
        if(c.difference("#" + row.hex_code) < CUTOFF){
          // push to search results array
          // locationPlaceArray.indexOf(row.creation_place) === -1 ? locationPlaceArray.push(row.creation_place) : console.log("This item already exists");
          dict[row.painting_id] = {
            title     : row.title,
            image_url : row.image_url,
            painting_id  : row.painting_id,
            creation_place : row.creation_place
          }
        }
      }
    });
    function filterbyLocation(location) {
      // if the location = creation place then dope. pass it as true.
      location_input = req.params.location
      console.log(location)
      return location.creation_place == location_input;
    }
    for (var key in dict) {
      let row = dict[key];
      searchResults.push({
        title     : row.title,
        image_url : row.image_url,
        painting_id  : row.painting_id,
        creation_place : row.creation_place
      });
    }
    // console.log(searchResults)
    let filteredResults = searchResults.filter(filterbyLocation)
    if (req.user){
      searchResults.splice(SEARCHRESULTSCUT)
      res.render('search-results.ejs', {locationPlaceArray: locationPlaceArray, searchResults: filteredResults, featuredColors: featuredColors, recentColors: req.user.recentColors, key: req.params.hex_code, hexkey: req.params.hex_code, featuredColors: featuredColors, recentUploads: recentUploads, username: req.user.username, thresholdkey: undefined, textkey: undefined});
    }
    else {
      searchResults.splice(SEARCHRESULTSCUT)
      res.render('search-results.ejs', {locationPlaceArray: locationPlaceArray, searchResults: filteredResults, featuredColors: featuredColors, recentColors: undefined, key: req.params.hex_code, hexkey: req.params.hex_code, featuredColors: featuredColors, recentUploads: recentUploads, username: undefined, thresholdkey: undefined, textkey: undefined});
    }
  });
});

app.post('/hexcodeSearch', (req, res) => {
  let hexcodeValue = req.body.hexcode;
  res.redirect('/search/hex/' + hexcodeValue)
});

app.post('/keywordSearch', (req, res) => {
  let keywordValue = req.body.keyword;
  res.redirect('/search/keyword/' + keywordValue)
});

app.post('/uploadSearch', (req, res) => {
  if (req.files.upload){
    let userUpload = req.files.upload;
    let num = getCount();
    userUpload.mv(__dirname + '/user-uploads/' + num + '.jpg', function(err) {
      if (err) {
        return res.status(500).send(err);

      }
      console.log('IMAGE UPLOADED')
      res.redirect('/search/upload/' + num + '/' + req.files.upload.name);
    });
  }
  else {
    res.redirect('/')
  }
});

app.post('/hexcodeFilterSearch', (req, res) => {
  console.log("FILTERING")
  if (req.body.threshold){
    let hexcodeValue = req.body.hexcode;
    let thresholdValue = req.body.threshold;
    let filterValue = req.body.filter;
    if(filterValue) {
      return res.redirect('/search/hex/' + hexcodeValue + '/' + thresholdValue + '/filter/' + filterValue)
    } else {
      return res.redirect('/search/hex/' + hexcodeValue + '/' + thresholdValue)
    }
  }
  else if (req.body.hexcode && !req.body.threshold){
    console.log("recognized")
    let hexcodeValue = req.body.hexcode;
    let filterValue = req.body.filter;
    res.redirect('/search/hex/' + hexcodeValue + '/filter/' + filterValue)
  }
  else if (req.body.textkey){
    let textkeyValue = req.body.textkey;
    let filterValue = req.body.filter;
    res.redirect('/search/keyword/' + textkeyValue + '/filter/' + filterValue)
  }
  else{
    res.redirect('/')
  }
});

// Allows for optional parameter where you can adjust the cutoff value for delta e
app.get('/search/hex/:hex_code/:cutoff', (req, res) => {
  let locationPlaceArray = []
  let searchResults = [];
  let dict = {};
  let validRows = [];
  if (req.params.hex_code.length === 6) {
    // object for the color we are comparing everything against
    let c = new colorMod.Color(req.params.hex_code);
    // queries AND sorts the data from the database
    let searchQueryHex = ("SELECT title, image_url, creation_place, paintings.painting_id,"+
    " colors.hex_code, colors.hex_code_percent " +
    "FROM paintings INNER JOIN colors " +
    " ON paintings.painting_id=colors.painting_id " +
    "ORDER BY hex_code_percent desc");
    if (req.user){
        recentColors.indexOf(req.params.hex_code) === -1 ? recentColors.push(req.params.hex_code) : console.log("This item already exists");
    }
    db.all(searchQueryHex, (err, rows) => {
      if (err) {
        throw err;
      }
      rows.forEach((row) => {
        // if its a valid row than add it to the dict
        // do a dict
        if(c.difference("#" + row.hex_code) < req.params.cutoff){
          // push to search results array
          locationPlaceArray.indexOf(row.creation_place) === -1 ? locationPlaceArray.push(row.creation_place) : console.log("This item already exists");
          dict[row.painting_id] = {
            title     : row.title,
            image_url : row.image_url,
            painting_id  : row.painting_id
          }
        }
      });
      // converts the dict into an array for rendering
      for (var key in dict) {
        let row = dict[key];
        searchResults.push({
          title     : row.title,
          image_url : row.image_url,
          painting_id  : row.painting_id,
          creation_place : row.creation_place
        });
      }
      if (req.user){
        searchResults.splice(SEARCHRESULTSCUT)
        res.render('search-results.ejs', {locationPlaceArray: locationPlaceArray, searchResults: searchResults, featuredColors: featuredColors, recentColors: req.session.recentColors, key: req.params.hex_code, hexkey: req.params.hex_code, featuredColors: featuredColors, recentUploads: recentUploads, username: req.user.username, thresholdkey: req.params.cutoff, textkey: undefined});
      }
      else{
        searchResults.splice(SEARCHRESULTSCUT)
        res.render('search-results.ejs', {locationPlaceArray: locationPlaceArray, searchResults: searchResults, featuredColors: featuredColors, recentColors: undefined, key: req.params.hex_code, hexkey: req.params.hex_code, featuredColors: featuredColors, recentUploads: recentUploads, username: undefined, thresholdkey: req.params.cutoff, textkey: undefined});
      }
    });
  }
  else {
    res.redirect('/')
  }
});

app.get('/search/hex/:hex_code/:cutoff/filter/:location', (req, res) => {
  let searchResults = [];
  let locationPlaceArray = [];
  let dict = {};
  let validRows = [];
  // object for the color we are comparing everything against
  let c = new colorMod.Color(req.params.hex_code);
  // queries AND sorts the data from the database
  let searchQueryHex = ("SELECT title, image_url, creation_place, paintings.painting_id,"+
  " colors.hex_code, colors.hex_code_percent " +
  "FROM paintings INNER JOIN colors " +
  " ON paintings.painting_id=colors.painting_id " +
  "ORDER BY hex_code_percent desc");
  db.all(searchQueryHex, (err, rows) => {
    if (err) {
      throw err;
    }
    rows.forEach((row) => {
      // if its a valid row than add it to the dict
      // do a dict
      if(c.difference("#" + row.hex_code) < req.params.cutoff){
        // push to search results array
        locationPlaceArray.indexOf(row.creation_place) === -1 ? locationPlaceArray.push(row.creation_place) : console.log("This item already exists");
        dict[row.painting_id] = {
          title     : row.title,
          image_url : row.image_url,
          painting_id  : row.painting_id,
          creation_place : row.creation_place
        }
      }
    });
    function filterbyLocation(location) {
      // if the location = creation place then dope. pass it as true.
      location_input = req.params.location
      console.log(location)
      return location.creation_place == location_input;
    }
    for (var key in dict) {
      let row = dict[key];
      searchResults.push({
        title     : row.title,
        image_url : row.image_url,
        painting_id  : row.painting_id,
        creation_place : row.creation_place
      });
    }
    // console.log(searchResults)
    let filteredResults = searchResults.filter(filterbyLocation)
    if (req.user) {
      searchResults.splice(SEARCHRESULTSCUT)
      res.render('search-results.ejs', {locationPlaceArray: locationPlaceArray, searchResults: filteredResults, featuredColors: featuredColors, recentColors: req.session.recentColors, key: req.params.hex_code, hexkey: req.params.hex_code, featuredColors: featuredColors, recentUploads: recentUploads, username: req.user.username, thresholdkey: req.params.cutoff, textkey: undefined});
    }
    else{
      searchResults.splice(SEARCHRESULTSCUT)
      res.render('search-results.ejs', {locationPlaceArray: locationPlaceArray, searchResults: filteredResults, featuredColors: featuredColors, recentColors: undefined, key: req.params.hex_code, hexkey: req.params.hex_code, featuredColors: featuredColors, recentUploads: recentUploads, username: undefined, thresholdkey: req.params.cutoff, textkey: undefined});
    }
  });
});

app.get('/search/keyword/:keyword', (req, res) => {
  let locationPlaceArray = []
  let searchResults = [];
  // TODO ADD ARTIST ONCE TEDDY ADDS ARTIST FIELD
  //
  let searchQueryHex = (`SELECT * FROM paintings WHERE title LIKE ? `);
  db.all(searchQueryHex, '%'+ req.params.keyword + '%', (err, rows) => {
    if (err) {
      throw err;
    }
    rows.forEach((row) => {
      locationPlaceArray.indexOf(row.creation_place) === -1 ? locationPlaceArray.push(row.creation_place) : console.log("This item already exists");
      searchResults.push({
        title     : row.title,
        image_url : row.image_url,
        painting_id  : row.painting_id,
        creation_place : row.creation_place
      });
    });
    console.log(searchResults)
    if (req.user) {
      searchResults.splice(SEARCHRESULTSCUT)
      res.render('search-results.ejs', {locationPlaceArray: locationPlaceArray, searchResults: searchResults, featuredColors: featuredColors, recentColors: req.session.recentColors, key: req.params.keyword, hexkey: undefined, featuredColors: featuredColors, recentUploads: recentUploads, username: req.user.username, thresholdkey: undefined, textkey: req.params.keyword});
    }
    else {
      searchResults.splice(SEARCHRESULTSCUT)
      res.render('search-results.ejs', {locationPlaceArray: locationPlaceArray, searchResults: searchResults, featuredColors: featuredColors, recentColors: undefined, key: req.params.keyword, hexkey: undefined, featuredColors: featuredColors, recentUploads: recentUploads, username: undefined, thresholdkey: undefined, textkey: req.params.keyword});
    }
  });
});


app.get('/search/keyword/:keyword/filter/:location', (req, res) => {
  let searchResults = [];
  let dict = {};
  // TODO ADD ARTIST ONCE TEDDY ADDS ARTIST FIELD
  let searchQueryHex = (`SELECT * FROM paintings WHERE title LIKE ? `);
  db.all(searchQueryHex, '%'+ req.params.keyword + '%', (err, rows) => {
    if (err) {
      throw err;
    }
    rows.forEach((row) => {
      dict[row.painting_id] = {
        title     : row.title,
        image_url : row.image_url,
        painting_id  : row.painting_id,
        creation_place : row.creation_place
      }
    });
    function filterbyLocation(location) {
      // if the location = creation place then dope. pass it as true.
      location_input = req.params.location
      console.log(location)
      return location.creation_place == location_input;
    }
    for (var key in dict) {
      let row = dict[key];
      searchResults.push({
        title     : row.title,
        image_url : row.image_url,
        painting_id  : row.painting_id,
        creation_place : row.creation_place
      });
    }
    // console.log(searchResults)
    let filteredResults = searchResults.filter(filterbyLocation)
    if (req.user){
      searchResults.splice(SEARCHRESULTSCUT)
      res.render('search-results.ejs', {locationPlaceArray: locationPlaceArray, searchResults: filteredResults, featuredColors: featuredColors, recentColors: req.session.recentColors, key: req.params.keyword, hexkey: undefined, featuredColors: featuredColors, recentUploads: recentUploads, username: req.user.username, thresholdkey: undefined, textkey: req.params.keyword});
    }
    else{
      searchResults.splice(SEARCHRESULTSCUT)
      res.render('search-results.ejs', {locationPlaceArray: locationPlaceArray, searchResults: filteredResults, featuredColors: featuredColors, recentColors: undefined, key: req.params.keyword, hexkey: undefined, featuredColors: featuredColors, recentUploads: recentUploads, username: undefined, thresholdkey: undefined, textkey: req.params.keyword});
    }
  });
});

app.get('/search/upload/:upload/:name', (req, res) => {
  let searchResults = [];
  let locationPlaceArray = [];
  let reconstructedData = [];
  if (req.params.name){
    // executes color-data.php on the picture
    const child = child_process.exec("php color-service/color-data.php " + req.params.upload, (error, stdout, stderr) => {
      // console.log(child)

      // try catch block to handle color-data failing. Only fails in cases of
      // wrong file sizes and types
      if(stdout) {
        try {
          // color data for the user inputed painting
          p = new paintingMod.Painting(JSON.parse(stdout).colors);
          // query to reconstruct the painting d  -----g-vata from the database
          let searchQueryReconstruct = ("SELECT title, image_url, paintings.painting_id,"+
          " colors.hex_code, colors.hex_code_percent " +
          "FROM paintings INNER JOIN colors " +
          " ON paintings.painting_id=colors.painting_id " +
          "ORDER BY paintings.painting_id asc");
          // executes the query to reconstruct all of the paintings
          db.all(searchQueryReconstruct, (err, rows) => {
            let current_painting = -1;
            let i = -1;
            if (err) {
              console.log('RECONSTRUCT ERROR !!!!')
              throw err;
            }
            //
            rows.forEach((row) => {
              // if its a color from the same painting
              if(row.painting_id == current_painting){
                // push to reconstructed paintings
                reconstructedData[i].data.push({
                  percent : row.hex_code_percent,
                  color : ("#" + row.hex_code),
                })
                console.log('RECONSTRUCTED DATA !!!!!!!')
                // go to the next painting
              } else {
                current_painting = row.painting_id;
                i++;
                reconstructedData[i] = {
                  id: row.painting_id,
                  data: [{
                    percent : row.hex_code_percent,
                    color : ("#" + row.hex_code)

                  }]
                }
              }
            });
            // compare all paintings to the users input
            compareResults = [];
            for (let j = 0; j < reconstructedData.length; j++) {
              let value = p.wholePaintingCompare(reconstructedData[j].data);
              if(compareResults[value.total]) {
                compareResults[value.total].push({id : reconstructedData[j].id, percent: value.percent})
              } else {
                compareResults[value.total] = [{id : reconstructedData[j].id, percent: value.percent}]

              }
            }
            // Sort this array within the individual values
            for (let k = 0; k < compareResults.length; k++) {
              if (compareResults[k]){
                compareResults[k].sort(function(a,b) {
                  return b.percent - a.percent;
                })
              }
            }
            // Get top 30 results
            let topIDs = [];
            let results = 0;
            for (let val = compareResults.length - 1; val > 0; val--) {
              if (compareResults[val]){
                for (valindex = 0; valindex < compareResults[val].length; valindex++) {
                  if(results >= 30){
                    break;
                  }
                  topIDs.push(compareResults[val][valindex].id);
                  results++;

                }
              }
            }
            // Query database for top 10 results
            let query = "SELECT title, image_url, painting_id FROM " +
            "paintings WHERE painting_id in ("
            for (const id of topIDs) {
              query += id.toString() + ",";
            }
            query = query.substring(0, query.length - 1) + ")";
            db.all(query, (err, rows) => {
              if (err) {
                console.log('substring')
                throw err;
              }
              rows.forEach((row) => {
                searchResults.push({
                  title     : row.title,
                  image_url : row.image_url,
                  painting_id  : row.painting_id
                });
              });
              // sorts the rows in order of the Database results
              let finalResults = [];
              for (let b = 0; b < topIDs.length; b++) {
                let item = searchResults.find(function(ele) {
                  return ele.painting_id == topIDs[b];
                })
                finalResults.push(item);
              }
              if (req.user){
                searchResults.splice(SEARCHRESULTSCUT)
                  res.render('search-results.ejs', {locationPlaceArray: locationPlaceArray, searchResults: finalResults, featuredColors: featuredColors, recentColors: req.session.recentColors, key: req.params.name, hexkey: undefined, featuredColors: featuredColors, recentUploads: recentUploads, username: req.user.username, thresholdkey: undefined, textkey: undefined})
              }
              else{
                searchResults.splice(SEARCHRESULTSCUT)
                  res.render('search-results.ejs', {locationPlaceArray: locationPlaceArray, searchResults: finalResults, featuredColors: featuredColors, recentColors: undefined, key: req.params.name, hexkey: undefined, featuredColors: featuredColors, recentUploads: recentUploads, username: undefined, thresholdkey: undefined, textkey: undefined})
              }
            });
          });
          // catches an error when calling the php
        } catch(e) {
          console.log(e);
          res.redirect("/");
        }
      } else {
        console.log(stderr)
        console.log('NOT STDOUT!');
        res.redirect("/");
      }
    });
  }
  else {
    res.redirect("/");
  }
});

app.get('/painting/:painting_id', (req, res) => {
  let searchQueryPainting = (`SELECT * FROM paintings WHERE painting_id = ?`);
  let paintingInfo = [];
  db.get(searchQueryPainting, [req.params.painting_id], (err, row) => {
    if (err) {
      throw err;
    }
    paintingInfo.push({
      title     : row.title,
      artist    : row.artist,
      year      : row.year,
      image_url : row.image_url,
      accession : row.accession,
      provenance: row.provenance,
      creation_place : row.creation_place,
      image_url : row.image_url,
      object_id : row.object_id,
      painting_id : row.painting_id
    })
    if (req.user){
      res.render('artwork.ejs', {featuredColors: featuredColors, paintingInfo: paintingInfo, title: row.title, recentColors: req.session.recentColors, recentUploads: recentUploads, username: req.user.username});
    }
    else{
      res.render('artwork.ejs', {featuredColors: featuredColors, paintingInfo: paintingInfo, title: row.title, recentColors: undefined, recentUploads: recentUploads, username: undefined});
    }
  });
});

app.get('/painting/:painting_id/favorite', (req, res) => {
  let paintingid = req.params.painting_id;

  db.run(`INSERT INTO userpaintings(user_id, painting_id) VALUES(?,?)`, [req.user.user_id, paintingid], function(err) {
    if (err) {
      console.log(err.message);
      return callback(err);
    }
  });
  res.redirect('/')
});
