document.addEventListener('DOMContentLoaded', () => {
  const addAdminForm = document.getElementById('addAdminForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const usernameError = document.getElementById('usernameError');
  const passwordError = document.getElementById('passwordError');

  addAdminForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      if (!username) usernameError.textContent = 'Username is required';
      if (!password) passwordError.textContent = 'Password is required';
      return;
    }

    try {
      const response = await fetch('/admin/add-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const result = await response.json();
        usernameError.textContent = result.error || 'Error adding admin';
        return;
      }

      const result = await response.json();
      alert(result.message);
      location.reload();
    } catch (err) {
      console.error(err);
    }
  });
});





