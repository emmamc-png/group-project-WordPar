///////////////////////////////////////////////////////////
/////-------------- Import Dependencies --------------/////
///////////////////////////////////////////////////////////

import express from 'express';
import handlebars from 'express-handlebars';
import Handlebars from 'handlebars';
import path from 'path';
import pgp from 'pg-promise';
import bodyParser from 'body-parser';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import fetch from 'node-fetch'; // For AI service communication
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES6 module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const pgpInstance = pgp();

///////////////////////////////////////////////////////////
/////----------------- Connect to DB -----------------/////
///////////////////////////////////////////////////////////

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
    extname: 'hbs',
    layoutsDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials',
  });
  
  // database configuration
  const dbConfig = {
    host: 'db', // the database server
    port: 5432, // the database port
    database: process.env.POSTGRES_DB, // the database name
    user: process.env.POSTGRES_USER, // the user account to connect with
    password: process.env.POSTGRES_PASSWORD, // the password of the user account
  };
  
  const db = pgpInstance(dbConfig);
  
  // test your database
  db.connect()
    .then(obj => {
      console.log('Database connection successful'); // you can view this message in the docker compose logs
      obj.done(); // success, release the connection;
    })
    .catch(error => {
      console.log('ERROR:', error.message || error);
    });

///////////////////////////////////////////////////////////
/////----------------- App Settings -----------------//////
///////////////////////////////////////////////////////////

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

//Sets up the connection to use the style sheet
app.use(express.static(path.join(__dirname, 'resources')));

///////////////////////////////////////////////////////////
/////------------------- API/Routes -----------------//////
///////////////////////////////////////////////////////////

//Render login page
app.get('/login', (req, res) => {
    res.render('pages/login', { bodyClass: 'auth-page' }); //, {bodyClass: 'auth-page'} selects the body style to be used when rendering the page
});

//Render registration page
app.get('/registration', (req, res) => {
    res.render('pages/registration', { bodyClass: 'auth-page' }); //, {bodyClass: 'auth-page'} selects the body style to be used when rendering the page
});

//Handle when users attempt to login`
app.post('/login', async(req,res) => {
  const username=req.body.username;
  const password=req.body.password;

  //Will be added once the database is available to check if username and password are correct
  if(!username || !password || username.length>50) {
        const error=true;
        res.status(400).render('pages/login', { bodyClass: 'auth-page', message: "Please enter a valid username and password.", error});
        return;
  }
  //INSERT QUERY HERE TO GET USER DATA FROM DATABASE
  const query='SELECT * FROM users WHERE username=$1';
  let user;

  //Check if username exists in DB:
  //If username doesn't exist, redirect to register page with error message saying: "Username doesn't exist, please register"
    try {
        // check if username exists in DB
        user=await db.one(query, [username]);
        console.log("User exists: "+user.username);
    }
    catch(err) {
        const error=true;
        console.log(err);
        res.status(400).render('pages/registration', { bodyClass: 'auth-page', message: "Username does not exist. Please register.", error});
        return;
    }
    try {
        // check if password from request matches with password in DB
        const test=bcrypt.hash(user.password,10);
        console.log("Testing password hash: "+ test);
        const match = await bcrypt.compare(req.body.password, user.password);
        if(!match) {
            const error=true;
            console.log("Incorrect password: "+ password);
            res.status(400).render("pages/login", { bodyClass: 'auth-page', message: "Incorrect password. Please try again.", error});
            return;
        }
        console.log(user.password + " : " + match);
        console.log("User logged in");
        //set session user
        req.session.user = user;
        req.session.save();
        console.log("Session user set: "+ req.session.user.username);
        res.status(200).redirect('/');
    }
    catch(err) {
        const error=true;
        console.log(err);
        res.status(500).render("pages/login", { bodyClass: 'auth-page', message: "An error occured. Please try again.", error});
        return;
    }
});

app.post('/registration', async(req,res)=> {
    const username=req.body.username;
    const password=req.body.password;
    const password_retype=req.body.password_retype;
    const email=req.body.email;

    if(!username || !password || !email || !password_retype || username.length>50 || email.length>100) {
        const error=true;
        res.status(400).render('pages/registration', { bodyClass: 'auth-page', message: "Please enter a valid username, password, and email.", error});
        return;
    }

    //Add check to compare the passwords to ensure they're the same
    if(password!=password_retype) {
        const error=true;
        res.status(400).render('pages/registration', { bodyClass: 'auth-page', message: "Passwords do not match.", error});
        return;
    }

    //hash the password
    const hash=await bcrypt.hash(req.body.password,10);
    console.log("Hashed password: "+hash);
    const query='INSERT INTO users(username, password) VALUES($1, $2)';
    const query2='SELECT * FROM users WHERE username=$1';
    try {
        await db.none(query, [username, hash]);
        console.log("User registered");
        res.status(200).redirect('/login');
    }
    catch(err) {
        const error=true;
        //res.status(400).json({ error: 'Username already exists.' });
        res.status(400).render("pages/registration", { bodyClass: 'auth-page', message: "Username already exists.", error});
    }
});

// Authentication Middleware.
const auth = (req, res, next) => {
  console.log("auth has been called!");
  if (!req.session.user) {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};

// Authentication Required
app.use(auth);

//Render home page
app.get('/', async(req, res) => {
    //Query to get leaderboard data
    const query=`SELECT users.username, SUM(game.score) AS score 
                FROM userGame 
                JOIN users ON userGame.user_id=users.userID 
                JOIN game ON userGame.game_id=game.gameID 
                GROUP BY username 
                ORDER BY SUM(score) DESC
                LIMIT 10`;
    //Get current logged in user
    const currentUser=req.session.user.username;
    //Query to get current user data (pts, rank, and username)
    const userQuery=`WITH ranked AS (
                      SELECT username, SUM(game.score) AS score, ROW_NUMBER() OVER (ORDER BY SUM(game.score) DESC) AS position 
                      FROM userGame 
                      JOIN users ON userGame.user_id=users.userID 
                      JOIN game ON userGame.game_id=game.gameID  
                      GROUP BY users.username
                      )
                    SELECT username, score, position
                    FROM ranked
                    WHERE username=$1`;
    //generate arrays to store user and leaderboard data
    let users=[];
    let currentUserData=[];
    //
    try {
      //Attempt to get user information
      currentUserData=await db.one(userQuery, [currentUser]);
    }
    
    catch(err) {
      //If no scores exist, set user score to 0
      currentUserData={username: currentUser, score: 0, position: null};
      console.log('user has no scores yet');
    }
    try {
      users=await db.any(query);
      console.log("Leaderboard data retrieved");
      res.status(200).render('pages/home', { bodyClass: 'home-page', leaderboard:users, currentUser: currentUserData}); //, {bodyClass: 'auth-page'} selects the body style to be used when rendering the page
    }
    catch(err) {
      console.log(err);
      //If error occurs, render page with empty leaderboard
      res.status(500).render('pages/home', { bodyClass: 'home-page', leaderboard: [], currentUser: currentUserData}); //, {bodyClass: 'auth-page'} selects the body style to be used when rendering the page
    }
});

app.get('/game', async(req, res) => {         
  res.status(200).render('pages/game', { bodyClass: 'auth-page'}); //, {bodyClass: 'auth-page'} selects the body style to be used when rendering the page
});

///////////////////////////////////////////////////////////
/////---------- Handlebars Helper Functions ----------/////
///////////////////////////////////////////////////////////


Handlebars.registerHelper('indexPlusOne', function(index) {
  return index+1;
});



///////////////////////////////////////////////////////////
/////--------------- AI Service Routes ---------------/////
///////////////////////////////////////////////////////////

// Example route to test AI communication
app.post("/api/guess", async (req, res) => {
  const { word } = req.body;

  try {
    // Use the Docker service name here
    const response = await fetch("http://ai_service:5000/api/similarity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word1: word, word2: "test" }) // Adjust as needed
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error contacting AI service:", error);
    res.status(500).json({ error: "AI service unreachable" });
  }
});

//Route for logging out user and removing session token
app.post("/logout", (req,res) => {
  try {
    req.session.destroy();
    res.status(200).redirect('/login');
  }
  catch(err) {
    console.log(err);
    res.status(500).redirect('/settings', {message: "An error occurred while logging out. Please try again."});
  };
});

///////////////////////////////////////////////////////////
/////---------- Open Server/Listen to port ----------//////
///////////////////////////////////////////////////////////
// starting the server and keeping the connection open to listen for more requests
const server = app.listen(3000);
export default server;
console.log('Server is listening on port 3000');


///////////////////////////////////////////////////////////
/////---------- Guesses routes ----------//////
///////////////////////////////////////////////////////////

app.post("/api/submitGuess", async (req, res) => {
  let { userInput, gameID } = req.body;
  const user = req.session.user;

  if (!user) return res.status(401).json({ error: "Not logged in" });
  if (!userInput) return res.status(400).json({ error: "No guess" });

  try {
    if (!gameID) {
      const game = await db.one(
        "INSERT INTO game (score, wordid) VALUES (0, NULL) RETURNING gameid"
      );
      gameID = game.gameid;
    }

    let word = await db.oneOrNone(
      "SELECT wordid FROM words WHERE word = $1",
      [userInput.toLowerCase()]
    );

    if (!word) {
      word = await db.one(
        "INSERT INTO words (word, length) VALUES ($1, $2) RETURNING wordid",
        [userInput.toLowerCase(), userInput.length]
      );
    }

    await db.none(
      `INSERT INTO guesses (gameid, userid, wordid, userinput)
       VALUES ($1, $2, $3, $4)`,
      [gameID, user.userid, word.wordid, userInput]
    );

    res.json({ success: true, gameID });
  } catch (err) {
    console.error("Error saving guess:", err);
    res.status(500).json({ error: "Database error" });
  }
});
