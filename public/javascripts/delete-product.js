document.addEventListener('DOMContentLoaded', () => {
  const deleteButtons = document.querySelectorAll('.btn-delete');

  deleteButtons.forEach(button => {
    button.addEventListener('click', async (event) => {
      const productId = event.target.getAttribute('data-id');

      if (confirm('Are you sure you want to delete this product?')) {
        try {
          const response = await fetch(`/products/delete/${productId}`, {
            method: 'DELETE',
          });

          const result = await response.json();

          if (result.success) {
            alert(result.message);
            location.reload(); 
          } else {
            alert(result.message);
          }
        } catch (error) {
          console.error('Error deleting product:', error);
          alert('Failed to delete the product.');
        }
      }
    });
  });
});
