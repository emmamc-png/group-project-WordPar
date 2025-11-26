//Functions for checking Inputs
function checkPasswords() {
    var password = document.getElementById("password").value;
    var password_retype = document.getElementById("password_retype").value;
    if (password !== password_retype) {
        document.getElementById("password_retype").setCustomValidity("Passwords do not match");
    } else {
        document.getElementById("password_retype").setCustomValidity("");
    }
};

function checkForImage(input) {
    console.log("Checking URL");

    document.getElementById("newProfilePic").setCustomValidity("");

    var imageURL=input.value.trim();
    const regex= /(?:[.=](jpe?g|png|gif|webp)|[?&]fm=(jpe?g|png|gif|webp))/i;

    if(!regex.test(imageURL)) {
        document.getElementById("newProfilePic").setCustomValidity("Please enter a valid image URL");
    }
};

//Home Page JS
// Script for how to play modal
const howToPlayModal = document.getElementById('customModal');
const openHowToPlay = document.getElementById('openModal');
const closeHowToPlay = document.getElementById('closeModal');

openHowToPlay.addEventListener('click', () => {
    howToPlayModal.style.display = 'flex';
});

closeHowToPlay.addEventListener('click', () => {
    howToPlayModal.style.display = 'none';
});

howToPlayModal.addEventListener('click', (e) => {
    if (e.target === howToPlayModal) {
        howToPlayModal.style.display = 'none';
    }
});

// Script for user profile modal
const modal2 = document.getElementById("myModal");
const btn = document.getElementById("myBtn");
const span = document.getElementsByClassName("close")[0];

btn.onclick = function() {
    modal2.style.display = "block";
}

span.onclick = function() {
    modal2.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == modal2) {
        modal2.style.display = "none";
    }
}

// Category Selection Modal (YOUR NEW FEATURE)
const playButton = document.getElementById('playButton');
const categoryModal = document.getElementById('categoryModal');
const closeCategoryModal = document.getElementById('closeCategoryModal');
const categoryButtons = document.querySelectorAll('.category-btn');

playButton.addEventListener('click', () => {
    categoryModal.style.display = 'flex';
});

closeCategoryModal.addEventListener('click', () => {
    categoryModal.style.display = 'none';
});

categoryModal.addEventListener('click', (e) => {
    if (e.target === categoryModal) {
        categoryModal.style.display = 'none';
    }
});

// Handle category selection - redirects to game with category
categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
        const category = button.getAttribute('data-category');
        window.location.href = `/game?category=${category}`;
    });
});

function updateChangeItem(item) {
    console.log(item);

    const messageDiv=document.querySelector(".message");
    //If current message, remove it
    if(messageDiv) {
        messageDiv.innerHTML="";
    }

    //Reset each option to prevent any overriding from previous user choices
    document.querySelectorAll(".change-form").forEach(option => {
        option.style.display="none";
        option.querySelectorAll(".profileInput").forEach(input => {
            input.disabled=true;
            input.setCustomValidity("");
        })
    })
    //Map ID to item
    const idMap={ username: "usernameChange", password: "passwordChange", email: "emailChange", image: "profilePic"};
    //Get the selected divison
    const selectedID=idMap[item];
    const selectedOption=document.getElementById(selectedID);

    if(selectedOption) {
        selectedOption.style.display="block";
        selectedOption.querySelectorAll(".profileInput").forEach(input => {
            input.disabled=false;
            input.required=true;
        });
    }
    submit=document.getElementById("submitButton");
    submit.style.display="block";
};

// Function to handle the different changes the user selects
document.addEventListener("DOMContentLoaded", () => {
    const form=document.querySelector(".changeUserInfo");
    if(!form) {
        console.log("Form not found");
        return;
    }

    console.log("Form found!");

    form.addEventListener("submit", async(e) => {
        //Prevents page reload which would close the modal
        console.log("User has submitted");
        e.preventDefault();

        const messageDiv=document.querySelector(".message");

        //If current message, remove it
        if(messageDiv) {
            messageDiv.innerHTML="";
        }

        //
        const formData=Object.fromEntries(new FormData(e.target));
        try {
            const response=await fetch("/changeInfo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const result=await response.json();

            if(result.error) {
                if(messageDiv) {
                    messageDiv.innerHTML = `
                            <div class="alert alert-danger" role="alert">
                                ${result.message}
                            </div>`;
                }
                return;
            }
            else {
                localStorage.setItem('modalIsOpen', 'true');
                window.location.href="/";
            }
            console.log("Done");
        }
        catch(err) {
            console.log(err);
            if (messageDiv) {
                messageDiv.innerHTML = `
                    <div class="alert alert-danger" role="alert">
                        An error occurred. Please try again.
                    </div>
                `;
            };
        };
    });
});

async function openProfileModal() {
    document.getElementById("myModal").style.display="block";
};

document.addEventListener("DOMContentLoaded", () => {
    if(localStorage.getItem("modalIsOpen")==="true") {
        openProfileModal();
        localStorage.removeItem("modalIsOpen");
    }
});