# API & Routes Documentation

## Authentication & User

### POST /login
- **Method:** POST
- **Endpoint:** `/login`
- **Input (form):**
  - `username` (string, required)
  - `password` (string, required)
- **Output (HTML):**
  - On success: sets `req.session.user` and redirects to `/`
  - On failure: render `pages/login` with `error` message for incorrect password or system failure or render `pages/registration` with `error` message for non-existent username

---

### GET /login
- **Method:** GET
- **Endpoint:** `/login`
- **Input:** none
- **Output (HTML):** `pages/login`

---

### POST /registration
- **Method:** POST
- **Endpoint:** `/registration`
- **Input (form):**
  - `username` (string, required)
  - `email` (string, required; must have an @ and . for RegEx)
  - `password` (string, required)
  - `password_retype` (string, required)
- **Output (HTML):**
  - On success: redirect to `/login`
  - On failure: render `pages/register` with `error` message for either username, email, or server errors

---

### GET /registration
- **Method:** GET
- **Endpoint:** `/registration`
- **Input:** none
- **Output (HTML):** render `pages/registration`

---

### POST /logout
- **Method:** GET
- **Endpoint:** `/logout`
- **Input:** none
- **Output (HTML):**
  - On success: destroys session, redirects to `/login`
  - On failure: redirects to '/'

---

## General Pages

### GET / 
- **Method:** GET
- **Endpoint:** `/`
- **Input:** session user
- **Output:**
  - On success: render `pages/home` with the following information: {leaderboard:users, currentUser: currentUserData, email:userEmail.email, profile: req.session.user.userimage}
  - On failure: redirect to `/login`

---

### POST /changeInfo
- **Method:** POST
- **Endpoint:** `/changeInfo`
- **Input:** session user, newPFP, currentPassword, newPassword, newEmail, newUsername
- **Output**
  - On Success: `200` JSON `{success:true}`
  - On Failure: `400` JSON `{error, message: ""}` with the message containing different details depending on the error or `500` JSON `{error, message: "A server error occurred. Please try again."} for server error

---

### GET /game
- **Method:** GET
- **Endpoint:** `/game`
- **Input:** session user
- **Output (HTML):** `pages/game` with {leaderboard:users, currentUser: currentUserData, email: userEmail.email}
---

### POST /exitGame
- **Method:** POST
- **Endpoint:** `/exitGame`
- **Input:** gameID, userid
- **Output:**
    - On success: `200` JSON `{success:true}`
    - On failure: `500` JSON `{success:false}`
---

### GET /API/getLeaderboard
- **Method:** GET
- **Endpoint:** `/API/getLeaderboard`
- **Input:** none
- **Output:**
    - On success: `200` JSON `{success:true, leaderboard:data}`
    - On failure: `500` JSON `{success:false, message: "An error occurred", error}`
---

## API Routes

### POST /api/submitGuess
- **Method:** POST
- **Endpoint:** `/api/submitGuess`
- **Input:** userInput, gameId, targetWord
- **Output (JSON):**
  - On success: JSON `{success:true, gameID, similarity: similarityScore, penalty, totalScore: updated.score}`
  - On failure: `500` JSON `{error: "Server error", details: err.message}`
---

### GET /api/health
- **Method:** GET
- **Endpoint:** `/api/health`
- **Input:** none
- **Output (JSON):**
  - `200` JSON `{status: "ok", service: "AI service integrated", timestamp: new Date().toISOString()}`
---

### GET /api/generate_word
- **Method:** GET
- **Endpoint:** `/api/generate_word`
- **Input:** category
- **Output (JSON):**
  - On success: `200` JSON `{result}`
  - On failure: `500` JSON `{error: "Failed to generate word", details: error.message}`
---

### POST /api/similarity
- **Method:** POST
- **Endpoint:** `/api/similarity`
- **Input:** word1, word2
- **Output (JSON):**
  - On success: `200` JSON `{result}`
  - On failure: `400` JSON `{error: "Both word1 and word2 are required in request body"}` or `500` JSON `{error:  "Failed to calculate similarity", details: error.message}`
