function loginUser() {
  const email = document.getElementById("loginUser").value;
  const password = document.getElementById("loginPass").value;

  const savedEmail = localStorage.getItem("userEmail");
  const savedPass = localStorage.getItem("userPass");

  if (email === savedEmail && password === savedPass) {
    alert("Login Successful!");
    window.location.href = "index.html";
  } else {
    document.getElementById("message").innerText = "Invalid credentials!";
  }

  return false;
}