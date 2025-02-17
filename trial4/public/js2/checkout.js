var uname = document.getElementById("name");
var email = document.getElementById("email");
var address = document.getElementById("checkout_address");
var city = document.getElementById("city");
var state = document.getElementById("state");
var pincode = document.getElementById("pincode");
var mobile = document.getElementById("mobile");

fetch("/user/profile")
  .then((response) => response.json())
  .then((data) => {
    if (data) {
      uname.value = data.c_username;
      email.value = data.c_email;
      address.value = data.c_address;
      city.value = data.city;
      state.value = data.PostOfficeName;
      pincode.value = data.c_pincode;
      mobile.value = data.c_mobile;
      fetch("/cart/user")
        .then((response) => response.json())
        .then((data) => {
          if (data) {
            let totalPrice = 0;
            let totalQuantity = 0;

            data.forEach((item) => {
              totalPrice += item.ca_qty * item.price;
              totalQuantity += item.ca_qty;
            });
            document.getElementById("prod_count").textContent = totalQuantity;
            // Update all elements with the class name "prod_price"
            const prodPriceElements =
              document.getElementsByClassName("prod_price");
            for (let i = 0; i < prodPriceElements.length; i++) {
              prodPriceElements[i].textContent = totalPrice;
            }
          }
        });
    }
  });
document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("continueForPayment")
    .addEventListener("click", placeOrder);
});

function placeOrder(event) {
  event.preventDefault(); // Prevent any default action, such as form submission

  const s_add = document.getElementById("checkout_address").value;
  const s_pc = document.getElementById("pincode").value;
  const s_no = document.getElementById("mobile").value;

  //   console.log("Address:", s_add);
  //   console.log("Pincode:", s_pc);
  //   console.log("Mobile:", s_no);

  fetch("/order/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      s_add: s_add,
      s_pc: s_pc,
      s_cno: s_no,
    }),
  })
    .then((response) => {
      console.log("Response status:", response.status);
      return response.json();
    })
    .then((data) => {
      console.log(data);
      if (data.status === 200) {
        localStorage.setItem("orderID", data.orderID);
        window.location.href = "/payment.html"; // Redirect to the payment page
      } else {
        document.getElementById("message").innerHTML =
          "Order not placed! " + data.message;
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      document.getElementById("message").innerHTML = "An error occurred!";
    });
}
