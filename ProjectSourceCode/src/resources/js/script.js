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
    const regex= /\.(jpe?g|png|gif|webp|svg)(?:\?.*)?$/i;

    if(!regex.test(imageURL)) {
        document.getElementById("newProfilePic").setCustomValidity("Please enter a valid image URL");
    }
};