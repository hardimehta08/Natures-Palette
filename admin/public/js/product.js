let currentPage = 1;
let currentcategory_id = null; // Track the currently selected category ID
let currentTableName = null; // Track the currently selected table name

// Fetch categories for the dropdown
function fetchCategories2() {
  fetch("/product/categories2", { credentials: "include" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((categories) => {
      const categorySelect = document.getElementById("prod_catt");
      categorySelect.innerHTML = '<option value="">Select Category</option>';
      if (categories.length === 0) {
        categorySelect.innerHTML +=
          '<option value="">No categories found</option>';
      } else {
        categories.forEach((cat) => {
          categorySelect.innerHTML += `<option value="${cat.CY_ID}" data-name="${cat.CY_NAME}">${cat.CY_NAME}</option>`;
        });
      }
    })
    .catch((error) => {
      console.error("Error fetching categories:", error);
      document.getElementById("product-details").innerHTML = `
                <tr><td colspan="6" class="text-center">Error loading categories</td></tr>
            `;
    });
}

// Fetch products by category and table name when dropdown changes
function fetchProductsByCategory(page = 1) {
  const categorySelect = document.getElementById("prod_catt");
  const category_id = categorySelect.value;
  const categoryName =
    categorySelect.options[categorySelect.selectedIndex]?.getAttribute(
      "data-name"
    ) || "";
  const searchQuery = document.getElementById("product-search").value.trim();

  currentcategory_id = category_id;
  currentPage = page;

  if (!category_id || !categoryName) {
    const productTable = document.getElementById("product-details");
    productTable.innerHTML = `
            <tr><td colspan="8" class="text-center">Please select a category to view products</td></tr>
        `;
    document.getElementById("pagination-controls").innerHTML = "";
    return;
  }

  currentTableName = categoryName.toLowerCase().replace(/\s+/g, "_");

  let url = `/product/table/${currentTableName}/products?page=${page}`;
  if (searchQuery) {
    url += `&productId=${encodeURIComponent(searchQuery)}`;
  }

  fetch(url, { credentials: "include" })
    .then((response) => {
      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const productTable = document.getElementById("product-details");
      productTable.innerHTML = "";

      if (data.products && data.products.length > 0) {
        data.products.forEach((product) => {
          const stockValue =
            product.stock !== null && product.stock !== undefined
              ? product.stock
              : "N/A";
          const row = `
                        <tr>
                            <td>${product.Product_id || "N/A"}</td>
                            <td>${product.product_name || "N/A"}</td>
                            <td>${product.description || "N/A"}</td>
                            <td>${product.price || "N/A"}</td>
                            <td>${stockValue}</td>
                            <td>
                                <img src="${product.image || "default.jpg"}" alt="${ product.product_name || "Product"}" width="50">
                            </td>
                            <td>${categoryName}</td>
                            <td>
                                <button class="btn" onclick="openEditModal('${product.Product_id}', '${product.product_name}', '${product.description || ""}', '${product.price}', '${stockValue}')">Edit</button>
                                <button class="btn" onclick="deleteProduct('${ product.Product_id}')">Delete</button>
                            </td>
                        </tr>
                    `;
          productTable.innerHTML += row;
        });

        // Show pagination only if not searching by productId
        if (!searchQuery) {
          updatePagination(data.totalPages, data.currentPage);
        } else {
          document.getElementById("pagination-controls").innerHTML = "";
        }
      } else {
        productTable.innerHTML = `<tr><td colspan="8" class="text-center">No products found for this category</td></tr>`;
        document.getElementById("pagination-controls").innerHTML = "";
      }
    })
    .catch((error) => {
      console.error("Error fetching products:", error);
      document.getElementById("product-details").innerHTML = `
                <tr><td colspan="8" class="text-center">Error loading products: ${error.message}</td></tr>
            `;
      document.getElementById("pagination-controls").innerHTML = "";
    });
}

function updatePagination(totalPages, currentPage) {
  const paginationControls = document.getElementById("pagination-controls");
  paginationControls.innerHTML = "";

  // Calculate the page to go to for Previous and Next buttons (for circular pagination)
  const prevPage = currentPage === 1 ? totalPages : currentPage - 1; // If on first page, go to last page
  const nextPage = currentPage === totalPages ? 1 : currentPage + 1; // If on last page, go to first page

  // Previous Button (<)
  paginationControls.innerHTML += `
    <li class="page-item">
      <a class="page-link" href="#" onclick="fetchProductsByCategory(${prevPage}); return false;"><</a>
    </li>
  `;

  // Page Numbers (show up to 5 pages, centered around current page if possible)
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  // Adjust startPage if endPage reaches totalPages
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationControls.innerHTML += `
      <li class="page-item ${i === currentPage ? "active" : ""}">
        <a class="page-link" href="#" onclick="fetchProductsByCategory(${i}); return false;">${i}</a>
      </li>
    `;
  }

  // Next Button (>)
  paginationControls.innerHTML += `
    <li class="page-item">
      <a class="page-link" href="#" onclick="fetchProductsByCategory(${nextPage}); return false;">></a>
    </li>
  `;
}
// Open edit modal
function openEditModal(productId, name, description, price, stock = "N/A") {
  const modal = document.getElementById("editProductModal");
  document.getElementById("edit-product-id").value = productId;
  document.getElementById("edit-product-name").value = name;
  document.getElementById("edit-product-desc").value = description;
  document.getElementById("edit-product-price").value = price;
  document.getElementById("edit-product-stock").value =
    stock !== "N/A" ? stock : ""; // Pre-fill stock
  modal.style.display = "block";
}

// Close edit modal
function closeEditModal() {
  document.getElementById("editProductModal").style.display = "none";
}

// Handle edit form submission
document
  .getElementById("editProductForm")
  ?.addEventListener("submit", async function (event) {
    event.preventDefault();

    const productId = document.getElementById("edit-product-id").value;
    const productData = {
      product_name: document.getElementById("edit-product-name").value,
      description: document.getElementById("edit-product-desc").value,
      price: document.getElementById("edit-product-price").value,
      stock: document.getElementById("edit-product-stock").value,
    };
    const images = [
      document.getElementById("edit-prod-img1").files[0]?.name || null,
      document.getElementById("edit-prod-img2").files[0]?.name || null,
      document.getElementById("edit-prod-img3").files[0]?.name || null,
    ].filter((img) => img); // Filter out null values

    try {
      const response = await fetch("/product/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableName: currentTableName,
          productId,
          productData,
          images,
        }),
        credentials: "include",
      });

      const result = await response.json();
      if (result.success) {
        alert("Product updated successfully!");
        closeEditModal();
        fetchProductsByCategory(currentPage); // Refresh table
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Failed to update product.");
    }
  });
// Delete product
function deleteProduct(productId) {
  if (!confirm("Are you sure you want to delete this product?")) return;

  fetch(`/product/delete/${currentTableName}/${productId}`, {
    method: "DELETE",
    credentials: "include",
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        alert("Product deleted successfully!");
        fetchProductsByCategory(currentPage); // Refresh table
      } else {
        alert("Error: " + result.error);
      }
    })
    .catch((error) => {
      console.error("Error deleting product:", error);
      alert("Failed to delete product.");
    });
}
// Unchanged functions below
function fetchCategories1() {
  fetch("/product/categories1", { credentials: "include" })
    .then((response) => response.json())
    .then((categories) => {
      const categorySelect = document.getElementById("prodcat");
      categorySelect.innerHTML = '<option value="">Select Category</option>';
      categories.forEach((cat) => {
        categorySelect.innerHTML += `<option value="${cat.CY_ID}">${cat.CY_NAME}</option>`;
      });
      categorySelect.addEventListener("change", handleCategoryChange1);
    })
    .catch((error) => console.error("Error fetching categories:", error));
}

function handleCategoryChange1() {
  const category_id = document.getElementById("prodcat").value;
  const subcategorySelect = document.getElementById("prodsubcat");
  const subsubCategorySelect = document.getElementById("prodsubsubcat");

  subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
  subsubCategorySelect.innerHTML =
    '<option value="">Select Sub Subcategory</option>';

  if (!category_id) return;

  fetch(`/product/category/${category_id}/subcategories`, {
    credentials: "include",
  })
    .then((response) => response.json())
    .then((subcategories) => {
      if (subcategories.length === 0) {
        subcategorySelect.innerHTML =
          '<option value="">No subcategories found</option>';
        return;
      }

      subcategories.forEach((sub) => {
        const option = document.createElement("option");
        option.value = sub.sub_id;
        option.textContent = sub.sub_name;
        subcategorySelect.appendChild(option);
      });

      subcategorySelect.addEventListener("change", handleSubcategoryChange1);
    })
    .catch((error) => console.error("Error fetching subcategories:", error));
}

function handleSubcategoryChange1() {
  const subcategory_id = document.getElementById("prodsubcat").value;
  const subsubCategorySelect = document.getElementById("prodsubsubcat");

  subsubCategorySelect.innerHTML =
    '<option value="">Select Sub Subcategory</option>';

  if (!subcategory_id) return;

  fetch(`/product/subcategory/${subcategory_id}/subsubcategories`, {
    credentials: "include",
  })
    .then((response) => response.json())
    .then((subsubcategories) => {
      if (subsubcategories.length === 0) {
        subsubCategorySelect.innerHTML =
          '<option value="">No sub-subcategories found</option>';
        return;
      }

      subsubcategories.forEach((subsub) => {
        const option = document.createElement("option");
        option.value = subsub.ss_id;
        option.textContent = subsub.ss_name;
        subsubCategorySelect.appendChild(option);
      });
    })
    .catch((error) =>
      console.error("Error fetching sub-subcategories:", error)
    );
}

document
  .getElementById("prodcat")
  .addEventListener("change", async function () {
    const category_id = this.value;
    const categoryName = this.options[this.selectedIndex]?.text.trim();

    if (!category_id) {
      console.error("Category ID is undefined");
      return;
    }

    try {
      const response = await fetch(
        `/product/get-fields?category=${encodeURIComponent(categoryName)}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      if (data.lastId) {
        alert("Last id in the table is: " + data.lastId);
      } else {
        alert("Table is empty!");
      }
      if (data.success) {
        generateForm(data.fields, categoryName, category_id);
      } else {
        alert("Error fetching fields: " + data.error);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to fetch fields. Check console for details.");
    }
  });

  async function fetchFieldTypes(tableName) {
    try {
      const response = await fetch(
        `/product/get-field-types?tableName=${tableName}`,
        { credentials: "include" }
      );
      const data = await response.json();
      return data.fields || [];
    } catch (error) {
      console.error("Error fetching field types:", error);
      return [];
    }
  }
  
  async function generateForm(fields, categoryName, category_id) {
    const formContainer = document.getElementById("product-form-container");
    formContainer.innerHTML = `<h3>Add Product to ${categoryName}</h3>`;
  
    const form = document.createElement("form");
    form.id = "product-form";
    form.enctype = "multipart/form-data";
  
    form.appendChild(createHiddenField("category_id", category_id));
    form.appendChild(createReadOnlyField("Category ID", "CY_ID", category_id));
  
    // Filter out the primary key field (e.g., PRODUCT_ID) since it's auto-generated
    fields.forEach((field) => {
      if (field.name === "category_id" || field.name === "PRODUCT_ID") return;
      form.appendChild(createInputField(field));
    });
  
    // Add image upload fields with previews
    const imagePreviews = [];
    for (let i = 1; i <= 3; i++) {
      const fileInputDiv = createFileInputField(`Upload Image ${i}`, `prod_img${i}`);
      form.appendChild(fileInputDiv);
  
      // Add preview div
      const previewDiv = document.createElement("div");
      previewDiv.id = `preview-prod_img${i}`;
      previewDiv.style.marginBottom = "10px";
      form.appendChild(previewDiv);
      imagePreviews.push(previewDiv);
  
      // Add event listener for image preview
      const fileInput = fileInputDiv.querySelector(`[name=prod_img${i}]`);
      fileInput.addEventListener("change", async () => {
        if (fileInput.files.length > 0) {
          const file = fileInput.files[0];
          try {
            const base64 = await convertToBase64(file);
            previewDiv.innerHTML = `<img src="${base64}" alt="Image ${i} Preview" style="max-width: 200px; max-height: 200px;" />`;
          } catch (error) {
            console.error(`Error converting image ${i} to Base64:`, error);
            previewDiv.innerHTML = `<p style="color: red;">Failed to load preview for Image ${i}</p>`;
          }
        } else {
          previewDiv.innerHTML = "";
        }
      });
    }
  
    const submitButton = document.createElement("button");
    submitButton.textContent = "Add Product";
    submitButton.type = "submit";
    submitButton.className = "btn";
    form.appendChild(submitButton);
  
    formContainer.appendChild(form);
  
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const formData = new FormData();
  
      // Append category ID
      formData.append("category_id", category_id);
  
      // Collect product data (except images)
      const productData = {};
      new FormData(form).forEach((value, key) => {
        if (!value || value === "undefined") return;
        if (!key.startsWith("prod_img")) {
          // Handle checkbox values (convert to 1/0 for database)
          const input = form.querySelector(`[name=${key}]`);
          if (input.type === "checkbox") {
            productData[key] = input.checked ? 1 : 0;
          } else {
            productData[key] = value;
          }
        }
      });
  
      // Convert productData object to JSON and append to FormData
      formData.append("productData", JSON.stringify(productData));
  
      // Append image files with validation
      let imageCount = 0;
      for (let i = 1; i <= 3; i++) {
        let fileInput = form.querySelector(`[name=prod_img${i}]`);
        if (fileInput && fileInput.files.length > 0) {
          const file = fileInput.files[0];
          // Validate file type (allow only images)
          if (!file.type.startsWith("image/")) {
            alert(`File for Image ${i} must be an image (e.g., JPG, PNG).`);
            return;
          }
          formData.append("images", file); // ✅ Append file
          imageCount++;
        }
      }
  
      console.log("Final Collected Data:", { category_id, productData, imageCount });
  
      try {
        const response = await fetch("/product/add", {
          method: "POST",
          body: formData, // ✅ Send as FormData, NOT JSON
          credentials: "include",
        });
  
        const result = await response.json();
        if (result.success) {
          alert(`Product added successfully! Product ID: ${result.insertedProductId}`);
  
          form.reset();
          // Clear image previews
          imagePreviews.forEach((preview) => (preview.innerHTML = ""));
        } else {
          alert("Error: " + result.error);
        }
      } catch (error) {
        console.error("Error:", error);
        alert("Failed to add product.");
      }
    });
  }
  
  
  function convertToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result); // Returns Base64 string
      reader.onerror = (error) => reject(error);
    });
  }
  
  function createReadOnlyField(labelText, name, value) {
    const div = document.createElement("div");
    div.className = "form-group";
    div.innerHTML = `<label>${labelText}:</label><input type="text" name="${name}" value="${value}" readonly>`;
    return div;
  }
  
  function createHiddenField(name, value) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    return input;
  }
  
  function createFileInputField(labelText, name) {
    const div = document.createElement("div");
    div.className = "form-group";
  
    const label = document.createElement("label");
    label.textContent = labelText;
    div.appendChild(label);
  
    const input = document.createElement("input");
    input.type = "file";
    input.name = name;
    input.accept = "image/*";
    div.appendChild(input);
  
    return div;
  }
  
  function createInputField(field) {
    const div = document.createElement("div");
    div.className = "form-group";
  
    const label = document.createElement("label");
    // Use field.label if available, otherwise use field.name
    label.textContent = field.label || field.name.replace(/_/g, " ").toUpperCase();
    div.appendChild(label);
  
    const input = document.createElement("input");
    input.name = field.name;
    input.required = field.required !== undefined ? field.required : true;
  
    if (
      field.type.includes("int") ||
      field.type.includes("decimal") ||
      field.type.includes("float") ||
      field.type.includes("double")
    ) {
      input.type = "number";
      if (field.type.includes("decimal") || field.type.includes("float") || field.type.includes("double")) {
        input.step = "0.01"; // Allow decimal values
      }
    } else if (field.type.includes("varchar") || field.type.includes("text")) {
      input.type = "text";
    } else if (
      field.type.includes("date") ||
      field.type.includes("datetime") ||
      field.type.includes("timestamp")
    ) {
      input.type = "date";
    } else if (
      field.type.includes("boolean") ||
      field.type.includes("tinyint(1)")
    ) {
      input.type = "checkbox";
    } else if (field.type.includes("enum")) {
      // Handle ENUM fields as a dropdown
      const select = document.createElement("select");
      select.name = field.name;
      select.required = field.required !== undefined ? field.required : true;
  
      // Parse ENUM values (assuming field.enumValues is an array of options)
      const enumValues = field.enumValues || [];
      enumValues.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
  
      div.appendChild(select);
      return div;
    } else {
      input.type = "text";
    }
  
    div.appendChild(input);
    return div;
  }
  
  async function fetchPrimaryKey(tableName) {
    try {
      const response = await fetch(
        `/product/get-primary-key?tableName=${tableName}`,
        { credentials: "include" }
      );
      const data = await response.json();
      return data.primaryKey || "PRODUCT_ID"; // Updated default to match expected primary key
    } catch (error) {
      console.error("Error fetching primary key:", error);
      return "PRODUCT_ID";
    }
  }

document.addEventListener("DOMContentLoaded", function () {
  fetchCategories1();
  fetchCategories2();
});
