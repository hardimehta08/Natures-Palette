// Document operation functions


const trigger=document.querySelectorAll('.tabbed-trigger');
    content=document.querySelectorAll('.tabbed>div');
    trigger.forEach((btn)=>{
        btn.addEventListener('click',function(){
            let dataTarget=this.dataset.id,
                body=document.querySelector(`#${dataTarget}`);

            trigger.forEach((b)=>b.parentNode.classList.remove('active'));
            content.forEach((s)=>s.classList.remove('active'));
            this.parentNode.classList.add('active');
            body.classList.add('active');
        });
    });


const accordionBtn = document.querySelectorAll('[data-accordion-btn]');
const accordion = document.querySelectorAll('[data-accordion]');

for (let i = 0; i < accordionBtn.length; i++) {

  accordionBtn[i].addEventListener('click', function () {

    const clickedBtn = this.nextElementSibling.classList.contains('active');

    for (let i = 0; i < accordion.length; i++) {

      if (clickedBtn) break;

      if (accordion[i].classList.contains('active')) {

        accordion[i].classList.remove('active');
        accordionBtn[i].classList.remove('active');

      }

    }

    this.nextElementSibling.classList.toggle('active');
    this.classList.toggle('active');

  });
}

// function toggleDropdown1() {
//     const dropdown = document.getElementById('dropdownMenu');
//     dropdown.classList.toggle('active');
// }

// window.onclick = function(event) {
//     if (!event.target.matches('.profile-photo')) {
//         var dropdowns = document.getElementsByClassName("dropdown-menu");
//         for (let i = 0; i < dropdowns.length; i++) {
//             let openDropdown = dropdowns[i];
//             if (openDropdown.classList.contains('active')) {
//                 openDropdown.classList.remove('active');
//             }
//         }
//     }
// }

// Toggle Export Menu
// const exportBtn = document.querySelector('.export-btn');
// const exportMenu = document.querySelector('.export-menu');

// exportBtn.addEventListener('click', function() {
//     exportMenu.classList.toggle('show');
// });

// Close menu if clicked outside
// document.addEventListener('click', function(event) {
//     if (!exportBtn.contains(event.target) && !exportMenu.contains(event.target)) {
//         exportMenu.classList.remove('show');
//     }
// });

// // Export Functionality
// const exportOptions = document.querySelectorAll('.export-option');
// exportOptions.forEach(option => {
//     option.addEventListener('click', function(e) {
//         e.preventDefault();
//         const type = this.getAttribute('data-type');
//         alert(`Export as ${type} - Feature coming soon!`);
//     });
// });

// Assuming this is in your client-side JS file

document.getElementById('add-field').addEventListener('click', function() {
  const fieldName = document.getElementById('field-name').value;
  const fieldType = document.getElementById('field-type').value;
  
  if (!fieldName || !fieldType) {
      alert('Please enter both field name and type.');
      return;
  }
  
  const list = document.getElementById('field-list');
  const item = document.createElement('div');
  item.innerHTML = `<span>${fieldName} (${fieldType})</span> 
                    <button onclick="removeField(this)">Remove</button>`;
  list.appendChild(item);

  document.getElementById('field-name').value = '';
  document.getElementById('field-type').selectedIndex = 0;
});

function removeField(button) {
  button.parentElement.remove();
}

document.getElementById('create-table').addEventListener('click', async function (event) {
  event.preventDefault();

  const createButton = event.target;
  createButton.disabled = true; // Prevent multiple clicks

  const categorySelect = document.getElementById('prod-cat');
  const categoryID = categorySelect.value.trim();
  const categoryName = categorySelect.options[categorySelect.selectedIndex]?.text.trim();

  if (!categoryID || categoryID === '') {
      alert('Error: Category must be selected.');
      createButton.disabled = false;
      return;
  }

  const fieldElements = Array.from(document.getElementById('field-list').children);

  const fields = fieldElements.map(div => {
      const span = div.querySelector('span');
      if (!span) return null;

      const fieldParts = span.textContent.split('(').map(s => s.trim());
      if (fieldParts.length < 2) {
          console.error('Invalid field format:', span.textContent);
          return null;
      }

      const fieldName = fieldParts[0];
      const fieldType = fieldParts[1].slice(0, -1); // Remove the closing parenthesis

      if (!fieldName || !fieldType) return null;
      return { name: fieldName, type: fieldType.toUpperCase() };
  }).filter(field => field !== null);

  if (fields.length === 0) {
      alert('Error: No valid fields detected.');
      createButton.disabled = false;
      return;
  }

  console.log("Sending request with data:", { categoryName, fields });

  try {
      const response = await fetch('/category/create-table', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryName, fields }) // Send categoryName instead of ID
      });

      const result = await response.json();
      console.log("Response from server:", result);

      if (result.success) {
          alert(`Table '${categoryName}' created successfully!`);
          document.getElementById('field-list').innerHTML = ''; // Clear fields after success
      } else {
          alert('Error: ' + result.error);
      }
  } catch (error) {
      console.error('Request Error:', error);
      alert('An error occurred while creating the table.');
  } finally {
      createButton.disabled = false; // Re-enable button after request
  }
});


function loadCategories() {
  fetch('/category/get-categories')
      .then(response => response.json())
      .then(categories => {
          const categorySelect = document.getElementById("prod-cat");
          categorySelect.innerHTML = '<option value="">Select Category</option>';
          categories.forEach(cat => {
              // Using uppercase property names as per the JSON response
              categorySelect.innerHTML += `<option value="${cat.CY_ID}">${cat.CY_NAME}</option>`;
          });
      })
      .catch(error => console.error('Error fetching categories:', error));
}

  document.addEventListener("DOMContentLoaded", function() {
    loadCategories(); // Load first page
  });
  let lastMessageIds = new Set();
  let notificationCount = 0;
  
  // Function to update the notification count
  function updateNotificationCount(count) {
      const badge = document.querySelector('.message-count');
      if (badge) {
          badge.textContent = count;
          badge.style.display = count > 0 ? 'inline-block' : 'none';
      }
  }
  
  async function fetchContactMessages() {
      try {
          const response = await fetch('/admin/fetch-contact-messages');
          const data = await response.json();
          const tableBody = document.getElementById('contact-table-body');
          tableBody.innerHTML = '';
  
          // Collect current message IDs
          const currentMessageIds = new Set(data.map((message) => message.id));
  
          // Detect new messages by comparing with last known IDs
          data.forEach((message) => {
              if (!lastMessageIds.has(message.id)) {
                  notificationCount += 1; // Increment count for new messages
              }
              const row = document.createElement('tr');
              row.innerHTML = `
                  <td>${message.id}</td>
                  <td>${message.name}</td>
                  <td>${message.email}</td>
                  <td>${message.subject}</td>
                  <td>${message.message}</td>
                  <td>${new Date(message.submitted_at).toLocaleDateString()}</td>
              `;
              tableBody.appendChild(row);
          });
  
          // Update the last known message IDs
          lastMessageIds = currentMessageIds;
  
          // Update the notification badge
          updateNotificationCount(notificationCount);
  
          // Reset count when viewing the contact-messages section
          if (document.getElementById('contact-messages').style.display === 'block') {
              notificationCount = 0;
              updateNotificationCount(0);
          }
      } catch (error) {
          console.error('Error fetching contact messages:', error);
      }
  }
  
  // Periodically check for new messages (e.g., every 30 seconds)
  setInterval(fetchContactMessages, 30000);
  
  
  // Call the function to load the contact messages when the page loads
  document.addEventListener('DOMContentLoaded', fetchContactMessages);