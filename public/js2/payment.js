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
      currency = data.ODETAILS_PRICE;
      document.getElementById("total").innerHTML = `&#8377;${currency}`;
      console.log("Total innerHTML Updated");
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

      // Verify user password
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
                qrCodeImage.src = data.qrCodeURL; // Show QR code for payment
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

    // Handle UPI transaction ID submission
    submitTransactionIdButton.addEventListener("click", function () {
      const transactionId12 = transactionIdInput.value.trim();
      const upiTransactionIdFormat = /^[a-zA-Z0-9]{12}$/;

      // Validate transaction ID format
      if (!upiTransactionIdFormat.test(transactionId12)) {
        alert("❌ Please enter a valid UPI transaction ID.");
        return;
      }

      if (!pyId) {
        console.error("🚨 Payment ID (PY_ID) is missing!");
        alert("🚨 Payment ID is missing. Try generating the QR again.");
        return;
      }

      // Confirm payment by updating transaction ID and processing payment server-side
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
          if (data.message === "Payment successful and bill generated!") {
            // Redirect to the order placed page
            alert("Order placed successfully! Invoice generated.");
            window.location.href = "/orderPlaced.html";
          } else {
            console.log(data);
            alert("❌ Error confirming payment or generating the bill.");
          }
        })
        .catch((error) => {
          console.error("❌ Error confirming payment:", error);
          alert("❌ Error confirming payment. Please try again.");
        });
    });
  });
  // Function to handle order confirmation
  function handleConfirmOrder() {
    console.log("✅ handleConfirmOrder() triggered");

    // Get the selected payment method
    const paymentMethod = document.querySelector(
      'input[name="payment"]:checked'
    )?.value;

    if (!paymentMethod) {
      alert("🚨 Please select a payment method.");
      return;
    }

    // Ensure the confirm button is defined
    const confirmOrderButton = document.getElementById("confirm-order");
    if (!confirmOrderButton) {
      console.error("❌ confirmOrderButton not found in the DOM.");
      return;
    }

    confirmOrderButton.disabled = true;

    // Prepare payment data
    const paymentData = {
      PY_MODE: paymentMethod.toUpperCase(),
      PY_DATE: new Date().toISOString().split("T")[0],
      PY_STATUS: paymentMethod === "qr" ? "PAID" : "UNPAID",
      PY_AMOUNT: currency,
      O_ID: orderId,
    };

    console.log("📤 Sending payment data to server:", paymentData);
    fetch("/payment/createPaymentWithBill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData),
    })
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        console.log("✅ Success:", data);
        alert(data.message || "Order placed successfully!");
        setTimeout(() => {
          window.location.href = "/orderPlaced.html";
        }, 3000);
      })
      .catch((error) => {
        console.error("❌ Error:", error.message);
        alert(`Error: ${error.message}`);
      })
      .finally(() => {
        confirmOrderButton.disabled = false;
      });
  }
});
