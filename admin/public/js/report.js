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
    height:400, // Set the height of the chart
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
      // console.log("Raw Recent Activity Data:", data.recentActivity);
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

      // console.log("Deduplicated Activities after merge:", uniqueActivities);
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
let ordersOverTimeChart=null;
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
  const minDate = "2024-01-01";

  // Dynamically set max attributes for date inputs
  startDateElement.max = maxStartDate;
  endDateElement.max = maxDate;

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
      alert("Start date cannot be before January 1, 2024.");
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
  const dateRangeElement = document.getElementById("salesDateRange");
  const startDateElement = document.getElementById("salesStartDate");
  const endDateElement = document.getElementById("salesEndDate");

  if (!dateRangeElement || !startDateElement || !endDateElement) {
    console.error("One or more required DOM elements are missing.");
    alert("Error: Required elements are missing on the page.");
    return;
  }

  const dateRange = dateRangeElement.value;
  let startDate, endDate, groupBy;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayBeforeYesterday = new Date(yesterday);
  dayBeforeYesterday.setDate(yesterday.getDate() - 1);
  const maxDate = yesterday.toISOString().split("T")[0]; // e.g., "2025-03-26"
  const maxStartDate = dayBeforeYesterday.toISOString().split("T")[0]; // e.g., "2025-03-25"
  const minDate = "2024-01-01";

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
      alert("Start date cannot be before January 1, 2024.");
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

  // Calculate the grouping for the export (same logic as fetchSalesReport)
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = Math.abs(end - start);
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  if (daysDiff === 0 || daysDiff === 1) {
    groupBy = "daily"; // Hourly grouping is not supported in export, so use daily
  } else if (daysDiff <= 7) {
    groupBy = "daily";
  } else if (daysDiff <= 90) {
    groupBy = "weekly";
  } else {
    groupBy = "monthly";
  }

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append("startDate", startDate);
  if (endDate) queryParams.append("endDate", endDate);
  if (groupBy) queryParams.append("groupBy", groupBy);

  console.log("Export query parameters:", queryParams.toString()); // Debug: Log the query parameters

  const endpoint =
    format === "csv"
      ? "/report/export-sales-report-csv"
      : "/report/export-sales-report-pdf";
  const fileName = `sales_report.${format}`;

  // Show loading state
  const exportButton = document.querySelector('button[onclick*="exportSalesReport"]');
  if (exportButton) {
    exportButton.disabled = true;
    exportButton.textContent = "Exporting...";
  }

  fetch(`${endpoint}?${queryParams.toString()}`, {
    method: "GET",
    headers: { Accept: format === "csv" ? "text/csv" : "application/pdf" },
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errorData) => {
          throw new Error(`HTTP error! Status: ${response.status}, Response: ${JSON.stringify(errorData)}`);
        });
      }
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
      alert(`Failed to export sales report as ${format.toUpperCase()}: ${error.message}`);
    })
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
  const minDate = "2024-01-01";

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
      alert("Start date cannot be before January 1, 2024.");
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
    startDateInput.value = '2024-01-01'; // Default start date
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
  const minDate = "2024-01-01";

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
      alert("Start date cannot be before January 1, 2024.");
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


function openStockModal(productId, productName, currentStock, categoryName) {
  const modal = document.getElementById("updateStockModal");
  document.getElementById("update-product-id").value = productId;
  document.getElementById("update-category-name").value = categoryName;
  document.getElementById("update-product-name").value = productName;
  document.getElementById("update-current-stock").value = currentStock;
  document.getElementById("update-new-stock").value = currentStock; // Pre-fill with current stock
  modal.style.display = "flex";
}

function closeStockModal() {
  const modal = document.getElementById("updateStockModal");
  modal.style.display = "none";
  document.getElementById("updateStockForm").reset();
}

// Handle form submission for stock update
document.getElementById("updateStockForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const productId = document.getElementById("update-product-id").value;
  const categoryName = document.getElementById("update-category-name").value;
  const newStock = document.getElementById("update-new-stock").value;

  fetch("/report/update-stock", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productId,
      categoryName,
      newStock,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        alert("Stock updated successfully");
        closeStockModal();
        fetchInventoryReport(); // Refresh the inventory report
      } else {
        alert("Error updating stock: " + (data.message || "Unknown error"));
      }
    })
    .catch((error) => {
      console.error("Error updating stock:", error);
      alert("Error updating stock. Please try again.");
    });
});

function fetchInventoryReport(page = 1) {
  const category = document.getElementById("inventoryCategoryFilter").value;
  const itemsPerPage = 10; // Number of items per page for pagination
  const queryParams = new URLSearchParams();
  if (category) queryParams.append("category", category);

  fetch(`/report/inventory-report?${queryParams.toString()}`)
    .then((response) => response.json())
    .then((data) => {
      // Low Stock Products with Update Link
      const lowStockTbody = document.getElementById("lowStockProducts");
      lowStockTbody.innerHTML = "";
      if (data.stockLevels.length === 0) {
        lowStockTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center;">No low stock products found.</td>
          </tr>
        `;
      } else {
        data.stockLevels.forEach((product) => {
          const row = `
            <tr class="${Number(product.stock) <= 2 ? "critical-stock" : "low-stock"}">
              <td>${product.productId}</td>
              <td>${product.productName}</td>
              <td>[${product.categoryId}]${product.categoryName}</td>
              <td>${product.stock}</td>
              <td>
                <a class="update-link" onclick="openStockModal('${product.productId}', '${product.productName}', ${product.stock}, '${product.categoryName}')">Update</a>
              </td>
            </tr>
          `;
          lowStockTbody.innerHTML += row;
        });
     }
      // Out of Stock Products
      const outOfStockTbody = document.getElementById("outOfStockProducts");
      outOfStockTbody.innerHTML = "";
      if (outOfStockProducts.length === 0) {
        outOfStockTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center;">No out of stock products found.</td>
          </tr>
        `;
      } else {
        data.stockLevels
          .filter((product) => Number(product.stock) === 0)
          .forEach((product) => {
            const row = `
              <tr class="out-of-stock">
                <td>${product.productId}</td>
                <td>${product.productName}</td>
                <td>[${product.categoryId}]${product.categoryName}</td>
                <td>${product.stock}</td>
                <td>
                    <a class="update-link" onclick="openStockModal('${product.productId}', '${product.productName}', ${product.stock}, '${product.categoryName}')">Update</a>
                </td>
              </tr>
            `;
            outOfStockTbody.innerHTML += row;
          });
      }
      // Critical Stock Alert and Notification Drawer
      // Critical Stock Alert and Notification Drawer
      const criticalStockData = data.stockLevels.filter((item) => Number(item.stock) <= 2);
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
        console.log("No critical stock data found for category:", category);
      }

      // Inventory Turnover with Pagination
      const turnoverTbody = document.getElementById("inventoryTurnover");
      const paginationDiv = document.getElementById("turnoverPagination"); // Add this div in your HTML
      turnoverTbody.innerHTML = "";

      if (data.turnover.length === 0) {
        turnoverTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center;">No inventory turnover data found.</td>
          </tr>
        `;
        if (paginationDiv) paginationDiv.innerHTML = ""; // Hide pagination controls
      } else {
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
            <td>[${product.categoryId}]${product.categoryName}</td>
            <td>${product.stock}</td>
            <td>${product.totalSold}</td>
            <td>${product.turnoverRatio.toFixed(2)}</td>
          </tr>
        `;
        turnoverTbody.innerHTML += row;
      });

      // Pagination Controls
      if (paginationDiv) {
        paginationDiv.innerHTML = "";
        const prevButton = document.createElement("button");
        prevButton.textContent = "<";
        prevButton.disabled = page === 1;
        prevButton.onclick = () => fetchInventoryReport(page - 1);
        prevButton.style.marginRight = "10px";

        const nextButton = document.createElement("button");
        nextButton.textContent = ">";
        nextButton.disabled = page === totalPages;
        nextButton.onclick = () => fetchInventoryReport(page + 1);

        const pageInfo = document.createElement("span");
        pageInfo.textContent = `Page ${page} of ${totalPages}`;
        pageInfo.style.margin = "0 10px";

        paginationDiv.appendChild(prevButton);
        paginationDiv.appendChild(pageInfo);
        paginationDiv.appendChild(nextButton);
      }
    }
    })
    .catch((error) => console.error("Error fetching inventory report:", error));
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

  // Optional: Validate the category (remove the restrictive check if not needed)
  if (category && !["PLANTS", "OTHER_CATEGORY"].includes(category.toUpperCase())) {
    console.warn("Selected category might not be valid:", category);
    // Proceed anyway to allow flexibility
  }

  const queryParams = new URLSearchParams();
  if (category) queryParams.append("category", category);

  const endpoint =
    format === "csv"
      ? "/report/export-inventory-report-csv"
      : "/report/export-inventory-report-pdf";
  const fileName = `inventory_report_${category || "all"}.${format}`; // Include category in filename

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
        `Inventory report for category "${category || "All Categories"}" exported successfully as ${format.toUpperCase()}!`
      );
    })
    .catch((error) => {
      console.error(`Error exporting inventory report as ${format}:`, error);
      alert(`Failed to export inventory report as ${format.toUpperCase()}.`);
    });
}

function handleDateRangeChangeOrder() {
  const dateRange = document.getElementById("orderDateRange").value;
  const customDateRange = document.getElementById("customDateRange");
  const startDateInput = document.getElementById("orderStartDate");
  const endDateInput = document.getElementById("orderEndDate");

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const maxDate = yesterday.toISOString().split("T")[0];
  endDateInput.setAttribute("max", maxDate);
  startDateInput.setAttribute("max", maxDate);

  if (dateRange === "custom") {
    customDateRange.style.display = "block";
    startDateInput.value = "2024-01-01"; // Updated to 2024-01-01 as per your requirement
    endDateInput.value = maxDate;
  } else {
    customDateRange.style.display = "none";
    fetchOrderReport();
  }
}

function handleCompareDateRangeChange() {
  const compareDateRange = document.getElementById("compareDateRange").value;
  const customCompareDates = document.getElementById("customCompareDates");
  const compareStartDate = document.getElementById("compareStartDate");
  const compareEndDate = document.getElementById("compareEndDate");

  if (!customCompareDates) {
    console.warn("Element with ID 'customCompareDates' not found in the DOM.");
    return;
  }

  if (compareDateRange === "custom") {
    customCompareDates.style.display = "block";
    compareStartDate.style.border = "";
    compareEndDate.style.border = "";
    if (!compareStartDate.value || !compareEndDate.value) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      compareEndDate.value = yesterday.toISOString().split("T")[0];
      compareStartDate.value = "2024-01-01";
    }
  } else {
    customCompareDates.style.display = "none";
  }
}

function fetchOrderReport() {
  const dateRange = document.getElementById("orderDateRange").value;
  const compareDateRange = document.getElementById("compareDateRange")?.value || "none";
  let startDate, endDate, compareStartDate, compareEndDate;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayBeforeYesterday = new Date(yesterday);
  dayBeforeYesterday.setDate(yesterday.getDate() - 1);
  const maxDate = yesterday.toISOString().split("T")[0];
  const maxStartDate = dayBeforeYesterday.toISOString().split("T")[0];
  const minDate = "2024-01-01";

  document.getElementById("orderStartDate").max = maxStartDate;
  document.getElementById("orderEndDate").max = maxDate;
  document.getElementById("compareStartDate").max = maxStartDate;
  document.getElementById("compareEndDate").max = maxDate;

  const validateDates = (start, end, min, max, maxStart, type = "Order") => {
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    if (!start || !end) {
      alert(`Please select both ${type} start and end dates.`);
      return false;
    }
    if (startDateObj < new Date(min)) {
      alert(`${type} start date cannot be before January 1, 2024.`);
      return false;
    }
    if (startDateObj > new Date(maxStart)) {
      alert(`${type} start date cannot be after ${maxStart} (day before yesterday).`);
      return false;
    }
    if (endDateObj > new Date(max)) {
      alert(`${type} end date cannot be after ${max} (yesterday).`);
      return false;
    }
    if (startDateObj > endDateObj) {
      alert(`${type} start date cannot be after end date.`);
      return false;
    }
    return true;
  };

  switch (dateRange) {
    case "all":
      startDate = minDate;
      endDate = maxDate;
      break;
    case "today":
      startDate = endDate = maxDate;
      break;
    case "last7days":
      endDate = maxDate;
      endDate = maxDate;
      startDate = new Date(yesterday.setDate(yesterday.getDate() - 7)).toISOString().split("T")[0];
      break;
    case "last30days":
      endDate = maxDate;
      endDate = maxDate;
    startDate = new Date(yesterday.setDate(yesterday.getDate() - 30)).toISOString().split("T")[0];
      break;
    case "custom":
      startDate = document.getElementById("orderStartDate").value;
      endDate = document.getElementById("orderEndDate").value;
      if (!validateDates(startDate, endDate, minDate, maxDate, maxStartDate)) {
        return;
      }
      break;
    default:
      console.warn("Invalid date range selected:", dateRange);
      return;
  }

   if (compareDateRange === "custom") {
    compareStartDate = document.getElementById("compareStartDate").value;
    compareEndDate = document.getElementById("compareEndDate").value;
    if (!validateDates(compareStartDate, compareEndDate, minDate, maxDate, maxStartDate, "Comparison")) {
      return;
    }
  }

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append("startDate", startDate);
  if (endDate) queryParams.append("endDate", endDate);
  if (compareStartDate) queryParams.append("compareStartDate", compareStartDate);
  if (compareEndDate) queryParams.append("compareEndDate", compareEndDate);

  fetch(`/report/order-report?${queryParams.toString()}`, {
    credentials: "include",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch order report: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      const updateElement = (id, value) => {
        const element = document.getElementById(id);
        // console.log(`Updating ${id} with value: ${value}`);
        if (element) element.textContent = value;
      };

      if (data.orderCount === 0) {
        const summaryContainer = document.getElementById("statusSummaryContainer");
        if (summaryContainer) {
          summaryContainer.innerHTML = "<p>No orders found for the selected date range.</p>";
        }
      }

      updateElement("totalOrders", data.orderCount || 0);
      updateElement("totalOrderCount", data.orderCount || 0);
      updateElement("pendingOrders", data.statusSummary.find((item) => item.status === "PROCESSING")?.count || 0);
      updateElement("completedOrders", data.statusSummary.find((item) => item.status === "DELIVERED")?.count || 0);
      updateElement("deliveredOrders", data.statusSummary.find((item) => item.status === "DELIVERED")?.count || 0);
      updateElement("canceledOrders", data.statusSummary.find((item) => item.status === "CANCELLED")?.count || 0);
      updateElement("placedOrders", data.statusSummary.find((item) => item.status === "PLACED")?.count || 0);

      const orderCount = data.orderCount || 0;
      const totalRevenue = data.totalRevenue || 0;
      updateElement("totalRevenue", `Rs. ${totalRevenue.toLocaleString()}`); 
      updateElement("avgOrderValue", `Rs. ${orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : 0}`);
      updateElement("refundCount", data.statusSummary.find((item) => item.status === "CANCELLED")?.count || 0);

      let orderStatusChart = Chart.getChart("orderSummaryPieChart");
      if (orderStatusChart) orderStatusChart.destroy();

      const statusCtx = document.getElementById("orderSummaryPieChart").getContext("2d");
      new Chart(statusCtx, {
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
          maintainAspectRatio: true,
        },
      });

      let existingOrdersOverTimeChart = Chart.getChart("ordersOverTimeChart");
      if (existingOrdersOverTimeChart) existingOrdersOverTimeChart.destroy();

      const ordersOverTimeCtx = document.getElementById("ordersOverTimeChart").getContext("2d");
      const currentOrderCount = data.orderCount || 0;
      const compareOrderCount = data.compareOrderCount || 0;
      let percentageChange = 0;
      let changeDirection = "";
      if (compareOrderCount > 0) {
        percentageChange = ((currentOrderCount - compareOrderCount) / compareOrderCount * 100).toFixed(2);
        changeDirection = percentageChange >= 0 ? "↑" : "↓";
        percentageChange = Math.abs(percentageChange);
      }

      const ordersOverTimeSummary = document.getElementById("ordersOverTimeSummary");
      if (ordersOverTimeSummary) {
        ordersOverTimeSummary.innerHTML = `
          <div style="font-size: 24px; font-weight: bold;">${currentOrderCount}</div>
          <div style="color: ${changeDirection === '↑' ? 'green' : 'red'};">
            ${changeDirection} ${percentageChange}% from ${compareOrderCount}
          </div>
        `;
      }

      const currentLabel = `${new Date(startDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${new Date(endDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}, ${new Date(endDate).getFullYear()}`;
      const compareLabel =
        compareStartDate && compareEndDate
          ? `${new Date(compareStartDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })} - ${new Date(compareEndDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}, ${new Date(compareEndDate).getFullYear()}`
          : "No Comparison";

      const validateChartData = (items) =>
        Array.isArray(items)
          ? items
              .filter(
                (item) =>
                  item &&
                  typeof item.orderDate === "string" &&
                  !isNaN(new Date(item.orderDate).getTime()) &&
                  typeof item.orderCount === "number" &&
                  !isNaN(item.orderCount)
              )
              .map((item) => ({
                x: item.orderDate,
                y: item.orderCount,
              }))
          : [];

      const currentData = validateChartData(data.ordersOverTime);
      const compareData = validateChartData(data.compareOrdersOverTime);

      new Chart(ordersOverTimeCtx, {
        type: "line",
        data: {
          datasets: [
            {
              label: compareLabel,
              data: compareData,
              borderColor: "#ff6384",
              backgroundColor: "rgba(255, 99, 132, 0.2)",
              borderWidth: 2,
              fill: true,
              tension: 0.2,
              hidden: compareData.length === 0,
              point: { radius: 4, hitRadius: 10, hoverRadius: 6 },
            },
            {
              label: currentLabel,
              data: currentData,
              borderColor: "#36a2eb",
              backgroundColor: "rgba(54, 162, 235, 0.2)",
              borderWidth: 2,
              fill: true,
              tension: 0.2,
              point: { radius: 4, hitRadius: 10, hoverRadius: 6 },
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            x: {
              type: "time",
              time: {
                unit: "day",
                displayFormats: { day: "MMM d" },
              },
              title: { display: true, text: "Date" },
            },
            y: {
              title: { display: true, text: "Order Count" },
              beginAtZero: true,
            },
          },
          plugins: {
            legend: { display: true, position: "bottom" },
            tooltip: {
              callbacks: {
                label: (context) => `${context.dataset.label}: ${context.parsed.y} orders`,
              },
            },
          },
        },
      });

      const shippingTbody = document.getElementById("shippingDetails");
      shippingTbody.innerHTML = data.shippingDetails
        .map((item) => {
          const formattedDate = formatDate(item.O_date);
          return `
            <tr>
              <td>${item.O_id}</td>
              <td>${item.customerName}</td>
              <td>${item.customerphone || "N/A"}</td>
              <td>${formattedDate}</td>
              <td>${item.paymentstatus}</td>
              <td>${item.orderstatus}</td>
              <td>${item.customerAddress}</td>
              <td>${item.customerPincode}</td>
              <td>${item.deliveryPerson || "Not Assigned"}</td>
            </tr>
          `;
        })
        .join("");
    })
    .catch((error) => {
      console.error("Error fetching order report:", error);
      alert("Failed to fetch order report. Please try again later.");
    });
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function exportOrderReport(format) {
  const dateRange = document.getElementById("orderDateRange").value;
  const compareDateRange = document.getElementById("compareDateRange").value;
  let startDate, endDate, compareStartDate, compareEndDate;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayBeforeYesterday = new Date(yesterday);
  dayBeforeYesterday.setDate(yesterday.getDate() - 1);
  const maxDate = yesterday.toISOString().split("T")[0]; // e.g., "2025-03-25"
  const maxStartDate = dayBeforeYesterday.toISOString().split("T")[0];
  const minDate = "2024-01-01";

  // Primary Date Range Logic
  if (dateRange === "all") {
    startDate = minDate; // January 1, 2024
    endDate = maxDate; // Yesterday
  } else if (dateRange === "today") {
    startDate = endDate = maxDate;
  } else if (dateRange === "last7days") {
    endDate = maxDate;
    const last7DaysStart = new Date(yesterday);
    last7DaysStart.setDate(last7DaysStart.getDate() - 7);
    startDate = last7DaysStart.toISOString().split("T")[0];
  } else if (dateRange === "last30days") {
    endDate = maxDate;
    const last30DaysStart = new Date(yesterday);
    last30DaysStart.setDate(last30DaysStart.getDate() - 30);
    startDate = last30DaysStart.toISOString().split("T")[0];
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
      alert("Start date cannot be before January 1, 2024.");
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
    alert("Please select a valid date range.");
    return;
  }

  // Comparison Date Range Logic
  if (compareDateRange !== "none") {
    if (compareDateRange === "previousPeriod") {
      // Calculate the duration of the primary date range
      const primaryStart = new Date(startDate);
      const primaryEnd = new Date(endDate);
      const durationDays = Math.ceil((primaryEnd - primaryStart) / (1000 * 60 * 60 * 24)) + 1; // Include both start and end days

      // Set the comparison period to the same duration before the primary start date
      const compareEnd = new Date(primaryStart);
      compareEnd.setDate(compareEnd.getDate() - 1); // Day before the primary start date
      const compareStart = new Date(compareEnd);
      compareStart.setDate(compareStart.getDate() - durationDays + 1); // Go back by the duration

      compareStartDate = compareStart.toISOString().split("T")[0];
      compareEndDate = compareEnd.toISOString().split("T")[0];

      // Validate comparison dates using the existing variables
      const min = new Date(minDate);
      const max = new Date(maxDate);

      if (compareStart < min) {
        alert("Comparison start date cannot be before January 1, 2024. Adjusting to the earliest possible date.");
        compareStartDate = minDate;
        compareStart.setTime(min.getTime()); // Update compareStart to reflect the adjusted date

        // Adjust compareEndDate if necessary to ensure it's not before compareStartDate
        if (compareStart > compareEnd) {
          compareEndDate = compareStartDate; // Set compareEndDate to compareStartDate
          compareEnd.setTime(compareStart.getTime()); // Update compareEnd to match
        }
      }
      if (compareEnd > max) {
        alert(`Comparison end date cannot be after ${maxDate} (yesterday). Adjusting to the latest possible date.`);
        compareEndDate = maxDate;
        compareEnd.setTime(max.getTime()); // Update compareEnd to reflect the adjusted date
      }
      if (compareStart > compareEnd) {
        alert("Comparison start date cannot be after comparison end date.");
        return;
      }
    } else if (compareDateRange === "custom") {
      compareStartDate = document.getElementById("compareStartDate").value;
      compareEndDate = document.getElementById("compareEndDate").value;

      if (!compareStartDate || !compareEndDate) {
        alert("Please select both comparison start and end dates.");
        return;
      }

      const compareStart = new Date(compareStartDate);
      const compareEnd = new Date(compareEndDate);
      const min = new Date(minDate);
      const max = new Date(maxDate);

      if (compareStart < min) {
        alert("Comparison start date cannot be before January 1, 2024.");
        return;
      }
      if (compareEnd > max) {
        alert(`Comparison end date cannot be after ${maxDate} (yesterday).`);
        return;
      }
      if (compareStart > compareEnd) {
        alert("Comparison start date cannot be after comparison end date.");
        return;
      }
    }
  }

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append("startDate", startDate);
  if (endDate) queryParams.append("endDate", endDate);
  if (compareStartDate) queryParams.append("compareStartDate", compareStartDate);
  if (compareEndDate) queryParams.append("compareEndDate", compareEndDate);

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
      if (!response.ok) {
        return response.text().then((text) => {
          try {
            const errorData = JSON.parse(text);
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.details || errorData.error || text}`);
          } catch (e) {
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${text || "Unknown error"}`);
          }
        });
      }
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
      alert(`Failed to export order report as ${format.toUpperCase()}: ${error.message}`);
    });
}

document.addEventListener("DOMContentLoaded", () => {
  const orderDateRangeSelect = document.getElementById("orderDateRange");
  const compareDateRangeSelect = document.getElementById("compareDateRange");

  if (orderDateRangeSelect) {
    orderDateRangeSelect.addEventListener("change", handleDateRangeChangeOrder);
    handleDateRangeChangeOrder();
  }

  if (compareDateRangeSelect) {
    compareDateRangeSelect.addEventListener("change", handleCompareDateRangeChange);
    handleCompareDateRangeChange();
  }

  fetchOrderReport();
});

