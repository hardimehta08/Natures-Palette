// customer.js
window.highlightCustomer = function (customerId) {
  console.log(`Highlighting customer with customerId: ${customerId}`);

  const customerTableBody = document.getElementById("customer-table-body");
  if (!customerTableBody) {
    console.error("Customer table body (#customer-table-body) not found");
    return;
  }

  const rows = customerTableBody.getElementsByTagName("tr");
  if (rows.length === 0) {
    console.warn("No rows found in customer table, fetching customers...");
    window.lastHighlightedCustomerId = customerId; // Store for post-fetch highlight
    fetchCustomers();
    return;
  }

  let found = false;
  for (let row of rows) {
    const idCell = row.cells[0]; // c_id column
    if (idCell && idCell.textContent.trim() === customerId) {
      Array.from(rows).forEach((r) => r.classList.remove("highlight"));
      row.classList.add("highlight");
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      found = true;
      break;
    }
  }

  if (!found) {
    console.warn(
      `Customer ID ${customerId} not found in the table, fetching fresh data...`
    );
    window.lastHighlightedCustomerId = customerId; // Store for retry
    fetchCustomers();
  }
};

// Fetch data from backend and display in the table
const fetchCustomers = async () => {
  try {
    // Get the search query from the input field
    const searchName =
      document.getElementById("customer-name-search")?.value || "";
    const url = `/customers${
      searchName ? `?searchName=${encodeURIComponent(searchName)}` : ""
    }`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const customers = await response.json();
    const tableBody = document.getElementById("customer-table-body");
    tableBody.innerHTML = ""; // Clear existing data

    if (customers.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8">No customers found</td></tr>';
      return;
    }

    customers.forEach((customer) => {
      const row = `
                <tr>
                    <td>${customer.c_username}</td>
                    <td>${customer.c_email}</td>
                    <td>${customer.c_address}</td>
                    <td>${customer.c_mobile}</td>
                    <td id="status-${customer.c_id}">${customer.c_status}</td>
                    <td>
                        <button class="btn" onclick="toggleEditStatus('${customer.c_id}', '${customer.c_status}')">Edit</button>
                    </td>
                </tr>
            `;
      tableBody.innerHTML += row;
    });
    if (window.lastHighlightedCustomerId) {
      highlightCustomer(window.lastHighlightedCustomerId);
      window.lastHighlightedCustomerId = null; // Reset
    }
  } catch (error) {
    console.error("Error fetching customers:", error);
    const tableBody = document.getElementById("customer-table-body");
    tableBody.innerHTML =
      '<tr><td colspan="8">Error loading customers</td></tr>';
  }
};

// Function to toggle status dropdown
const toggleEditStatus = (c_id, currentStatus) => {
  const statusCell = document.getElementById(`status-${c_id}`);

  // Check if the element exists before setting innerHTML
  if (statusCell) {
    statusCell.innerHTML = `
            <select id="status-select-${c_id}" onchange="updateStatus('${c_id}')">
                <option value="ACTIVE" ${
                  currentStatus === "ACTIVE" ? "selected" : ""
                }>ACTIVE</option>
                <option value="INACTIVE" ${
                  currentStatus === "INACTIVE" ? "selected" : ""
                }>INACTIVE</option>
            </select>
        `;
  } else {
    console.error(`Element with ID status-${c_id} not found.`);
  }
};

// Ensure the script runs after DOM is fully loaded
document.addEventListener("DOMContentLoaded", fetchCustomers);

// Function to update status in database
const updateStatus = async (c_id) => {
  const newStatus = document.getElementById(`status-select-${c_id}`).value;
  try {
    const response = await fetch(`/customers/${c_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ c_status: newStatus }),
    });

    if (response.ok) {
      alert("Status updated successfully!");
      fetchCustomers(); // Refresh the table
    } else {
      alert("Failed to update status.");
    }
  } catch (error) {
    console.error("Error updating status:", error);
  }
};
// Call the function when the page loads
window.onload = fetchCustomers;
