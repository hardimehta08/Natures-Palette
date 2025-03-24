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

// Load admin profile details when the profile section is opened
function loadAdminProfile() {
    fetch('/auth/admin-profile')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update profile details on the page
                const profileName = document.getElementById('profileName');
                const profileEmail = document.getElementById('profileEmail');
                const profileRole = document.getElementById('profileRole');
                const userName = document.getElementById('userName');
                const userRole = document.getElementById('userRole');
                const profilePhoto = document.getElementById('profilePhoto');
                const navProfilePhoto = document.getElementById('navProfilePhoto');
                const dropdownProfilePhoto = document.getElementById('dropdownProfilePhoto');

                // Check if elements exist before updating
                if (profileName) profileName.textContent = data.admin.name;
                if (profileEmail) profileEmail.textContent = data.admin.email;
                if (profileRole) profileRole.textContent = data.admin.role || 'Admin';
                if (userName) userName.textContent = data.admin.name;
                if (userRole) userRole.textContent = data.admin.role || 'Admin';

                const photoUrl = data.admin.photo || '../ad-images/profile/default.jpg';
                if (profilePhoto) profilePhoto.src = photoUrl;
                if (navProfilePhoto) navProfilePhoto.src = photoUrl;
                if (dropdownProfilePhoto) dropdownProfilePhoto.src = photoUrl;
            } else {
                alert('Failed to load profile details. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error loading profile:', error);
            alert('Error loading profile details. Please try again.');
        });
}

// Update profile photo directly from the profile page
function updateProfilePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePic', file);

    fetch('/auth/update-profile-photo', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update the profile photo on the page
                const newPhotoUrl = data.photoUrl;
                const profilePhoto = document.getElementById('profilePhoto');
                const navProfilePhoto = document.getElementById('navProfilePhoto');
                const dropdownProfilePhoto = document.getElementById('dropdownProfilePhoto');

                if (profilePhoto) profilePhoto.src = newPhotoUrl;
                if (navProfilePhoto) navProfilePhoto.src = newPhotoUrl;
                if (dropdownProfilePhoto) dropdownProfilePhoto.src = newPhotoUrl;
                alert('Profile photo updated successfully!');
            } else {
                alert('Failed to update profile photo: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error updating profile photo:', error);
            alert('Error updating profile photo. Please try again.');
        });
}

// Open the Edit Profile modal and prefill the form
function openEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    const editName = document.getElementById('editName');
    const editEmail = document.getElementById('editEmail');

    // Prefill the form with current values
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');

    if (editName && profileName) editName.value = profileName.textContent;
    if (editEmail && profileEmail) editEmail.value = profileEmail.textContent;

    if (modal) modal.style.display = 'block';
}

// Close the Edit Profile modal
function closeEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) modal.style.display = 'none';
}

// Save changes to name and email
function saveProfileChanges(event) {
    event.preventDefault();

    const name = document.getElementById('editName').value;
    const email = document.getElementById('editEmail').value;

    fetch('/auth/update-profile', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update the profile details on the page
                const profileName = document.getElementById('profileName');
                const profileEmail = document.getElementById('profileEmail');
                const userName = document.getElementById('userName');

                if (profileName) profileName.textContent = name;
                if (profileEmail) profileEmail.textContent = email;
                if (userName) userName.textContent = name;
                closeEditProfileModal();
                alert('Profile updated successfully!');
            } else {
                alert('Failed to update profile: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error updating profile:', error);
            alert('Error updating profile. Please try again.');
        });
}

// Open the Change Password modal
function openChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'block';
}

// Close the Change Password modal
function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'none';
}

// Handle password change
function changePassword(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        alert('New password and confirm password do not match.');
        return;
    }

    fetch('/auth/change-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPassword, newPassword })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                closeChangePasswordModal();
                alert('Password updated successfully!');
            } else {
                alert('Failed to update password: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error changing password:', error);
            alert('Error changing password. Please try again.');
        });
}