document.addEventListener('DOMContentLoaded', function () {
  const addProductForm = document.getElementById('add-product-form'); 

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
      const gender = addProductForm.querySelector('[name="gender"]').value;
      const imageInput = addProductForm.querySelector('[name="images"]');
      const files = imageInput.files;  

      // Validate product name
      if (!productName) {
        valid = false;
        addProductForm.querySelector('[name="name"]').insertAdjacentHTML(
          'afterend',
          '<p class="error-message text-danger">This field is required.</p>'
        );
      }

      // Validate category
      if (!category) {
        valid = false;
        addProductForm.querySelector('[name="category"]').insertAdjacentHTML(
          'afterend',
          '<p class="error-message text-danger">This field is required.</p>'
        );
      }

      // Validate price
      if (!price || price < 200 || price > 1000) {
        valid = false;
        addProductForm.querySelector('[name="price"]').insertAdjacentHTML(
          'afterend',
          '<p class="error-message text-danger">Enter a valid price.</p>'
        );
      }

      // Validate gender
      if (!gender) {
        valid = false;
        addProductForm.querySelector('[name="gender"]').insertAdjacentHTML(
          'afterend',
          '<p class="error-message text-danger">This field is required.</p>'
        );
      }

      // Validate images (check file type and size)
      const allowedFileTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const maxFileSize = 10 * 1024 * 1024; // 10MB

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Check file type
        if (!allowedFileTypes.includes(file.type)) {
          valid = false;
          imageInput.insertAdjacentHTML(
            'afterend',
            '<p class="error-message text-danger">Only image files (JPEG, JPG, PNG) are allowed.</p>'
          );
          break;
        }

        // Check file size
        if (file.size > maxFileSize) {
          valid = false;
          imageInput.insertAdjacentHTML(
            'afterend',
            '<p class="error-message text-danger">Each image must be smaller than 10MB.</p>'
          );
          break;
        }
      }
      const sizeNames = addProductForm.querySelectorAll('[name="sizeName[]"]');
      const sizeQuantities = addProductForm.querySelectorAll('[name="sizeQuantity[]"]');
      const sizeData = [];
      sizeNames.forEach((sizeInput, index) => {
        const size = sizeInput.value.trim();
        const quantity = sizeQuantities[index].value.trim();

        if (!size || !quantity) {
          valid = false;
          sizeInput.insertAdjacentHTML(
            'afterend',
            '<p class="error-message text-danger">Both size and quantity are required.</p>'
          );
        }

        if (quantity && (isNaN(quantity) || quantity <= 0)) {
          valid = false;
          sizeQuantities[index].insertAdjacentHTML(
            'afterend',
            '<p class="error-message text-danger">Enter a valid quantity (must be greater than 0).</p>'
          );
        }

        if (size && !sizeData.includes(size)) {
          sizeData.push(size);
        } else if (size) {
          valid = false;
          sizeInput.insertAdjacentHTML(
            'afterend',
            `<p class="error-message text-danger">Size "${size}" cannot be added twice.</p>`
          );
        }
      });

      if (valid) {
        addProductForm.submit();
      }
    });
  }
});
