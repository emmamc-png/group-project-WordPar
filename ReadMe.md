<h1 align="center"> Word Par </h1>

<p align="center">
    <img src="/ProjectSourceCode/src/resources/img/logoImage.png" alt="Word Par Logo"/>
</p>

----

## Description:

Within the game Word Par, it offers users the ability to play a word guessing game that provides a random word according to the theme through an OpenAI API. Each game starts with a specific amount of points available depending on the word length (50 points per letter). Then, following each user guess, using the OpenAI API, we will decide how close each guess is to the actual word sementically. If the user guess is cold they lose 20 points, 10 points for in the middle, and 5 points for warm. When the user accesses the home page after logging in to their account, they will be greated with a leaderboard that shows the top 10 players in addition to their current ranking (or unranked in they haven't played yet) and points. The leaderboard is updated everytime a user refreshes the page. When a user selects play, it opens a menu to select a category before being redirected to the game and have a word selected for them to guess which will show them the amount of characters the word is. As they go through the game, the background will change colors as well as providing them a list of their previous guesses and the percentage of "closeness" they are to the actual word. Every player has a maximum of 10 guesses before the game ends. Once a game is completed the points are stored in a database and utilized to find their ranking.

----

## Contributers:
* Emma McArthur
* Joel Gaikwad
* Josiah Shehata
* Reeves Cook
* Karthik Chandrasekhar

----

## Technology Stack:
* **Frontend:**
    * **CSS** (Cascading Style Sheets): Holds the styling aspects for the application's user interface (UI)
    * **HTML** (Hyptertext Markup Language): Provides the core aspects and elements of the different pages for Word Par 
    * **HBS** (Handlebars): Adds dynamic elements to the different webpages to allow for changing information (ex. leaderboard)
    * **Axios**: Tool used to allow for the frontend to fetch data from the backend or for the frontend to send data to the backend
* **Backend:**
    * **NodeJS**: Javascript runtime environment that is the base for Express. NodeJS allows for us to make dynamic HTML pages, collect/process form data, process HTTP requests, and much more
    * **Express**: Web framework for NodeJS which simplifies routing, middleware handling, and much more. Also supports various templating engines (such as HBS)
* **Database:**
    * **PostgresSQL**: Allows us to initalize, store, and interact with data for the application. A relational database mangement system (RDBMS) which uses SQL (structured query language) to interact with the database
* **Testing:**
    * **Mocha**: A test framework and test runner that is utilized as a structure and environment for application testing
    * **Chai**: A library that offers logic for verifying tests through assertions
* **Infrastructure/DevOps:**
    * **Docker**: Infastructure tool utilized as a substitute for a virtual machine which uses containerization which packages all aspects of an application into the container to prevent from any inconsistencies based on the developer's local machine

----

## Prerequisites to run the application:
* **Downloads Required:**
    * **Docker:** Must be downloaded on local machine. You can find out information on how to download it depending on your OS [here!](https://www.docker.com/get-started/)

#### All other downloads will be handled through the Docker containerization (everything is downloaded and ran inside the container itself)


* **If you choose not to use Docker, you must download these:**
    * **PostgresSQL**: Can be downloaded from [here](https://www.postgresql.org/download/)
    * **NodeJS**: Can be downloaded from [here](https://nodejs.org/en)

----

## How to run the application locally:

### 1. Create a '.env' file:
* **Create a .env file which will include the following:**
    * POSTGRES_HOST=db
    * POSTGRES_USER=(your user)
    * POSTGRES_PASSWORD=(your password)
    * POSTGRES_DB=(your database)
    * SESSION_SECRET=(your session secret)
    * OPENAI_API_KEY(your OpenAI API key) 

### 2. Next Steps
* **If using Docker:**
    * Open a terminal and redirect to /ProjectSourceCode/src
    * In the terminal type "docker compose up" which will automatically run the tests and everything else necessary

* **If NOT using Docker:**
    * Open a terminal and redirect to /ProjectSourceCode/src where you need to run: npm install
    * Then, in the terminal use the command: npm testandrun

----

## How to run the tests:
* **If using Docker:**
    * Open a terminal and redirect to /ProjectSourceCode/src
    * In the terminal type: docker compose run --rm web npm run testOnly

* **If NOT using Docker:**
    * Open a terminal and redirect to /ProjectSourceCode/src and if not done previously, run the command: npm install
    * Then, in the terminal use the command: npm testOnly

----

## Check out our deployed application [here](https://group-project-wordpar-1.onrender.com/)!


