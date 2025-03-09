// Fetch Payments
function fetchPayments() {
    const statusFilter = document.getElementById('paymentStatusFilter').value;
    fetch(`/payment/get/payments?status=${statusFilter}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Fetched payments:', data); // Log data to verify
            const tbody = document.getElementById('payment-table-body');
            tbody.innerHTML = ''; // Clear existing rows
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9">No payments found</td></tr>';
                return;
            }
            data.forEach(payment => {
                const row = document.createElement('tr');
                const formattedDate = payment.PY_DATE 
                ? new Date(payment.PY_DATE).toISOString().split('T')[0]
                : "N/A";

                row.innerHTML = `
                    <td>${payment.PY_ID}</td>
                    <td>${payment.PY_MODE}</td>
                    <td>${payment.PY_TRANSACTION_ID || 'N/A'}</td>
                    <td>${formattedDate}</td>
                    <td>${payment.PY_STATUS}</td>
                    <td>${payment.PY_AMOUNT}</td>
                    <td>${payment.O_ID}</td>
                    <td>${payment.PY_OTP || 'N/A'}</td>
                    <td>
                        <button class="btn primary" onclick="openEditPaymentModal('${payment.PY_ID}', '${payment.PY_MODE}', '${payment.PY_TRANSACTION_ID || ''}', '${payment.PY_OTP || ''}')">Edit</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error fetching payments:', error);
            const tbody = document.getElementById('payment-table-body');
            tbody.innerHTML = '<tr><td colspan="9">Error loading payments</td></tr>';
        });
}

// Open Edit Payment Modal
function openEditPaymentModal(pyId, paymentMode, transactionId, otp) {
    document.getElementById('edit-payment-id').value = pyId;
    document.getElementById('edit-payment-mode').value = paymentMode; // Store payment mode
    document.getElementById('edit-payment-mode-display').textContent = paymentMode; // Display payment mode
    document.getElementById('edit-transaction-id').value = transactionId;
    document.getElementById('edit-otp').value = otp;

    // Show/hide transaction ID field based on payment mode
    const transactionIdGroup = document.getElementById('transaction-id-group');
    const transactionIdInput = document.getElementById('edit-transaction-id');
    if (paymentMode === 'COD') {
        transactionIdGroup.style.display = 'none'; // Hide the field for COD
        transactionIdInput.removeAttribute('required'); // Remove required attribute
    } else {
        transactionIdGroup.style.display = 'block'; // Show the field for QR/other modes
        transactionIdInput.setAttribute('required', 'required'); // Add required attribute
    }

    document.getElementById('editPaymentModal').style.display = 'block';
}

// Close Edit Payment Modal
function closeEditPaymentModal() {
    document.getElementById('editPaymentModal').style.display = 'none';
}

// Handle Edit Payment Form Submission
document.getElementById('editPaymentForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const pyId = document.getElementById('edit-payment-id').value;
    const transactionId = document.getElementById('edit-transaction-id').value;
    const otp = document.getElementById('edit-otp').value;

    fetch(`/payment/${pyId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            PY_TRANSACTION_ID: transactionId,
            PY_OTP: otp
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to update payment');
        return response.json();
    })
    .then(() => {
        closeEditPaymentModal();
        fetchPayments(); // Refresh the payment table
        alert('Payment updated successfully!');
    })
    .catch(error => {
        console.error('Error updating payment:', error);
        alert('Failed to update payment. Please try again.');
    });
});

// Fetch payments when the payment section is shown
document.addEventListener('DOMContentLoaded', () => {
    // Only fetch if payment section is initially active (optional)
    if (!document.getElementById('payment').classList.contains('hidden')) {
        fetchPayments();
    }
});

// Updated showSection to ensure payment fetch
function showSection(sectionId) {
    document.querySelectorAll('.tab__content').forEach(sec => sec.classList.add('hidden'));
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove('hidden');
        if (sectionId === 'payment') {
            fetchPayments(); // Fetch payments when payment section is shown
        }
    } else {
        console.error(`Section with ID ${sectionId} not found`);
    }
}