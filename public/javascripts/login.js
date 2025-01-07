

document.addEventListener("DOMContentLoaded", function () {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');

  if (error) {
    const emailError = document.getElementById('emailError');

    if (error === 'email_not_found') {
      emailError.textContent = 'Email not found. Please use a registered email address.';
    } else if (error === 'server_error') {
      emailError.textContent = 'A server error occurred. Please try again later.';
    }
  }
document.getElementById("loginForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const emailErrorElement = document.getElementById("emailError");
  const passwordErrorElement = document.getElementById("passwordError");

  emailErrorElement.textContent = "";
  passwordErrorElement.textContent = "";
  
  const togglePassword = document.getElementById('togglePassword');

  togglePassword.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;

    if (passwordInput.type === 'password') {
      togglePassword.classList.remove('fa-eye-slash');
      togglePassword.classList.add('fa-eye');
    } else {
      togglePassword.classList.remove('fa-eye');
      togglePassword.classList.add('fa-eye-slash');
    }
  });

  let hasError = false;
  if (!email) {
    emailErrorElement.textContent = "Please enter your email.";
    hasError = true;
  }

  if (!password) {
    passwordErrorElement.textContent = "Please enter your password.";
    hasError = true;
  }

  if (hasError) return;

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (response.ok) {
      window.location.href = "/"; 
    }else if(response.status === 403){
      alert("You have been blocked. Please contact support.");
    }
     else {
      emailErrorElement.textContent = result.error || "Invalid username or password.";
    }
  } catch (error) {
    console.error("Error during login:", error);
    emailErrorElement.textContent = "An error occurred. Please try again.";
  }
});
});


