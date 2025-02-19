const pathname = window.location.pathname;
const category = pathname.split("/")[1];
const subcategory = pathname.split("/")[2];
// console.log(category);
// const pathSegments = pathname.split("/").filter((segment) => segment);
document.addEventListener("DOMContentLoaded", () => {
  // Determine the endpoint based on the category
  let endpoint;
  switch (category) {
    case "seasonal_plants":
      endpoint = `/header/season/${subcategory}`;
      break;
    case "suitable_locations":
      endpoint = `/header/suitable_locations/${subcategory}`;
      break;
    case "plant_types":
      endpoint = `/header/plant_types/${subcategory}`;
      break;
    case "flower_varieties":
      endpoint = `/header/flower_varieties/${subcategory}`;
      break;
    case "occassion":
      endpoint = `/header/bouquet/occassion/${subcategory}`;
      break;
    case "wrapping-style":
      endpoint = `/header/bouquet/wrapping/${subcategory}`;
      break;
    case "arrangement-type":
      endpoint = `/header/bouquet/type/${subcategory}`;
      break;
    case "flower-varieties":
      endpoint = `/header/bouquet/flowers/${subcategory}`;
      break;
    case "pots":
      endpoint = `/header/pots/type/${subcategory}`;
      break;
    case "fertilizers":
      endpoint = `/header/fertilizers/type/${subcategory}`;
      break;
  }
  // Call the fetchData function with the determined endpoint
  fetchData(endpoint);
});
const fetchData = (endpoint) => {
  // console.log(endpoint);

  fetch(endpoint)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      var plantsdata = data;
      var tp = document.getElementById("tp");
      tp.textContent = data.count;
      switch (category) {
        case "seasonal_plants":
          {
            switch (subcategory) {
              case "summer":
                var breadcrumb = document.getElementById("breadcrumb1");
                if (breadcrumb) {
                  breadcrumb.textContent = "Plants > Seasonal Plants > Summer";
                }
                var heading = document.getElementById("heading");
                heading.textContent = "Summer";
                var info1 = document.getElementById("info1");
                info1.textContent =
                  "";
                break;
              case "winter":
                var breadcrumb = document.getElementById("breadcrumb1");
                if (breadcrumb) {
                  breadcrumb.textContent = "Plants > Seasonal Plants > Winter";
                }
                var heading = document.getElementById("heading");
                heading.textContent = "Winter";
                var info1 = document.getElementById("info1");
                info1.textContent =
                  "";
                break;
              case "monsoon":
                var breadcrumb = document.getElementById("breadcrumb1");
                if (breadcrumb) {
                  breadcrumb.textContent = "Plants > Seasonal Plants > Monsoon";
                }
                var heading = document.getElementById("heading");
                heading.textContent = "Monsoon";
                var info1 = document.getElementById("info1");
                info1.textContent =
                  "";
                break;
              case "spring":
                var breadcrumb = document.getElementById("breadcrumb1");
                if (breadcrumb) {
                  breadcrumb.textContent = "Plants > Seasonal Plants > Spring";
                }
                var heading = document.getElementById("heading");
                heading.textContent = "Spring";
                var info1 = document.getElementById("info1");
                info1.textContent =
                  "";
                break;
              case "autumn":
                var breadcrumb = document.getElementById("breadcrumb1");
                if (breadcrumb) {
                  breadcrumb.textContent = "Plants > Seasonal Plants > Autumn";
                }
                var heading = document.getElementById("heading");
                heading.textContent = "Autumn";
                var info1 = document.getElementById("info1");
                info1.textContent =
                  "";
                break;
              case "all-seasons":
                var breadcrumb = document.getElementById("breadcrumb1");
                if (breadcrumb) {
                  breadcrumb.textContent =
                    "Plants > Seasonal Plants > All Seasons";
                }
                var heading = document.getElementById("heading");
                heading.textContent = "All Season";
                var info1 = document.getElementById("info1");
                info1.textContent =
                  "";
                break;
            }
            displayProducts(plantsdata);
          }
          break;
        case "suitable_locations":
          {
            switch (subcategory) {
              case "indoor":
                var breadcrumb = document.getElementById("breadcrumb1");
                if (breadcrumb) {
                  breadcrumb.textContent =
                    "Plants > Suitable Locations > Indoor";
                }
                var heading = document.getElementById("heading");
                heading.textContent = "Indoor";
                var info1 = document.getElementById("info1");
                info1.textContent =
                  "";
                break;
              case "outdoor":
                var breadcrumb = document.getElementById("breadcrumb1");
                if (breadcrumb) {
                  breadcrumb.textContent =
                    "Plants > Suitable Locations > Outdoor";
                }
                var heading = document.getElementById("heading");
                heading.textContent = "Outdoor";
                var info1 = document.getElementById("info1");
                info1.textContent =
                  "";
                break;
              case "office":
                var breadcrumb = document.getElementById("breadcrumb1");
                if (breadcrumb) {
                  breadcrumb.textContent =
                    "Plants > Suitable Locations > Office";
                }
                var heading = document.getElementById("heading");
                heading.textContent = "Office";
                var info1 = document.getElementById("info1");
                info1.textContent =
                  "";
                break;
              case "balcony":
                var breadcrumb = document.getElementById("breadcrumb1");
                if (breadcrumb) {
                  breadcrumb.textContent =
                    "Plants > Suitable Locations > Balcony";
                }
                var heading = document.getElementById("heading");
                heading.textContent = "Balcony";
                var info1 = document.getElementById("info1");
                info1.textContent =
                  "";
                break;
              case "bedroom":
                var breadcrumb = document.getElementById("breadcrumb1");
                if (breadcrumb) {
                  breadcrumb.textContent =
                    "Plants > Suitable Locations > Bedroom";
                }
                var heading = document.getElementById("heading");
                heading.textContent = "Bedroom";
                var info1 = document.getElementById("info1");
                info1.textContent =
                  "";
                break;
              case "terrace":
                var breadcrumb = document.getElementById("breadcrumb1");
                if (breadcrumb) {
                  breadcrumb.textContent =
                    "Plants > Suitable Locations > Terrace";
                }
                var heading = document.getElementById("heading");
                heading.textContent = "Terrace";
                var info1 = document.getElementById("info1");
                info1.textContent =
                  "";
                break;
              case "living-room":
                var breadcrumb = document.getElementById("breadcrumb1");
                if (breadcrumb) {
                  breadcrumb.textContent =
                    "Plants > Suitable Locations > Living Room";
                }
                var heading = document.getElementById("heading");
                heading.textContent = "Living Room";
                var info1 = document.getElementById("info1");
                info1.textContent =
                  "";
                break;
            }
          }
          displayProducts(plantsdata);
          break;
        case "plant_types":
          switch (subcategory) {
            case "air-plants":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Plants > Plant Types > Air Plants";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Air Plants";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "bamboo":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Plants > Plant Types > Bamboo";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Bamboo";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "climber":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Plants > Plant Types > Climber";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Climber";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "creeper":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Plants > Plant Types > Creeper";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Creeper";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "herb":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Plants > Plant Types > Herbs";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Herbs";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "shrubs":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Plants > Plant Types > Shrubs";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Shrubs";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "cactus":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Plants > Plant Types > Cactus";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Cactus";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
          }
          displayProducts(plantsdata);
          break;
        case "flower_varieties":
          switch (subcategory) {
            case "rose":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Plants > Flower Varieties > Rose";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Rose";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "adenium":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Plants > Flower Varieties > Adenium";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Adenium";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "lily":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Plants > Flower Varieties > Lily";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Lily";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "hibiscus":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Plants > Flower Varieties > Hibiscus";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Hibiscus";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "jasmine":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Plants > Flower Varieities > Jasmine";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Jasmine";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "marigold":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Plants > Flower Varieties > Marigold";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Marigold";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "carnation":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent =
                  "Plants > Flower Varieties > Carnation";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Carnation";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
          }
          displayProducts(plantsdata);
          break;
        case "occassion":
          switch (subcategory) {
            case "birthday":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Bouquets > Occassion > Birthday";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Birthday";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "anniversary":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Bouquets > Occassion > Anniversary";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Anniversary";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "congratulations":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent =
                  "Bouquets > Occassion > Congratulations";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Congratulations";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "get-well-soon":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Bouquets > Occassion > Get Well Soon";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Get Well Soon";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "farewell":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Bouquets > Occassion > Farewell";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Farewell";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "condolences":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Bouquets > Occassion > Condolences";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Condolences";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
          }
          displayProducts(plantsdata);
          break;
        case "wrapping-style":
          switch (subcategory) {
            case "flowers-in-a-box":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent =
                  "Bouquets > Wrapping Style > Flowers in a Box";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Flowers in a Box";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "flowers-in-vase":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent =
                  "Bouquets > Wrapping Style > Flowers in Vase";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Flowers in Vase";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "ribbon-wrapped":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent =
                  "Bouquets > Wrapping Style > Ribbon Wrapped";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Ribbon Wrapped";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "flower-basket":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent =
                  "Bouquets > Wrapping Style > Flower Basket";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Flower Basket";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "cellophane-wrapped":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent =
                  "Bouquets > Wrapping Style > Cellophane Wrapped";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Cellophane Wrapped";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "tissue-wrapped":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent =
                  "Bouquets > Wrapping Style > Tissue Wrapped";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Tissue Wrapped";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
          }
          displayProducts(plantsdata);
          break;
        case "arrangement-type":
          switch (subcategory) {
            case "heart-shape":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent =
                  "Bouquets > Arrangement Type > Heart Shape";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Heart Shape";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "flower-basket":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent =
                  "Bouquets > Arrangement Type > Flower Basket";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Flower Basket";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "flower-in-glass":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent =
                  "Bouquets > Arangement Type > Flowers in Glass";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Flowers in Glass";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "hand-bouquet":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent =
                  "Bouquets > Arrangement Type > Hand Bouquet";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Hand Bouquet";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
          }
          displayProducts(plantsdata);
          break;
        case "flower-varieties":
          switch (subcategory) {
            case "rose-bouquet":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent =
                  "Bouquets > Flower Varieties > Rose Bouquet";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Rose Bouquet";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "carnations-bouquet":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent =
                  "Bouquets > Flower Varieties > Carnations Bouquet";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Carnations Bouquet";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "lily-bouquet":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent =
                  "Bouquets > Flower Varieties > Lily Bouquet";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Lily Bouquet";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "mixed-flowers-bouquet":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent =
                  "Bouquets > Flower Varieties > Mixed Flowers Bouquet";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Mixed Flowers Bouquet";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
          }
          displayProducts(plantsdata);
          break;
        case "pots":
          switch (subcategory) {
            case "plastic":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Pots > Plastic";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Plastic Pots";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "ceramic":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Pots > Ceramic";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Ceramic pots";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "glass":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Pots > Glass";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Glass pots";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "resin":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Pots > Resin";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Resin Pots";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "vase":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Pots > Vase";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Vase";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "hanging-pots":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Pots > Hanging-pots";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Hanging Pots";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
          }
          displayProducts(plantsdata);
          break;
        case "fertilizers":
          switch (subcategory) {
            case "organic":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Fertilizers > Organic";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Organic Fertilizer";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "potting-soil":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Fertilizers > Potting Soil";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Potting Soil";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "cocopeat":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Fertilizers > Cocopeat";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Cocopeat";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "manure":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Fertilizers > Manure";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Manure";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
            case "compost":
              var breadcrumb = document.getElementById("breadcrumb1");
              if (breadcrumb) {
                breadcrumb.textContent = "Fertilizer > Compost";
              }
              var heading = document.getElementById("heading");
              heading.textContent = "Compost";
              var info1 = document.getElementById("info1");
              info1.textContent =
                "";
              break;
          }
          displayProducts(plantsdata);
          break;
      }
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
};

function displayProducts(data) {
  console.log(data);
  for (var i = 0; i < data.count; i++) {
    var newImagePath = "../" + data.items[i].image;
    data.items[i].image = newImagePath;
  }
  const productContainer = document.getElementById("product-container");
  productContainer.innerHTML = "";
  var product = data.items;

  product.forEach((data) => {
    const productHTML = `
      <div class="product-card">
      <a href="/product.html?product=${data.name}">
        <img src="${data.image}" alt="${data.name}" class="product-image">
        <h3 class="product-name">${data.name}</h3>
        <p class="product-price">₹${data.price}</p>
        </a>
      </div>
    `;
    productContainer.innerHTML += productHTML;
  });
}
function displayNewArrivals(data) {
  const productContainer = document.getElementById("newarrival-container");
  productContainer.innerHTML = "";
  var products = data;

  products.forEach((item) => {
    const productHTML = `
      <div class="product-card">
        <img src="${item.PATH1}" alt="${item.P_NAME}" class="product-image">
        <h3 class="product-name">${item.P_NAME}</h3>
        <p class="product-price">₹${item.P_PRICE}</p>
      </div>
    `;
    productContainer.innerHTML += productHTML;
  });
}

// const dropdowns = {
//   sizeFilter: ["Size", ...options],
//   colorFilter: ["Color", ...options],
//   defaultSorting: ["Default Sorting", ...options],
// };

// // Function to populate select elements
// function populateDropdown(id, options) {
//   const select = document.getElementById(id);
//   options.forEach((option) => {
//     const opt = document.createElement("option");
//     opt.value = option.value;
//     opt.textContent = option.text;
//     select.appendChild(opt);
//   });
// }

// // Populate all dropdowns
// Object.keys(dropdowns).forEach((id) => {
//   populateDropdown(
//     id,
//     dropdowns[id].map((text, index) => ({
//       value: index.toString(),
//       text,
//     }))
//   );
// });
