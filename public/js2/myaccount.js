var username = document.getElementById("username");
var userdesc = document.getElementById("userdescription");

// Fetch User Profile
fetch("/user/profile")
  .then((response) => response.json())
  .then((data) => {
    if (data.message === "Please login to access this information.") {
      // Create the login link for unauthorized users
      var login = document.createElement("a");
      login.href = "../html/login.html";
      login.textContent = "Login";
      userdesc.innerHTML += "<br><br>";
      userdesc.appendChild(login);
      document.getElementById("order_btn").style.display = "none";
      document.getElementById("feedback_btn").style.display = "none";
      document.getElementById("update_btn").style.display = "none";
      document.getElementById("change_btn").style.display = "none";
      document.getElementById("logout").style.display = "none";
    } else if (data && data.c_username) {
      // Update the username
      username.innerHTML += data.c_username;

      // Fetch Customer Orders
      return fetch("/order/customer/orders")
        .then((response) => response.json()) // Parse order data
        .then((data) => {
          console.log(data);
          if (data.message === "Unauthorized") {
            // Display login message for orders
            const orderContainer = document.getElementById("order_container");
            orderContainer.innerHTML = "Please login to view your orders.";

            // Hide child elements of the container
            Array.from(orderContainer.children).forEach((child) => {
              child.style.display = "none";
            });
          } else {
            const orderContainer = document.getElementById("order_container");

            if (data.message === "Unauthorized") {
              // Display login message for orders
              orderContainer.innerHTML = "Please login to view your orders.";

              // Hide child elements of the container
              Array.from(orderContainer.children).forEach((child) => {
                child.style.display = "none";
              });
            } else if (data.message === "Order not found") {
              // Display "no orders found" message
              document.getElementById("order_name").innerHTML =
                "No orders placed yet!";
              document.getElementById("order_image").style.display = "none";
              document.getElementById("order_price").style.display = "none";
              document.getElementById("order_id").style.display = "none";
              document.getElementById("order_date").style.display = "none";
              document.getElementById("order_status").style.display = "none";
            } else {
              // Populate order details
              document.getElementById("order_image").src = "../" + data.image;
              document.getElementById("order_name").innerHTML =
                data.name.replace(/_/g, " ");
              document.getElementById("order_price").innerHTML += data.price;
              document.getElementById("order_id").innerHTML += data.o_id;
              document.getElementById("order_date").innerHTML += new Date(
                data.o_date
              ).toLocaleDateString("en-GB");
              document.getElementById("order_status").innerHTML +=
                data.o_status;
            }
          }
        });
    } else {
      throw new Error("Invalid user data");
    }
  })
  .catch((error) => {
    console.error("Error:", error);
  });

function logout() {
  fetch("/user/logout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message == "You need to login to logout.") {
        alert(data.message);
      } else {
        alert("Logout successful!");
        window.location.href = "/";
      }
    })
    .catch((error) => {
      console.log("Error: ", error);
      alert("Error: " + error.message);
    });
}

function updateUser() {
  var updateuname = document.getElementById("updateuname").value;
  var updateemail = document.getElementById("updateemail").value;
  var updateuaddress = document.getElementById("updateuaddress").value;
  var updatepincode = document.getElementById("updatepincode").value;
  var updatembno = document.getElementById("updatembno").value;
  var profileData = {
    username: updateuname,
    email: updateemail,
    address: updateuaddress,
    pincode: updatepincode,
    mobile: updatembno,
  };

  fetch("/user/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profileData), // Convert the profile data to a JSON string
  })
    .then((response) => {
      if (!response.ok) {
        // If the response status is not OK, handle the error
        return response.text().then((text) => {
          throw new Error(text);
        });
      }
      return response.json(); // Parse the response as JSON
    })
    .then((data) => {
      if (data.message == "Please login to update your profile.") {
        alert("Please login to update your profile.");
      } else if (data.message) {
        alert("Profile Updated Successfully!");
      } else {
        throw new Error("Unexpected response format");
      }
    })
    .catch((error) => {
      console.log("Error:", error);
      alert("Error updating profile: " + error.message);
    });
}

function changepass() {
  var cpass = document.getElementById("cpass").value;
  var npass = document.getElementById("npass").value;
  var cnpass = document.getElementById("cnpass").value;

  const passwordData = {
    currentPassword: cpass,
    newPassword: npass,
    confirmPassword: cnpass,
  };
  fetch("/user/password", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(passwordData), // Convert the password data to a JSON string
  })
    .then((response) => {
      if (!response.ok) {
        return response.text().then((text) => {
          throw new Error(text);
        });
      }
      return response.json(); // Parse the response as JSON
    })
    .then((data) => {
      if (data.message == "Please login to update your password.") {
        alert("Please login to update your password.");
      } else {
        alert("Password Updated Successfully!");
      }
    })
    .catch((error) => {
      console.log("Error:", error);
      alert("Error updating password: " + error.message);
    });
}
fetch("/feedback/customer")
  .then((response) => response.json())
  .then((data) => {
    // console.log(data);
    const feedbackContainer = document.getElementById("f_container");
    if (data.message == "No feedback data found.") {
      feedbackContainer.innerHTML = "<h3>No feedbacks found!</h3>";
    } else {
      data.forEach((item) => {
        // Create a new div for each feedback item
        const feedbackCard = document.createElement("div");
        feedbackCard.style = `
    background-color: white;
    height: auto;
    width: 19cm;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: left !important;
    margin-bottom: 20px;  // Add margin to separate each card
  `;

        const cardContent = `
    <div
      style="
        width: 100%;
        padding: 1rem !important;
        margin-left: 1cm !important;
        margin-top: 10px !important;
        position:relative;
      "
    >
      <h5
        style="
          font-size: 1.5rem !important;
          font-weight: bold !important;
          margin-bottom: 20px !important;
        "
      >
        ${item.name.replace(/_/g, " ")}
        <button id="del_feedback" onclick="delfeedback('${
          item.F_ID
        }')">Delete</button>
      </h5>
      <div class="stars" style="margin-bottom:10px;">${"⭐".repeat(
        item.star_rating
      )}</div>
      <p><strong>Date: </strong>${new Date(item.F_DATE).toLocaleDateString(
        "en-GB"
      )}</p>
      <p style="width: 100% !important; margin: 10px 0">${item.F_DESC}</p>
    </div>
  `;

        feedbackCard.innerHTML = cardContent;
        feedbackContainer.appendChild(feedbackCard);
      });
    }
  });

function delfeedback(f_id) {
  fetch("/feedback/delete", {
    method: "DELETE",
    body: JSON.stringify({ feedbackId: f_id }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((data) => {
      if (data.status == 200) {
        alert("feedback deleted successfully!");
        location.reload();
      } else {
        console.error("Error:", data.statusText);
      }
    })
    .catch((error) => console.error("Error:", error));
}
function deleteUser() {
  const userConfirmed = confirm(
    "Are you sure you want to delete your account?"
  );
  if (!userConfirmed) {
    return; // Exit if the user cancels the action
  }

  fetch("/user/delete", {
    method: "DELETE", // Specify the HTTP method as DELETE
    headers: {
      "Content-Type": "application/json", // Ensure the server knows it's JSON data
    },
  })
    .then((response) => {
      if (response.ok) {
        alert("Your account has been deleted successfully."); // Notify user of success
        window.location.href = "/login.html";
      } else {
        response.json().then((data) => {
          alert(`Error: ${data.error || "Failed to delete your account."}`); // Show error from the server
        });
      }
    })
    .catch((error) => {
      console.error("Error deleting account:", error);
      alert(
        "An error occurred while trying to delete your account. Please try again."
      );
    });
}
