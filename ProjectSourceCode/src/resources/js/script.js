function checkPasswords() {
    var password = document.getElementById("password").value;
    var password_retype = document.getElementById("password_retype").value;
    if (password !== password_retype) {
        document.getElementById("password_retype").setCustomValidity("Passwords do not match");
    } else {
        document.getElementById("password_retype").setCustomValidity("");
    }
}