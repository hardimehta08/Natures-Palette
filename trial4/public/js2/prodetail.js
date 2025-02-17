// Function to get the product name from the URL
function getProductNameFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("product");
}
var prodid;

// Fetching product details using the product name from the URL
const productName = getProductNameFromURL();
fetch(`/product/${productName}`)
  .then((response) => response.json())
  .then((data) => {
    console.log(data);
    prodid = data.productId;
    document.getElementById("product-title").textContent = data.name;
    document.getElementById("product-price").textContent += data.price;
    document.getElementById("product-description").innerHTML = data.description;
    document.getElementById("featured-image").src = "../" + data.images[0];
    const thumbnailContainer = document.getElementById("thumbnail-container");
    data.images.forEach((src, index) => {
      const img = document.createElement("img");
      img.src = "../" + src;
      img.alt = `Thumbnail ${index + 1}`;
      img.classList.add("small-img");
      img.addEventListener("click", () => {
        document.getElementById("featured-image").src = "../" + src;
      });
      thumbnailContainer.appendChild(img);
    });
  });
function wishlist() {
  fetch("/wishlist/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prodid: prodid }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.text().then((text) => {
          throw new Error(text);
        });
      }
      return response.text(); // Read the response as text
    })
    .then((message) => {
      const messageElement = document.querySelector(".message");
      messageElement.innerHTML = message; // Set the message element content
    })
    .catch((error) => {
      console.error("Error:", error);
      const messageElement = document.querySelector(".message");
      messageElement.innerHTML = error.message; // Display the error message
    });
}
const quantity = document.getElementById("quantity");
function addtocart() {
  console.log(quantity.valueAsNumber);
  fetch("/cart/addFromProduct", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prodname: productName, quantity: quantity.valueAsNumber }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.text().then((text) => {
          throw new Error(text);
        });
      }
      return response.text(); // Read the response as text
    })
    .then((message) => {
      const messageElement = document.querySelector(".message");
      messageElement.innerHTML = message; // Set the message element content
    })
    .catch((error) => {
      console.error("Error:", error);
      const messageElement = document.querySelector(".message");
      messageElement.innerHTML = error.message; // Display the error message
    });
}

// const reviewContainer = document.getElementById("review-container");
// let totalRating = 0;
// const product = [
//   {
//     id: 1,
//     name: "aaa",
//     price: 599,
//     category: "Plant",
//     image: "../Database(image)/Plant/P0001/1.jpg",
//     rating: 4.5,
//     isBestseller: true,
//     isNewArrival: false,
//     reviews: 3,
//   },
//   {
//     id: 2,
//     name: "bbb",
//     price: 999,
//     category: "Plant",
//     image: "../Database/Plant/P0001/2.jpg",
//     rating: 4.7,
//     isBestseller: true,
//     isNewArrival: false,
//     reviews: 2,
//   },
// ];
// for(i=0;i<product.length;i++){
// product.reviews.forEach((review) => {
//   totalRating += review.rating;
//   const reviewElement = document.createElement("div");
//   reviewElement.classList.add("profile");
//   reviewElement.innerHTML = `
//         <div class="thumb-name">
//           <img src=  "../Database(image)/Plant/P0001/1.jpg" alt="">
//             <div class="grouping">
//                 <strong>${review.name}</strong>
//                 <div class="ratingg">${"⭐".repeat(review.rating)}</div>
//                 <div class="date">${review.date}</div>
//             </div>
//         </div>
//         <div class="comment">${review.comment}</div>
//         <p class="gray">${review.desc}</p>
//         `;
//   reviewContainer.appendChild(reviewElement);
// });
// }

// // Calculate average rating
// const averageRating = (totalRating / product.reviews.length).toFixed(1);
// document.getElementById("average-rating").textContent = `${averageRating} ⭐`;
// document.getElementById(
//   "total-reviews"
// ).textContent = `${product.reviews.length} Reviews`;
// document.getElementById("review-count").textContent = product.reviews.length;

// // Tab switching functionality (Fixed)
// document.querySelectorAll(".tab-link").forEach((tab) => {
//   tab.addEventListener("click", () => {
//     // Remove active class from all tabs & sections
//     document
//       .querySelectorAll(".tab-link")
//       .forEach((t) => t.classList.remove("active"));
//     document
//       .querySelectorAll(".product-about")
//       .forEach((content) => content.classList.remove("active"));

//     // Activate clicked tab and corresponding section
//     tab.classList.add("active");
//     document.getElementById(tab.dataset.id).classList.add("active");
//   });
// });

const products1 = [
  {
    id: 1,
    name: "aaa",
    price: 599,
    category: "Plant",
    image: "../Database/Plant/P0001/1.jpg",
    rating: 4.5,
    isBestseller: true,
    isNewArrival: false,
  },
  {
    id: 2,
    name: "bbb",
    price: 999,
    category: "Plant",
    image: "../Database/Plant/P0001/2.jpg",
    rating: 4.7,
    isBestseller: true,
    isNewArrival: false,
  },
  {
    id: 3,
    name: "bbb",
    price: 999,
    category: "Plant",
    image: "../Database/Plant/P0001/2.jpg",
    rating: 4.7,
    isBestseller: true,
    isNewArrival: true,
  },
  {
    id: 5,
    name: "ccc",
    price: 20,
    category: "Bouquet",
    image: "../Database/Bouquet/B0001/1.jpg",
    rating: 4.2,
    isBestseller: true,
    isNewArrival: true,
  },
  {
    id: 6,
    name: "ddd",
    price: 40,
    category: "Bouquet",
    image: "../Database/Bouquet/B0002/2.jpg",
    rating: 4.3,
    isBestseller: true,
    isNewArrival: false,
  },
  {
    id: 7,
    name: "ddd",
    price: 40,
    category: "Bouquet",
    image: "../Database/Bouquet/B0003/1.png",
    rating: 4.3,
    isBestseller: true,
    isNewArrival: false,
  },
  {
    id: 8,
    name: "eee",
    price: 199,
    category: "Garden Decor",
    image: "../Database/Pot/PT001/1.png",
    rating: 4.3,
    isBestseller: false,
    isNewArrival: true,
  },
];
function displayProducts1(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = ""; // Clear previous products

  products1.forEach((product) => {
    const productCard = document.createElement("div");
    productCard.className = "product-card";
    productCard.innerHTML = `
      <a href="/product.html?product=${product.name}">
      <img src="${product.image}" alt="${product.name}">
      <h3>${product.name}</h3>
      <p>Rating: ${product.rating} ⭐</p>
      <p>Price: $${product.price}</p>
      <div class="product-icons">
         <a href="/wishlist/add" class="action__btn" aria-label="Add to Wishlist">
                <i class="fa-regular fa-heart"></i>
          </a>
              <a href="/cart/add" class="action__btn" aria-label="ADD TO CART">
                <i class="fa-solid fa-cart-shopping"></i>
              </a>
      </a>
      </div>
    `;
    container.appendChild(productCard);
  });
}
displayProducts1("newarrival-container");
