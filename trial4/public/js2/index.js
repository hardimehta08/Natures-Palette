// const categories = ["Plant", "Bouquet", "Garden Decor"];
// function createCategoryButtons(sectionId, containerId, endpoint) {
//   console.log(`Creating category buttons for section: ${sectionId}, container: ${containerId}, endpoint: ${endpoint}`);
//   const buttonContainer = document.getElementById(sectionId);
//   if (!buttonContainer) {
//     console.error(`Button container not found: ${sectionId}`);
//     return;
//   }

//   buttonContainer.innerHTML = "";

//   categories.forEach((category, index) => {
//     const button = document.createElement("button");
//     button.textContent = category;
//     button.className = "filter-button";
//     button.dataset.category = category;
//     button.addEventListener("click", function () {
//       document
//         .querySelectorAll(`#${sectionId} .filter-button`)
//         .forEach((btn) => btn.classList.remove("active"));
//       this.classList.add("active");
//       displayItems(containerId, `${endpoint}?category=${category}`);
//     });

//     buttonContainer.appendChild(button);

//     if (index === 0) button.classList.add("active");
//   });
// }

async function fetchProducts(endpoint, containerId) {
  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const products = await response.json();
    console.log(`Fetched products from ${endpoint}:`, products);

    const container = document.getElementById(containerId);
    container.innerHTML = "";

    products.forEach((product) => {
      const productCard = document.createElement("div");
      productCard.className = "product-card";
      productCard.innerHTML = `
          <a href="/product.html?product=${product.P_NAME}">
              <img src="${product.PATH1}" alt="${product.P_NAME}" width="150px">
              <h3>${product.P_NAME}</h3>
              <p>Price: ₹${product.P_PRICE}</p>
              <div class="product-icons">
                  <a href="#" class="action__btn" aria-label="Add to Wishlist">
                      <i class="fa-regular fa-heart"></i>
                  </a>
                  <a href="#" class="action__btn" aria-label="ADD TO CART">
                      <i class="fa-solid fa-cart-shopping"></i>
                  </a>
                  </a>
              </div>
          `;
      container.appendChild(productCard);
    });
  } catch (error) {
    console.error("Error fetching products:", error);
  }
}

// Fetch Best-Selling Products
fetchProducts("/best-selling", "bestseller-container");

// Fetch Fresh Arrivals
fetchProducts("/fresh-arrivals", "newarrival-container");

document.addEventListener("DOMContentLoaded", function () {
  setupSlider(
    "bestseller-container",
    "slide-left-bestseller",
    "slide-right-bestseller"
  );
  setupSlider(
    "newarrival-container",
    "slide-left-newarrival",
    "slide-right-newarrival"
  );
});

function setupSlider(containerId, leftBtnId, rightBtnId) {
  const container = document.getElementById(containerId);
  const btnLeft = document.getElementById(leftBtnId);
  const btnRight = document.getElementById(rightBtnId);

  let scrollAmount = 0;
  const productWidth = container.clientWidth / 4; // Show 4 products at a time
  const maxScroll = productWidth * 4; // Scrollable up to 8 products

  btnRight.addEventListener("click", function () {
    if (scrollAmount < maxScroll) {
      scrollAmount += productWidth;
      container.scrollTo({ left: scrollAmount, behavior: "smooth" });
    }
  });

  btnLeft.addEventListener("click", function () {
    if (scrollAmount > 0) {
      scrollAmount -= productWidth;
      container.scrollTo({ left: scrollAmount, behavior: "smooth" });
    }
  });
}

document.addEventListener("DOMContentLoaded", (event) => {
  async function fetchCategories() {
    try {
      const response = await fetch("/fetch/fetch/fetchcategories");
      const categories = await response.json();
      const container = document.getElementById("categories-container");
      container.innerHTML = ""; // Clear the container before adding new content

      categories.forEach((category) => {
        const categoryDiv = document.createElement("div");
        categoryDiv.className = "category__item";

        const categoryLink = document.createElement("a");
        categoryLink.href = `/${category.CY_NAME.toLowerCase()}`;
        categoryLink.className = "category__item";

        const categoryImg = document.createElement("img");
        categoryImg.src = category.CY_IMAGE;
        categoryImg.alt = category.CY_NAME;
        categoryImg.className = "category__img";

        const categoryTitle = document.createElement("h3");
        categoryTitle.className = "category__title";
        categoryTitle.textContent = `${category.CY_NAME} →`;

        categoryLink.appendChild(categoryImg);
        categoryLink.appendChild(categoryTitle);
        categoryDiv.appendChild(categoryLink);
        container.appendChild(categoryDiv);
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }

  fetchCategories();
});
