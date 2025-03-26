// orderdet.js
// In orderdet.js
window.showOrderDetails = function (orderId) {
  console.log(`Highlighting order with orderId: ${orderId}`);

  // Ensure the Orders section is visible
  showSection("orders");

  // Wait for the table to be populated (if fetchOrders is async)
  setTimeout(() => {
    const tableBody = document.querySelector("#orders-table tbody");
    if (!tableBody) {
      console.error("Orders table body not found");
      return;
    }

    // Find the row with the matching orderId
    const rows = tableBody.getElementsByTagName("tr");
    let found = false;

    for (let row of rows) {
      const orderIdCell = row.cells[0]; // First column is Order ID
      if (orderIdCell && orderIdCell.textContent.trim() === orderId) {
        // Remove highlight from other rows
        Array.from(rows).forEach(r => r.classList.remove("highlight"));
        // Highlight this row
        row.classList.add("highlight");
        // Scroll to the row
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        found = true;
        break;
      }
    }

    if (!found) {
      console.warn(`Order ID ${orderId} not found in the table`);
      // Optionally trigger a fetch if the table might not be up-to-date
      fetchOrders(); // Ensure this function exists and refreshes the table
      setTimeout(() => highlightOrder(orderId), 200); // Retry after fetch
    }
  }, 100); // Delay to ensure table is rendered
};

// Helper function to retry highlighting
function highlightOrder(orderId) {
  const tableBody = document.querySelector("#orders-table tbody");
  const rows = tableBody.getElementsByTagName("tr");
  for (let row of rows) {
    const orderIdCell = row.cells[0];
    if (orderIdCell && orderIdCell.textContent.trim() === orderId) {
      Array.from(rows).forEach(r => r.classList.remove("highlight"));
      row.classList.add("highlight");
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      break;
    }
  }
}

// Ensure fetchOrders exists (example placeholder if not defined)
window.fetchOrders = window.fetchOrders || function () {
  console.log("Fetching orders...");
  fetch("/orders")
    .then(response => response.json())
    .then(data => {
      const tbody = document.querySelector("#orders-table tbody");
      tbody.innerHTML = "";
      data.forEach(order => {
        tbody.innerHTML += `
          <tr>
            <td>${order.orderId}</td>
            <td>${order.date}</td>
            <td>${order.status}</td>
            <td>${order.customerId}</td>
            <td>${order.customerName}</td>
            <td><button onclick="alert('View details for ${order.orderId}')">View</button></td>
          </tr>
        `;
      });
    })
    .catch(error => console.error("Error fetching orders:", error));
};

// Fetch and display orders with filter
function fetchOrders(statusFilter = "", searchName = "") {
  const url = `/order/orderdets${statusFilter || searchName ? "?" : ""}${
    statusFilter ? `status=${statusFilter}` : ""
  }${statusFilter && searchName ? "&" : ""}${searchName ? `searchName=${searchName}` : ""}`;

  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then((data) => {
      const tableBody = document.querySelector("#orders-table tbody");
      tableBody.innerHTML = "";

      data.forEach((order) => {
        const formattedDate = formatDate(order.O_date);
        const row = `
                    <tr>
                        <td>${order.O_id}</td>
                        <td>${formattedDate}</td>
                        <td>${order.O_status}</td>
                        <td>${order.C_id}</td>
                        <td>${order.customer_name || "N/A"}</td>
                        <td>
                            <button class="btn" onclick="viewOrderDetails('${order.O_id}')">View</button>
                            <button class="btn" onclick="openUpdateStatusModal('${order.O_id}', '${order.O_status}')">Update Status</button>
                        </td>
                    </tr>
                `;
        tableBody.innerHTML += row;
      });
    })
    .catch((error) => console.error("Error fetching orders:", error));
}

// Filter orders based on status dropdown
document.addEventListener("DOMContentLoaded", () => {
  fetchOrders(); // Initial fetch without filter

  const statusFilter = document.getElementById("status-filter");
  statusFilter.addEventListener("change", (e) => {
    const searchName = document.getElementById("customer-name-search").value;
    fetchOrders(e.target.value, searchName);
  });

  const customerNameSearch = document.getElementById("customer-name-search");
  customerNameSearch.addEventListener("input", (e) => {
    const statusFilter = document.getElementById("status-filter").value;
    fetchOrders(statusFilter, e.target.value);
  });
});

// Helper function to format date (already provided)
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}
// Open modal to update order status
function openUpdateStatusModal(orderId, currentStatus) {
  document.getElementById("update-order-id").value = orderId;
  document.getElementById("update-status").value = currentStatus;
  document.getElementById("updateStatusModal").style.display = "block";
}

// Close modal
function closeUpdateStatusModal() {
  document.getElementById("updateStatusModal").style.display = "none";
}

// Handle status update form submission
document
  .getElementById("updateStatusForm")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const orderId = document.getElementById("update-order-id").value;
    const newStatus = document.getElementById("update-status").value;

    try {
      const response = await fetch(`/order/orderdets/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");
      const result = await response.json();

      if (result.success) {
        alert("Order status updated successfully!");
        closeUpdateStatusModal();
        fetchOrders(document.getElementById("status-filter").value); // Refresh orders
      } else {
        alert("Failed to update status: " + result.error);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Error updating status. Please try again.");
    }
  });
// View order details
function viewOrderDetails(orderId) {
  const orderDetailsContainer = document.getElementById("order-details");
  orderDetailsContainer.innerHTML = "";

  fetch(`/order/orderdets/${orderId}/details`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Server error: ${response.status} - ${response.statusText}`
        );
      }
      return response.json();
    })
    .then((details) => {
      console.log("Order Details:", details);

      if (!Array.isArray(details)) {
        orderDetailsContainer.innerHTML = `<tr><td colspan="7">${
          details.error || "Unexpected response"
        }</td></tr>`;
        document.getElementById("order-details-modal").style.display = "block";
        return;
      }

      if (details.length === 0) {
        orderDetailsContainer.innerHTML = `<tr><td colspan="7">No details found for this order.</td></tr>`;
        document.getElementById("order-details-modal").style.display = "block";
        return;
      }

      details.forEach((detail) => {
        const row = `
                    <tr>
                        <td>${detail.Odetails_id}</td>
                        <td>${detail.product_name || "N/A"}</td>
                        <td>${detail.description || "N/A"}</td>
                        <td><img src="${detail.image}" alt="${
          detail.product_name || "Product"
        }" width="100" onerror="this.onerror=null; this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';"></td>
                        <td>${detail.ODETAILS_Qty}</td>
                        <td>${detail.ODETAILS_price}</td>
                        <td>${detail.category_name || "N/A"}</td>
                    </tr>
                `;
        console.log(
          `Rendering image for product ${detail.Odetails_id}: ${detail.image}`
        );
        orderDetailsContainer.innerHTML += row;
      });
      document.getElementById("order-details-modal").style.display = "block";
    })
    .catch((error) => {
      console.error("Error fetching order details:", error);
      orderDetailsContainer.innerHTML = `<tr><td colspan="7">Error loading details: ${error.message}</td></tr>`;
      document.getElementById("order-details-modal").style.display = "block";
    });
}

function closeModal() {
  document.getElementById("order-details-modal").style.display = "none";
}

// Fetch orders on page load
document.addEventListener("DOMContentLoaded", fetchOrders);
