document.getElementById('editProductForm').addEventListener('submit', function (e) {
    let valid = true;

    // Clear previous error messages
    document.getElementById('nameError').textContent = '';
    document.getElementById('priceError').textContent = '';
    document.getElementById('pieceError').textContent = '';

    const name = document.getElementById('name').value.trim();
    const price = parseFloat(document.getElementById('price').value.trim());
    const piece = parseInt(document.getElementById('piece').value.trim());
    const nameError = 'Product Name is required.';
    const priceError = 'Price must be between 100 and 1000.';
    const pieceError = 'Enter a valid value.';

    // Validate Name
    if (!name) {
      document.getElementById('nameError').textContent = nameError;
      valid = false;
    }

    // Validate Price
    if (!price || price < 100 || price > 1000) {
      document.getElementById('priceError').textContent = priceError;
      valid = false;
    }

    // Validate Piece
    if (!piece || piece < 0) {
      document.getElementById('pieceError').textContent = pieceError;
      valid = false;
    }

    // If invalid, prevent form submission
    if (!valid) {
      e.preventDefault();
    }
  });

