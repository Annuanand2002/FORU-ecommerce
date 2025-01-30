
  // Function to re-apply active class when content changes
  function setActiveLink() {
    // Get all the sidebar links
    const sidebarLinks = document.querySelectorAll('.custom-link');
    
    // Remove active class from all links
    sidebarLinks.forEach(link => link.classList.remove('active'));

    // Get the current URL path and add active class to corresponding link
    const currentPath = window.location.pathname;

    // Select the corresponding link based on the current path
    if (currentPath.includes('dashboard')) {
      document.getElementById('dashboardLink').classList.add('active');
    } else if (currentPath.includes('products')) {
      document.getElementById('productsLink').classList.add('active');
    } else if (currentPath.includes('user')) {
      document.getElementById('usersLink').classList.add('active');
    } else if (currentPath.includes('orders')) {
      document.getElementById('ordersLink').classList.add('active');
    } else if (currentPath.includes('category')) {
      document.getElementById('categoryLink').classList.add('active');
    } else if (currentPath.includes('coupon')) {
      document.getElementById('couponLink').classList.add('active');
    } else if (currentPath.includes('logout')) {
      document.getElementById('logoutLink').classList.add('active');
    }
  }

  // Run the function on page load
  window.onload = setActiveLink;

  // Optionally, you can also listen for state changes if you're using AJAX or dynamic loading
  // Example using popstate event (for single-page applications with client-side routing)
  window.addEventListener('popstate', setActiveLink);

