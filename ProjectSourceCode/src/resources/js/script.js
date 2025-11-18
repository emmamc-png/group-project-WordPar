function checkPasswords() {
    var password = document.getElementById("password").value;
    var password_retype = document.getElementById("password_retype").value;
    if (password !== password_retype) {
        document.getElementById("password_retype").setCustomValidity("Passwords do not match");
    } else {
        document.getElementById("password_retype").setCustomValidity("");
    }
}

//Game JS
// ========================================
// Get Category from URL API Parameter
// ========================================
const urlParams = new URLSearchParams(window.location.search);
let category = urlParams.get('category') || 'music';
document.getElementById('category-value').textContent = category.toUpperCase();

// ========================================
// Game Variables
// ========================================
let secretWord = '';
let guessHistory = [];
let attempts = 0;
const MAX_ATTEMPTS = 10;
let currentGameID = null;

// ========================================
// Initialize Game - Generate Secret Word (YOUR FEATURE)
// ========================================
async function startNewGame() {
    attempts = 0;
    guessHistory = [];
    currentGameID = null;
    
    try {
        const response = await fetch(`/api/generate_word?category=${category}`);
        const data = await response.json();
        
        secretWord = data.word;
        console.log('🎯 Secret word:', secretWord); // DEBUG - Remove in production
        
        // alert(`Game started! Category: ${category.toUpperCase()}\nGuess the secret word!`);
        
    } catch (error) {
        console.error('Error generating word:', error);
        alert('Failed to start game. Please try again.');
    }
}

// Start game when page loads
window.addEventListener('DOMContentLoaded', () => {
    startNewGame();
});

// ========================================
// Keyboard Input Handling 
// ========================================
const buttonContainer = document.getElementById('buttonContainer');
//let wordLength = secretWord.length;
let prevKey = "";
let buttonInputs = [];
let room = true;
let clear = false;

function updateGuess(buttonInputs) {
    // Truncate the size of the input guess into the correct size
    /*console.log('here')
    console.log(buttonInputs.length)
    console.log("word "+ secretWord.length)
    buttonInputs.length = secretWord.length;
    console.log("dude" + buttonInputs.length)
*/
    const guessDiv = document.getElementById("guess");
    let htmlContent = "<div id='letters'>";
    buttonInputs.forEach(item => {
        htmlContent += "<div class='character rounded'>";
        htmlContent += `${item}`;
        htmlContent += "</div>";
    });
    htmlContent += "</div>";
    guessDiv.innerHTML = htmlContent;

   //console.log(buttonInputs)
    if (clear) {
        const clearbtnDiv = document.getElementById("clearbtn");
        let htmlContent2 = "<button id='clear' type='button' class=' btn btn-outline-secondary btn-lg' value='Clear'>Clear</button>"
        clearbtnDiv.innerHTML = htmlContent2;
        clearbtnDiv.addEventListener('click', buttonPressed);
    }

    const maxLengthDiv = document.getElementById("max-length");
    let htmlContent3 = "<div id='true-length'>";
        htmlContent3 += "Maximum: ";
        htmlContent3 += "<div id='actual-length'>";
        htmlContent3 += "<div id='maximum'>";
        htmlContent3 += `${secretWord.length}`;
        htmlContent3 += "</div>";
        htmlContent3 += "</div>";
        htmlContent3 += "</div>";
    maxLengthDiv.innerHTML = htmlContent3;
}

async function buttonPressed(event) {
    if (room) {
        if (prevKey) {
            prevKey.classList.remove('simulate-btn-hover');
        }
        
        const correctKey = document.querySelector(`#${event.target.id}`)
        prevKey = correctKey;
        //if (correctKey) {
        correctKey.classList.add('simulate-btn-hover');
        if (event.target.id === 'clear') {
            clear = true;
        }
        //}

        if (event.target.tagName === 'BUTTON') {
            if(event.target.id == 'enter') {
                if (buttonInputs.length === 0) {
                    alert('Please enter a word first!');
                    return;
                }
                // Submit guess with AI integration (YOUR FEATURE)
                await submitGuess(buttonInputs.join(''));

                // Display the clear button
                clear = true;
                updateGuess(buttonInputs);
                // reset guesses
                room = false;
                buttonInputs = [];
                room = true;
                
            }
            else if (event.target.id === 'back') {
                buttonInputs.pop();
                updateGuess(buttonInputs);
            }
            else if (event.target.id !== 'clear') {
                buttonInputs.push(event.target.value);
                updateGuess(buttonInputs);
            }
            else {
                buttonInputs=[];
                updateGuess(buttonInputs);
            }
        }
    }
    else {
        if (event.target.tagName === 'BUTTON') {
            if (event.target.id === 'clear') {
                buttonInputs.length = 0;
                const guessDiv = document.getElementById("letters");
                const clearbtn = document.getElementById("clear");
                const resultsDiv = document.getElementById("guess-history")
                if (guessDiv) guessDiv.remove();
                if (clearbtn) clearbtn.remove();
                if (resultsDiv) resultsDiv.remove();
                attempts = 0;
                document.getElementById('strokes-value').textContent = attempts;
                room = true;
                clear = false;
            }
        }
    }
}

// Call the button function every time a key is pressed
buttonContainer.addEventListener('click', buttonPressed);

// Keyboard support
document.addEventListener("keydown", function(event) { 
    if ((event.key.length === 1 && event.key.match(/[a-z]/i)) || event.key == 'Enter' || event.key == 'Backspace') {
        event.preventDefault();
        let keyTap;

        if (room) {
            if (event.key == 'Enter') {
                keyTap = { target: {tagName: 'BUTTON', value: event.key, id: 'enter'} };
            }
            else if (event.key == 'Backspace') {
                keyTap = { target: {tagName: 'BUTTON', value: event.key, id: 'back'} };
            }
            else {
                keyTap = { target: {tagName: 'BUTTON', value: event.key, id: event.key} };
            }
        }
        else {
            if (event.key === 'Backspace') {
                keyTap = { target: {tagName: 'BUTTON', value: event.key, id: 'clear'} }
            }
        }
        buttonPressed(keyTap);
    }
});


// ========================================
// Exit Game
// ========================================
async function exitGame() {
    try {
        const exitGameResponse = await fetch("/exitGame", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                gameID: currentGameID || null
            })
        })

        const exit=await exitGameResponse.json();
        if (exit.success) {
            //Redirect back to home if a success
            window.location.href='/';
            return;
        }
        else {
            console.log("Error exiting");
        }
    }
    catch(err) {
        console.log("Error exiting: "+err);
    }
};


// ========================================
// Submit Guess with AI 
// ========================================
async function submitGuess(userGuess) {
    attempts++;
    document.getElementById('strokes-value').textContent = attempts;
    
    try {
        // Save to database
        const dbResponse = await fetch("/api/submitGuess", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userInput: userGuess,
                gameID: currentGameID || null
            })
        });

        const dbData = await dbResponse.json();
        if (dbData.success) {
            currentGameID = dbData.gameID;
        }

        // Calculate similarity with AI
        const aiResponse = await fetch('/api/similarity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                word1: userGuess.toLowerCase(),
                word2: secretWord.toLowerCase()
            })
        });
        
        const aiData = await aiResponse.json();
        const similarity = aiData.similarity;
        const percentage = Math.round(similarity * 100);
        
        guessHistory.push({
            word: userGuess,
            similarity: similarity,
            percentage: percentage,
            attempt: attempts
        });
        
        displayFeedback(userGuess, similarity, percentage);
        
        // Check win condition
        if (similarity >= 0.95 || userGuess.toLowerCase() === secretWord.toLowerCase()) {
            setTimeout(() => {
                alert(`🎉 YOU WON! The word was "${secretWord}"!\nAttempts: ${attempts}`);
                if (confirm('Play again?')) {
                    location.reload();
                }
            }, 500);
        }
        else if (attempts >= MAX_ATTEMPTS) {
            setTimeout(() => {
                alert(`😢 Game Over! The word was "${secretWord}".\nBetter luck next time!`);
                if (confirm('Try again?')) {
                    location.reload();
                }
            }, 500);
        }
        
    } catch (error) {
        console.error('Error processing guess:', error);
        alert('Error checking your guess. Please try again.');
    }
}

// ========================================
// Display Feedback (YOUR FEATURE)
// ========================================
function displayFeedback(guess, similarity, percentage) {
    let feedbackContainer = document.getElementById('guess-history');
    if (!feedbackContainer) {
        feedbackContainer = document.createElement('div');
        feedbackContainer.id = 'guess-history';
        /*feedbackContainer.style.cssText = `
            margin-top: 20px;
            padding: 15px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            max-height: 300px;
            overflow-y: auto;
        `;
        */
        document.getElementById('guessContainer').appendChild(feedbackContainer);
    }
    
    let message = '';
    let color = '';
    
    if (similarity == 1) {
        message = '🔥 YOU GOT IT!! NICE JOB!';
        color = '#ff4444';
    }
    else if (similarity > 0.9) {
        message = '🔥 ALMOST THERE!';
        color = '#ff4444';
    } else if (similarity > 0.7) {
        message = '🌟 VERY CLOSE!';
        color = '#ff8844';
    } else if (similarity > 0.5) {
        message = '😊 GETTING WARMER!';
        color = '#ffaa44';
    } else if (similarity > 0.3) {
        message = '🤔 ON THE RIGHT TRACK...';
        color = '#88aaff';
    } else {
        message = '❄️ COLD!';
        color = '#4488ff';
    }
    
    const feedbackItem = document.createElement('div');
    feedbackItem.classList.add('result');
    feedbackItem.style.cssText = `
        background: ${color};
    `;
    /*  padding: 10px;
        margin-bottom: 10px;
        color: white;
        border-radius: 5px;
        font-weight: bold;
    `;
    */
    feedbackItem.innerHTML = `
        <div style="display: flex; justify-content: space-between;">
            <span>${attempts}. ${guess.toUpperCase()}</span>
            <span>${percentage}%</span>
        </div>
        <div style="font-size: 0.9em; margin-top: 5px;">${message}</div>
    `;
    
    feedbackContainer.insertBefore(feedbackItem, feedbackContainer.firstChild);
}