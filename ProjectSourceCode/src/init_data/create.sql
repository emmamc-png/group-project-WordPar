 -- src/init_data/create.sql
DROP TABLE IF EXISTS userGame CASCADE;
DROP TABLE IF EXISTS game CASCADE;
DROP TABLE IF EXISTS guesses CASCADE;
DROP TABLE IF EXISTS words CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE words(
    wordID SERIAL PRIMARY KEY,
    word VARCHAR(15) UNIQUE,
    length INT NOT NULL
);

CREATE TABLE game (
    gameID SERIAL PRIMARY KEY,
    score INT NOT NULL,
    wordID INT,
    FOREIGN KEY (wordID) REFERENCES words(wordID)
);

CREATE TABLE users(
    userID SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE userGame(
    game_id INT NOT NULL,
    user_id INT NOT NULL,
    PRIMARY KEY (game_id, user_id),
    FOREIGN KEY (game_id) REFERENCES game(gameID),
    FOREIGN KEY (user_id) REFERENCES users(userID)
);

CREATE TABLE guesses(
    guessID SERIAL PRIMARY KEY,
    wordID INT,
    FOREIGN KEY (wordID) REFERENCES words(wordID),
    userInput VARCHAR(15)
);