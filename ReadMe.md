<h1 align="center"> Word Par </h1>

<p align="center">
    <img src="/ProjectSourceCode/src/resources/img/logoImage.png" alt="Word Par Logo"/>
</p>

----

## Description:

Within the game Word Par, it offers users the ability to play a word guessing game that provides a random word according to the theme through an OpenAI API. Each game starts with a specific amount of points available depending on the word length (25 points per letter). Then, following each user guess, using the OpenAI API, we will decide how close each guess is to the actual word semantically. The amount of points a player loses per guess is based on how semantically close the word is and the total number of current points the player has. When the user accesses the home page after logging in to their account, they will be greeted with a leaderboard that shows the top 10 players in addition to their current ranking (or unranked if they haven't played yet) and points. The leaderboard is updated every time a user refreshes the page. When a user selects play, it opens a menu to select a category before being redirected to the game and have a word selected for them to guess which will show them the amount of characters the word is. As they go through the game, the background will change colors as well as providing them a list of their previous guesses and the percentage of "closeness" they are to the actual word. Every player has a maximum of 10 guesses before the game ends. Once a game is completed the points are stored in a database and utilized to find their ranking.

----

## Contributers:
* Emma McArthur
* Joel Gaikwad
* Josiah Shehata
* Reeves Cook
* Karthik Chandrasekhar

----
## Directory Structure:
```text
├─group-project-WordPar/
│  ├─ TeamMeetingLogs
│  ├─ MilestoneSubmissions
|  ├─ ProjectSourceCode
|  |    ├─ docker-compose.yaml              # Docker Configuration
|  |    ├─ .gitignore                       # Contains the necessary missing files (.env)
|  |    |- .env                             # Within the .gitignore; Contains Environment Variables
|  |    ├─ package.json                     # Project dependencies and scripts
|  |    ├─ src
|  |        ├─ views
|  |            ├─ pages                    # Page Templates
|  |                ├─ home.hbs             # Home page
|  |                ├─ login.hbs            # Login page
|  |                ├─ registration.hbs     # Registration page
|  |                |- game.hbs             # Game page
|  |            ├─ partials                 # Partial Components of Page Templates
|  |                ├─ header.hbs           # Header template for pages
|  |                ├─ footer.hbs           # Footer template for pages
|  |                ├─ message.hbs          # Message template for pages
|  |                ├─ title.hbs            # Title template for pages
|  |            ├─ layouts                  # Layout of Page Templates
|  |                ├─ main.hbs             # Main layout template
|  |        ├─ resources                    # Additional Components beyond HTML for Website
|  |            ├─ css                      # Styling Assets
|  |                ├─ style.css            # Application Styling
|  |            ├─ js                       # JavaScript Assets
|  |                ├─ script.js            # JavaScript file for Client-Side Functions
|  |            ├─ img                      # Image Assets
|  |                ├─ golfball.jpg         
|  |                ├─ logoImage.png
|  |                ├─ userProfile.png
|  |    ├─ index.js                         # Main Server File
|  |    ├─ aiService.js                     # Server-Side JS File for API-Specific Functions
|  |    ├─ init_data                        # Database Initialization
|  |        |─ create.sql                   # Database Schema Creation
|  |        |─ insert.sql                   # Initial Data Insertion
|  |    ├─ test                             # Testing Assets
|  |        ├─ server.spec.js               # Testing Script VIA Mocha and Chai
│  ├─ README.md                

```
----
## Technology Stack:
* **Frontend:**
    * **CSS** (Cascading Style Sheets): Holds the styling aspects for the application's user interface (UI)
    * **HTML** (Hyptertext Markup Language): Provides the core aspects and elements of the different pages for Word Par 
    * **HBS** (Handlebars): Adds dynamic elements to the different webpages to allow for changing information (ex. leaderboard)
    * **JS** (JavaScript): Adds client-side interactions to elements throughout the webpages
    * **Axios**: Tool used to allow for the frontend to fetch data from the backend or for the frontend to send data to the backend
* **Backend:**
    * **Node.js**: Javascript runtime environment that is the base for Express. NodeJS allows for us to make dynamic HTML pages, collect/process form data, process HTTP requests, and much more
    * **Express.js**: Web framework for NodeJS which simplifies routing, middleware handling, and much more. Also supports various templating engines (such as HBS)
* **Database:**
    * **PostgreSQL**: Allows us to initalize, store, and interact with data for the application. A relational database mangement system (RDBMS) which uses SQL (structured query language) to interact with the database
* **Testing:**
    * **Mocha**: A test framework and test runner that is utilized as a structure and environment for application testing
    * **Chai**: A library that offers logic for verifying tests through assertions
* **Infrastructure/DevOps:**
    * **Docker**: Infastructure tool utilized as a substitute for a virtual machine which uses containerization which packages all aspects of an application into the container to prevent from any inconsistencies based on the developer's local machine
* **API Integrations**
    * **OpenAI**: Utilized to provide a word depending on the category and analyze semantically how close the guess is to the actual word
* **Version Control**
    * **Git**: Utilized to have different branches for each user story for collaboration purposes and tracking of changes
* **Project Management**
    * **GitHub Projects**: Utilized to track user stories throughout the project with the ability to assign it to each person and keep track how long it took for said person to complete their task. Allowed for us to follow the agile methodology

----

## Prerequisites to run the application:
* **Downloads Required:**
    * **Docker:** Must be downloaded on local machine. You can find out information on how to download it depending on your OS [here!](https://www.docker.com/get-started/)

#### All other downloads will be handled through the Docker containerization (everything is downloaded and ran inside the container itself)


* **If you choose not to use Docker, you must download these:**
    * **PostgresSQL**: Can be downloaded from [here](https://www.postgresql.org/download/)
    * **Node.js**: Can be downloaded from [here](https://nodejs.org/en)

----

## How to run the application locally:

### 1. Create a '.env' file:
* **Create a .env file which will include the following:**
  ```
    POSTGRES_HOST="db"
    POSTGRES_USER="(your user)"
    POSTGRES_PASSWORD="(your password)"
    POSTGRES_DB="(your database)"
  
    SESSION_SECRET="(your session secret)"
    OPENAI_API_KEY="(your OpenAI API key)"
  ```

### 2. Next Steps
* **If using Docker:**
    * Open a terminal and redirect to ProjectSourceCode with:
      ```bash
      cd ProjectSourceCode
      ```
    * In the terminal to make it automatically run the tests and everything else necessary enter:
      ```bash
      docker compose up
      ```
    * To terminate the process enter into the terminal:
      ```bash
      docker compose down
      ```
    * To remove volumes in addition while terminating:
      ```bash
      docker compose down -v
      ```

* **If NOT using Docker:**
    * Open a terminal and redirect to ProjectSourceCode where you need to run:
      ```bash
      npm install
      ```
    * Then, in the terminal use the command:
      ```bash
      npm testandrun
      ```

----

## How to run the tests:
* **If using Docker (Tests ONLY):**
    * Open a terminal and redirect to ProjectSourceCode by:
      ```bash
      cd ProjectSourceCode
      ```
    * In the terminal type:
      ```bash
      docker compose run --rm web npm run testOnly
      ```

* **If NOT using Docker (Tests ONLY):**
    * Open a terminal and redirect to ProjectSourceCode by:
      ```bash
      cd ProjectSourceCode
      ```
    * If not done previously, run the command:
      ```bash
      npm install
      ```
    * Then, in the terminal use the command:
      ```bash
      npm testOnly
      ```

----

## Check out our deployed application [here](https://group-project-wordpar-1.onrender.com/)!


