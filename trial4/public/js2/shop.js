document.addEventListener("DOMContentLoaded", (event) => {
  const pathname = window.location.pathname;
  const pathSegments = pathname.split("/").filter((segment) => segment);

  let endpoint;
  if (pathSegments.length > 1) {
    const category = pathSegments[0];
    const subcategory = pathSegments[1];
    endpoint = `/fetch/category/${category}/${subcategory}`;
  } else {
    const category = pathSegments[0];
    endpoint = `/fetch/category/${category}`;
  }

  // Call the fetchData function with the dynamically constructed endpoint and pathSegments
  fetchData(endpoint, pathSegments, pathname);

  // Fetch best-selling data
  fetch("/best-selling")
    .then((response) => response.json())
    .then((data) => {
      for (let i = 0; i < data.length; i++) {
        let newImagePath = "../" + data[i].PATH1;
        data[i].PATH1 = newImagePath;
      }
      displayNewArrivals(data);
    });

  // Setup slider
  setupSlider(
    "newarrival-container",
    "slide-left-newarrival",
    "slide-right-newarrival"
  );
});

const fetchData = (endpoint, pathSegments, pathname) => {
  fetch(endpoint)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      console.log("Fetched data:", data);
      updateUI(pathSegments, data, pathname);
      displayProducts(data);
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
};

const updateUI = (pathSegments, data, pathname) => {
  const category = pathSegments[0];
  const subcategory = pathSegments[1] || null;
  const breadcrumb = document.getElementById("breadcrumb1");
  const heading = document.getElementById("heading");

  if (subcategory) {
    breadcrumb.textContent = `${capitalize(category)} > ${capitalize(
      subcategory.replace("_", " ")
    )}`;
    heading.textContent = capitalize(subcategory.replace("_", " "));
  } else {
    breadcrumb.textContent = capitalize(category);
    heading.textContent = capitalize(category);
  }

  const subcategories = data.items || [];
  subcategories.forEach((sub, index) => {
    const subCat = document.getElementById(`sub_cat${index + 1}`);
    const subCatImg = document.getElementById(`sub_cat_img${index + 1}`);
    const a = document.getElementById(`a${index + 1}`);

    if (subCat && subCatImg && a) {
      subCat.textContent = capitalize(sub.sub_name || sub.ss_name);
      subCatImg.src = sub.sub_image || sub.ss_image;
      a.href = `${pathname}/${(sub.sub_name || sub.ss_name).replace(" ", "_")}`;
    }
  });
};

const displayProducts = (data) => {
  const productContainer = document.getElementById("product-container");
  productContainer.innerHTML = "";
  const products = data.items;

  if (products && products.forEach) {
    products.forEach((product) => {
      const productHTML = `
        <div class="product-card">
        <a href="/product.html?product=${product.sub_name}">
          <img src="${product.sub_image}" alt="${product.sub_name}" class="">
          <h3 class="product-name">${product.sub_name}</h3>
          <p class="product-price">${product.sub_desc}</p>
        </a>
        </div>
      `;
      productContainer.innerHTML += productHTML;
    });
  } else {
    console.error("Error: products is not an array or undefined");
  }
};

const displayNewArrivals = (data) => {
  const productContainer = document.getElementById("newarrival-container");
  productContainer.innerHTML = "";
  const products = data;
  products.forEach((item) => {
    const productHTML = `
      <div class="product-card">
      <a href="/product.html?product=${item.P_NAME}">
        <img src="${item.PATH1}" alt="${item.P_NAME}">
        <h3 class="product-name">${item.P_NAME}</h3>
        <p class="product-price">₹${item.P_PRICE}</p>
      </a>
      </div>
    `;
    productContainer.innerHTML += productHTML;
  });
};

const setupSlider = (containerId, leftBtnId, rightBtnId) => {
  const container = document.getElementById(containerId);
  const btnLeft = document.getElementById(leftBtnId);
  const btnRight = document.getElementById(rightBtnId);

  if (!container || !btnLeft || !btnRight) {
    console.error("Slider elements not found");
    return;
  }

  let scrollAmount = 0;
  const productWidth = container.clientWidth / 4;
  const maxScroll = container.scrollWidth - container.clientWidth;

  btnRight.addEventListener("click", function () {
    scrollAmount = Math.min(scrollAmount + productWidth, maxScroll);
    container.scrollTo({ left: scrollAmount, behavior: "smooth" });
  });

  btnLeft.addEventListener("click", function () {
    scrollAmount = Math.max(scrollAmount - productWidth, 0);
    container.scrollTo({ left: scrollAmount, behavior: "smooth" });
  });
};

const capitalize = (str) => {
  if (typeof str !== "string") {
    console.error("capitalize: received non-string value", str);
    return "";
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// const pathname = window.location.pathname;
// const pathSegments = pathname.split("/").filter((segment) => segment);

// document.addEventListener("DOMContentLoaded", () => {
//   let endpoint;
//   if (pathSegments.length > 1) {
//     const category = pathSegments[0];
//     const subcategory = pathSegments[1];
//     endpoint = `/category/${category}/${subcategory}`;
//   } else {
//     const category = pathSegments[0];
//     endpoint = `/category/${category}`;
//   }
//   fetchData(endpoint);
// });
// fetch("/best-selling")
//   .then((response) => response.json())
//   .then((data) => {
//     for (var i = 0; i < data.length; i++) {
//       var newImagePath = "../" + data[i].PATH1;
//       data[i].PATH1 = newImagePath;
//     }
//     displayNewArrivals(data);
//   });
// const fetchData = (endpoint) => {
//   fetch(endpoint)
//     .then((response) => {
//       // console.log(pathSegments);
//       if (!response.ok) {
//         throw new Error("Network response was not ok");
//       }
//       return response.json();
//     })
//     .then((data) => {
//       if (pathSegments.length > 1) {
//         const category = pathSegments[0];
//         const subcategory = pathSegments[1];
//         switch (category) {
//           case "plants":
//             switch (subcategory) {
//               case "seasonal_plants":
//                 var breadcrumb = document.getElementById("breadcrumb1");
//                 if (breadcrumb) {
//                   breadcrumb.textContent = "Plants > Seasonal Plants";
//                 }
//                 var heading = document.getElementById("heading");
//                 heading.textContent = "Seasonal Plants";

//                 var info1 = document.getElementById("info1");
//                 info1.textContent = "";
//                 plantsdata = data;
//                 var tp = document.getElementById("tp");
//                 tp.textContent = data.count;

//                 var sub_cat1 = document.getElementById("sub_cat1");
//                 var sub_cat_img1 = document.getElementById("sub_cat_img1");
//                 sub_cat_img1.src = "../images/summer.jpeg";
//                 sub_cat1.textContent = "Summer";
//                 var a1 = document.getElementById("a1");
//                 sub_cat1.href = "/seasonal_plants/summer";
//                 a1.href = "/seasonal_plants/summer";

//                 var sub_cat2 = document.getElementById("sub_cat2");
//                 var sub_cat_img2 = document.getElementById("sub_cat_img2");
//                 sub_cat_img2.src = "../images/winter.jpeg";
//                 sub_cat2.textContent = "Winter";
//                 a1 = document.getElementById("a2");
//                 sub_cat2.href = "/seasonal_plants/winter";
//                 a1.href = "/seasonal_plants/winter";

//                 var sub_cat3 = document.getElementById("sub_cat3");
//                 var sub_cat_img3 = document.getElementById("sub_cat_img3");
//                 sub_cat_img3.src = "../images/monsoon.jpeg";
//                 sub_cat3.textContent = "Monsoon";
//                 a1 = document.getElementById("a3");
//                 sub_cat3.href = "/seasonal_plants/monsoon";
//                 a1.href = "/seasonal_plants/monsoon";

//                 var sub_cat4 = document.getElementById("sub_cat4");
//                 var sub_cat_img4 = document.getElementById("sub_cat_img4");
//                 sub_cat_img4.src = "../images/spring.jpeg";
//                 sub_cat4.textContent = "Spring";
//                 a1 = document.getElementById("a4");
//                 sub_cat4.href = "/seasonal_plants/spring";
//                 a1.href = "/seasonal_plants/spring";

//                 var sub_cat5 = document.getElementById("sub_cat5");
//                 var sub_cat_img5 = document.getElementById("sub_cat_img5");
//                 sub_cat_img5.src = "../images/autumn.jpeg";
//                 sub_cat5.textContent = "Autumn";
//                 a1 = document.getElementById("a5");
//                 sub_cat5.href = "/seasonal_plants/autumn";
//                 a1.href = "/seasonal_plants/autumn";

//                 var sub_cat6 = document.getElementById("sub_cat6");
//                 var sub_cat_img6 = document.getElementById("sub_cat_img6");
//                 sub_cat_img6.src = "../images/homeplant.jpg";
//                 sub_cat6.textContent = "All Season";
//                 a1 = document.getElementById("a6");
//                 sub_cat6.href = "/seasonal_plants/all-seasons";
//                 a1.href = "/seasonal_plants/all-seasons";

//                 document.getElementById("sub_cat7").hidden = true;
//                 document.getElementById("sub_cat_img7").hidden = true;
//                 break;
//               case "suitable_locations":
//                 var breadcrumb = document.getElementById("breadcrumb1");
//                 if (breadcrumb) {
//                   breadcrumb.textContent = "Plants > Suitable Locations";
//                 }
//                 var heading = document.getElementById("heading");
//                 heading.textContent = "Suitable Locations";

//                 var info1 = document.getElementById("info1");
//                 info1.textContent = "";
//                 plantsdata = data;
//                 var tp = document.getElementById("tp");
//                 tp.textContent = data.count;

//                 var sub_cat1 = document.getElementById("sub_cat1");
//                 var sub_cat_img1 = document.getElementById("sub_cat_img1");
//                 sub_cat_img1.src = "../images/plant1.jpeg";
//                 sub_cat1.textContent = "Indoor";
//                 var a1 = document.getElementById("a1");
//                 sub_cat1.href = "/suitable_locations/indoor";
//                 a1.href = "/suitable_locations/indoor";

//                 var sub_cat2 = document.getElementById("sub_cat2");
//                 var sub_cat_img2 = document.getElementById("sub_cat_img2");
//                 sub_cat_img2.src = "../images/outdoor.jpeg";
//                 sub_cat2.textContent = "Outdoor";
//                 a1 = document.getElementById("a2");
//                 sub_cat2.href = "/suitable_locations/outdoor";
//                 a1.href = "/suitable_locations/outdoor";

//                 var sub_cat3 = document.getElementById("sub_cat3");
//                 var sub_cat_img3 = document.getElementById("sub_cat_img3");
//                 sub_cat_img3.src = "../images/office.jpeg";
//                 sub_cat3.textContent = "Office";
//                 a1 = document.getElementById("a3");
//                 sub_cat3.href = "/suitable_locations/office";
//                 a1.href = "/suitable_locations/office";

//                 var sub_cat4 = document.getElementById("sub_cat4");
//                 var sub_cat_img4 = document.getElementById("sub_cat_img4");
//                 sub_cat_img4.src = "../images/balcony.jpeg";
//                 sub_cat4.textContent = "Balcony";
//                 a1 = document.getElementById("a4");
//                 sub_cat4.href = "/suitable_locations/balcony";
//                 a1.href = "/suitable_locations/balcony";

//                 var sub_cat5 = document.getElementById("sub_cat5");
//                 var sub_cat_img5 = document.getElementById("sub_cat_img5");
//                 sub_cat_img5.src = "../images/bedroom.jpeg";
//                 sub_cat5.textContent = "Bedroom";
//                 a1 = document.getElementById("a5");
//                 sub_cat5.href = "/suitable_locations/bedroom";
//                 a1.href = "/suitable_locations/bedroom";

//                 var sub_cat6 = document.getElementById("sub_cat6");
//                 var sub_cat_img6 = document.getElementById("sub_cat_img6");
//                 sub_cat_img6.src = "../images/terrace.jpeg";
//                 sub_cat6.textContent = "Terrace";
//                 a1 = document.getElementById("a6");
//                 sub_cat6.href = "/suitable_locations/terrace";
//                 a1.href = "/suitable_locations/terrace";

//                 var sub_cat7 = document.getElementById("sub_cat7");
//                 var sub_cat_img7 = document.getElementById("sub_cat_img7");
//                 sub_cat_img7.src = "../images/livingroom.jpeg";
//                 sub_cat7.textContent = "Living Room";
//                 a1 = document.getElementById("a7");
//                 sub_cat7.href = "/suitable_locations/living-room";
//                 a1.href = "/suitable_locations/living-room";
//                 break;
//               case "plant_types":
//                 var breadcrumb = document.getElementById("breadcrumb1");
//                 if (breadcrumb) {
//                   breadcrumb.textContent = "Plants > Plant Types";
//                 }
//                 var heading = document.getElementById("heading");
//                 heading.textContent = "Plant Types";

//                 var info1 = document.getElementById("info1");
//                 info1.textContent = "";
//                 plantsdata = data;
//                 var tp = document.getElementById("tp");
//                 tp.textContent = data.count;

//                 var sub_cat1 = document.getElementById("sub_cat1");
//                 var sub_cat_img1 = document.getElementById("sub_cat_img1");
//                 sub_cat_img1.src = "../images/air plant.jpeg";
//                 sub_cat1.textContent = "Air Plants";
//                 var a1 = document.getElementById("a1");
//                 sub_cat1.href = "/plant_types/air-plants";
//                 a1.href = "/plant_types/air-plants";

//                 var sub_cat2 = document.getElementById("sub_cat2");
//                 var sub_cat_img2 = document.getElementById("sub_cat_img2");
//                 sub_cat_img2.src = "../images/bamboo.jpeg";
//                 sub_cat2.textContent = "Bamboo";
//                 a1 = document.getElementById("a2");
//                 sub_cat2.href = "/plant_types/bamboo";
//                 a1.href = "/plant_types/bamboo";

//                 var sub_cat3 = document.getElementById("sub_cat3");
//                 var sub_cat_img3 = document.getElementById("sub_cat_img3");
//                 sub_cat_img3.src = "../images/climber.jpeg";
//                 sub_cat3.textContent = "Climber";
//                 a1 = document.getElementById("a3");
//                 sub_cat3.href = "/plant_types/climber";
//                 a1.href = "/plant_types/climber";

//                 var sub_cat4 = document.getElementById("sub_cat4");
//                 var sub_cat_img4 = document.getElementById("sub_cat_img4");
//                 sub_cat_img4.src = "../images/creeper.jpeg";
//                 sub_cat4.textContent = "Creeper";
//                 a1 = document.getElementById("a4");
//                 sub_cat4.href = "/plant_types/creeper";
//                 a1.href = "/plant_types/creeper";

//                 var sub_cat5 = document.getElementById("sub_cat5");
//                 var sub_cat_img5 = document.getElementById("sub_cat_img5");
//                 sub_cat_img5.src = "../images/cactus.jpeg";
//                 sub_cat5.textContent = "Cactus";
//                 a1 = document.getElementById("a5");
//                 sub_cat5.href = "/plant_types/cactus";
//                 a1.href = "/plant_types/cactus";

//                 var sub_cat6 = document.getElementById("sub_cat6");
//                 var sub_cat_img6 = document.getElementById("sub_cat_img6");
//                 sub_cat_img6.src = "../images/herbs.jpeg";
//                 sub_cat6.textContent = "Herbs";
//                 a1 = document.getElementById("a6");
//                 sub_cat6.href = "/plant_types/herb";
//                 a1.href = "/plant_types/herb";

//                 var sub_cat7 = document.getElementById("sub_cat7");
//                 var sub_cat_img7 = document.getElementById("sub_cat_img7");
//                 sub_cat_img7.src = "../images/shrubs.jpeg";
//                 sub_cat7.textContent = "Shrubs";
//                 a1 = document.getElementById("a7");
//                 sub_cat7.href = "/plant_types/shrubs";
//                 a1.href = "/plant_types/shrubs";
//                 break;
//               case "flower_varieties":
//                 var breadcrumb = document.getElementById("breadcrumb1");
//                 if (breadcrumb) {
//                   breadcrumb.textContent = "Plants > Flower Varieties";
//                 }
//                 var heading = document.getElementById("heading");
//                 heading.textContent = "Flower Varieties";

//                 var info1 = document.getElementById("info1");
//                 info1.textContent = "";
//                 plantsdata = data;
//                 var tp = document.getElementById("tp");
//                 tp.textContent = data.count;

//                 var sub_cat1 = document.getElementById("sub_cat1");
//                 var sub_cat_img1 = document.getElementById("sub_cat_img1");
//                 sub_cat_img1.src = "../images/adenium.jpeg";
//                 sub_cat1.textContent = "Adenium";
//                 var a1 = document.getElementById("a1");
//                 sub_cat1.href = "/flower_varieties/adenium";
//                 a1.href = "/flower_varieties/adenium";

//                 var sub_cat2 = document.getElementById("sub_cat2");
//                 var sub_cat_img2 = document.getElementById("sub_cat_img2");
//                 sub_cat_img2.src = "../images/rose.jpeg";
//                 sub_cat2.textContent = "Rose";
//                 a1 = document.getElementById("a2");
//                 sub_cat2.href = "/flower_varieties/rose";
//                 a1.href = "/flower_varieties/rose";

//                 var sub_cat3 = document.getElementById("sub_cat3");
//                 var sub_cat_img3 = document.getElementById("sub_cat_img3");
//                 sub_cat_img3.src = "../images/lily.jpeg";
//                 sub_cat3.textContent = "Lily";
//                 a1 = document.getElementById("a3");
//                 sub_cat3.href = "/flower_varieties/lily";
//                 a1.href = "/flower_varieties/lily";

//                 var sub_cat4 = document.getElementById("sub_cat4");
//                 var sub_cat_img4 = document.getElementById("sub_cat_img4");
//                 sub_cat_img4.src = "../images/hibiscus.jpeg";
//                 sub_cat4.textContent = "Hibiscus";
//                 a1 = document.getElementById("a4");
//                 sub_cat4.href = "/flower_varieties/hibiscus";
//                 a1.href = "/flower_varieties/hibiscus";

//                 var sub_cat5 = document.getElementById("sub_cat5");
//                 var sub_cat_img5 = document.getElementById("sub_cat_img5");
//                 sub_cat_img5.src = "../images/jasmine.jpeg";
//                 sub_cat5.textContent = "Jasmine";
//                 a1 = document.getElementById("a5");
//                 sub_cat5.href = "/flower_varieties/jasmine";
//                 a1.href = "/flower_varieties/jasmine";

//                 var sub_cat6 = document.getElementById("sub_cat6");
//                 var sub_cat_img6 = document.getElementById("sub_cat_img6");
//                 sub_cat_img6.src = "../images/marigold.jpeg";
//                 sub_cat6.textContent = "Marigold";
//                 a1 = document.getElementById("a6");
//                 sub_cat6.href = "/flower_varieties/marigold";
//                 a1.href = "/flower_varieties/marigold";

//                 var sub_cat7 = document.getElementById("sub_cat7");
//                 var sub_cat_img7 = document.getElementById("sub_cat_img7");
//                 sub_cat_img7.src = "../images/carnation.jpeg";
//                 sub_cat7.textContent = "Carnation";
//                 a1 = document.getElementById("a7");
//                 sub_cat7.href = "/flower_varieties/carnation";
//                 a1.href = "/flower_varieties/carnation";

//                 break;
//             }
//             for (var i = 0; i < data.items.length; i++) {
//               var newImagePath = "../" + data.items[i].image;
//               data.items[i].image = newImagePath;
//             }

//             // console.log(data);
//             displayProducts(data);
//             break;
//           case "bouquets":
//             console.log(subcategory);
//             switch (subcategory) {
//               case "occassion_type":
//                 var breadcrumb = document.getElementById("breadcrumb1");
//                 if (breadcrumb) {
//                   breadcrumb.textContent = "Bouquets > Occassion";
//                 }
//                 var heading = document.getElementById("heading");
//                 heading.textContent = "Occassion";

//                 var info1 = document.getElementById("info1");
//                 info1.textContent = "";
//                 plantsdata = data;
//                 var tp = document.getElementById("tp");
//                 tp.textContent = data.count;

//                 var sub_cat1 = document.getElementById("sub_cat1");
//                 var sub_cat_img1 = document.getElementById("sub_cat_img1");
//                 sub_cat_img1.src = "../images/birthday.jpg";
//                 sub_cat1.textContent = "Birthday";
//                 var a1 = document.getElementById("a1");
//                 sub_cat1.href = "/occassion/birthday";
//                 a1.href = "/occassion/birthday";

//                 var sub_cat2 = document.getElementById("sub_cat2");
//                 var sub_cat_img2 = document.getElementById("sub_cat_img2");
//                 sub_cat_img2.src = "../images/anniversary.jpg";
//                 sub_cat2.textContent = "Anniversary";
//                 a1 = document.getElementById("a2");
//                 sub_cat2.href = "/occassion/anniversary";
//                 a1.href = "/occassion/anniversary";

//                 var sub_cat3 = document.getElementById("sub_cat3");
//                 var sub_cat_img3 = document.getElementById("sub_cat_img3");
//                 sub_cat_img3.src = "../images/congratulations.jpg";
//                 sub_cat3.textContent = "Congratulations";
//                 a1 = document.getElementById("a3");
//                 sub_cat3.href = "/occassion/congratulations";
//                 a1.href = "/occassion/congratulations";

//                 var sub_cat4 = document.getElementById("sub_cat4");
//                 var sub_cat_img4 = document.getElementById("sub_cat_img4");
//                 sub_cat_img4.src = "../images/getwellsoon.jpg";
//                 sub_cat4.textContent = "Get Well Soon";
//                 a1 = document.getElementById("a4");
//                 sub_cat4.href = "/occassion/get-well-soon";
//                 a1.href = "/occassion/get-well-soon";

//                 var sub_cat5 = document.getElementById("sub_cat5");
//                 var sub_cat_img5 = document.getElementById("sub_cat_img5");
//                 sub_cat_img5.src = "../images/farewell.jpg";
//                 sub_cat5.textContent = "Farewell";
//                 a1 = document.getElementById("a5");
//                 sub_cat5.href = "/occassion/farewell";
//                 a1.href = "/occassion/farewell";

//                 var sub_cat6 = document.getElementById("sub_cat6");
//                 var sub_cat_img6 = document.getElementById("sub_cat_img6");
//                 sub_cat_img6.src = "../images/condolences.jpg";
//                 sub_cat6.textContent = "Condolences";
//                 a1 = document.getElementById("a6");
//                 sub_cat6.href = "/occassion/condolences";
//                 a1.href = "/occassion/condolences";

//                 document.getElementById("sub_cat7").hidden = true;
//                 document.getElementById("sub_cat_img7").hidden = true;
//                 break;
//               case "wrapping_style":
//                 var breadcrumb = document.getElementById("breadcrumb1");
//                 if (breadcrumb) {
//                   breadcrumb.textContent = "Bouquets > Wrapping Style";
//                 }
//                 var heading = document.getElementById("heading");
//                 heading.textContent = "Wrapping Style";

//                 var info1 = document.getElementById("info1");
//                 info1.textContent = "";
//                 plantsdata = data;
//                 var tp = document.getElementById("tp");
//                 tp.textContent = data.count;

//                 var sub_cat1 = document.getElementById("sub_cat1");
//                 var sub_cat_img1 = document.getElementById("sub_cat_img1");
//                 sub_cat_img1.src = "../images/extra/flowersinbox.jpg";
//                 sub_cat1.textContent = "Flowers in Box";
//                 var a1 = document.getElementById("a1");
//                 sub_cat1.href = "/wrapping-style/flowers-in-a-box";
//                 a1.href = "/wrapping-style/flowers-in-a-box";

//                 var sub_cat2 = document.getElementById("sub_cat2");
//                 var sub_cat_img2 = document.getElementById("sub_cat_img2");
//                 sub_cat_img2.src = "../images/extra/flowersinvase.jpg";
//                 sub_cat2.textContent = "Flowers in Vase";
//                 a1 = document.getElementById("a2");
//                 sub_cat2.href = "/wrapping-style/flowers-in-vase";
//                 a1.href = "/wrapping-style/flowers-in-vase";

//                 var sub_cat3 = document.getElementById("sub_cat3");
//                 var sub_cat_img3 = document.getElementById("sub_cat_img3");
//                 sub_cat_img3.src = "../images/extra/ribbonwrapped.jpg";
//                 sub_cat3.textContent = "Ribbon Wrapped";
//                 a1 = document.getElementById("a3");
//                 sub_cat3.href = "/wrapping-style/ribbon-wrapped";
//                 a1.href = "/wrapping-style/ribbon-wrapped";

//                 var sub_cat4 = document.getElementById("sub_cat4");
//                 var sub_cat_img4 = document.getElementById("sub_cat_img4");
//                 sub_cat_img4.src = "../images/spring.jpeg";
//                 sub_cat4.textContent = "Flower Basket";
//                 a1 = document.getElementById("a4");
//                 sub_cat4.href = "/wrapping-style/flower-basket";
//                 a1.href = "/wrapping-style/flower-basket";

//                 var sub_cat5 = document.getElementById("sub_cat5");
//                 var sub_cat_img5 = document.getElementById("sub_cat_img5");
//                 sub_cat_img5.src = "../images/autumn.jpeg";
//                 sub_cat5.textContent = "Cellophane Wrapped";
//                 a1 = document.getElementById("a5");
//                 sub_cat5.href = "/wrapping-style/cellophane-wrapped";
//                 a1.href = "/wrapping-style/cellophane-wrapped";

//                 var sub_cat6 = document.getElementById("sub_cat6");
//                 var sub_cat_img6 = document.getElementById("sub_cat_img6");
//                 sub_cat_img6.src = "../images/homeplant.jpg";
//                 sub_cat6.textContent = "Tissue Wrapped";
//                 a1 = document.getElementById("a6");
//                 sub_cat6.href = "/wrapping-style/tissue-wrapped";
//                 a1.href = "/wrapping-style/tissue-wrapped";

//                 document.getElementById("sub_cat7").hidden = true;
//                 document.getElementById("sub_cat_img7").hidden = true;
//                 break;
//               case "arrangement_type":
//                 var breadcrumb = document.getElementById("breadcrumb1");
//                 if (breadcrumb) {
//                   breadcrumb.textContent = "Bouquets > Arrangement Style";
//                 }
//                 var heading = document.getElementById("heading");
//                 heading.textContent = "Arrangement Style";

//                 var info1 = document.getElementById("info1");
//                 info1.textContent = "";
//                 plantsdata = data;
//                 var tp = document.getElementById("tp");
//                 tp.textContent = data.count;

//                 var sub_cat1 = document.getElementById("sub_cat1");
//                 var sub_cat_img1 = document.getElementById("sub_cat_img1");
//                 sub_cat_img1.src = "../images/heart shape.jpeg";
//                 sub_cat1.textContent = "Heart Shape";
//                 var a1 = document.getElementById("a1");
//                 sub_cat1.href = "/arrangement-type/heart-shape";
//                 a1.href = "/arrangement-type/heart-shape";

//                 var sub_cat2 = document.getElementById("sub_cat2");
//                 var sub_cat_img2 = document.getElementById("sub_cat_img2");
//                 sub_cat_img2.src = "../images/flower in basket.jpeg";
//                 sub_cat2.textContent = "Flowers Basket";
//                 a1 = document.getElementById("a2");
//                 sub_cat2.href = "/arrangement-type/flower-basket";
//                 a1.href = "/arrangement-type/flower-basket";

//                 var sub_cat3 = document.getElementById("sub_cat3");
//                 var sub_cat_img3 = document.getElementById("sub_cat_img3");
//                 sub_cat_img3.src = "../images/flower in glass.jpeg";
//                 sub_cat3.textContent = "Flowers in Glass";
//                 a1 = document.getElementById("a3");
//                 sub_cat3.href = "/arrangement-type/flower-in-glass";
//                 a1.href = "/arrangement-type/flower-in-glass";

//                 var sub_cat4 = document.getElementById("sub_cat4");
//                 var sub_cat_img4 = document.getElementById("sub_cat_img4");
//                 sub_cat_img4.src = "../images/hand bouquet.jpeg";
//                 sub_cat4.textContent = "Hand Bouquet";
//                 a1 = document.getElementById("a4");
//                 sub_cat4.href = "/arrangement-type/hand-bouquet";
//                 a1.href = "/arrangement-type/hand-bouquet";

//                 document.getElementById("sub_cat5").hidden = true;
//                 document.getElementById("sub_cat_img5").hidden = true;
//                 document.getElementById("sub_cat6").hidden = true;
//                 document.getElementById("sub_cat_img6").hidden = true;
//                 document.getElementById("sub_cat7").hidden = true;
//                 document.getElementById("sub_cat_img7").hidden = true;
//                 break;
//               case "flower_varieties":
//                 endpoint = "/header/flower_varieties";
//                 var breadcrumb = document.getElementById("breadcrumb1");
//                 if (breadcrumb) {
//                   breadcrumb.textContent = "Bouquets > Flower Varieties";
//                 }
//                 var heading = document.getElementById("heading");
//                 heading.textContent = "Flower Varieties";

//                 var info1 = document.getElementById("info1");
//                 info1.textContent = "";
//                 plantsdata = data;
//                 var tp = document.getElementById("tp");
//                 tp.textContent = data.count;

//                 var sub_cat1 = document.getElementById("sub_cat1");
//                 var sub_cat_img1 = document.getElementById("sub_cat_img1");
//                 sub_cat_img1.src = "../images/rose bouquet.jpeg";
//                 sub_cat1.textContent = "Rose";
//                 var a1 = document.getElementById("a1");
//                 sub_cat1.href = "/flower-varieties/rose-bouquet";
//                 a1.href = "/flower-varieties/rose-bouquet";

//                 var sub_cat2 = document.getElementById("sub_cat2");
//                 var sub_cat_img2 = document.getElementById("sub_cat_img2");
//                 sub_cat_img2.src = "../images/carnations bouquet.jpeg";
//                 sub_cat2.textContent = "Carnations";
//                 a1 = document.getElementById("a2");
//                 sub_cat2.href = "/flower-varieties/carnations-bouquet";
//                 a1.href = "/flower-varieties/carnations-bouquet";

//                 var sub_cat3 = document.getElementById("sub_cat3");
//                 var sub_cat_img3 = document.getElementById("sub_cat_img3");
//                 sub_cat_img3.src = "../images/liliy bouquet.jpeg";
//                 sub_cat3.textContent = "Lilies";
//                 a1 = document.getElementById("a3");
//                 sub_cat3.href = "/flower-varieties/lily-bouquet";
//                 a1.href = "/flower-varieties/lily-bouquet";

//                 var sub_cat4 = document.getElementById("sub_cat4");
//                 var sub_cat_img4 = document.getElementById("sub_cat_img4");
//                 sub_cat_img4.src = "../images/mixed flowers bouquet.jpeg";
//                 sub_cat4.textContent = "Mixed Flowers";
//                 a1 = document.getElementById("a4");
//                 sub_cat4.href = "/flower-varieties/mixed-flowers-bouquet";
//                 a1.href = "/flower-varieties/mixed-flowers-bouquet";

//                 document.getElementById("sub_cat5").hidden = true;
//                 document.getElementById("sub_cat_img5").hidden = true;
//                 document.getElementById("sub_cat6").hidden = true;
//                 document.getElementById("sub_cat_img6").hidden = true;
//                 document.getElementById("sub_cat7").hidden = true;
//                 document.getElementById("sub_cat_img7").hidden = true;
//                 break;
//             }
//             for (var i = 0; i < data.items.length; i++) {
//               var newImagePath = "../" + data.items[i].image;
//               data.items[i].image = newImagePath;
//             }

//             // console.log(data);
//             displayProducts(data);
//             break;
//         }
//       } else {
//         switch (category) {
//           case "plants":
//             document.getElementById("breadcrumb1").innerHTML = "Plants";
//             var heading = document.getElementById("heading");
//             heading.textContent = "Plants";

//             var info1 = document.getElementById("info1");
//             info1.textContent = "";
//             var plantsdata;
//             plantsdata = data;
//             var tp = document.getElementById("tp");
//             tp.textContent = data.count;
//             var sub_cat1 = document.getElementById("sub_cat1");
//             var sub_cat_img1 = document.getElementById("sub_cat_img1");
//             sub_cat_img1.src = "../images/season.jpeg";
//             sub_cat1.textContent = "Seasonal Plants";
//             var a1 = document.getElementById("a1");
//             sub_cat1.href = "/plants/seasonal_plants";
//             a1.href = "/plants/seasonal_plants";

//             var sub_cat2 = document.getElementById("sub_cat2");
//             var sub_cat_img2 = document.getElementById("sub_cat_img2");
//             sub_cat_img2.src = "../images/suitable location.jpeg";
//             sub_cat2.textContent = "Suitable Locations";
//             a1 = document.getElementById("a2");
//             sub_cat2.href = "/plants/suitable_locations";
//             a1.href = "/plants/suitable_locations";

//             var sub_cat3 = document.getElementById("sub_cat3");
//             var sub_cat_img3 = document.getElementById("sub_cat_img3");
//             sub_cat_img3.src = "../images/plant types.jpeg";
//             sub_cat3.textContent = "Plant Types";
//             a1 = document.getElementById("a3");
//             sub_cat3.href = "/plants/plant_types";
//             a1.href = "/plants/plant_types";

//             var sub_cat4 = document.getElementById("sub_cat4");
//             var sub_cat_img4 = document.getElementById("sub_cat_img4");
//             sub_cat_img4.src = "../images/flower varieties.jpeg";
//             sub_cat4.textContent = "Flower Varieties";
//             a1 = document.getElementById("a4");
//             sub_cat4.href = "/plants/flower_varieties";
//             a1.href = "/plants/flower_varieties";

//             document.getElementById("sub_cat5").hidden = true;
//             document.getElementById("sub_cat_img5").hidden = true;
//             document.getElementById("sub_cat6").hidden = true;
//             document.getElementById("sub_cat_img6").hidden = true;
//             document.getElementById("sub_cat7").hidden = true;
//             document.getElementById("sub_cat_img7").hidden = true;

//             displayProducts(data);
//             break;
//           case "bouquets":
//             document.getElementById("breadcrumb1").innerHTML = "Bouquets";
//             var heading = document.getElementById("heading");
//             heading.textContent = "Bouquets";

//             var info1 = document.getElementById("info1");
//             info1.textContent = "";
//             var plantsdata;
//             plantsdata = data;
//             var tp = document.getElementById("tp");
//             tp.textContent = data.count;
//             var sub_cat1 = document.getElementById("sub_cat1");
//             var sub_cat_img1 = document.getElementById("sub_cat_img1");
//             sub_cat_img1.src = "../images/extra/occassion.jpg";
//             sub_cat1.textContent = "Occassion";
//             var a1 = document.getElementById("a1");
//             sub_cat1.href = "/bouquets/occassion_type";
//             a1.href = "/bouquets/occassion_type";

//             var sub_cat2 = document.getElementById("sub_cat2");
//             var sub_cat_img2 = document.getElementById("sub_cat_img2");
//             sub_cat_img2.src = "../images/extra/wrapping-type.jpg";
//             sub_cat2.textContent = "Wrapping Type";
//             a1 = document.getElementById("a2");
//             sub_cat2.href = "/bouquets/wrapping_style";
//             a1.href = "/bouquets/wrapping_style";

//             var sub_cat3 = document.getElementById("sub_cat3");
//             var sub_cat_img3 = document.getElementById("sub_cat_img3");
//             sub_cat_img3.src = "../images/extra/arrangement-type.jpg";
//             sub_cat3.textContent = "Bouquet Types";
//             a1 = document.getElementById("a3");
//             sub_cat3.href = "/bouquets/arrangement_type";
//             a1.href = "/bouquets/arrangement_type";

//             var sub_cat4 = document.getElementById("sub_cat4");
//             var sub_cat_img4 = document.getElementById("sub_cat_img4");
//             sub_cat_img4.src = "../images/extra/flower-varieties.jpg";
//             sub_cat4.textContent = "Flower Varieties";
//             a1 = document.getElementById("a4");
//             sub_cat4.href = "/bouquets/flower_varieties";
//             a1.href = "/bouquets/flower_varieties";

//             document.getElementById("sub_cat5").hidden = true;
//             document.getElementById("sub_cat_img5").hidden = true;
//             document.getElementById("sub_cat6").hidden = true;
//             document.getElementById("sub_cat_img6").hidden = true;
//             document.getElementById("sub_cat7").hidden = true;
//             document.getElementById("sub_cat_img7").hidden = true;

//             displayProducts(data);
//             break;
//           case "pots":
//             document.getElementById("breadcrumb1").innerHTML = "Pots";
//             var heading = document.getElementById("heading");
//             heading.textContent = "Pots";

//             var info1 = document.getElementById("info1");
//             info1.textContent = "";
//             var plantsdata;
//             plantsdata = data;
//             var tp = document.getElementById("tp");
//             tp.textContent = data.count;
//             var sub_cat1 = document.getElementById("sub_cat1");
//             var sub_cat_img1 = document.getElementById("sub_cat_img1");
//             sub_cat_img1.src = "../images/plastic pots.jpeg";
//             sub_cat1.textContent = "Plastic";
//             var a1 = document.getElementById("a1");
//             sub_cat1.href = "/pots/plastic";
//             a1.href = "/pots/plastic";

//             var sub_cat2 = document.getElementById("sub_cat2");
//             var sub_cat_img2 = document.getElementById("sub_cat_img2");
//             sub_cat_img2.src = "../images/ceramic pot.jpeg";
//             sub_cat2.textContent = "Ceramic";
//             a1 = document.getElementById("a2");
//             sub_cat2.href = "/pots/ceramic";
//             a1.href = "/pots/ceramic";

//             var sub_cat3 = document.getElementById("sub_cat3");
//             var sub_cat_img3 = document.getElementById("sub_cat_img3");
//             sub_cat_img3.src = "../images/glass pot.jpeg";
//             sub_cat3.textContent = "Glass";
//             a1 = document.getElementById("a3");
//             sub_cat3.href = "/pots/glass";
//             a1.href = "/pots/glass";

//             var sub_cat4 = document.getElementById("sub_cat4");
//             var sub_cat_img4 = document.getElementById("sub_cat_img4");
//             sub_cat_img4.src = "../images/resin pots.jpeg";
//             sub_cat4.textContent = "Resin";
//             a1 = document.getElementById("a4");
//             sub_cat4.href = "/pots/resin";
//             a1.href = "/pots/resin";

//             var sub_cat5 = document.getElementById("sub_cat5");
//             var sub_cat_img5 = document.getElementById("sub_cat_img5");
//             sub_cat_img5.src = "../images/vases.jpeg";
//             sub_cat5.textContent = "Vases";
//             a1 = document.getElementById("a5");
//             sub_cat5.href = "/pots/vase";
//             a5.href = "/pots/vase";

//             var sub_cat6 = document.getElementById("sub_cat6");
//             var sub_cat_img6 = document.getElementById("sub_cat_img6");
//             sub_cat_img6.src = "../images/hanging pots.jpeg";
//             sub_cat6.textContent = "Hanging Pots";
//             a1 = document.getElementById("a6");
//             sub_cat6.href = "/pots/hanging-pots";
//             a1.href = "/pots/hanging-pots";

//             document.getElementById("sub_cat7").hidden = true;
//             document.getElementById("sub_cat_img7").hidden = true;

//             displayProducts(data);
//             break;
//           case "fertilizers":
//             document.getElementById("breadcrumb1").innerHTML = "Fertilizers";
//             var heading = document.getElementById("heading");
//             heading.textContent = "Fertilizers";

//             var info1 = document.getElementById("info1");
//             info1.textContent = "";
//             var plantsdata;
//             plantsdata = data;
//             var tp = document.getElementById("tp");
//             tp.textContent = data.count;
//             var sub_cat1 = document.getElementById("sub_cat1");
//             var sub_cat_img1 = document.getElementById("sub_cat_img1");
//             sub_cat_img1.src = "../images/organic.jpeg";
//             sub_cat1.textContent = "Organic";
//             var a1 = document.getElementById("a1");
//             sub_cat1.href = "/fertilizers/organic";
//             a1.href = "/fertilizers/organic";

//             var sub_cat2 = document.getElementById("sub_cat2");
//             var sub_cat_img2 = document.getElementById("sub_cat_img2");
//             sub_cat_img2.src = "../images/potting soil.jpeg";
//             sub_cat2.textContent = "Potting Soil";
//             a1 = document.getElementById("a2");
//             sub_cat2.href = "/fertilizers/potting-soil";
//             a1.href = "/fertilizers/potting-soil";

//             var sub_cat3 = document.getElementById("sub_cat3");
//             var sub_cat_img3 = document.getElementById("sub_cat_img3");
//             sub_cat_img3.src = "../images/cocopeat.jpeg";
//             sub_cat3.textContent = "Cocopeat";
//             a1 = document.getElementById("a3");
//             sub_cat3.href = "/fertilizers/cocopeat";
//             a1.href = "/fertilizers/cocopeat";

//             var sub_cat4 = document.getElementById("sub_cat4");
//             var sub_cat_img4 = document.getElementById("sub_cat_img4");
//             sub_cat_img4.src = "../images/manure.jpeg";
//             sub_cat4.textContent = "Manure";
//             a1 = document.getElementById("a4");
//             sub_cat4.href = "/fertilizers/manure";
//             a1.href = "/fertilizers/manure";

//             var sub_cat5 = document.getElementById("sub_cat5");
//             var sub_cat_img5 = document.getElementById("sub_cat_img5");
//             sub_cat_img5.src = "../images/compost.jpeg";
//             sub_cat5.textContent = "Compost";
//             a1 = document.getElementById("a5");
//             sub_cat5.href = "/fertilizers/compost";
//             a5.href = "/fertilizers/compost";

//             document.getElementById("sub_cat6").hidden = true;
//             document.getElementById("sub_cat_img6").hidden = true;
//             document.getElementById("sub_cat7").hidden = true;
//             document.getElementById("sub_cat_img7").hidden = true;
//             displayProducts(data);
//             break;
//           case "tools":
//             document.getElementById("breadcrumb1").innerHTML = "Tools";
//             var heading = document.getElementById("heading");
//             heading.textContent = "Tools";

//             var info1 = document.getElementById("info1");
//             info1.textContent = "";
//             var plantsdata;
//             plantsdata = data;
//             var tp = document.getElementById("tp");
//             tp.textContent = data.count;

//             document.getElementById("sub_cat1").hidden = true;
//             document.getElementById("sub_cat_img1").hidden = true;
//             document.getElementById("sub_cat2").hidden = true;
//             document.getElementById("sub_cat_img2").hidden = true;
//             document.getElementById("sub_cat3").hidden = true;
//             document.getElementById("sub_cat_img3").hidden = true;
//             document.getElementById("sub_cat4").hidden = true;
//             document.getElementById("sub_cat_img4").hidden = true;
//             document.getElementById("sub_cat5").hidden = true;
//             document.getElementById("sub_cat_img5").hidden = true;
//             document.getElementById("sub_cat6").hidden = true;
//             document.getElementById("sub_cat_img6").hidden = true;
//             document.getElementById("sub_cat7").hidden = true;
//             document.getElementById("sub_cat_img7").hidden = true;
//             for (var i = 0; i < data.items.length; i++) {
//               var newImagePath = "../" + data.items[i].image;
//               data.items[i].image = newImagePath;
//             }
//             displayProducts(data);
//             break;
//         }
//       }
//     })
//     .catch((error) => {
//       console.error("Error fetching data:", error);
//     });
// };

// function displayProducts(data) {
//   const productContainer = document.getElementById("product-container");
//   productContainer.innerHTML = "";
//   var product = data.items;

//   product.forEach((data) => {
//     const productHTML = `
//       <div class="product-card">
//       <a href="/product.html?product=${data.name}">
//         <img src="${data.image}" alt="${data.name}" class="">
//         <h3 class="product-name">${data.name}</h3>
//         <p class="product-price">₹${data.price}</p>
//         </a>
//       </div>
//     `;
//     productContainer.innerHTML += productHTML;
//   });
// }

// function displayNewArrivals(data) {
//   const productContainer = document.getElementById("newarrival-container");
//   productContainer.innerHTML = "";
//   var products = data;
//   console.log(products);

//   products.forEach((item) => {
//     const productHTML = `
//       <div class="product-card">
//       <a href="/product.html?product=${item.P_NAME}">
//         <img src="${item.PATH1}" alt="${item.P_NAME}" >
//         <h3 class="product-name">${item.P_NAME}</h3>
//         <p class="product-price">₹${item.P_PRICE}</p>
//         </a>
//       </div>
//     `;
//     productContainer.innerHTML += productHTML;
//   });
// }

// function setupSlider(containerId, leftBtnId, rightBtnId) {
//   const container = document.getElementById(containerId);
//   const btnLeft = document.getElementById(leftBtnId);
//   const btnRight = document.getElementById(rightBtnId);

//   if (!container || !btnLeft || !btnRight) {
//     console.error("Slider elements not found");
//     return;
//   }

//   let scrollAmount = 0;
//   const productWidth = container.clientWidth / 4; // Show 4 products at a time
//   const maxScroll = container.scrollWidth - container.clientWidth;

//   btnRight.addEventListener("click", function () {
//     scrollAmount = Math.min(scrollAmount + productWidth, maxScroll);
//     container.scrollTo({ left: scrollAmount, behavior: "smooth" });
//   });

//   btnLeft.addEventListener("click", function () {
//     scrollAmount = Math.max(scrollAmount - productWidth, 0);
//     container.scrollTo({ left: scrollAmount, behavior: "smooth" });
//   });
// }

// document.addEventListener("DOMContentLoaded", async () => {
//   const pathSegments = window.location.pathname.split('/').filter(segment => segment);
//   let endpoint;

//   if (pathSegments.length > 1) {
//       const subcategoryId = pathSegments[1];
//       endpoint = `/sub-subcategories/${subcategoryId}`;
//   } else {
//       const categoryId = pathSegments[0];
//       endpoint = `/subcategories/${categoryId}`;
//   }

//   try {
//       const response = await fetch(endpoint);
//       const { template, data } = await response.json();

//       renderPage(template, data, pathSegments);
//   } catch (error) {
//       console.error("Error fetching data:", error);
//   }
// });

// function renderPage(template, data, pathSegments) {
//   const container = document.getElementById("categories-container");
//   container.innerHTML = ""; // Clear the container before adding new content

//   if (template === 'shop.html') {
//       document.getElementById("breadcrumb1").innerHTML = generateBreadcrumb(pathSegments);
//       document.getElementById("heading").textContent = getHeading(pathSegments);
//       document.getElementById("info1").textContent = ""; // Add any additional info here
//       document.getElementById("tp").textContent = data.count || 0;

//       data.forEach((item, index) => {
//           const itemDiv = document.createElement("div");
//           itemDiv.className = "category__item";

//           const itemLink = document.createElement("a");
//           itemLink.href = `/${item.CY_NAME?.toLowerCase() || item.sub_name?.toLowerCase()}`;
//           itemLink.className = "category__item";

//           const itemImg = document.createElement("img");
//           itemImg.src = item.CY_IMAGE || item.sub_image;
//           itemImg.alt = "";
//           itemImg.className = "category__img";

//           const itemTitle = document.createElement("h3");
//           itemTitle.className = "category__title";
//           itemTitle.textContent = `${item.CY_NAME || item.sub_name} →`;

//           itemLink.appendChild(itemImg);
//           itemLink.appendChild(itemTitle);
//           itemDiv.appendChild(itemLink);
//           container.appendChild(itemDiv);

//           // Hide unused subcategories
//           if (index >= 7) {
//               itemDiv.hidden = true;
//           }
//       });
//   } else {
//       document.getElementById("breadcrumb1").innerHTML = generateBreadcrumb(pathSegments);
//       document.getElementById("heading").textContent = getHeading(pathSegments);
//       document.getElementById("info1").textContent = ""; // Add any additional info here
//       document.getElementById("tp").textContent = data.count || 0;

//       data.forEach((item, index) => {
//           const itemDiv = document.createElement("div");
//           itemDiv.className = "subcategory__item";

//           const itemLink = document.createElement("a");
//           itemLink.href = `/${item.sub_name?.toLowerCase() || item.ss_name?.toLowerCase()}`;
//           itemLink.className = "subcategory__item";

//           const itemImg = document.createElement("img");
//           itemImg.src = item.sub_image || item.ss_image;
//           itemImg.alt = "";
//           itemImg.className = "subcategory__img";

//           const itemTitle = document.createElement("h3");
//           itemTitle.className = "subcategory__title";
//           itemTitle.textContent = `${item.sub_name || item.ss_name} →`;

//           itemLink.appendChild(itemImg);
//           itemLink.appendChild(itemTitle);
//           itemDiv.appendChild(itemLink);
//           container.appendChild(itemDiv);

//           // Hide unused subcategories
//           if (index >= 7) {
//               itemDiv.hidden = true;
//           }
//       });
//   }
// }

// function generateBreadcrumb(pathSegments) {
//   return pathSegments.map(segment => segment.charAt(0).toUpperCase() + segment.slice(1)).join(' > ');
// }

// function getHeading(pathSegments) {
//   return pathSegments.map(segment => segment.charAt(0).toUpperCase() + segment.slice(1)).join(' ');
// }
