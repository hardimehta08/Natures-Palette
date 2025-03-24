// report.js
let criticalStockData = [];
let salesTrendChart = null;
let bestSellersChart = null;
let orderStatusChart = null;
let bestSellersData = []; // Store the full best-sellers data for filtering

// Fetch categories for the inventory filter dropdown (also used for best-sellers filter)
function fetchInventoryCategories1() {
  fetch("/report/inventory-categories1")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Categories received:", data);
      const categoryFilter = document.getElementById("inventoryCategoryFilter");
      const bestSellersCategoryFilter = document.getElementById(
        "bestSellersCategoryFilter"
      );
      if (!categoryFilter || !bestSellersCategoryFilter) {
        console.error("Category filter elements not found in DOM");
        return;
      }
      categoryFilter.innerHTML = '<option value="">All Categories</option>';
      bestSellersCategoryFilter.innerHTML =
        '<option value="">All Categories</option>';

      // Ensure data is an array
      const categories = Array.isArray(data) ? data : [];
      if (categories.length > 0) {
        categories.forEach((cat) => {
          categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
          bestSellersCategoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
      } else {
        console.warn("No valid categories returned from the server");
      }
    })
    .catch((error) => {
      console.error("Error fetching inventory categories:", error);
      alert("Failed to load categories. Please try again later.");
    });
}

// Update Best-Sellers Chart based on selected category
function updateBestSellersChart() {
  const selectedCategory = document.getElementById(
    "bestSellersCategoryFilter"
  ).value;
  let filteredData = bestSellersData;
  if (selectedCategory) {
    filteredData = bestSellersData.filter(
      (item) => item.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }

  // Map product IDs to product names
  const productNames = filteredData.reduce((acc, item) => {
    acc[item.Product_id] = item.productName;
    return acc;
  }, {});

  if (bestSellersChart) bestSellersChart.destroy();
  const bestSellersCtx = document
    .getElementById("bestSellersChart")
    .getContext("2d");
  bestSellersChart = new Chart(bestSellersCtx, {
    type: "bar",
    data: {
      labels: filteredData.map((item) => item.Product_id), // Display product IDs on the x-axis
      datasets: [
        {
          label: "Units Sold",
          data: filteredData.map((item) => item.totalSold),
          backgroundColor: "rgba(115, 128, 236, 0.6)", // Use a single color
          borderColor: "#7380ec",
          borderWidth: 1,
        },
      ],
    },
    options: {
      indexAxis: "y", // This sets the bar chart to horizontal
      maintainAspectRatio: false, 
      responsive: true,
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Units Sold",
          },
          ticks: {
            precision: 0, // Ensure integer values on the x-axis
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Product IDs",
          },
          ticks: {
            callback: function (value, index, values) {
              return filteredData[index].Product_id; // Display product IDs
            },
          },
        },
      },
      plugins: {
        legend: {
          position: "top",
        },
        tooltip: {
          enabled: false, // Disable default tooltips
        },
      },
      layout: {
        padding: {
          right: 30,
          bottom:30,
        },
      },
      maintainAspectRatio: false, // Allow the chart to adjust its height
    },
    height: 400, // Set the height of the chart
  });

  const popup = document.getElementById("popup");
  const chartContainer =
    document.getElementById("bestSellersChart").parentElement;
  chartContainer.style.height = "400px"; // Set the height to 320px

  document
    .getElementById("bestSellersChart")
    .addEventListener("mousemove", function (event) {
      const points = bestSellersChart.getElementsAtEventForMode(
        event,
        "nearest",
        { intersect: true },
        true
      );
      if (points.length) {
        const firstPoint = points[0];
        const productId = bestSellersChart.data.labels[firstPoint.index];
        const productName = productNames[productId];
        const unitsSold =
          bestSellersChart.data.datasets[0].data[firstPoint.index];

        popup.style.display = "block";
        popup.style.left = event.pageX + 10 + "px";
        popup.style.top = event.pageY + 10 + "px";
        popup.innerHTML = `<strong>${productName}</strong><br>ID: ${productId}<br>Units Sold: ${unitsSold}`;
      } else {
        popup.style.display = "none";
      }
    });
}

// Fetch Dashboard Data
function fetchDashboardData() {
  fetch("/report/dashboard")
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to fetch dashboard data: ${response.statusText}`
        );
      }
      return response.json();
    })
    .then((data) => {
      if (!data || !data.keyMetrics || !data.charts || !data.recentActivity) {
        console.error("Invalid response format:", data);
        // Reset UI on error
        document.getElementById("dailySales").textContent = "Rs. 0";
        document.getElementById("weeklySales").textContent = "Rs. 0";
        document.getElementById("monthlySales").textContent = "Rs. 0";
        document.getElementById("totalOrders").textContent = "0";
        document.getElementById("totalActiveCustomers").textContent = "0";
        document.getElementById("totalInventory").textContent = "0";
        if (salesTrendChart) salesTrendChart.destroy();
        if (bestSellersChart) bestSellersChart.destroy();
        if (orderStatusChart) orderStatusChart.destroy();
        document.getElementById("recentActivityLog").innerHTML = "";
        alert("Failed to load dashboard data. Please try again later.");
        return;
      }

      // Update Key Metrics
      document.getElementById(
        "dailySales"
      ).textContent = `Rs. ${data.keyMetrics.dailySales.toFixed(2)}`;
      document.getElementById(
        "weeklySales"
      ).textContent = `Rs. ${data.keyMetrics.weeklySales.toFixed(2)}`;
      document.getElementById(
        "monthlySales"
      ).textContent = `Rs. ${data.keyMetrics.monthlySales.toFixed(2)}`;
      document.getElementById("totalOrders").textContent =
        data.keyMetrics.totalOrders;
      document.getElementById("totalActiveCustomers").textContent =
        data.keyMetrics.totalActiveCustomers;
      document.getElementById("totalInventory").textContent =
        data.keyMetrics.totalInventory;

      // Sales Trend Chart
      if (salesTrendChart) salesTrendChart.destroy();
      const salesTrendCtx = document
        .getElementById("salesTrendChart")
        .getContext("2d");
      salesTrendChart = new Chart(salesTrendCtx, {
        type: "line",
        data: {
          labels: data.charts.salesTrend.map((item) =>
            new Date(item.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          ),
          datasets: [
            {
              label: "Sales",
              data: data.charts.salesTrend.map((item) => item.totalSales),
              borderColor: "#7380ec",
              backgroundColor: "rgba(115, 128, 236, 0.2)",
              fill: false,
              tension: 0.1,
            },
          ],
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "Sales (Rs.)" },
            },
            x: { title: { display: true, text: "Date" } },
          },
        },
      });

      // Store best-sellers data for filtering
      bestSellersData = data.charts.bestSellers;
      updateBestSellersChart();

      // Order Status Distribution Chart
      console.log("Order Status Data:", data.charts.orderStatus);
      if (orderStatusChart) orderStatusChart.destroy();
      const orderStatusCtx = document
        .getElementById("orderStatusChart")
        .getContext("2d");
      orderStatusChart = new Chart(orderStatusCtx, {
        type: "pie",
        data: {
          labels: data.charts.orderStatus.map((item) => item.status),
          datasets: [
            {
              label: "Order Count by Status",
              data: data.charts.orderStatus.map((item) => item.count),
              backgroundColor: [
                "#ff6384", // Pending
                "#36a2eb", // Processing
                "#ffce56", // Shipped
                "#4bc0c0", // Delivered
                "#ff9f40", // Canceled
              ],
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "top",
              onClick: (e, legendItem, legend) => {
                // Prevent default legend click behavior (toggling visibility)
                e.stopPropagation();
                const status = legend.chart.data.labels[legendItem.index];
                navigateToOrdersWithStatusFilter(status);
              },
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const label = context.label || "";
                  const value = context.raw || 0;
                  return `${label}: ${value} orders`;
                },
              },
            },
          },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const element = elements[0];
              const status =
                element.element.$context.chart.data.labels[element.index];
              navigateToOrdersWithStatusFilter(status);
            }
          },
        },
      });

      // Recent Activity Log with Clickable Links
      const activityLog = document.getElementById("recentActivityLog");
console.log("Raw Recent Activity Data:", data.recentActivity);
activityLog.innerHTML = ""; // Clear existing entries

const allActivities = [
  ...(data.recentActivity || []),
  ...(window.recentActivity || [])
].filter(activity => activity && activity.activityType);

const seenIdentifiers = new Set();
const uniqueActivities = allActivities.filter(activity => {
  const key = `${activity.activityType}-${activity.identifier}`;
  if (seenIdentifiers.has(key)) {
    console.warn(`Duplicate activity detected: ${key}`);
    return false;
  }
  seenIdentifiers.add(key);
  return true;
}).sort((a, b) => new Date(b.activityDate) - new Date(a.activityDate)).slice(0, 5);

console.log("Deduplicated Activities after merge:", uniqueActivities);
activityLog.innerHTML = "";

uniqueActivities.forEach((activity) => {
  const li = document.createElement("li");
  const link = document.createElement("a");
  link.href = "#";
  link.textContent = `${activity.activityType} at ${new Date(activity.activityDate).toLocaleString()}`;
  link.style.cursor = "pointer";
  link.style.color = "#7380ec";
  link.style.textDecoration = "none";

  // Add click handlers based on activity type
  switch (activity.activityType) {
    case "New Order":
      link.onclick = () => {
        console.log(`Navigating to Orders and highlighting orderId: ${activity.identifier}`);
        showSection("orders");
        setTimeout(() => {
          if (typeof window.showOrderDetails === "function") {
            window.showOrderDetails(activity.identifier);
          } else {
            console.error("showOrderDetails is not defined");
          }
        }, 100); // Delay to ensure Orders section is rendered
      };
      break;

    case "New Customer":
      link.onclick = () => {
        console.log(`Navigating to Customers with customerId: ${activity.identifier}`);
        showSection("customer");
        setTimeout(() => {
          if (typeof window.highlightCustomer === "function") {
            window.highlightCustomer(activity.identifier);
          } else {
            console.error("highlightCustomer is not defined");
          }
        }, 100);
      };
      break;

      case "Low Stock Alert":
        link.onclick = () => {
          console.log(`Navigating to Inventory with productId: ${activity.identifier}`);
          showSection("inventory-report");
          setTimeout(() => {
            if (typeof window.highlightLowStockProduct === "function") {
              window.highlightLowStockProduct(activity.identifier);
            } else {
              console.error("highlightLowStockProduct is not defined");
            }
          }, 100);
        };
        break;

    default:
      console.warn(`Unhandled activity type: ${activity.activityType}`);
  }

  li.appendChild(link);
  activityLog.appendChild(li);
});
    })
    .catch((error) => {
      console.error("Error fetching dashboard data:", error);
      // Reset UI on error
      document.getElementById("dailySales").textContent = "Rs. 0";
      document.getElementById("weeklySales").textContent = "Rs. 0";
      document.getElementById("monthlySales").textContent = "Rs. 0";
      document.getElementById("totalOrders").textContent = "0";
      document.getElementById("totalActiveCustomers").textContent = "0";
      document.getElementById("totalInventory").textContent = "0";
      if (salesTrendChart) salesTrendChart.destroy();
      if (bestSellersChart) bestSellersChart.destroy();
      if (orderStatusChart) orderStatusChart.destroy();
      document.getElementById("recentActivityLog").innerHTML = "";
      alert("Failed to load dashboard data. Please try again later.");
    });
}

// Call fetchDashboardData when the Dashboard tab is shown
document.addEventListener("DOMContentLoaded", () => {
  fetchDashboardData();
  fetchInventoryCategories1();
});

// report.js
let orderPieChart = null;
let orderBarChart = null;
let salesByPeriodChart = null;
let salesByProductChart = null;
let salesByCategoryChart = null;
let customerDemographicsChart = null;
let customerPurchaseHistoryChart = null;

// let currentReportType = 'order-report';

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  fetchInventoryCategories(); // Fetch categories for inventory filter

  // Setup event listeners for date range toggles
  document
    .getElementById("salesDateRange")
    .addEventListener("change", function () {
      const customRangeDiv = document.getElementById("salesCustomDateRange");
      customRangeDiv.style.display = this.value === "custom" ? "block" : "none";
      if (this.value !== "custom") fetchSalesReport();
    });

  document
    .getElementById("customerDateRange")
    .addEventListener("change", function () {
      const customRangeDiv = document.getElementById("customerCustomDateRange");
      customRangeDiv.style.display = this.value === "custom" ? "block" : "none";
      if (this.value !== "custom") fetchCustomerReport();
    });

  document
    .getElementById("orderDateRange")
    .addEventListener("change", function () {
      const customRangeDiv = document.getElementById("customDateRange");
      customRangeDiv.style.display = this.value === "custom" ? "block" : "none";
      if (this.value !== "custom") fetchOrderReport();
    });
});

// Fetch categories for the inventory filter dropdown
function fetchInventoryCategories() {
  fetch("/report/inventory-categories")
    .then((response) => response.json())
    .then((categories) => {
      const categoryFilter = document.getElementById("inventoryCategoryFilter");
      categoryFilter.innerHTML = '<option value="">All Categories</option>';
      categories.forEach((cat) => {
        categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
      });
    })
    .catch((error) =>
      console.error("Error fetching inventory categories:", error)
    );
}

function handleDateRangeChangeSales() {
  const dateRange = document.getElementById("salesDateRange").value;
  const customDateRangeDiv = document.getElementById("salesCustomDateRange");

  if (dateRange === "custom") {
    customDateRangeDiv.style.display = "block"; // Show custom date inputs
  } else {
    customDateRangeDiv.style.display = "none"; // Hide custom date inputs
    fetchSalesReport(); // Trigger the fetch for predefined ranges
  }
}
// Fetch Sales Report

function fetchSalesReport() {
  // Check if required DOM elements exist
  const dateRangeElement = document.getElementById("salesDateRange");
  const startDateElement = document.getElementById("salesStartDate");
  const endDateElement = document.getElementById("salesEndDate");
  const totalSalesElement = document.getElementById("totalSales");
  const periodChartElement = document.getElementById("salesByPeriodChart");
  const productChartElement = document.getElementById("salesByProductChart");
  const categoryChartElement = document.getElementById("salesByCategoryChart");

  if (!dateRangeElement || !startDateElement || !endDateElement || !totalSalesElement || !periodChartElement || !productChartElement || !categoryChartElement) {
    console.error("One or more required DOM elements are missing.");
    alert("Error: Required elements are missing on the page.");
    return;
  }

  const dateRange = dateRangeElement.value;
  let startDate, endDate;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayBeforeYesterday = new Date(yesterday);
  dayBeforeYesterday.setDate(yesterday.getDate() - 1);
  const maxDate = yesterday.toISOString().split("T")[0]; // e.g., "2025-03-22"
  const maxStartDate = dayBeforeYesterday.toISOString().split("T")[0]; // e.g., "2025-03-21"
  const minDate = "2020-01-01";

  // Dynamically set max attributes for date inputs
  startDateElement.max = maxStartDate;
  endDateElement.max = maxDate;

  console.log("Selected date range:", dateRange); // Debug: Log the selected date range

  if (dateRange === "all") {
    startDate = minDate;
    endDate = maxDate;
  } else if (dateRange === "today") {
    startDate = endDate = maxDate;
  } else if (dateRange === "last7days") {
    endDate = maxDate;
    startDate = new Date(yesterday.setDate(yesterday.getDate() - 7))
      .toISOString()
      .split("T")[0];
  } else if (dateRange === "last30days") {
    endDate = maxDate;
    startDate = new Date(yesterday.setDate(yesterday.getDate() - 30))
      .toISOString()
      .split("T")[0];
  } else if (dateRange === "custom") {
    startDate = startDateElement.value;
    endDate = endDateElement.value;

    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const min = new Date(minDate);
    const max = new Date(maxDate);
    const maxStart = new Date(maxStartDate);

    if (start < min) {
      alert("Start date cannot be before January 1, 2020.");
      return;
    }
    if (start > maxStart) {
      alert(`Start date cannot be after ${maxStartDate} (day before yesterday).`);
      return;
    }
    if (end > max) {
      alert(`End date cannot be after ${maxDate} (yesterday).`);
      return;
    }
    if (start > end) {
      alert("Start date cannot be after end date.");
      return;
    }
  } else {
    console.error("Invalid date range selected:", dateRange);
    alert("Please select a valid date range.");
    return;
  }

  console.log("Calculated startDate:", startDate); // Debug: Log the startDate
  console.log("Calculated endDate:", endDate); // Debug: Log the endDate

  // Determine the grouping for the chart label
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = Math.abs(end - start);
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  let periodLabel;
  if (daysDiff === 0 || daysDiff === 1) {
    periodLabel = "Hour";
  } else if (daysDiff <= 7) {
    periodLabel = "Date";
  } else if (daysDiff <= 90) {
    periodLabel = "Week";
  } else {
    periodLabel = "Month";
  }

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append("startDate", startDate);
  if (endDate) queryParams.append("endDate", endDate);

  console.log("Query parameters:", queryParams.toString()); // Debug: Log the query parameters

  // Show loading state
  totalSalesElement.textContent = "Loading...";

  fetch(`/report/sales-report?${queryParams.toString()}`)
    .then((response) => {
      console.log("Response status:", response.status); // Debug: Log the response status
      if (!response.ok) {
        return response.json().then((errorData) => {
          throw new Error(`HTTP error! Status: ${response.status}, Response: ${JSON.stringify(errorData)}`);
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log("Sales Report Data:", data);
      console.log("Sales by Product:", data.salesByProduct);
      console.log("Sales by Category:", data.salesByCategory);

      // Validate data structure
      if (!data.totalSales || !Array.isArray(data.totalSales)) {
        console.warn("Total sales data is missing or invalid:", data.totalSales);
        data.totalSales = [];
      }
      if (!data.salesByProduct || !Array.isArray(data.salesByProduct)) {
        console.warn("Sales by product data is missing or invalid:", data.salesByProduct);
        data.salesByProduct = [];
      }
      if (!data.salesByCategory || !Array.isArray(data.salesByCategory)) {
        console.warn("Sales by category data is missing or invalid:", data.salesByCategory);
        data.salesByCategory = [];
      }

      // Update Total Sales
      const totalSales = data.totalSales.reduce(
        (sum, item) => sum + (item.totalSales || 0),
        0
      );
      totalSalesElement.textContent = `Rs. ${totalSales.toFixed(2)}`;

      // Sales by Period Chart
      if (salesByPeriodChart) salesByPeriodChart.destroy();
      const periodCtx = periodChartElement.getContext("2d");
      salesByPeriodChart = new Chart(periodCtx, {
        type: "line",
        data: {
          labels: data.totalSales.map((item) => item.period || "Unknown Period"),
          datasets: [
            {
              label: "Total Sales",
              data: data.totalSales.map((item) => item.totalSales || 0),
              borderColor: "#7380ec",
              backgroundColor: "rgba(115, 128, 236, 0.2)",
              fill: false,
              tension: 0.1,
            },
          ],
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "Sales (Rs.)" },
            },
            x: { title: { display: true, text: periodLabel } },
          },
        },
      });

      // Sales by Product Chart
      if (salesByProductChart) salesByProductChart.destroy();
      const productCtx = productChartElement.getContext("2d");
      salesByProductChart = new Chart(productCtx, {
        type: "bar",
        data: {
          labels: data.salesByProduct.map((item) => item.Product_id || "Unknown ID"),
          datasets: [
            {
              label: "Total Revenue",
              data: data.salesByProduct.map((item) => item.totalRevenue || 0),
              backgroundColor: "rgba(115, 128, 236, 0.6)",
              borderColor: "#7380ec",
              borderWidth: 1,
            },
          ],
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "Revenue (Rs.)" },
            },
            x: {
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                font: { size: 10 },
              },
            },
          },
          plugins: {
            tooltip: {
              enabled: true,
              callbacks: {
                label: function (context) {
                  console.log("Tooltip triggered for index:", context.dataIndex); // Debug: Log tooltip trigger
                  const item = data.salesByProduct[context.dataIndex];
                  console.log("Tooltip item:", item); // Debug: Log the item
                  const productName = item.productName || "Unknown Product";
                  const categoryName = item.categoryName || "Unknown Category";
                  const revenue = item.totalRevenue || 0;
                  return `${productName} (${categoryName}): Rs. ${revenue}`;
                },
              },
            },
          },
        },
      });

      // Sales by Category Chart
      if (salesByCategoryChart) salesByCategoryChart.destroy();
      const categoryCtx = categoryChartElement.getContext("2d");
      salesByCategoryChart = new Chart(categoryCtx, {
        type: "bar",
        data: {
          labels: data.salesByCategory.map((item) => item.categoryName || "Unknown Category"),
          datasets: [
            {
              label: "Total Revenue",
              data: data.salesByCategory.map((item) => item.totalRevenue || 0),
              backgroundColor: "rgba(115, 128, 236, 0.6)",
              borderColor: "#7380ec",
              borderWidth: 1,
            },
          ],
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "Revenue (Rs.)" },
            },
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function (context) {
                  const item = data.salesByCategory[context.dataIndex];
                  const categoryName = item.categoryName || "Unknown Category";
                  const revenue = item.totalRevenue || 0;
                  return `${categoryName}: Rs. ${revenue}`;
                },
              },
            },
          },
        },
      });
    })
    .catch((error) => {
      console.error("Error fetching sales report:", error);
      alert(`Failed to fetch sales report: ${error.message}`);
    });
}

// Export Sales Report
function exportSalesReport(format) {
  const dateRange = document.getElementById("salesDateRange").value;
  let startDate, endDate;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayBeforeYesterday = new Date(yesterday);
  dayBeforeYesterday.setDate(yesterday.getDate() - 1);
  const maxDate = yesterday.toISOString().split("T")[0]; // "2025-03-22"
  const maxStartDate = dayBeforeYesterday.toISOString().split("T")[0]; // "2025-03-21"
  const minDate = "2020-01-01";

  if (dateRange === "all") {
    startDate = minDate;
    endDate = maxDate;
  } else if (dateRange === "today") {
    startDate = endDate = maxDate;
  } else if (dateRange === "last7days") {
    endDate = maxDate;
    startDate = new Date(yesterday.setDate(yesterday.getDate() - 7))
      .toISOString()
      .split("T")[0];
  } else if (dateRange === "last30days") {
    endDate = maxDate;
    startDate = new Date(yesterday.setDate(yesterday.getDate() - 30))
      .toISOString()
      .split("T")[0];
  } else if (dateRange === "custom") {
    startDate = document.getElementById("salesStartDate").value;
    endDate = document.getElementById("salesEndDate").value;

    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const min = new Date(minDate);
    const max = new Date(maxDate);
    const maxStart = new Date(maxStartDate);

    if (start < min) {
      alert("Start date cannot be before January 1, 2020.");
      return;
    }
    if (start > maxStart) {
      alert(`Start date cannot be after ${maxStartDate} (day before yesterday).`);
      return;
    }
    if (end > max) {
      alert(`End date cannot be after ${maxDate} (yesterday).`);
      return;
    }
    if (start > end) {
      alert("Start date cannot be after end date.");
      return;
    }
  }

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append("startDate", startDate);
  if (endDate) queryParams.append("endDate", endDate);

  const endpoint =
    format === "csv"
      ? "/report/export-sales-report-csv"
      : "/report/export-sales-report-pdf";
  const fileName = `sales_report.${format}`;

  fetch(`${endpoint}?${queryParams.toString()}`, {
    method: "GET",
    headers: { Accept: format === "csv" ? "text/csv" : "application/pdf" },
  })
    .then((response) => {
      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);
      return response.blob();
    })
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      alert(`Sales report exported successfully as ${format.toUpperCase()}!`);
    })
    .catch((error) => {
      console.error(`Error exporting sales report as ${format}:`, error);
      alert(`Failed to export sales report as ${format.toUpperCase()}.`);
    });
}

function fetchCustomerReport() {
  // Check if required DOM elements exist
  const dateRangeElement = document.getElementById("customerDateRange");
  const startDateElement = document.getElementById("customerStartDate");
  const endDateElement = document.getElementById("customerEndDate");
  const demographicsChartElement = document.getElementById("customerDemographicsChart");
  const purchaseHistoryChartElement = document.getElementById("customerPurchaseHistoryChart");

  if (!dateRangeElement || !startDateElement || !endDateElement || !demographicsChartElement || !purchaseHistoryChartElement ) {
    console.error("One or more required DOM elements are missing.");
    alert("Error: Required elements are missing on the page.");
    return;
  }

  const dateRange = dateRangeElement.value;
  let startDate, endDate;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayBeforeYesterday = new Date(yesterday);
  dayBeforeYesterday.setDate(yesterday.getDate() - 1);
  const maxDate = yesterday.toISOString().split("T")[0]; // e.g., "2025-03-22"
  const maxStartDate = dayBeforeYesterday.toISOString().split("T")[0]; // e.g., "2025-03-21"
  const minDate = "2020-01-01";

  // Dynamically set max attributes for date inputs
  startDateElement.max = maxStartDate;
  endDateElement.max = maxDate;

  console.log("Selected date range:", dateRange); // Debug: Log the selected date range

  if (dateRange === "all") {
    startDate = minDate;
    endDate = maxDate;
  } else if (dateRange === "today") {
    startDate = endDate = maxDate;
  } else if (dateRange === "last7days") {
    endDate = maxDate;
    startDate = new Date(yesterday.setDate(yesterday.getDate() - 7))
      .toISOString()
      .split("T")[0];
  } else if (dateRange === "last30days") {
    endDate = maxDate;
    startDate = new Date(yesterday.setDate(yesterday.getDate() - 30))
      .toISOString()
      .split("T")[0];
  } else if (dateRange === "custom") {
    startDate = startDateElement.value;
    endDate = endDateElement.value;

    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const min = new Date(minDate);
    const max = new Date(maxDate);
    const maxStart = new Date(maxStartDate);

    if (start < min) {
      alert("Start date cannot be before January 1, 2020.");
      return;
    }
    if (start > maxStart) {
      alert(`Start date cannot be after ${maxStartDate} (day before yesterday).`);
      return;
    }
    if (end > max) {
      alert(`End date cannot be after ${maxDate} (yesterday).`);
      return;
    }
    if (start > end) {
      alert("Start date cannot be after end date.");
      return;
    }
  } else {
    console.error("Invalid date range selected:", dateRange);
    alert("Please select a valid date range.");
    return;
  }

  console.log("Calculated startDate:", startDate); // Debug: Log the startDate
  console.log("Calculated endDate:", endDate); // Debug: Log the endDate

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append("startDate", startDate);
  if (endDate) queryParams.append("endDate", endDate);

  console.log("Query parameters:", queryParams.toString()); // Debug: Log the query parameters

  fetch(`/report/customer-report?${queryParams.toString()}`)
    .then((response) => {
      console.log("Response status:", response.status); // Debug: Log the response status
      if (!response.ok) {
        return response.json().then((errorData) => {
          throw new Error(`HTTP error! Status: ${response.status}, Response: ${JSON.stringify(errorData)}`);
        });
      }
      return response.json();
    })
    .then((data) => {
      console.log("Customer Report Data:", data);

      // Validate data structure
      if (!data.demographics || !Array.isArray(data.demographics)) {
        console.warn("Demographics data is missing or invalid:", data.demographics);
        data.demographics = [];
      }
      if (!data.purchaseHistory || !Array.isArray(data.purchaseHistory)) {
        console.warn("Purchase history data is missing or invalid:", data.purchaseHistory);
        data.purchaseHistory = [];
      }

      // Customer Demographics Chart (Bar chart by area/pincode)
      if (customerDemographicsChart) customerDemographicsChart.destroy();
      const demographicsCtx = demographicsChartElement.getContext("2d");
      customerDemographicsChart = new Chart(demographicsCtx, {
        type: "bar",
        data: {
          labels: data.demographics.map((item) => item.areaId || "Unknown Area"),
          datasets: [
            {
              label: "Customer Count",
              data: data.demographics.map((item) => item.customerCount || 0),
              backgroundColor: "rgba(54, 162, 235, 0.6)",
              borderColor: "#36a2eb",
              borderWidth: 1,
            },
          ],
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "Number of Customers" },
            },
            x: {
              title: { display: true, text: "Area (Pincode)" },
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                font: { size: 10 },
              },
            },
          },
        },
      });

      // Top Customers by Purchase History Chart (Bar chart with dual y-axis)
      if (customerPurchaseHistoryChart) customerPurchaseHistoryChart.destroy();
      const purchaseHistoryCtx = purchaseHistoryChartElement.getContext("2d");
      customerPurchaseHistoryChart = new Chart(purchaseHistoryCtx, {
        type: "bar",
        data: {
          labels: data.purchaseHistory.map((item) => item.C_ID || "Unknown Customer"),
          datasets: [
            {
              label: "Total Spent (Rs.)",
              data: data.purchaseHistory.map((item) => item.totalSpent || 0),
              backgroundColor: "rgba(255, 99, 132, 0.6)",
              borderColor: "#ff6384",
              borderWidth: 1,
              yAxisID: "y-spent", // Assign to left y-axis
              barThickness: 20, // Increase bar thickness
            },
            {
              label: "Total Orders",
              data: data.purchaseHistory.map((item) => item.totalOrders || 0),
              backgroundColor: "rgba(75, 192, 192, 0.6)",
              borderColor: "#4bc0c0",
              borderWidth: 1,
              yAxisID: "y-orders", // Assign to right y-axis
              barThickness: 20, // Increase bar thickness
            },
          ],
        },
        options: {
          scales: {
            "y-spent": {
              type: "linear",
              position: "left",
              beginAtZero: true,
              title: {
                display: true,
                text: "Total Spent (Rs.)",
              },
              grid: {
                drawOnChartArea: true, // Show grid lines for left y-axis
              },
            },
            "y-orders": {
              type: "linear",
              position: "right",
              beginAtZero: true,
              title: {
                display: true,
                text: "Total Orders",
              },
              grid: {
                drawOnChartArea: false, // Avoid overlapping grid lines
              },
              ticks: {
                stepSize: 1, // Ensure whole numbers for order counts
              },
            },
            x: {
              title: {
                display: true,
                text: "Customer ID",
              },
            },
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function (context) {
                  const item = data.purchaseHistory[context.dataIndex];
                  const datasetLabel = context.dataset.label; // "Total Spent (Rs.)" or "Total Orders"
                  const value = context.raw;
                  const customerName = item.customername || "Unknown Customer";
                  return `${customerName} - ${datasetLabel}: ${datasetLabel === "Total Spent (Rs.)" ? "Rs. " : ""}${value}`;
                },
              },
            },
          },
          responsive: true,
        },
      });   
    })
    .catch((error) => {
      console.error("Error fetching customer report:", error);
      alert(`Failed to fetch customer report: ${error.message}`);
    });
}

function handleDateRangeChangeCustomer() {
  const dateRange = document.getElementById('customerDateRange').value;
  const customDateRange = document.getElementById('customerCustomDateRange');
  const startDateInput = document.getElementById('customerStartDate');
  const endDateInput = document.getElementById('customerEndDate');

  // Set yesterday's date as the max for end date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const maxDate = yesterday.toISOString().split('T')[0];
  endDateInput.setAttribute('max', maxDate);

  if (dateRange === 'custom') {
    customDateRange.style.display = 'block';
    // Set default values for custom range
    startDateInput.value = '2020-01-01'; // Default start date
    endDateInput.value = maxDate; // Default end date (yesterday)
  } else {
    customDateRange.style.display = 'none';
    // Fetch customer report immediately for non-custom ranges
    fetchCustomerReport();
  }
}
// Export Customer Report
function exportCustomerReport(format) {
  const dateRange = document.getElementById("customerDateRange").value;
  let startDate, endDate;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayBeforeYesterday = new Date(yesterday);
  dayBeforeYesterday.setDate(yesterday.getDate() - 1);
  const maxDate = yesterday.toISOString().split("T")[0]; // e.g., "2025-03-22"
  const maxStartDate = dayBeforeYesterday.toISOString().split("T")[0]; // e.g., "2025-03-21"
  const minDate = "2020-01-01";

  if (dateRange === "all") {
    startDate = minDate;
    endDate = maxDate;
  } else if (dateRange === "today") {
    startDate = endDate = maxDate;
  } else if (dateRange === "last7days") {
    endDate = maxDate;
    startDate = new Date(yesterday.setDate(yesterday.getDate() - 7))
      .toISOString()
      .split("T")[0];
  } else if (dateRange === "last30days") {
    endDate = maxDate;
    startDate = new Date(yesterday.setDate(yesterday.getDate() - 30))
      .toISOString()
      .split("T")[0];
  } else if (dateRange === "custom") {
    startDate = document.getElementById("customerStartDate").value;
    endDate = document.getElementById("customerEndDate").value;
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const min = new Date(minDate);
    const max = new Date(maxDate);
    const maxStart = new Date(maxStartDate);

    if (start < min) {
      alert("Start date cannot be before January 1, 2020.");
      return;
    }
    if (start > maxStart) {
      alert(`Start date cannot be after ${maxStartDate} (day before yesterday).`);
      return;
    }
    if (end > max) {
      alert(`End date cannot be after ${maxDate} (yesterday).`);
      return;
    }
    if (start > end) {
      alert("Start date cannot be after end date.");
      return;
    }
  } else {
    console.error("Invalid date range selected:", dateRange);
    alert("Please select a valid date range.");
    return;
  }

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append("startDate", startDate);
  if (endDate) queryParams.append("endDate", endDate);

  const endpoint =
    format === "csv"
      ? "/report/export-customer-report-csv"
      : "/report/export-customer-report-pdf";
  const fileName = `customer_report.${format}`;

  fetch(`${endpoint}?${queryParams.toString()}`, {
    method: "GET",
    headers: { Accept: format === "csv" ? "text/csv" : "application/pdf" },
  })
    .then((response) => {
      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);
      return response.blob();
    })
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      alert(
        `Customer report exported successfully as ${format.toUpperCase()}!`
      );
    })
    .catch((error) => {
      console.error(`Error exporting customer report as ${format}:`, error);
      alert(`Failed to export customer report as ${format.toUpperCase()}.`);
    });
}

document.addEventListener("DOMContentLoaded", () => {
  const notificationToggle = document.getElementById("notificationToggle");
  const notificationDrawer = document.getElementById("notificationDrawer");
  const closeNotificationDrawer = document.getElementById("closeNotificationDrawer");
  const clearNotificationsBtn = document.getElementById("clearNotificationsBtn");

  if (!notificationToggle || !notificationDrawer || !closeNotificationDrawer || !clearNotificationsBtn) {
    console.error("Notification elements not found:", {
      notificationToggle,
      notificationDrawer,
      closeNotificationDrawer,
      clearNotificationsBtn,
    });
    return;
  }

  // Toggle drawer
  notificationToggle.addEventListener("click", () => {
    console.log("Toggling notification drawer");
    console.log("notificationDrawer before toggle:", notificationDrawer);
    console.log("Classes before toggle:", notificationDrawer.classList.toString());
    const isOpen = notificationDrawer.classList.contains("open");
    if (isOpen) {
      notificationDrawer.classList.remove("open");
      notificationDrawer.classList.add("hidden");
      notificationDrawer.style.right = "-300px";
    } else {
      notificationDrawer.classList.remove("hidden");
      notificationDrawer.classList.add("open");
      notificationDrawer.style.right = "0";
    }
    console.log("Classes after toggle:", notificationDrawer.classList.toString());
  });

  // Close drawer
  closeNotificationDrawer.addEventListener("click", () => {
    console.log("Closing notification drawer");
    notificationDrawer.classList.remove("open");
    notificationDrawer.classList.add("hidden");
    notificationDrawer.style.right = "-300px";
  });

  // Clear notifications and close drawer
  clearNotificationsBtn.addEventListener("click", () => {
    console.log("Clearing notifications and closing drawer");
    const notificationList = document.getElementById("notificationList");
    const notificationCount = document.getElementById("drawerNotificationCount");
    const alertBanner = document.getElementById("criticalStockAlert");

    if (notificationList) notificationList.innerHTML = ""; // Clear all notification items
    if (notificationCount) notificationCount.style.display = "none"; // Hide the count
    if (alertBanner) alertBanner.classList.add("hidden"); // Hide the alert banner

    // Close the drawer after clearing
    notificationDrawer.classList.remove("open");
    notificationDrawer.classList.add("hidden");
    notificationDrawer.style.right = "-300px";
  });

  // Initial fetch of inventory report
  fetchInventoryReport();
});

function fetchInventoryReport(page = 1) {
  const category = document.getElementById("inventoryCategoryFilter").value;
  const itemsPerPage = 10; // Number of items per page for pagination
  const queryParams = new URLSearchParams();
  if (category) queryParams.append("category", category);

  fetch(`/report/inventory-report?${queryParams.toString()}`)
    .then((response) => response.json())
    .then((data) => {
      console.log("Fetched data.stockLevels:", data.stockLevels);

      // Low Stock Products with Update Link
      const lowStockTbody = document.getElementById("lowStockProducts");
      lowStockTbody.innerHTML = "";
      data.stockLevels.forEach((product) => {
        const row = `
          <tr class="${Number(product.stock) <= 2 ? "critical-stock" : "low-stock"}">
            <td>${product.productId}</td>
            <td>${product.productName}</td>
            <td>${product.category}</td>
            <td>${product.stock}</td>
            <td>
              <a href="/update-stock?productId=${product.productId}&category=${encodeURIComponent(product.category)}" class="update-link">Update</a>
            </td>
          </tr>
        `;
        lowStockTbody.innerHTML += row;
      });

      // Out of Stock Products
      const outOfStockTbody = document.getElementById("outOfStockProducts");
      outOfStockTbody.innerHTML = "";
      data.stockLevels
        .filter((product) => Number(product.stock) === 0)
        .forEach((product) => {
          const row = `
            <tr class="out-of-stock">
              <td>${product.productId}</td>
              <td>${product.productName}</td>
              <td>${product.category}</td>
              <td>${product.stock}</td>
            </tr>
          `;
          outOfStockTbody.innerHTML += row;
        });

      // Critical Stock Alert and Notification Drawer
      const criticalStockData = data.stockLevels.filter((item) => Number(item.stock) <= 2);
      console.log("criticalStockData:", criticalStockData);
      const alertBanner = document.getElementById("criticalStockAlert");
      const alertMessage = document.getElementById("criticalStockMessage");
      const bellIcon = document.getElementById("notificationBell");
      const notificationList = document.getElementById("notificationList");
      const notificationDrawer = document.getElementById("notificationDrawer");

      if (criticalStockData.length > 0) {
        const criticalProducts = criticalStockData
          .map((p) => `${p.productName} (${p.stock} left)`)
          .join(", ");
        alertMessage.textContent = `Critically low stock: ${criticalProducts}`;
        alertBanner.classList.remove("hidden");

        if (!notificationList) {
          console.error("notificationList not found");
          return;
        }

        notificationList.innerHTML = ""; // Clear previous notifications
        const currentTime = new Date().toLocaleString();
        criticalStockData.forEach((item) => {
          const notificationItem = document.createElement("div");
          notificationItem.classList.add("notification-item");
          notificationItem.innerHTML = `
            <strong>Low Stock Alert</strong><br>
            ${item.productName} (${item.stock} left) at ${currentTime}
          `;
          notificationItem.onclick = () => {
            const sectionResult = showSection("report", "inventory-report");
            if (!sectionResult) {
              console.warn("Failed to navigate to report section. Ensure 'report' ID exists.");
              return;
            }
            fetchInventoryReport().then(() => {
              if (notificationDrawer) {
                console.log("Closing drawer after navigating to report");
                notificationDrawer.classList.remove("open");
                notificationDrawer.classList.add("hidden");
                notificationDrawer.style.right = "-300px";
              }
            });
          };
          notificationList.appendChild(notificationItem);
        });

        // Update notification count on bell
        let notificationCount = document.getElementById("drawerNotificationCount");
        if (!notificationCount) {
          notificationCount = document.createElement("span");
          notificationCount.id = "drawerNotificationCount";
          bellIcon.style.position = "relative";
          bellIcon.appendChild(notificationCount);
        }
        notificationCount.textContent = criticalStockData.length;
        notificationCount.style.position = "absolute";
        notificationCount.style.top = "-10px";
        notificationCount.style.right = "-10px";
        notificationCount.style.background = "red";
        notificationCount.style.color = "white";
        notificationCount.style.borderRadius = "50%";
        notificationCount.style.padding = "6px 6px";
        notificationCount.style.fontSize = "10px";
        notificationCount.style.fontWeight = "bold";
        notificationCount.style.display = "inline-block";
      } else {
        if (alertBanner) alertBanner.classList.add("hidden");
        const notificationCount = document.getElementById("drawerNotificationCount");
        if (notificationCount) notificationCount.style.display = "none";
        if (notificationList) notificationList.innerHTML = "";
        console.log("No critical stock data found, skipping notification update");
      }

      // Inventory Turnover with Pagination
      const turnoverTbody = document.getElementById("inventoryTurnover");
      const paginationDiv = document.getElementById("turnoverPagination"); // Add this div in your HTML
      turnoverTbody.innerHTML = "";

      const totalItems = data.turnover.length;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedTurnover = data.turnover.slice(startIndex, endIndex);

      paginatedTurnover.forEach((product) => {
        const row = `
          <tr>
            <td>${product.productId}</td>
            <td>${product.productName}</td>
            <td>${product.category}</td>
            <td>${product.stock}</td>
            <td>${product.totalSold}</td>
          </tr>
        `;
        turnoverTbody.innerHTML += row;
      });

      // Pagination Controls
      if (paginationDiv) {
        paginationDiv.innerHTML = "";
        const prevButton = document.createElement("button");
        prevButton.textContent = "Previous";
        prevButton.disabled = page === 1;
        prevButton.onclick = () => fetchInventoryReport(page - 1);
        prevButton.style.marginRight = "10px";

        const nextButton = document.createElement("button");
        nextButton.textContent = "Next";
        nextButton.disabled = page === totalPages;
        nextButton.onclick = () => fetchInventoryReport(page + 1);

        const pageInfo = document.createElement("span");
        pageInfo.textContent = `Page ${page} of ${totalPages}`;
        pageInfo.style.margin = "0 10px";

        paginationDiv.appendChild(prevButton);
        paginationDiv.appendChild(pageInfo);
        paginationDiv.appendChild(nextButton);
      }

      // Slow Moving Products
      // const slowMovingTbody = document.getElementById("slowMovingProducts");
      // slowMovingTbody.innerHTML = "";
      // data.slowMoving.forEach((product) => {
      //   const row = `
      //     <tr>
      //       <td>${product.productId}</td>
      //       <td>${product.productName}</td>
      //       <td>${product.category}</td>
      //       <td>${product.stock}</td>
      //       <td>${product.totalSold}</td>
      //     </tr>
      //   `;
      //   slowMovingTbody.innerHTML += row;
      // });
    })
    .catch((error) => console.error("Error fetching inventory report:", error));
}

const paginationDiv = document.getElementById("turnoverPagination");
if (paginationDiv) {
  paginationDiv.innerHTML = "";
  const prevButton = document.createElement("button");
  prevButton.textContent = "Previous";
  prevButton.disabled = page === 1;
  prevButton.onclick = () => fetchInventoryReport(page - 1);
  prevButton.style.marginRight = "10px";

  const nextButton = document.createElement("button");
  nextButton.textContent = "Next";
  nextButton.disabled = page === totalPages;
  nextButton.onclick = () => fetchInventoryReport(page + 1);

  const pageInfo = document.createElement("span");
  pageInfo.textContent = `Page ${page} of ${totalPages}`;
  pageInfo.style.margin = "0 10px";

  paginationDiv.appendChild(prevButton);
  paginationDiv.appendChild(pageInfo);
  paginationDiv.appendChild(nextButton);
}
// Function to clear all notifications and update the bell count
function clearNotifications() {
  const notificationList = document.getElementById("notificationList");
  const notificationCount = document.getElementById("drawerNotificationCount");
  const alertBanner = document.getElementById("criticalStockAlert");

  if (notificationList) {
    notificationList.innerHTML = ""; // Clear all notification items
  }
  if (notificationCount) {
    notificationCount.style.display = "none"; // Hide the count
  }
  if (alertBanner) {
    alertBanner.classList.add("hidden"); // Hide the alert banner
  }
}

// Export Inventory Report
function exportInventoryReport(format) {
  const category = document.getElementById("inventoryCategoryFilter").value;
  const queryParams = new URLSearchParams();
  if (category) queryParams.append("category", category);

  const endpoint =
    format === "csv"
      ? "/report/export-inventory-report-csv"
      : "/report/export-inventory-report-pdf";
  const fileName = `inventory_report.${format}`;

  fetch(`${endpoint}?${queryParams.toString()}`, {
    method: "GET",
    headers: { Accept: format === "csv" ? "text/csv" : "application/pdf" },
  })
    .then((response) => {
      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);
      return response.blob();
    })
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      alert(
        `Inventory report exported successfully as ${format.toUpperCase()}!`
      );
    })
    .catch((error) => {
      console.error(`Error exporting inventory report as ${format}:`, error);
      alert(`Failed to export inventory report as ${format.toUpperCase()}.`);
    });
}

function handleDateRangeChangeOrder() {
  const dateRange = document.getElementById('orderDateRange').value;
  const customDateRange = document.getElementById('customDateRange');
  const startDateInput = document.getElementById('orderStartDate');
  const endDateInput = document.getElementById('orderEndDate');

  // Set yesterday's date as the max for end date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const maxDate = yesterday.toISOString().split('T')[0];
  endDateInput.setAttribute('max', maxDate);

  if (dateRange === 'custom') {
      customDateRange.style.display = 'block';
      // Set default values for custom range
      startDateInput.value = '2020-01-01'; // Default start date
      endDateInput.value = maxDate; // Default end date (yesterday)
  } else {
      customDateRange.style.display = 'none';
      // Fetch feedback immediately for non-custom ranges
      fetchOrderReport();
  }
}
// Fetch Order Report
function fetchOrderReport() {
  const dateRange = document.getElementById("orderDateRange").value;
  let startDate, endDate;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayBeforeYesterday = new Date(yesterday);
  dayBeforeYesterday.setDate(yesterday.getDate() - 1);
  const maxDate = yesterday.toISOString().split("T")[0]; // "2025-03-22"
  const maxStartDate = dayBeforeYesterday.toISOString().split("T")[0]; // "2025-03-21"
  const minDate = "2020-01-01";

  // Dynamically set max attributes for date inputs
  document.getElementById("orderStartDate").max = maxStartDate;
  document.getElementById("orderEndDate").max = maxDate;

  if (dateRange === "today") {
    startDate = endDate = maxDate;
  } else if (dateRange === "last7days") {
    endDate = maxDate;
    startDate = new Date(yesterday.setDate(yesterday.getDate() - 7))
      .toISOString()
      .split("T")[0];
  } else if (dateRange === "last30days") {
    endDate = maxDate;
    startDate = new Date(yesterday.setDate(yesterday.getDate() - 30))
      .toISOString()
      .split("T")[0];
  } else if (dateRange === "custom") {
    startDate = document.getElementById("orderStartDate").value;
    endDate = document.getElementById("orderEndDate").value;

    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const min = new Date(minDate);
    const max = new Date(maxDate);
    const maxStart = new Date(maxStartDate);

    if (start < min) {
      alert("Start date cannot be before January 1, 2020.");
      return;
    }
    if (start > maxStart) {
      alert(`Start date cannot be after ${maxStartDate} (day before yesterday).`);
      return;
    }
    if (end > max) {
      alert(`End date cannot be after ${maxDate} (yesterday).`);
      return;
    }
    if (start > end) {
      alert("Start date cannot be after end date.");
      return;
    }
  }

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append("startDate", startDate);
  if (endDate) queryParams.append("endDate", endDate);

  fetch(`/report/order-report?${queryParams.toString()}`)
    .then((response) => response.json())
    .then((data) => {
      console.log("Order Report Data:", data);

      // Existing Order Summary Metrics
      document.getElementById("placedOrders").textContent =
        data.statusSummary.find((item) => item.status === "PLACED")?.count || 0;
      document.getElementById("pendingOrders").textContent =
        data.statusSummary.find((item) => item.status === "PROCESSING")?.count || 0;
      document.getElementById("deliveredOrders").textContent =
        data.statusSummary.find((item) => item.status === "DELIVERED")?.count || 0;
      document.getElementById("canceledOrders").textContent =
        data.statusSummary.find((item) => item.status === "CANCELLED")?.count || 0;

      // Order Status Chart
      if (orderStatusChart) orderStatusChart.destroy();
      const statusCtx = document.getElementById("orderSummaryPieChart").getContext("2d");
      orderStatusChart = new Chart(statusCtx, {
        type: "pie",
        data: {
          labels: data.statusSummary.map((item) => item.status),
          datasets: [
            {
              label: "Order Count by Status",
              data: data.statusSummary.map((item) => item.count),
              backgroundColor: ["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#ff9f40"],
            },
          ],
        },
        options: {
          responsive: true,
        },
      });

      // Shipping Details Table
      const shippingTbody = document.getElementById("shippingDetails");
      shippingTbody.innerHTML = "";
      data.shippingDetails.forEach((item) => {
        const row = `
          <tr>
            <td>${item.O_id}</td>
            <td>${item.C_id}</td>
            <td>${item.customerAddress}</td>
            <td>${item.customerPincode}</td>
            <td>${item.deliveryPerson || "Not Assigned"}</td>
          </tr>
        `;
        shippingTbody.innerHTML += row;
      });

      // New Order Summary Report Metrics
      // Order Count: Total orders in the date range
      const orderCount = data.orderCount || 0;
      document.getElementById("totalOrderCount").textContent = orderCount;

      // Total Revenue: Sum of (price * quantity) for all order details
      const totalRevenue = data.totalRevenue || 0;
      document.getElementById("totalRevenue").textContent = totalRevenue;

      // Average Order Value: Total revenue / order count
      const avgOrderValue = orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : 0;
      document.getElementById("avgOrderValue").textContent = avgOrderValue;

      // Refunds: Count of orders with status 'CANCELLED'
      const refundCount = data.statusSummary.find((item) => item.status === "CANCELLED")?.count || 0;
      document.getElementById("refundCount").textContent = refundCount;
    })
    .catch((error) => console.error("Error fetching order report:", error));
}

// Export Order Report
function exportOrderReport(format) {
  const dateRange = document.getElementById("orderDateRange").value;
  let startDate, endDate;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayBeforeYesterday = new Date(yesterday);
  dayBeforeYesterday.setDate(yesterday.getDate() - 1);
  const maxDate = yesterday.toISOString().split("T")[0]; // "2025-03-22"
  const maxStartDate = dayBeforeYesterday.toISOString().split("T")[0]; // "2025-03-21"
  const minDate = "2020-01-01";

  if (dateRange === "today") {
    startDate = endDate = maxDate;
  } else if (dateRange === "last7days") {
    endDate = maxDate;
    startDate = new Date(yesterday.setDate(yesterday.getDate() - 7))
      .toISOString()
      .split("T")[0];
  } else if (dateRange === "last30days") {
    endDate = maxDate;
    startDate = new Date(yesterday.setDate(yesterday.getDate() - 30))
      .toISOString()
      .split("T")[0];
  } else if (dateRange === "custom") {
    startDate = document.getElementById("orderStartDate").value;
    endDate = document.getElementById("orderEndDate").value;

    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const min = new Date(minDate);
    const max = new Date(maxDate);
    const maxStart = new Date(maxStartDate);

    if (start < min) {
      alert("Start date cannot be before January 1, 2020.");
      return;
    }
    if (start > maxStart) {
      alert(`Start date cannot be after ${maxStartDate} (day before yesterday).`);
      return;
    }
    if (end > max) {
      alert(`End date cannot be after ${maxDate} (yesterday).`);
      return;
    }
    if (start > end) {
      alert("Start date cannot be after end date.");
      return;
    }
  }

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append("startDate", startDate);
  if (endDate) queryParams.append("endDate", endDate);

  const endpoint =
    format === "csv"
      ? "/report/export-order-report-csv"
      : "/report/export-order-report-pdf";
  const fileName = `order_report.${format}`;

  fetch(`${endpoint}?${queryParams.toString()}`, {
    method: "GET",
    headers: { Accept: format === "csv" ? "text/csv" : "application/pdf" },
  })
    .then((response) => {
      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);
      return response.blob();
    })
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      alert(`Order report exported successfully as ${format.toUpperCase()}!`);
    })
    .catch((error) => {
      console.error(`Error exporting order report as ${format}:`, error);
      alert(`Failed to export order report as ${format.toUpperCase()}.`);
    });
}

// CSV Report Generation (Optional)
document
  .getElementById("reportForm")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append("startDate", startDate);
    if (endDate) queryParams.append("endDate", endDate);

    try {
      const response = await fetch(
        `/order/orderdets/report?${queryParams.toString()}`,
        {
          method: "GET",
          headers: { Accept: "text/csv" },
        }
      );

      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "orders_report.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      alert("Report generated successfully!");
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report.");
    }
  });
