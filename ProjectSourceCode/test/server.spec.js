// ********************** Initialize server **********************************

// const server = require('../src/index'); //TODO: Make sure the path to your index.js is correctly added
import server from '../src/index.js';

// ********************** Import Libraries ***********************************

// const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
// const chaiHttp = require('chai-http');

import chai from 'chai';
import chaiHttp from 'chai-http';
import bcryptjs from 'bcryptjs';
import pgp from "pg-promise";
import express from "express";

chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

const app = express();
const pgpInstance = pgp();

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
// ********************** DEFAULT WELCOME TESTCASE ****************************

//Default test case removed to prevent any user confusion
/*
describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});
*/

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************
//We are checking POST /registration API by passing the user info. 
//For the positive test case, we are passing a randomly generated username to ensure uniqueness. This test case should pass and return a status 200.
//For the negative test case we are passing an invalid username as it already exists in the database. The test should pass and return a status 400.

describe('Testing Registration API', () => {
    // API: /registration
    // Input: { username: randomly generated alphanumeric string, email: '(randomly generated alphanumeric string)@gmail.com', password:'pass', password_retype:'pass'}
    // Expect: res.status == 200
    // Result: This test case should pass and return a status 200.
    // Explanation: The testcase will call the /registration API with the following valid inputs
    // and expects the API to return a status of 200.
    it('positive : /registration', done => {
        var name=Math.random().toString(36).substring(7);
        var email=name+'@gmail.com'
        chai
            .request(server)
            .post('/registration')
            .send({username: name, email: email, password: 'pass', password_retype: 'pass'}) //password is '$2a$10$hNH/BF2RrZ4gltk98Pmt2.omYMapoVJUp2g8ZrzMOfj.EzqgZPYnS'
            .end((err, res) => {
                console.log('testing positive');
                expect(res).to.have.status(200);
                done();
            });
    });
  // API: /registration
  // Input: { username: 'bob', email: 'bob@gmail.com', password:'pass', password_retype:'pass'}
  // Expect: res.status == 400
  // Result: This test case should pass and return a status 400.
  // Explanation: The testcase will call the /registration API with the following invalid inputs
  // and expects the API to return a status of 400.
  it('Negative : /registration, attempts to register user with an invalid name', done => {
    chai
      .request(server)
      .post('/registration')
      .send({ username: 'bob', email: 'bob@gmail.com', password:'pass', password_retype:'pass'}) //Will fail because bob already exists
      .end((err, res) => {
        console.log('testing negative');
        console.log('Status: ', res.status);
        expect(res).to.have.status(400);
        console.log('I am reaching done');
        done();
      });
  });
});


//EC Testing
//We are testing the login session by attempting to login using a test user through doing POST /login.
//Positive case: We are passing valid credentials for an existing user and expect to get a status 200 response and a session to be created.
//Negative case: We are passing invalid credentials (wrong password) for an existing user and expect to get a status 400 response and no session to be created.
describe('Testing Login API', () => {
    // API: /login
    // Input: { username: 'bob', password:'pass'}
    // Expect: res.status == 200
    // Result: This test case should pass and return a status 200.
    // Explanation: The testcase will call the /login API with the following valid inputs
    // and expects the API to return a status of 200.
    it('position : /login', done => {
        chai
            .request(server)
            .post('/login')
            .send({username: 'bob', password: 'pass'})
            .end((err, res) => {
                console.log('testing positive');
                expect(res).to.have.status(200);
                done();
            });
    });
  // API: /login
  // Input: { username: 'bob', password:'p'}
  // Expect: res.status == 400
  // Result: This test case should pass and return a status 400.
  // Explanation: The testcase will call the /login API with the following invalid inputs
  // and expects the API to return a status of 400.
  it('Negative : /login, attempts to login to a user with an invalid password', done => {
    chai
      .request(server)
      .post('/login')
      .send({ username: 'bob', password:'p'}) //Will fail because wrong password
      .end((err, res) => {
        console.log('testing negative');
        console.log('Status: ', res.status);
        expect(res).to.have.status(400);
        console.log('I am reaching done');
        done();
      });
  });
});

//We are checking POST /changeInfo API by passing the user info. 
//For the positive test case, we are passing a randomly generated user and attempt to change it's password from "pass" to "a". This test case should pass and return a status 200 and success=true.
//For the negative test case we are passing an invalid username that already exists in the DB to change a user's username to. The test should pass and return a status 400.
describe('Testing ChangeInfo API', () => {
    var name=Math.random().toString(36).substring(7);
    var ncsName=name.toLowerCase();
    var email=`${name}@gmail.com`
    let agent;
    const testUser= {
      username: name,
      ncsUsername: ncsName,
      email: email,
      password: 'pass',
    };

    before(async() => {
      const hashedPassword = await bcryptjs.hash(testUser.password, 10);
      await db.query('INSERT INTO users (username, ncsUsername, email,password) VALUES ($1, $2, $3, $4)', [
      testUser.username,
      testUser.ncsUsername,
      testUser.email,
      hashedPassword,
      ]);
    });

    beforeEach(() => {
      // Create new agent for session handling
      agent = chai.request.agent(server);
    });

    afterEach(() => {
      // Clear cookie after each test
      agent.close();
    });

    after(async() => {
      await db.query(`DELETE FROM users WHERE email=$1`, [testUser.email]);
    });

    // API: /changeInfo
    // Input: randomly generated user and new username to switch their 
    // Expect: res.status == 200 and status:true
    // Result: This test case should pass and return a status 200 and a success:true value.
    // Explanation: The testcase will call the /changeInfo API with the following valid inputs
    // and expects the API to return a status of 200.
    it('Positive : change username of temp user', done => {
       agent
          .post('/login')
          .send({
            username: testUser.username,
            password: testUser.password,
          })
          .end((err, res) => {
            console.log("Attempting to login test user");
            expect(res).to.have.status(200);

            const newPassword='a';

            agent
              .post('/changeInfo')
              .send({
                newPassword: newPassword,
                currentPassword: testUser.password,
              })
              .end((err2, res2) => {
                expect(res2).to.have.status(200);
                expect(res2.body).to.have.property('success', true);
                done();
              });
            });
    });
  // API: /changeInfo
  // Input: a randomly generated user and a used username of "bob"
  // Expect: res.status == 400
  // Result: This test case should pass and return a status 400.
  // Explanation: The testcase will call the /changeInfo API with the following invalid inputs
  // and expects the API to return a status of 400.
  it('Negative : /changeInfo, attempts to change a users username to an invalid one', done => {
    agent
      .post('/login')
          .send({
            username: testUser.username,
            password: 'a',
          })
          .end((err, res) => {
            console.log("Attempting to login test user");
            expect(res).to.have.status(200);
      
            const newUsername='a';

          agent
            .post('/changeInfo')
            .send({
              newUsername: newUsername,
            })
            .end((err2, res2) => {
              console.log("Sent: " +newUsername);
              expect(res2).to.have.status(400);
              expect(res2.body).to.have.property('message');
              done();
            });
          });
  });
});


//We are checking POST /api/submitGuess API by passing the a guess (only for positive) and a user
//For the positive test case, we are passing a random guess and a random user. The test should pass and return a status 200, success:true, and a gameID.
//For the negative test case we are passing no guess which should cause an error. The test should pass and return a status 400 and an error message.
describe('Testing submitGuess API', () => {
    var name=Math.random().toString(36).substring(7);
    var ncsName=name.toLowerCase();
    var email=`${name}@gmail.com`
    let agent;
    const testUser= {
      username: name,
      ncsUsername: ncsName,
      email: email,
      password: 'pass',
    };

    before(async() => {
      const hashedPassword = await bcryptjs.hash(testUser.password, 10);
      await db.query('INSERT INTO users (username, ncsUsername, email,password) VALUES ($1, $2, $3, $4)', [
      testUser.username,
      testUser.ncsUsername,
      testUser.email,
      hashedPassword,
      ]);
    });

    beforeEach(() => {
      // Create new agent for session handling
      agent = chai.request.agent(server);
    });

    afterEach(() => {
      // Clear cookie after each test
      agent.close();
    });

    after(async() => {
      const userId=await db.one(`SELECT userID FROM users WHERE ncsUsername=$1`, [testUser.ncsUsername]);
      await db.query(`DELETE FROM guesses WHERE userID=$1`, [userId.userid]);
      await db.query(`DELETE FROM userGame WHERE user_id=$1`, [userId.userid]);
      await db.query(`DELETE FROM users WHERE email=$1`, [testUser.email]);
    });

    // API: /api/submitGuess
    // Input: randomly generated user and the guess word of "cheese"
    // Expect: This test should return a gameID, a status of 200, and the property "success" as true
    // Result: This test case should return a gameID and that it was a success
    // Explanation: The testcase will call the /api/submitGuess API with the following valid inputs
    // and expects the API to return a gameID.
    it('Positive : enter valid user and guess', done => {
       agent
          .post('/login')
          .send({
            username: testUser.username,
            password: testUser.password,
          })
          .end((err, res) => {
            console.log("Attempting to login test user");
            expect(res).to.have.status(200);

            const word="cheese";

            agent
              .post('/api/submitGuess')
              .send({userInput: word})
              .end((err2, res2) => {
                expect(res2).to.have.status(200);
                expect(res2.body).to.have.property('success', true);
                expect(res2.body).to.have.property('gameID');
                done();
              });
            });
    });
  // API: /api/submitGuess
  // Input: a randomly generated user without a word
  // Expect: res.status == 400
  // Result: This test case should pass and return a status 400.
  // Explanation: The testcase will call the /api/submitGuess API with the following invalid inputs
  // and expects the API to return a status of 400.
  it('Negative : /api/submitGuess, attempts to submit without a word', done => {
    agent
      .post('/login')
          .send({
            username: testUser.username,
            password: testUser.password,
          })
          .end((err, res) => {
            console.log("Attempting to login test user");
            expect(res).to.have.status(200);

          agent
            .post('/api/submitGuess')
            .send({
            })
            .end((err2, res2) => {
              expect(res2).to.have.status(400);
              expect(res2.body).to.have.property('error', 'No guess');
              done();
            });
          });
  });
});

// ********************************************************************************