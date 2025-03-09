document.addEventListener('DOMContentLoaded', () => {
  fetchDeliveryPersons();
});

async function fetchDeliveryPersons() {
  try {
    console.log('Fetching delivery persons...');
    const response = await fetch('/admin/deliverypersons', { credentials: 'include' });
    console.log('Response status:', response.status);
    if (!response.ok) throw new Error(`Failed to fetch delivery persons: ${response.statusText}`);
    const deliveryPersons = await response.json();
    console.log('Fetched delivery persons:', deliveryPersons);

    const list = document.getElementById('delivery-persons-list');
    list.innerHTML = '';
    if (!deliveryPersons || deliveryPersons.length === 0) {
      list.innerHTML = '<tr><td colspan="5">No delivery persons found</td></tr>';
    } else {
      deliveryPersons.forEach((person) => {
        const status = person.d_status || 'active';
        list.innerHTML += `
          <tr>
            <td>${person.d_id}</td>
            <td>${person.d_name}</td>
             <td>${person.d_email}</td>
            <td>${person.d_phone || 'N/A'}</td>
            <td>${status}</td>
            <td>
              <button class="btn" onclick="toggleDeliveryPersonStatus('${person.d_id}', '${status}')">
                ${status === 'active' ? 'Block' : 'Unblock'}
              </button>
            </td>
          </tr>
        `;
      });
    }
  } catch (error) {
    console.error('Error fetching delivery persons:', error);
    document.getElementById('delivery-persons-list').innerHTML = '<tr><td colspan="5">Error loading delivery persons</td></tr>';
  }
}

async function toggleDeliveryPersonStatus(personId, currentStatus) {
  if (!personId || !currentStatus) {
    console.error('Invalid input:', { personId, currentStatus });
    alert('Invalid delivery person data.');
    return;
  }

  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  if (!confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} this delivery person?`)) return;

  try {
    const apiUrl = `/admin/update/${personId}`; // Replace with your API URL
    console.log('Requesting:', { url: apiUrl, personId, newStatus });
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
      credentials: 'include',
    });

    if (!response.ok) {
      const contentType = response.headers.get('Content-Type');
      const errorText = await response.text();
      throw new Error(`Failed to update status: ${response.status} - ${contentType.includes('json') ? errorText : 'Endpoint not found (HTML response)'}`);
    }

    const result = await response.json();
    if (result.success) {
      alert(`Delivery person ${personId} is now ${newStatus}.`);
      fetchDeliveryPersons();
      fetchOrders1();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error toggling delivery person status:', error);
    alert(`Failed to toggle delivery person status: ${error.message}`);
  }
}

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

    // Filter orders based on statusFilter (if provided)
    let filteredData = data;
    if (statusFilter) {
      filteredData = data.filter((order) => order.status === statusFilter);
    }

    filteredData.sort((a, b) => {
      const aIsDeliveredAndPaid = a.status === "DELIVERED" && a.payment_status === "PAID";
      const bIsDeliveredAndPaid = b.status === "DELIVERED" && b.payment_status === "PAID";

      if (aIsDeliveredAndPaid && !bIsDeliveredAndPaid) return 1; // a goes to bottom
      if (!aIsDeliveredAndPaid && bIsDeliveredAndPaid) return -1; // b goes to bottom
      return 0; // Maintain original order if neither or both are Delivered & Paid
    });

    const tableBody = document.getElementById("delivery-table-body");
    tableBody.innerHTML = "";

    // Check if filtered data is empty
    if (filteredData.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6">No orders for this status</td>
        </tr>
      `;
    } else {
      filteredData.forEach((order) => {
        const assigned = order.d_name ? order.d_name : "Not Assigned";
        
        // Determine action column content based on status
        let actionContent = "";
        if (order.status === "DELIVERED" && order.payment_status === "PAID") {
          actionContent = "No actions available"; // No buttons for Delivered orders
        } else {
          actionContent = assigned === "Not Assigned"
            ? `<button class="btn primary" onclick="openAssignDeliveryModal('${order.O_id}')">Assign</button>`
            : `<button class="btn primary" onclick="unassignDelivery('${order.O_id}')">Unassign</button>`;
        }

        tableBody.innerHTML += `
          <tr data-order-id="${order.O_id}">
            <td>${order.O_id}</td>
            <td>${order.customer_name || "Unknown"}</td>
            <td>${order.status}</td>
            <td>${order.payment_status}</td>
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