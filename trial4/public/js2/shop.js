document.addEventListener("DOMContentLoaded", (event) => {
  const pathname = window.location.pathname;
  const pathSegments = pathname.split("/").filter((segment) => segment);
  let category, subcategory;

  let headerEndpoint;

  if (pathSegments.length > 1) {
    category = pathSegments[0];
    subcategory = pathSegments[1];
    headerEndpoint = `/header/${category}/${subcategory}`;
  } else {
    category = pathSegments[0];
    headerEndpoint = `/header/${category}`;
  }

  // Fetch header data based on the dynamically constructed endpoint
  fetch(headerEndpoint)
    .then((response) => response.json())
    .then((data) => {
      // Call the displayProducts function with the fetched data
      displayProducts(data);
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });

  // Call the fetchData function with the dynamically constructed endpoint and pathSegments
  let fetchEndpoint;
  if (pathSegments.length > 1) {
    const category = pathSegments[0];
    const subcategory = pathSegments[1];
    fetchEndpoint = `/fetch/category/${category}/${subcategory}`;
  } else {
    const category = pathSegments[0];
    fetchEndpoint = `/fetch/category/${category}`;
  }

  fetchData(fetchEndpoint, pathSegments, pathname);

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
      updateUI(pathSegments, data, pathname);
      // Call the displayProducts function with the fetched data
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
  const optionsContainer = document.getElementById("options-container");

  // Clear existing subcategories
  optionsContainer.innerHTML = "";

  subcategories.forEach((sub, index) => {
    const optionDiv = document.createElement("div");
    optionDiv.classList.add("option-div");

    const optionItems = document.createElement("div");
    optionItems.classList.add("option-items");

    const a = document.createElement("a");
    const pathSegment = pathSegments[1] || pathSegments[0];
    a.href = `../${pathSegment}/${(sub.sub_name || sub.ss_name).replace(
      / /g,
      "_"
    )}`;

    const img = document.createElement("img");
    img.src = sub.sub_image || sub.ss_image;
    img.alt = "";

    const cat = document.createElement("a");
    cat.classList.add("cat");
    cat.textContent = capitalize(sub.sub_name || sub.ss_name);

    a.appendChild(img);
    a.appendChild(cat);
    optionItems.appendChild(a);
    optionDiv.appendChild(optionItems);
    optionsContainer.appendChild(optionDiv);
  });
};

const displayProducts = (data) => {
  const result = document.getElementById("tp");
  result.innerHTML = data.count;
  const productContainer = document.getElementById("product-container");
  productContainer.innerHTML = "";
  const products = data.items || data;
  document.getElementById("info1").innerHTML = data.desc;

  if (products && products.forEach) {
    products.forEach((product) => {
      const productHTML = `
          <div class="product-card">
          <a href="/product.html?product=${product.name}">
            <img src="../${product.image}" alt="${product.name}" class="">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-price">&#8377; ${product.price}</p>
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

const capitalize = (str) => {
  if (typeof str !== "string") {
    console.error("capitalize: received non-string value", str);
    return "";
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
};
