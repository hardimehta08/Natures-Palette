const confirmOrderButton = document.getElementById("confirm-order");
let orderId;
let currency;

document.addEventListener("DOMContentLoaded", function () {
  orderId = localStorage.getItem("orderID");

  if (!orderId) {
    console.error("🚨 Order ID not found in localStorage!");
    return;
  }

  console.log("✅ Order ID:", orderId);

  // Fetch payment details
  fetch(`/payment/${orderId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok: " + response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      console.log("✅ Payment details:", data);
      document.getElementById("address").innerHTML = 
        `${data.S_ADDRESS}<br>${data.S_PINCODE}<br>${data.S_CONTACTNO}`;
      currency = data.Total_Product_Cost;
      document.getElementById("total").innerHTML = `&#8377;${currency}`;
    })
    .catch((error) => {
      console.error("❌ Error fetching payment details:", error);
    });

  // Selecting DOM elements safely
  const paymentForm = document.getElementById("payment-form");
  const passwordContainer = document.getElementById("password-container");
  const qrCodeContainer = document.getElementById("qr-code-container");
  const qrCodeImage = document.getElementById("qr-code-image");
  const qrRadioButton = document.getElementById("qr");
  const submitPasswordButton = document.getElementById("submit-password");
  const transactionIdContainer = document.getElementById("transaction-id-container");
  const transactionIdInput = document.getElementById("transaction-id");
  const submitTransactionIdButton = document.getElementById("submit-transaction-id");

  let userEmail = null;

  // Fetch user email
  fetch("/user/profile")
    .then((response) => response.json())
    .then((data) => {
      userEmail = data.c_email;
    })
    .catch((error) => {
      console.error("❌ Error fetching user profile:", error);
    });

  if (!confirmOrderButton) {
    console.error("🚨 confirmOrderButton is missing in the HTML!");
    return;
  }

  if (!paymentForm || !qrRadioButton || !submitPasswordButton || !submitTransactionIdButton ||
      !transactionIdContainer || !transactionIdInput) {
    console.error("🚨 Some required elements are missing in the DOM!");
    return;
  }

  // Handle payment selection
  paymentForm.addEventListener("change", function (event) {
    if (event.target.value === "qr") {
      passwordContainer.style.display = "block";
      transactionIdContainer.style.display = "none";
      confirmOrderButton.disabled = true; // Disable the Confirm Order button
    } else {
      passwordContainer.style.display = "none";
      transactionIdContainer.style.display = "none";
      qrCodeContainer.style.display = "none";
      confirmOrderButton.disabled = false;
    }
  });

  // Handle password verification for QR payments
  submitPasswordButton.addEventListener("click", function () {
    const password = document.getElementById("password").value;

    fetch("/user/verify-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, password: password }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Network response was not ok: " + response.statusText);
        return response.json();
      })
      .then((data) => {
        if (data.message === "Password verified successfully") {
          qrCodeContainer.style.display = "block";
          passwordContainer.style.display = "none";
          confirmOrderButton.disabled = true;

          // Fetch and display the QR code
          fetch("/payment/generate-qr-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: orderId, currency: currency }),
          })
            .then((response) => response.json())
            .then((data) => {
              qrCodeImage.src = data.qrCodeURL;
              transactionIdContainer.style.display = "block"; // Show transaction ID input
            })
            .catch((error) => {
              console.error("❌ Error generating QR code:", error);
            });
        } else {
          alert("Incorrect password. Please try again.");
        }
      })
      .catch((error) => {
        console.error("❌ Error verifying password:", error);
      });
  });

  // Handle transaction ID submission
  submitTransactionIdButton.addEventListener("click", function () {
    const transactionId = transactionIdInput.value.trim();
    const upiTransactionIdFormat = /^[a-zA-Z0-9]{12}$/; // Example format: 12 alphanumeric characters

    if (!upiTransactionIdFormat.test(transactionId)) {
      alert("❌ Please enter a valid UPI transaction ID.");
      return;
    }

    fetch("/payment/update-transaction-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: orderId, transactionId: transactionId }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Network response was not ok: " + response.statusText);
        return response.json();
      })
      .then((data) => {
        if (data.message === "Transaction ID updated successfully") {
          transactionIdContainer.style.display = "none";
          confirmOrderButton.disabled = false;
        } else {
          alert("❌ Error updating transaction ID. Please try again.");
        }
      })
      .catch((error) => {
        console.error("❌ Error updating transaction ID:", error);
      });
  });

  // Handle order confirmation
  confirmOrderButton.addEventListener("click", function () {
    handleConfirmOrder();
  });
});

// Function to handle order confirmation
function handleConfirmOrder() {
  console.log("✅ handleConfirmOrder() triggered");

  const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;

  if (!paymentMethod) {
    console.error("🚨 No payment method selected!");
    return;
  }

  let paymentStatus = paymentMethod === "qr" ? "PAID" : "UNPAID";

  fetch("/payment/createPayment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      PY_MODE: paymentMethod.toUpperCase(),
      PY_DATE: new Date().toISOString().split("T")[0],
      PY_STATUS: paymentStatus,
      PY_AMOUNT: currency,
      O_ID: orderId,
    }),
  })
    .then((response) => {
      console.log("📤 Payment request sent", response);
      if (!response.ok) throw new Error("Network response was not ok: " + response.statusText);
      return response.text();
    })
    .then((data) => {
      console.log("✅ Payment creation response:", data);
      generateAndSendBill();
    })
    .catch((error) => {
      console.error("❌ Error in handleConfirmOrder():", error);
    })
    .finally(() => {
      confirmOrderButton.disabled = false;
    });
}

// Function to generate and send bill
function generateAndSendBill() {
  fetch("/bill/generateBill")
    .then((response) => {
      if (!response.ok) {
        return response.text().then((text) => {
          throw new Error(`Network response was not ok: ${response.status} - ${text}`);
        });
      }
      return response.text();
    })
    .then((data) => {
      console.log("✅ Bill generation response:", data);
      alert("📄 Bill generated and sent successfully!");
      window.location.href = "/orderPlaced.html";
    })
    .catch((error) => {
      console.error("❌ Error generating bill:", error.message);
      alert(`Bill generation failed: ${error.message}`);
    });
}

