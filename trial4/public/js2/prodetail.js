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
    prodid = data.productId;
    document.getElementById("product-title").textContent = data.name;
    document.getElementById("product-price").textContent += data.price;
    document.getElementById("product-description").innerHTML = data.description;
    document.getElementById("featured-image").src = "../" + data.images[0];
    const reviewContainer = document.getElementById("review-container");

    // Clear any existing content in the review container
    reviewContainer.innerHTML = "";

    // Loop through the feedback array and create elements to display the feedback
    data.feedback.forEach((feedback) => {
      const reviewElement = document.createElement("div");
      reviewElement.classList.add("review");

      reviewElement.innerHTML = `
    <div class="profile">
      <strong>${feedback.username}</strong>
      <div class="stars">${"⭐".repeat(feedback.star_rating)}</div>
      <div class="date">${new Date(feedback.f_date).toLocaleDateString(
        "en-GB"
      )}</div>
      <div class="comment">${feedback.f_desc}</div>
    </div>
  `;

      reviewContainer.appendChild(reviewElement);
    });

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
      return response.json();
    })
    .then((data) => {
      document.getElementById("message").innerHTML = data.message;
    })
    .catch((error) => {
      const errorObj = JSON.parse(error.message);
      const messageElement = document.getElementById("message");
      messageElement.innerHTML = errorObj.error;
    });
}

const quantity = document.getElementById("quantity");
let quantityValue;
function addtocart() {
  quantityValue = quantity.valueAsNumber;
  if (isNaN(quantityValue) || quantityValue <= 0) {
    quantityValue = 1; // Set default value to 1 if the input is invalid
  }
  fetch("/cart/addFromProduct", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prodname: productName,
      quantity: quantityValue,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.text().then((text) => {
          throw new Error(text);
        });
      }
      return response.json();
    })
    .then((data) => {
      document.getElementById("message").innerHTML = data.message;
    })
    .catch((error) => {
      const errorObj = JSON.parse(error.message);
      const messageElement = document.getElementById("message");
      messageElement.innerHTML = errorObj.message;
    });
}

fetch("/best-selling")
  .then((response) => response.json())
  .then((data) => {
    displayNewArrivals(data);
  });

const displayNewArrivals = (data) => {
  const productContainer = document.getElementById("newarrival-container");
  productContainer.innerHTML = "";

  if (data && data.forEach) {
    data.forEach((item) => {
      const formattedName = item.P_NAME.replace(/_/g, " ");
      const productHTML = `
          <div class="product-card">
            <a href="/product.html?product=${item.P_NAME}">
              <img src="../${item.PATH1}" alt="${formattedName}">
              <h3 class="product-name">${formattedName}</h3>
              <p class="product-price">₹${item.P_PRICE}</p>
            </a>
          </div>
        `;
      productContainer.innerHTML += productHTML;
    });
  } else {
    console.error("Error: new arrivals is not an array or undefined");
  }
};
document.getElementById("write-review").addEventListener("click", () => {
  const feedbackContainer = document.getElementById("feedback-container");
  const feedbackForm = `
    <div class="card">
      <div class="card-header">
        <button class="close-btn" id="close-feedback">&times;</button>
      </div>
      <div class="card-body">
        <div class="stars" id="star-container">
          <i class="fas fa-star" data-rating="1" id="one"></i>
          <i class="fas fa-star" data-rating="2" id="two"></i>
          <i class="fas fa-star" data-rating="3" id="three"></i>
          <i class="fas fa-star" data-rating="4" id="four"></i>
          <i class="fas fa-star" data-rating="5" id="five"></i>
        </div>
        <textarea id="feedback-text" rows="10" placeholder="Please, leave a message"></textarea>
        <button class="cta" id="submit-feedback">Submit Feedback</button><br />
      </div>
    </div>
  `;
  feedbackContainer.innerHTML = feedbackForm;

  // Close button functionality
  document.getElementById("close-feedback").addEventListener("click", () => {
    feedbackContainer.innerHTML = ""; // Clear the feedback form
  });

  let starRating = 0;
  const stars = document.querySelectorAll(".stars i");
  stars.forEach((star) => {
    star.addEventListener("click", () => {
      starRating = star.getAttribute("data-rating");
      stars.forEach((s, index) => {
        s.classList.toggle("selected", index < starRating);
      });
    });
  });

  // Event listener for submitting feedback
  document.getElementById("submit-feedback").addEventListener("click", () => {
    const feedbackText = document.getElementById("feedback-text").value;

    fetch("/feedback/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId: prodid,
        description: feedbackText,
        starRating: starRating,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          return response.text().then((text) => {
            throw new Error(text);
          });
        }
        return response.json();
      })
      .then((data) => {
        alert("Feedback has been submitted successfully!");
        location.reload(); // Reload the page
      })
      .catch((error) => {
        const errorObj = JSON.parse(error.message);
        const messageElement = document.getElementById("message");
        messageElement.innerHTML = errorObj.error;
      });
  });
});
function maxqty() {
  var i = document.getElementById("quantity").value;
  if (i == 10) {
    alert("Cannot add more than 10 items");
  }
}
