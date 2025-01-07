const resendButton = document.getElementById("resendButton");

resendButton.addEventListener("click", function () {
  resendButton.disabled = true;
  resendButton.textContent = "Resending...";

  fetch('/resend-verification-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail }) 
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert("Verification link sent again!");
      resendButton.disabled = false;
      resendButton.textContent = "Resend Verification Link";
    } else {
      alert("Error resending verification link. Please try again.");
    }
  })
  .catch(err => {
    alert("An error occurred. Please try again.");
    console.error(err);
  });
});
