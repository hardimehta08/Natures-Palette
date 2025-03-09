// Function to handle date range change and show/hide custom date inputs
function handleDateRangeChange() {
    const dateRange = document.getElementById('reviewDateRange').value;
    const customDateRange = document.getElementById('reviewCustomDateRange');
    const startDateInput = document.getElementById('reviewStartDate');
    const endDateInput = document.getElementById('reviewEndDate');

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
        fetchFeedback();
    }
}

// Function to fetch feedback report
function fetchFeedback() {
    const dateRange = document.getElementById('reviewDateRange').value;
    const rating = document.getElementById('reviewRatingFilter').value;
    const customerName = document.getElementById('reviewCustomerSearch').value;
    let startDate, endDate;

    console.log(`Fetching feedback with Date Range: ${dateRange}, Rating: ${rating}, Customer: ${customerName}`);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const maxDate = yesterday.toISOString().split('T')[0];

    if (dateRange === 'today') {
        startDate = endDate = maxDate; // Use yesterday as "today"
    } else if (dateRange === 'last7days') {
        endDate = maxDate;
        startDate = new Date(yesterday.setDate(yesterday.getDate() - 7)).toISOString().split('T')[0];
    } else if (dateRange === 'last30days') {
        endDate = maxDate;
        startDate = new Date(yesterday.setDate(yesterday.getDate() - 30)).toISOString().split('T')[0];
    } else if (dateRange === 'custom') {
        startDate = document.getElementById('reviewStartDate').value;
        endDate = document.getElementById('reviewEndDate').value;
        if (!startDate || !endDate) {
            alert('Please select both start and end dates.');
            return;
        }
    } else if (dateRange === 'all') {
        startDate = '2020-01-01';
        endDate = maxDate;
    }

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    if (rating) queryParams.append('rating', rating);
    if (customerName) queryParams.append('customerName', customerName);

    console.log(`Query URL: /feedback/feedback-report?${queryParams.toString()}`);

    // Fetch feedback data
    fetch(`/feedback/feedback-report?${queryParams.toString()}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Feedback Report Data:", data);

            const tableBody = document.getElementById('review-table-body');
            tableBody.innerHTML = '';

            if (data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6">No feedback found for the selected filters.</td></tr>';
                return;
            }

            data.forEach(feedback => {
                const formattedDate = feedback.feedback_date.split('T')[0];

                const row = `
                    <tr>
                        <td>${feedback.feedback_id}</td>
                        <td>${feedback.customer_name}</td>
                        <td>${feedback.feedback_desc}</td>
                        <td>${formattedDate}</td>
                        <td>${feedback.product_id || 'N/A'}</td>
                        <td>${feedback.rating || 'N/A'}</td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        })
        .catch(error => {
            console.error('Error fetching feedback report:', error);
            alert('Failed to fetch feedback report. Please try again later.');
        });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    handleDateRangeChange(); // Set up date range on load
    fetchFeedback();

    // Set yesterday's date as the max for end date on page load
    const endDateInput = document.getElementById('reviewEndDate');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    endDateInput.setAttribute('max', yesterday.toISOString().split('T')[0]);
});