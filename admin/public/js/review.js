// Function to fetch feedback report
function fetchFeedback() {
    const rating = document.getElementById('reviewRatingFilter').value;
    const customerName = document.getElementById('reviewCustomerSearch').value;

    console.log(`Fetching feedback with Rating: ${rating}, Customer: ${customerName}`);

    // Build query parameters
    const queryParams = new URLSearchParams();
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
    fetchFeedback();
});