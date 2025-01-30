document.addEventListener('DOMContentLoaded', () => {
  const addCategoryForm = document.getElementById('addCategoryForm');
  const categoryNameInput = document.getElementById('categoryName');
  const categoryError = document.getElementById('categoryError');
  const categoryList = document.getElementById('categoryList');

  addCategoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = categoryNameInput.value.trim();
    const nameRegex = /^[A-Za-z\s]+$/

    if (!name) {
      categoryError.textContent = 'This field is required';
      return;
    }
    if(!nameRegex.test(name)){
      categoryError.textContent = "Category name must only contain letters and spaces";
      return;
    }

    try {
      const response = await fetch('/admin/add-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const result = await response.json();
        categoryError.textContent = result.error || 'Error adding category';
        return;
      }

      const result = await response.json();
      alert(result.message);
      location.reload();
    } catch (err) {
      console.error(err);
    }
  });

  categoryList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-category')) {
      const categoryId = e.target.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this category?')) {
        try {
          const response = await fetch(`/admin/delete-category/${categoryId}`, { method: 'DELETE' });

          if (response.ok) {
            location.reload();
          }
        } catch (err) {
          console.error(err);
        }
      }
    }
  });
});

