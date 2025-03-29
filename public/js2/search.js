let debounceTimer;
async function fetchKeywords() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const searchTerm = document.getElementById("search").value.replace(/_/g, ' '); // Replace underscores with spaces
    if (searchTerm.length > 2) {
      const response = await fetch(`/search/searchKeywords?q=${searchTerm}`);
      const keywords = await response.json();

      const dropdownMenu = document.getElementById("dropdown-menu");
      dropdownMenu.innerHTML = "";

      if (keywords.length > 0) {
        keywords.forEach((item) => {
          const li = document.createElement("li");
          li.textContent = item.keyword.replace(/_/g, ' '); // Replace underscores with spaces in keyword
          li.onclick = () => navigateToProductDetail(item.keyword.replace(/_/g, ' ')); // Ensure no underscores in navigation
          dropdownMenu.appendChild(li);
        });
        dropdownMenu.style.display = "block";
      } else {
        const li = document.createElement("li");
        li.textContent = "No results found";
        dropdownMenu.appendChild(li);
        dropdownMenu.style.display = "block";
      }
    } else {
      document.getElementById("dropdown-menu").style.display = "none";
    }
  }, 300); // Delay of 300ms
}

function navigateToProductDetail(keyword) {
  window.location.href = `/product.html?product=${keyword.replace(/_/g, ' ')}`; // Replace underscores in URL parameter
}