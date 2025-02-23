document.addEventListener('DOMContentLoaded', function() {
  const categoryForm = document.getElementById('category-form');
  const productContainer = document.querySelector('.product-section .row');

  function filterProducts() {
    const selectedCategories = Array.from(categoryForm.querySelectorAll('input[type="checkbox"]:checked'))
      .map(input => input.value);  

    const products = document.querySelectorAll('.product-card');
    products.forEach(product => {
      const productCategories = JSON.parse(product.dataset.categories); 
      const showProduct = selectedCategories.every(category => productCategories.includes(category));

      if (showProduct || selectedCategories.length === 0) {
        product.style.display = 'block';  
      } else {
        product.style.display = 'none';   t
      }
    });
  }


  categoryForm.addEventListener('change', filterProducts);


  filterProducts();
});
document.getElementById("sort-by").addEventListener('change',function(){
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set('sort',this.value);
  window.location.search = urlParams.toString();
})
