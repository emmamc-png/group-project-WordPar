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

//Functions to re-open modal
async function openProfileModal() {
    document.getElementById("myModal").style.display="block";
};

document.addEventListener("DOMContentLoaded", () => {
    if(localStorage.getItem("modalIsOpen")==="true") {
        openProfileModal();
        localStorage.removeItem("modalIsOpen");
    }
});