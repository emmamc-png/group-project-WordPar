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

const hbs = handlebars.create({
  extname: "hbs",
  layoutsDir: __dirname + "/views/layouts",
  partialsDir: __dirname + "/views/partials",
});

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};

const db = pgpInstance(dbConfig);

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

app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.json());

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

app.use(express.static(path.join(__dirname, "resources")));

///////////////////////////////////////////////////////////
/////------------------- PUBLIC ROUTES ---------------/////
///////////////////////////////////////////////////////////

app.get("/login", (req, res) => {
  res.render("pages/login", { bodyClass: "auth-page" });
});

app.get("/registration", (req, res) => {
  res.render("pages/registration", { bodyClass: "auth-page" });
});

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

  //Make the username non-case sensitive for logging in
  const ncsUsername=username.toLowerCase();
  const query = "SELECT * FROM users WHERE ncsUsername=$1";
  let user;

  try {
    user = await db.one(query, [ncsUsername]);
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

app.post("/registration", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const password_retype = req.body.password_retype;
  let email = req.body.email;
  email=email.toLowerCase();

  const ncsUsername=username.toLowerCase();
  if (
    !username ||
    !password ||
    !email ||
    !password_retype ||
    username.length > 50 ||
    email.length > 100
  ) {
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

  const hash = await bcrypt.hash(req.body.password, 10);
  console.log("Hashed password: " + hash);
  const createUser =
    "INSERT INTO users(username, ncsUsername, email, password) VALUES($1, $2, $3, $4)";
  const checkUsername = "SELECT * FROM users WHERE ncsUsername=$1";
  const checkEmail = `SELECT * FROM users WHERE email=$1`;

  let existingUser;
  let existingEmail;

  try {
    existingUser = await db.none(checkUsername, [ncsUsername]);
    console.log("Username is available: " + username);
  } catch (err) {
    const error = true;
    console.log("Username already exists: " + err);
    res.status(400).render("pages/registration", {
      bodyClass: "auth-page",
      message: "Username already exists",
      error,
    });
    return;
  }

  try {
    existingEmail = await db.none(checkEmail, [email]);
    console.log("Email is available: " + email);
  } catch (err) {
    const error = true;
    console.log("Email already in use: " + err);
    res.status(400).render("pages/registration", {
      bodyClass: "auth-page",
      message: "Email already in use",
      error,
    });
    return;
  }

  try {
    await db.none(createUser, [username, ncsUsername, email, hash]);
    console.log("User registered");
    res.status(200).redirect("/login");
  } 
  catch (err) {
    const error = true;
    res.status(400).render("pages/registration", {
      bodyClass: "auth-page",
      message: "Username already exists or email already in use.",
      error,
    });
  }
});

///////////////////////////////////////////////////////////
/////--------------- AI SERVICE ROUTES ---------------/////
///////////////////////////////////////////////////////////
// CRITICAL: These MUST be BEFORE auth middleware!

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "AI service integrated",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/generate_word", async (req, res) => {
  console.log(
    "🎯 Generate word endpoint called! Category:",
    req.query.category
  );
  const category = req.query.category;

  if (!category) {
    return res.status(400).json({ error: "category query parameter required" });
  }

  try {
    const result = await generateWord(category);
    console.log("✅ Word generated successfully:", result);
    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Generate word error:", error);
    res.status(500).json({
      error: "Failed to generate word",
      details: error.message,
    });
  }
});

app.post("/api/similarity", async (req, res) => {
  const { word1, word2 } = req.body;

  if (!word1 || !word2) {
    return res.status(400).json({
      error: "Both word1 and word2 are required in request body",
    });
  }

  try {
    const result = await calculateSimilarity(word1, word2);
    res.status(200).json(result);
  } catch (error) {
    console.error("Similarity calculation error:", error);
    res.status(500).json({
      error: "Failed to calculate similarity",
      details: error.message,
    });
  }
});

///////////////////////////////////////////////////////////
/////------------- Authentication Middleware ------------//
///////////////////////////////////////////////////////////

const auth = (req, res, next) => {
  console.log("auth has been called for:", req.path);
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
};

// Apply authentication to all routes below this line
app.use(auth);

///////////////////////////////////////////////////////////
/////------------- PROTECTED ROUTES ---------------------//
///////////////////////////////////////////////////////////

app.get("/", async (req, res) => {
  const query = `SELECT users.username, SUM(game.score) AS score 
                FROM userGame 
                JOIN users ON userGame.user_id=users.userID 
                JOIN game ON userGame.game_id=game.gameID 
                GROUP BY username 
                ORDER BY SUM(score) DESC
                LIMIT 10`;

  const currentUser = req.session.user.username;
  const currentID=req.session.user.userid;
  const getUserEmail = `SELECT email FROM users WHERE userID=$1`;
  let userEmail;

  try {
    userEmail = await db.one(getUserEmail, [currentID]);
    console.log("User email retrieved: " + userEmail.email);
  } catch (err) {
    console.log("Error retrieving user email: " + err);
    userEmail = { email: "" };
  }

  const userQuery = `WITH ranked AS (
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
  let users = [];
  let currentUserData = [];
  try {
    //Attempt to get user information
    currentUserData = await db.one(userQuery, [currentUser]);
  } catch (err) {
    //If no scores exist, set user score to 0
    currentUserData = {
      username: currentUser,
      score: 0,
      position: null,
      email: userEmail.email,
    };
    console.log("user has no scores yet");
  }
  try {
    users = await db.any(query);
    console.log("Leaderboard data retrieved");
    if (req.session.user.userimage) {
      console.log("Image found!");
    } else {
      console.log("No image found!");
    }
    res
      .status(200)
      .render("pages/home", {
        bodyClass: "home-page",
        leaderboard: users,
        currentUser: currentUserData,
        email: userEmail.email,
        profile: req.session.user.userimage,
      }); //, {bodyClass: 'auth-page'} selects the body style to be used when rendering the page
  } catch (err) {
    console.log(err);
    //If error occurs, render page with empty leaderboard
    res
      .status(500)
      .render("pages/home", {
        bodyClass: "home-page",
        leaderboard: [],
        currentUser: currentUserData,
        email: userEmail.email,
        profile: null,
      }); //, {bodyClass: 'auth-page'} selects the body style to be used when rendering the page
  }
});

app.post("/changeInfo", async(req,res)=> {
  //Get the form data depending on what the user chose to change
  let profilePic=req.body.newPFP || null;
  let currPass=req.body.currentPassword || null;
  let newPass=req.body.newPassword || null;
  let newEmail=req.body.newEmail || null;
  let newUser=req.body.newUsername || null;

  let ncsUser;
  //transform it to lowercase to prevent any repeated use of emails
  if(newEmail) {
    newEmail=newEmail.toLowerCase();
  }
  if(newUser) {
    ncsUser=newUser.toLowerCase();
  }
    //Check to see if username or PFP gotten
  if(profilePic)
 {
    console.log("Recieved: "+req.body.newPFP);
 }
 if (newUser) {
    console.log("Recieved: "+newUser);
    console.log("Current username: " + req.session.user.username);
 }

  //Query to get the user info
  let findUserQuery=`SELECT * FROM users WHERE userID=$1`;
  let findUsername=`SELECT ncsUsername FROM users WHERE ncsUsername=$1`;
  let findEmail=`SELECT email FROM users WHERE email=$1`;
  let user;
  //Queries to change info
  let insertImageQuery=`UPDATE users SET userimage=$1 WHERE userID=$2`;
  let emailQuery=`UPDATE users SET email=$1 WHERE userID=$2`;
  let changePasswordQuery=`UPDATE users SET password=$1 WHERE userID=$2`;
  let usernameChangeQuery=`UPDATE users SET username=$1 WHERE userID=$2`;
  let ncsUsernameChangeQuery=`UPDATE users SET ncsUsername=$1 WHERE userID=$2`;

  //Try to find the user
  try {
    user=await db.one(findUserQuery, [req.session.user.userid]);
    console.log("User found: " + user.username);
  }
  //If no user (which shouldn't happen), return an error message
  catch(err) {
    const error=true;
    console.log(err);
    return res.status(400).json({message: "User not found", error})
  }

  //Try to change the user's information
  try {
    //Check if user chose to change username
    if(newUser) {
      //If new username is their current, return an error message
      if(newUser==req.session.user.username) {
        const error=true;
        return res.status(400).json({error, message: "You cannot change your username to the same as it currently is. Please try again"});
      }
      //If the not the same user just trying to change capitals, check if already in use
      console.log("The ncs username is: "+req.session.user.ncsusername);
      //Check if username is in use
      let checkForUsername=await db.oneOrNone(findUsername, [ncsUser]);
      //If username is in use, return an error message
      if(req.session.user.ncsusername!==ncsUser) {
        if(checkForUsername) {
          const error=true;
          return res.status(400).json({error, message: "This username is already in use. Please try a different one"});
        }
      }
      if(newUser.length>50) {
        const error=true;
        return res.status(400).json({error, message: "This username is too long. Please try a different one"});
      }
      //If no errors, change username and non-case sensitive username
      await db.none(usernameChangeQuery, [newUser, user.userid]);
      await db.none(ncsUsernameChangeQuery, [ncsUser, user.userid]);
      console.log("New ncs username: "+ ncsUser);
      console.log("Username sucessfully changed");
      //Update the user session information for the username
      req.session.user.username=newUser;
      req.session.user.ncsusername=ncsUser;
      return res.status(200).json({success:true});
    }
    //Check if user chose to change profile pic
    else if (profilePic) {
      //If the new profile pic is their current, return an error message
      if (profilePic==req.session.user.userimage) {
        const error=true;
        return res.status(400).json({error, message: "You cannot change your profile picture to the same as it currently is. Please try again"});
      }
      if(profilePic.length>512) {
        const error=true;
        return res.status(400).json({error, message: "This URL is too long. Please use another image"});
      }
      //Else, complete the change (check for image is done in the front-end)
      await db.none(insertImageQuery, [profilePic, user.userid]);
      console.log("User PFP succesfully changed");
      req.session.user.userimage=profilePic;
      return res.status(200).json({success:true});
    }
    //Check if the user chose to change their password
    else if (newPass) {
      console.log("Attempting to change password");
      //Ensure the password matches to prevent anyone from trying to change someone else's password
      const match=await bcrypt.compare(currPass, user.password);
      //If not a match, return an error to inform them they entered the wrong current password
      if(!match) {
        const error=true;
        return res.status(400).json({error, message: "Incorrect password. Please try again."});
      }
      //If the passwords are the same, return an error that they're changing their password to the same thing (not allowed for safety)
      if(newPass==currPass) {
        const error=true;
        return res.status(400).json({error, message:"You cannot change your password to the same as it currently is. Please try again"});
      }
      //Hash the new password and change the user's password in the DB
      newPass=await bcrypt.hash(newPass, 10);
      await db.none(changePasswordQuery, [newPass, user.userid]);
      console.log("Password changed!");
      return res.status(200).json({success:true});
    }
    //Check if the user wants to change their email
    else if (newEmail) {
      //Check if the new email is the same as their current email and if so send an error message that they can't change it to the same one
      if(newEmail==req.session.user.email) {
        const error=true;
        return res.status(400).json({error, message: "You cannot change your email to the same as it currently is. Please try again"});
      }
      //Check if the email they entered is currently in use
      const checkEmail=await db.oneOrNone(findEmail, [newEmail]);
      //If in user, send an error message telling them that
      if(checkEmail) {
        const error=true;
        return res.status(400).json({error, message: "This email is already in use. Please use a different one"});
      }
      if(newEmail.length>100) {
        const error=true;
        return res.status(400).json({error, message: "This email is too long. Please try a different one"});
      }
      //Else, change the email in the DB and the user session
      await db.none(emailQuery, [newEmail, user.userid]);
      req.session.user.email=newEmail;
      console.log("Email succesfully changed");
      return res.status(200).json({success:true});
    }
    //In case no information is sent (somehow), provide user an error message informing them no information was changed
    else {
      const error=true;
      return res.status(400).json({error, message: "User information could not be changed"});
    }
  }
  //If an error occurs anywhere, return to the user and error message informing that the server had an issue and they should retry
  catch(err) {
    const error=true;
    console.log(err)
    return res.status(500).json({error, message: "A server error occurred. Please try again."});
  }
});

app.get("/game", async (req, res) => {
  // implementation of leader board for results pop up
  const query = `SELECT users.username, SUM(game.score) AS score 
                FROM userGame 
                JOIN users ON userGame.user_id=users.userID 
                JOIN game ON userGame.game_id=game.gameID 
                GROUP BY username 
                ORDER BY SUM(score) DESC
                LIMIT 10`;

  const currentUser = req.session.user.username;
  const currentID=req.session.user.userid;
  const getUserEmail = `SELECT email FROM users WHERE userID=$1`;
  let userEmail;

  try {
    userEmail = await db.one(getUserEmail, [currentID]);
    console.log("User email retrieved: " + userEmail.email);
  } catch (err) {
    console.log("Error retrieving user email: " + err);
    userEmail = { email: "" };
  }

  const userQuery = `WITH ranked AS (
                      SELECT username, SUM(game.score) AS score, ROW_NUMBER() OVER (ORDER BY SUM(game.score) DESC) AS position 
                      FROM userGame 
                      JOIN users ON userGame.user_id=users.userID 
                      JOIN game ON userGame.game_id=game.gameID  
                      GROUP BY users.username
                      )
                    SELECT username, score, position
                    FROM ranked
                    WHERE username=$1`;

  let users = [];
  let currentUserData = [];

  try {
    currentUserData = await db.one(userQuery, [currentUser]);
  } catch (err) {
    currentUserData = {
      username: currentUser,
      score: 0,
      position: null,
      email: userEmail.email,
    };
    console.log("user has no scores yet");
  }
  users = await db.any(query);
  res
    .status(200)
    .render("pages/game", {
      bodyClass: "auth-page",
      leaderboard: users,
      currentUser: currentUserData,
      email: userEmail.email,
    });
});

app.post("/exitGame", async (req, res) => {
  //Delete the connection to the user in userGame to prevent the user from getting points from a game they didn't finish
  let gameID = req.body.gameID;
  let userID = req.session.user.userid;
  //If no userID, they aren't logged in which should not be possible
  if (!userID) {
    res.status(400).json({ success: false });
  }
  //If no gameID, no need to delete from database
  if (!gameID) {
    console.log("No game session started");
    res.status(200).json({ success: true });
    return;
  }
  const deleteUserGame = `DELETE FROM userGame WHERE game_id=$1 AND user_id=$2`;
  try {
    await db.none(deleteUserGame, [gameID, userID]);
    console.log("Successfully deleted");
    res.status(200).json({ success: true });
  } catch (err) {
    console.log("Error exiting game. Attempt again");
    res.status(500).json({ success: false });
  }
});

//submit guess x scoring
app.post("/api/submitGuess", async (req, res) => {
  let { userInput, gameID, targetWord } = req.body;

  const user = req.session.user;
  if (!user) return res.status(401).json({ error: "Not logged in" });

  // Correct userID property (your DB column is userID)
  const userID = user.userid || user.userID;
  if (!userID) return res.status(500).json({ error: "Session userID missing" });

  if (!userInput) return res.status(400).json({ error: "No guess provided" });
  if (!targetWord) return res.status(400).json({ error: "No target word provided" });

  userInput = userInput.trim().toLowerCase();
  targetWord = targetWord.trim().toLowerCase();

  try {
    // 1. Ensure targetWord exists in words table
    let targetRow = await db.oneOrNone("SELECT wordid FROM words WHERE word = $1", [targetWord]);

    if (!targetRow) {
      targetRow = await db.one(
        "INSERT INTO words (word, length) VALUES ($1, $2) RETURNING wordid",
        [targetWord, targetWord.length]
      );
    }

    const points=targetWord.length*25;

    // 2. Create new game if needed
    if (!gameID) {
      const newGame = await db.one(
        `INSERT INTO game (score, wordid)
         VALUES ($1, $2)
         RETURNING gameid, score`,
        [points, targetRow.wordid]
      );

      gameID = newGame.gameid;

      // FIX: always use valid userID
      await db.none(
        "INSERT INTO userGame (game_id, user_id) VALUES ($1, $2)",
        [gameID, userID]
      );
    }

    // 3. Similarity scoring
    const sim = await calculateSimilarity(userInput, targetWord);
    const similarityScore = sim.similarity;

    // Golf scoring mechanic
    const penalty = Math.round((1 - similarityScore) * 20); // smaller penalty for closer guesses

    var updated = await db.one(
      `UPDATE game
       SET score = score - $1
       WHERE gameid = $2
       RETURNING score`,
      [penalty, gameID]
    );

    if(updated.score<=0) {
      const newScore=await db.one(`UPDATE GAME SET score=0 WHERE gameid=$1 RETURNING score`, [gameID]);
      updated.score=newScore.score;
    }

    // 4. Insert guessed word into words table if necessary
    let guessRow = await db.oneOrNone("SELECT wordid FROM words WHERE word = $1", [
      userInput,
    ]);

    if (!guessRow) {
      guessRow = await db.one(
        "INSERT INTO words (word, length) VALUES ($1, $2) RETURNING wordid",
        [userInput, userInput.length]
      );
    }

    // 5. Insert guess record
    await db.none(
      `INSERT INTO guesses (gameid, userid, wordid, userinput)
       VALUES ($1, $2, $3, $4)`,
      [gameID, userID, guessRow.wordid, userInput]
    );

    return res.json({
      success: true,
      gameID,
      similarity: similarityScore,
      penalty,
      totalScore: updated.score,
    });

  } catch (err) {
    console.error("❌ Golf scoring error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
});

app.get('/API/getLeaderboard', async(req,res) => {
  try {
    const leaderboardQuery=`WITH ranked AS (
                              SELECT username, SUM(game.score) AS score, ROW_NUMBER() OVER (ORDER BY SUM(game.score) DESC) AS position 
                              FROM userGame 
                              JOIN users ON userGame.user_id=users.userID 
                              JOIN game ON userGame.game_id=game.gameID  
                              GROUP BY users.username
                            )
                            SELECT username, score, position
                            FROM ranked
                            ORDER BY score DESC
                            LIMIT 10;`
    const data=await db.any(leaderboardQuery);
    res.status(200).json({success: true, leaderboard: data});
  }
  catch(err) {
    const error=true;
    console.log(err);
    res.status(500).json({success: false, message: "An error occurred", error});
  }
});


app.post("/logout", (req, res) => {
  try {
    req.session.destroy();
    res.status(200).redirect("/login");
  } catch (err) {
    console.log(err);
    res.status(500).redirect("/");
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
console.log("Server is listening on port 3000");
