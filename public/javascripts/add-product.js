
document.addEventListener('DOMContentLoaded', function () {
  const addProductForm = document.getElementById('add-product-form'); // Target only the specific form

  if (addProductForm) {
    addProductForm.addEventListener('submit', function (event) {
      event.preventDefault(); 

      const errorMessages = addProductForm.querySelectorAll('.error-message');
      errorMessages.forEach(function (error) {
        error.textContent = '';
      });

      let valid = true;
      const productName = addProductForm.querySelector('[name="name"]').value;
      const category = addProductForm.querySelector('[name="category"]').value;
      const price = addProductForm.querySelector('[name="price"]').value;
      const piece = addProductForm.querySelector('[name="piece"]').value;
      const gender = addProductForm.querySelector('[name="gender"]').value;
      const sizes = addProductForm.querySelectorAll('[name="size[]"]:checked');

      if (!productName) {
        valid = false;
        addProductForm.querySelector('[name="name"]').insertAdjacentHTML(
          'afterend',
          '<p class="error-message text-danger">This field is required.</p>'
        );
      }

      if (!category) {
        valid = false;
        addProductForm.querySelector('[name="category"]').insertAdjacentHTML(
          'afterend',
          '<p class="error-message text-danger">This field is required.</p>'
        );
      }

      if (!price || price < 200 || price > 1000) {
        valid = false;
        addProductForm.querySelector('[name="price"]').insertAdjacentHTML(
          'afterend',
          '<p class="error-message text-danger">Enter a valid price.</p>'
        );
      }

      if (!piece || piece <= 0) {
        valid = false;
        addProductForm.querySelector('[name="piece"]').insertAdjacentHTML(
          'afterend',
          '<p class="error-message text-danger">Enter a valid number.</p>'
        );
      }

      if (!gender) {
        valid = false;
        addProductForm.querySelector('[name="gender"]').insertAdjacentHTML(
          'afterend',
          '<p class="error-message text-danger">This field is required.</p>'
        );
      }

      if (sizes.length === 0) {
        valid = false;
        addProductForm.querySelector('[name="size[]"]').insertAdjacentHTML(
          'afterend',
          '<p class="error-message text-danger">At least one size must be selected.</p>'
        );
      }

      if (valid) {
        addProductForm.submit();
      }
    });
  }
});
