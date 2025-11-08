// ********************** Initialize server **********************************

// const server = require('../src/index'); //TODO: Make sure the path to your index.js is correctly added
import server from '../src/index.js';

// ********************** Import Libraries ***********************************

// const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
// const chaiHttp = require('chai-http');

import chai from 'chai';
import chaiHttp from 'chai-http';

chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

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

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************
//Negative test case
//We are checking POST /add_user API by passing the user info in in incorrect manner (name cannot be an integer). This test case should pass and return a status 400 along with a "Invalid input" message.


describe('Testing Registration API', () => {
    // API: /registration
    // Input: { username: randomly generated alphanumeric string, email: 't@gmail.com', password1:'pass', password2:'pass'}
    // Expect: res.status == 200
    // Result: This test case should pass and return a status 200.
    // Explanation: The testcase will call the /registration API with the following valid inputs
    // and expects the API to return a status of 200.
    it('positive : /registration', done => {
        var name=Math.random().toString(36).substring(7);
        chai
            .request(server)
            .post('/registration')
            .send({username: name, email: 't@gmail.com', password1: 'pass', password2: 'pass'}) //password is '$2a$10$hNH/BF2RrZ4gltk98Pmt2.omYMapoVJUp2g8ZrzMOfj.EzqgZPYnS'
            .end((err, res) => {
                console.log('testing positive');
                expect(res).to.have.status(200);
                done();
            });
    });
  // API: /registration
  // Input: { username: 'bob', email: 'bob@gmail.com', password1:'pass', password2:'pass'}
  // Expect: res.status == 400
  // Result: This test case should pass and return a status 400.
  // Explanation: The testcase will call the /registration API with the following invalid inputs
  // and expects the API to return a status of 400.
  it('Negative : /registration, attempts to register user with an invalid name', done => {
    chai
      .request(server)
      .post('/registration')
      .send({ username: 'bob', email: 'bob@gmail.com', password1:'pass', password2:'pass'}) //Will fail because bob already exists
      .end((err, res) => {
        console.log('testing negative');
        console.log('Status: ', res.status);
        expect(res).to.have.status(400);
        console.log('I am reaching done');
        done();
      });
  });
});


// ********************************************************************************