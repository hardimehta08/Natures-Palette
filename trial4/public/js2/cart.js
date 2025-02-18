let fdata = [];

function loadCart(data) {
  const cartitem = document.getElementById("cart-items");
  if (!cartitem) {
    const message = document.getElementById("message");
    message.innerHTML = "Cart items container not found!";
    return;
  }

  cartitem.innerHTML = "";
  let Stotal = 0;

  data.forEach((item) => {
    cartitem.innerHTML += `
      <tr data-cart-id="${item.ca_id}">
        <td><img src="${item.image}" alt="${item.name}" width="50"></td>
        <td><a href="/product.html?product=${item.name}">${item.name}</a></td>
        <td>${item.price}</td>
        <td><input type="number" value="${item.ca_qty}" id="qty_num${item.ca_id}" style="width:30px;" onchange="updatecart('${item.ca_id}', this.value)"></td>
        <td>${item.total}</td>
        <td><button onclick="removeFromCart('${item.ca_id}');updateCartAndWishlistCounts();">Remove</button></td>
      </tr>
    `;
    Stotal += item.total;
  });

  const total = document.getElementById("total");
  total.innerHTML = "Total : &#8377; " + Stotal;
}

fetch("/cart/user")
  .then((response) => response.json())
  .then((data) => {
    fdata = data;
    loadCart(data);
  })
  .catch((error) => {
    const message = document.getElementById("message");
    message.innerHTML = `Error loading cart items: ${error.message}`;
  });

function updatecart(id, newQty) {
  // Find the item in the data array
  const item = fdata.find((item) => item.ca_id === id);
  if (item) {
    item.ca_qty = parseInt(newQty, 10);
    item.total = item.ca_qty * item.price;
    const Stotal = fdata.reduce((sum, item) => sum + item.total, 0);

    // Update the database
    fetch("/cart/update", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ca_id: id, qty: item.ca_qty }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Database updated:", data);
        // Reload the cart to reflect the updated quantities and totals
        loadCart(fdata);
      })
      .catch((error) => {
        console.error("Error updating database:", error);
        const message = document.getElementById("message");
        message.innerHTML = "Error updating the cart. Please try again.";
      });
  } else {
    console.error("Item not found in cart");
  }
}
function removeFromCart(ca_id) {
  // Find the item index in the data array
  const itemIndex = fdata.findIndex((item) => item.ca_id === ca_id);
  if (itemIndex !== -1) {
    // Remove the item from the data array
    fdata.splice(itemIndex, 1);
    const Stotal = fdata.reduce((sum, item) => sum + item.total, 0);

    // Update the database
    fetch("/cart/remove", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cartId: ca_id }), // Ensure the correct parameter name
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message) {
          console.log(data.message);
          // Reload the cart to reflect the updated cart items
          loadCart(fdata);
        } else {
          console.error("Error removing item:", data);
        }
      })
      .catch((error) => {
        console.error("Error removing item from database:", error);
        const message = document.getElementById("message");
        message.innerHTML =
          "Error removing the item from the cart. Please try again.";
      });
  } else {
    console.error("Item not found in cart");
  }
}
