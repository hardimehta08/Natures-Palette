const confirmOrderButton = document.getElementById("confirm-order");
let orderId;
let currency;
let pyId; // ✅ Declare pyId globally
let userEmail = null;
let userPassword = null; // ✅ Store password globally for later use

document.addEventListener("DOMContentLoaded", function () {
  orderId = localStorage.getItem("orderID");

  if (!orderId) {
    console.error("🚨 Order ID not found in localStorage!");
    return;
  }

  console.log("✅ Order ID:", orderId);

  // Fetch payment details
  fetch(`/payment/${orderId}`)
    .then((response) => response.json())
    .then((data) => {
      console.log("✅ Payment details:", data);
      document.getElementById(
        "address"
      ).innerHTML = `${data.S_ADDRESS}<br>${data.S_PINCODE}<br>${data.S_CONTACTNO}`;
      currency = data.Total_Product_Cost;
      document.getElementById("total").innerHTML = `&#8377;${currency}`;
    })
    .catch((error) =>
      console.error("❌ Error fetching payment details:", error)
    );

  // Fetch user email
  fetch("/user/profile")
    .then((response) => response.json())
    .then((data) => {
      userEmail = data.c_email;
    })
    .catch((error) => console.error("❌ Error fetching user profile:", error));

  const paymentForm = document.getElementById("payment-form");
  const passwordContainer = document.getElementById("password-container");
  const qrCodeContainer = document.getElementById("qr-code-container");
  const qrCodeImage = document.getElementById("qr-code-image");
  const qrRadioButton = document.getElementById("qr");
  const submitPasswordButton = document.getElementById("submit-password");
  const transactionIdContainer = document.getElementById(
    "transaction-id-container"
  );
  const transactionIdInput = document.getElementById("transaction-id");
  const submitTransactionIdButton = document.getElementById(
    "submit-transaction-id"
  );

  if (
    !confirmOrderButton ||
    !paymentForm ||
    !qrRadioButton ||
    !submitPasswordButton ||
    !submitTransactionIdButton ||
    !transactionIdContainer ||
    !transactionIdInput
  ) {
    console.error("🚨 Some required elements are missing in the DOM!");
    return;
  }

  // Handle payment selection
  paymentForm.addEventListener("change", function (event) {
    if (event.target.value === "qr") {
      passwordContainer.style.display = "block";
      transactionIdContainer.style.display = "none";
      confirmOrderButton.disabled = true;
    } else {
      passwordContainer.style.display = "none";
      transactionIdContainer.style.display = "none";
      qrCodeContainer.style.display = "none";
      confirmOrderButton.disabled = false;
      confirmOrderButton.addEventListener("click", function () {
        if (document.getElementById("cod").checked) {
          handleConfirmOrder();
        }
      });
    }

    // Handle password verification for QR payments
    submitPasswordButton.addEventListener("click", function () {
      const password = document.getElementById("password").value;

      fetch("/user/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: password }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.message === "Password verified successfully") {
            qrCodeContainer.style.display = "block";
            passwordContainer.style.display = "none";
            confirmOrderButton.disabled = true;
            userPassword = password; // ✅ Store password globally for later use

            // Fetch and display the QR code
            fetch("/payment/createPaymentWithQRCode", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ O_ID: orderId, PY_AMOUNT: currency }),
            })
              .then((response) => response.json())
              .then((data) => {
                console.log(data);
                qrCodeImage.src = data.qrCodeURL;
                pyId = data.PY_ID; // ✅ Store PY_ID globally
                transactionIdContainer.style.display = "block";
              })
              .catch((error) =>
                console.error("❌ Error generating QR code:", error)
              );
          } else {
            alert("Incorrect password. Please try again.");
          }
        })
        .catch((error) => console.error("❌ Error verifying password:", error));
    });

    // Handle transaction ID submission

    submitTransactionIdButton.addEventListener("click", function () {
      const transactionId12 = transactionIdInput.value.trim();
      const upiTransactionIdFormat = /^[a-zA-Z0-9]{12}$/;

      if (!upiTransactionIdFormat.test(transactionId12)) {
        alert("❌ Please enter a valid UPI transaction ID.");
        return;
      }

      if (!pyId) {
        console.error("🚨 Payment ID (PY_ID) is missing!");
        alert("🚨 Payment ID is missing. Try generating the QR again.");
        return;
      }

      fetch("/payment/confirm-qr-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PY_ID: pyId,
          transactionId: transactionId12,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.message === "Payment confirmed.") {
            // Call the new endpoint to generate the bill and update the order status
            fetch("/payment/generateBillAndRedirect", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ O_ID: orderId }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (
                  data.message ===
                  "Payment successful, bill generated, and order updated!"
                ) {
                  // Redirect to the order placed page
                  alert("Order placed successfully!");
                  window.location.href = "/orderPlaced.html";
                } else {
                  alert("❌ Error generating the bill. Please try again.");
                }
              })
              .catch((error) => {
                console.error("❌ Error generating the bill:", error);
                alert("❌ Error generating the bill. Please try again.");
              });
          } else {
            alert("❌ Error updating transaction ID. Please try again.");
          }
        })
        .catch((error) => {
          console.error("❌ Error updating transaction ID:", error);
          alert("❌ Error updating transaction ID. Please try again.");
        });
    });
  });
  // Function to handle order confirmation
  function handleConfirmOrder() {
    console.log("✅ handleConfirmOrder() triggered");

    const paymentMethod = document.querySelector(
      'input[name="payment"]:checked'
    )?.value;

    if (!paymentMethod) {
      alert("🚨 Please select a payment method.");
      return;
    }

    confirmOrderButton.disabled = true;

    const paymentData = {
      PY_MODE: paymentMethod.toUpperCase(),
      PY_DATE: new Date().toISOString().split("T")[0],
      PY_STATUS: paymentMethod === "qr" ? "PAID" : "UNPAID",
      PY_AMOUNT: currency,
      O_ID: orderId,
    };

    fetch("/payment/createPaymentWithBill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("✅ Payment & Bill successful:", data);
        alert("Order placed successfully!");
        setTimeout(() => {
          window.location.href = "/orderPlaced.html";
        }, 5000);
      })
      .catch((error) => {
        console.error("❌ Error in handleConfirmOrder():", error.message);
        alert(`Error: ${error.message}`);
      })
      .finally(() => {
        confirmOrderButton.disabled = false;
      });
  }
});
