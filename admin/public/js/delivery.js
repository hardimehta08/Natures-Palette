// Fetch orders for Delivery tab (all orders with filter, Delivered sorted to bottom)
async function fetchOrders1(statusFilter = "") {
  try {
    const response = await fetch('/admin/orders');

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid response format: Expected an array");
    }

    console.log("Fetched Delivery Orders:", data);

    // Filter orders based on statusFilter (if provided)
    let filteredData = data;
    if (statusFilter) {
      filteredData = data.filter((order) => order.status === statusFilter);
    }

    // Sort orders: non-Delivered first, Delivered last
    filteredData.sort((a, b) => {
      if (a.status === "Delivered" && b.status !== "Delivered") return 1;
      if (a.status !== "Delivered" && b.status === "Delivered") return -1;
      return 0; // Maintain original order within same status
    });

    const tableBody = document.getElementById("delivery-table-body");
    tableBody.innerHTML = "";

    // Check if filtered data is empty
    if (filteredData.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5">No orders for this status</td>
        </tr>
      `;
    } else {
      filteredData.forEach((order) => {
        const assigned = order.d_name ? order.d_name : "Not Assigned";
        console.log(`Order ${order.O_id}: Status = ${order.status}, Assigned = ${assigned}, Delivery Person = ${order.d_name}`);
        
        // Determine action column content based on status
        let actionContent = "";
        if (order.status === "Delivered") {
          actionContent = "No actions available"; // No buttons for Delivered orders
        } else {
          actionContent = assigned === "Not Assigned"
            ? `<button onclick="openAssignDeliveryModal('${order.O_id}')">Assign</button>`
            : `<button onclick="unassignDelivery('${order.O_id}')">Unassign</button>`;
        }

        tableBody.innerHTML += `
          <tr data-order-id="${order.O_id}">
            <td>${order.O_id}</td>
            <td>${order.customer_name || "Unknown"}</td>
            <td>${order.status}</td>
            <td>${assigned}</td>
            <td>${actionContent}</td>
          </tr>
        `;
      });
    }
  } catch (error) {
    console.error("Error fetching delivery orders:", error);
    const tableBody = document.getElementById("delivery-table-body");
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">Error loading orders</td>
      </tr>
    `;
  }
}

// Open Assign Delivery Modal
async function openAssignDeliveryModal(orderId) {
  document.getElementById("assign-order-id").value = orderId;

  const response = await fetch('/admin/delivery-persons');
  const persons = await response.json();
  const deliverySelect = document.getElementById("delivery-person");

  deliverySelect.innerHTML = `<option value="">Select Delivery Person</option>`;
  persons.forEach((person) => {
    deliverySelect.innerHTML += `<option value="${person.d_id}">${person.d_name}</option>`;
  });

  document.getElementById("assignDeliveryModal").style.display = "block";
}

// Close Assign Delivery Modal
function closeAssignDeliveryModal() {
  document.getElementById("assignDeliveryModal").style.display = "none";
}

// Assign Delivery Person
document.getElementById("assignDeliveryForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const orderId = document.getElementById("assign-order-id").value;
  const deliveryPersonId = document.getElementById("delivery-person").value;

  try {
    const response = await fetch("/admin/assign-delivery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, deliveryPersonId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      alert(result.message);
      closeAssignDeliveryModal();
      fetchOrders1(document.getElementById("delivery-status-filter").value); // Refresh with current filter
    } else {
      throw new Error("Failed to assign delivery person");
    }
  } catch (error) {
    console.error("Error assigning delivery person:", error);
    alert("Failed to assign delivery person. Please try again.");
  }
});

// Unassign Delivery Person
async function unassignDelivery(orderId) {
  if (!confirm("Are you sure you want to unassign the delivery person?")) return;

  try {
    const response = await fetch("/admin/unassign-delivery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      alert(result.message);
      fetchOrders1(document.getElementById("delivery-status-filter").value); // Refresh with current filter
    } else {
      throw new Error("Failed to unassign delivery person");
    }
  } catch (error) {
    console.error("Error unassigning delivery person:", error);
    alert("Failed to unassign delivery person. Please try again.");
  }
}

// Initial fetch and filter setup for Delivery tab
document.addEventListener("DOMContentLoaded", () => {
  fetchOrders1(); // Initial fetch with no filter

  const statusFilter = document.getElementById("delivery-status-filter");
  statusFilter.addEventListener("change", (e) => {
    fetchOrders1(e.target.value); // Fetch with selected filter
  });
});