///////////////////////////////////////////////////////////
/////-------------- Import Dependencies --------------/////
///////////////////////////////////////////////////////////

import express from "express";
import handlebars from "express-handlebars";
import Handlebars from "handlebars";
import path from "path";
import pgp from "pg-promise";
import bodyParser from "body-parser";
import session from "express-session";
import bcrypt from "bcryptjs";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { generateWord, calculateSimilarity } from "./aiService.js";

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
  extname: "hbs",
  layoutsDir: __dirname + "/views/layouts",
  partialsDir: __dirname + "/views/partials",
});

// database configuration
const dbConfig = {
  host: "db",
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};

const db = pgpInstance(dbConfig);

// test your database
db.connect()
  .then((obj) => {
    console.log("Database connection successful");
    obj.done();
  })
  .catch((error) => {
    console.log("ERROR:", error.message || error);
  });

///////////////////////////////////////////////////////////
/////----------------- App Settings -----------------//////
///////////////////////////////////////////////////////////

// Register `hbs` as our view engine
app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.json());

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

// Sets up the connection to use the style sheet
app.use(express.static(path.join(__dirname, "resources")));

///////////////////////////////////////////////////////////
/////------------------- PUBLIC ROUTES ---------------/////
///////////////////////////////////////////////////////////

// Render login page
app.get("/login", (req, res) => {
  res.render("pages/login", { bodyClass: "auth-page" });
});

// Render registration page
app.get("/registration", (req, res) => {
  res.render("pages/registration", { bodyClass: "auth-page" });
});

// Handle login
app.post("/login", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password || username.length > 50) {
    const error = true;
    res.status(400).render("pages/login", {
      bodyClass: "auth-page",
      message: "Please enter a valid username and password.",
      error,
    });
    return;
  }

  const query = "SELECT * FROM users WHERE username=$1";
  let user;

  try {
    user = await db.one(query, [username]);
    console.log("User exists: " + user.username);
  } catch (err) {
    const error = true;
    console.log(err);
    res.status(400).render("pages/registration", {
      bodyClass: "auth-page",
      message: "Username does not exist. Please register.",
      error,
    });
    return;
  }

  try {
    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) {
      const error = true;
      console.log("Incorrect password: " + password);
      res.status(400).render("pages/login", {
        bodyClass: "auth-page",
        message: "Incorrect password. Please try again.",
        error,
      });
      return;
    }
    console.log("User logged in");
    req.session.user = user;
    req.session.save();
    console.log("Session user set: " + req.session.user.username);
    res.status(200).redirect("/");
  } catch (err) {
    const error = true;
    console.log(err);
    res.status(500).render("pages/login", {
      bodyClass: "auth-page",
      message: "An error occured. Please try again.",
      error,
    });
    return;
  }
});

// Handle registration
app.post("/registration", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const password_retype = req.body.password_retype;
  const email = req.body.email;

  if (!username || !password || !email || !password_retype || username.length > 50 ||email.length > 100) {
    const error = true;
    res.status(400).render("pages/registration", {
      bodyClass: "auth-page",
      message: "Please enter a valid username, password, and email.",
      error,
    });
    return;
  }

  if (password != password_retype) {
    const error = true;
    res.status(400).render("pages/registration", {
      bodyClass: "auth-page",
      message: "Passwords do not match.",
      error,
    });
    return;
  }

    //hash the password
    const hash=await bcrypt.hash(req.body.password,10);
    console.log("Hashed password: "+hash);
    const createUser='INSERT INTO users(username, email, password) VALUES($1, $2, $3)';
    const checkUsername='SELECT * FROM users WHERE username=$1';
    const checkEmail=`SELECT * FROM users WHERE email=$1`;

    let existingUser;
    let existingEmail;

    //Check if username already exists
    try {
      existingUser=await db.none(checkUsername, [username]);
      console.log("Username is available: " +username);
    }
    catch(err) {
      const error=true;
      console.log("Username already exists: " + err);
      res.status(400).render("pages/registration", { bodyClass: 'auth-page', message: "Username already exists", error});
      return;
    }

    //Check if email is already in use
    try {
      existingEmail=await db.none(checkEmail, [email]);
      console.log("Email is available: " +email);
    }
    catch(err) {
      const error=true;
      console.log("Email already in use: " + err);
      res.status(400).render("pages/registration", { bodyClass: 'auth-page', message: "Email already in use", error});
      return;
    }

    //Create new user
    try {
      await db.none(createUser, [username, email, hash]);
        console.log("User registered");
        res.status(200).redirect('/login');
    }
    catch(err) {
        const error=true;
        res.status(400).render("pages/registration", { bodyClass: 'auth-page', message: "Username already exists or email already in use.", error});
    }
});

///////////////////////////////////////////////////////////
/////------------- Authentication Middleware ------------//
///////////////////////////////////////////////////////////

const auth = (req, res, next) => {
  console.log("auth has been called!");
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
};

// Apply authentication to all routes below
app.use(auth);

///////////////////////////////////////////////////////////
/////------------- PROTECTED ROUTES ---------------------//
///////////////////////////////////////////////////////////

// Render home page
app.get("/", async (req, res) => {
  const query = `SELECT users.username, SUM(game.score) AS score 
                FROM userGame 
                JOIN users ON userGame.user_id=users.userID 
                JOIN game ON userGame.game_id=game.gameID 
                GROUP BY username 
                ORDER BY SUM(score) DESC
                LIMIT 10`;
    //Get current logged in user
    const currentUser=req.session.user.username;
    const getUserEmail=`SELECT email FROM users WHERE username=$1`;
    let userEmail;
    try {
      userEmail=await db.one(getUserEmail, [currentUser]);
      console.log("User email retrieved: " + userEmail.email);
    }
    catch (err) {
      console.log("Error retrieving user email: " + err);
      userEmail={email: ''};
    }
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
    try {
      //Attempt to get user information
      currentUserData=await db.one(userQuery, [currentUser]);
    }
    
    catch(err) {
      //If no scores exist, set user score to 0
      currentUserData={username: currentUser, score: 0, position: null, email: userEmail.email};
      console.log('user has no scores yet');
    }
    try {
      users=await db.any(query);
      console.log("Leaderboard data retrieved");
      res.status(200).render('pages/home', { bodyClass: 'home-page', leaderboard:users, currentUser: currentUserData, email: userEmail.email}); //, {bodyClass: 'auth-page'} selects the body style to be used when rendering the page
    }
    catch(err) {
      console.log(err);
      //If error occurs, render page with empty leaderboard
      res.status(500).render('pages/home', { bodyClass: 'home-page', leaderboard: [], currentUser: currentUserData, email: userEmail.email}); //, {bodyClass: 'auth-page'} selects the body style to be used when rendering the page
    }
});

app.get('/game', async(req, res) => {         
  res.status(200).render('pages/game', { bodyClass: 'auth-page'}); //, {bodyClass: 'auth-page'} selects the body style to be used when rendering the page
});

//Initialize new game
app.post('/game', async(req,res) => {
  let userID=req.session.user.userid;
  let category=req.body.category;
  if(!category) {
    category='music';
  }
  let initial_score=100;
  console.log('Category selected: '+category);
  let word=null;
  //Make call to API service to get words based on category
  generateWord(category).then (async (result) => {
    let word=result.word;
    console.log('Word generated from AI service: '+word);
    //Insert word into DB if it does not already exist
    let wordID;
    initial_score=word.length*20; //Set initial score based on word length
    let getWordQuery=`SELECT wordID from words WHERE word=$1`;
    let insertWordQuery=`INSERT INTO words(word, length) VALUES ($1, $2) RETURNING wordID`;
    let startGameQuery=`INSERT INTO game(score,wordID) VALUES ($1, $2) RETURNING gameID`;
    let connectUserToGameQuery=`INSERT INTO userGame(game_id,user_id) VALUES ($1, $2)`;
    try {
      let wordRecord=await db.oneOrNone(getWordQuery, [word]);
      if(wordRecord) {
        wordID=wordRecord.wordid;
        console.log('Word already exists in DB with ID: '+wordID);
      }
      else {
        let insertResult=await db.one(insertWordQuery, [word, word.length]);
        wordID=insertResult.wordid;
        console.log('New word inserted into DB with ID: '+wordID);
      }
      let gameID=await db.one(startGameQuery, [initial_score, wordID]);
      //Provies {"gameid": (number)}
      req.session.gameSession=gameID;
      console.log("GameID is: "+gameID.gameid);
      await db.none(connectUserToGameQuery, [gameID.gameid, userID])
      res.status(200).render('pages/game', { bodyClass: 'auth-page', category: category, initial_score: initial_score, word: word}); //, {bodyClass: 'auth-page'} selects the body style to be used when rendering the page
    }
    catch(err) {
      console.log('Error inserting/retrieving word from DB: '+err);
      //If error occurs, return back to home page
      res.status(500).redirect('/');
    }
  });
});

app.post('/exitGame', async(req, res) => {
  //Delete the connection to the user in userGame to prevent the user from getting points from a game they didn't finish
  let gameID=req.session.gameSession.gameid;
  let userID=req.session.user.userid;

  let deleteGameFromUserQuery=`DELETE FROM userGame WHERE game_id=$1 AND user_id=$2`;

  try {
    await db.none(deleteGameFromUserQuery, [gameID, userID]);
    delete req.session.gameSession;
    console.log("User has succesfully exited game");
    res.status(200).redirect('/');
  }
  //Catch will be altered to send user back to game
  catch(err) {
    const error=true;
    res.status(500).redirect('/');
  }
});

///////////////////////////////////////////////////////////
/////---------- Guesses Routes (from merge) ----------/////
///////////////////////////////////////////////////////////

// Submit guess to database
app.post("/api/submitGuess", async (req, res) => {
  let { userInput, gameID } = req.body;
  const user = req.session.user;

  if (!user) return res.status(401).json({ error: "Not logged in" });
  if (!userInput) return res.status(400).json({ error: "No guess" });

  try {
    // Create new game if no gameID provided
    if (!gameID) {
      const game = await db.one(
        "INSERT INTO game (score, wordid) VALUES (0, NULL) RETURNING gameid"
      );
      gameID = game.gameid;
    }

    // Check if word exists in words table
    let word = await db.oneOrNone("SELECT wordid FROM words WHERE word = $1", [
      userInput.toLowerCase(),
    ]);

    // Insert word if it doesn't exist
    if (!word) {
      word = await db.one(
        "INSERT INTO words (word, length) VALUES ($1, $2) RETURNING wordid",
        [userInput.toLowerCase(), userInput.length]
      );
    }

    // Insert guess into guesses table
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

// Logout
app.post("/logout", (req, res) => {
  try {
    req.session.destroy();
    res.status(200).redirect("/login");
  } catch (err) {
    console.log(err);
    res.status(500).redirect("/settings", {
      message: "An error occurred while logging out. Please try again.",
    });
  }
});

///////////////////////////////////////////////////////////
/////---------- Handlebars Helper Functions ----------/////
///////////////////////////////////////////////////////////

Handlebars.registerHelper("indexPlusOne", function (index) {
  return index + 1;
});

///////////////////////////////////////////////////////////
/////---------- Open Server/Listen to port ----------//////
///////////////////////////////////////////////////////////

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
