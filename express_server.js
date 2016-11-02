// require('dotenv').config();

"use strict"

const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080; // default port 8080
const bodyParser = require("body-parser");
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const cookieSession = require('cookie-session');

app.set('trust proxy', 1);
app.set("view engine", "ejs");

//app.use tells the program to route through the callbacks.
//without bodyParser we would not be able to use req.body....its a function that takes in req & response produces
//a nice object that we can then work with.
app.use(bodyParser.urlencoded({extended: false}));
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2']
}));
app.use(userMiddleware);
//allows use of Static assets located in ./public/ folder
app.use(express.static('public'));

//Everytime you're new on the browser new cookies are set because this is set in the middleware it will be available anywhere
//in the application.

//function that generates a new shortUrl
function generateRandomString() {
  console.log('generating');
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < 6; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

//hardcoded shortened urls to pull data from in urls_index.ejs
var urlDatabase = {
  // "b2xVn2": "http://www.lighthouselabs.ca",
  // "9sm5xK": "http://www.google.com"
};

var users = {
  'foob': {
    id: 'foob',
    email: 'hello@world.com',
    password: 'qwerty'
  }
};

/*
 * when a request comes in
 * We look up user id in session, and assign it to the object from our database
 * We also assign it to `locals` variable, making it available in the template directly, no need for template_vars
 * all middleware runs FIRST. This middleware runs with each request. By having this function it helps program flow
 * by potentially bypassing certain routes that may run.
 */
function userMiddleware(req, res, next) {
  const user_id = req.session.user_id;
  if (user_id) {
    req.user = users[user_id];
    res.locals.user = req.user; //locals makes the variable available in templates
  }
  //if there was a corresponding user object make it true if there wasn't anything or undefined make it false.
  req.isAuthenticated = !!req.user;
  res.locals.isAuthenticated = req.isAuthenticated;

  next();
}

//redirects to /urls
app.get("/", (req, res) => {
  res.redirect("/urls");
});

//this page shows all the urls and their shortened forms this is where urls_index is rendered
app.get("/urls", (req, res) => {
  //array filling with url keys
  let usersUrls = [];
  //check every single key and if it belongs to user that is currently logged in it will add to new array
  //that is how the user is only able to see the urls that they shortened.
  for (var key in urlDatabase) {
    if (urlDatabase[key]['userId'] === req.session.user_id) {
      usersUrls[key] = urlDatabase[key];
    }
  }
  let templateVars = {urls: usersUrls};
  res.render("urls_index", templateVars);
});

//this is going to POST your shortened URL to urls
app.post("/urls", (req, res) => {
  let shortUrl = generateRandomString();
  urlDatabase[shortUrl] = {longUrl: req.body.longURL, userId: req.session.user_id};
  res.redirect('/urls');
});
/* #### URLS */
//this deletes short url
app.delete('/urls/:id', (req, res) => {
  if (req.session.user_id === urlDatabase[req.params.id]['userId']) {
    delete urlDatabase[req.params.id];
    res.redirect('/urls');
  } else {
    res.status(400).send('Bad Request');
  }
});

//renders urls/new page
app.get("/new", (req, res) => {
  res.render("urls_new", {username: req.cookies["username"]});
});

//this is for the edit page (urls/show) if owner of shortened url is not logged in they cannot access the shortened url
app.get("/urls/:id", (req, res) => {
  let input = req.params.id;
  if (req.session.user_id === urlDatabase[input]['userId']) {
    let templateVars = {shortURL: input, longURL: urlDatabase[input]['longUrl'], username: req.cookies["username"]};
    res.render("urls_show", templateVars);
  } else {
    res.status(404).send('Bad Request');
  }
});

//edits the short url.
app.put("/urls/:id", (req, res) => {
  urlDatabase[req.params.id].longUrl = req.body.longURL; //************
  res.redirect("/urls")
});

/* #### U - short URLs */
//this is so when you type /u/unique shortened url...it will take you to the webpage the shortened url is pointing to
app.get("/u/:id", (req, res) => {
  let longUrl = req.params.id;
  res.redirect(urlDatabase[longUrl]['longUrl']);
});

//renders the registration page where user can register a name and password.
app.get("/register", (req, res) => {
  res.render('url_register');
});

//posts username and password and generates random id for username hashes the password
app.post("/register", (req, res) => {
  console.log('/register');
  const id = generateRandomString();
  let email = req.body.email;
  const hashed_password = bcrypt.hashSync(req.body.password, 10);

  //if email is already registered **** if email or password fields are empty ***** otherwise register user and redirect.
  if (email === users.email) {
    res.status(400).send('Email already exists');
  } else if (req.body.email.length === 0 || req.body.password.length === 0) {
    res.status(400).send('Bad Request');
  } else {
    users[id] = {id, email, hashed_password};
    req.session.user_id = id;
    res.redirect('/new');
  }
});

//if the user is NOT authenticated render the login page.
app.get("/login", (req, res) => {
  if (!req.isAuthenticated) {
    res.render('login');
  }
  //otherwise redirect to the home page.
  else {
    res.redirect('/');
  }
});

//posts login information grabs email and password from the request body.
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  // check that it matches the database
  // const user = users.find(user => user.email === email && user.password === password)

  const user = getUserByEmail(email);
  if (!user) {
    return res.status(403).send("Invalid username");
  }

  //if the password matches the hashed password create a session for the user otherwise send error.
  let passwordCheck = bcrypt.compareSync(password, user.hashed_password);
  if (passwordCheck) {
    req.session.user_id = user.id;
    res.redirect("/");
  } else {
    return res.status(403).send("Invalid password");
  }
});

//clears session after logout button is pushed.
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect('/');
});

//port where to find your application.
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

//we manually go over each user in the database and return the one where email matches.
/*
 * @return Object|null
 */
const getUserByEmail = (email) => {
  for (let id in users) {
    let user = users[id];
    if (user.email === email) {
      return user;
    }
  }
}
