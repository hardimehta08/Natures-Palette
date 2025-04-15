// Fetch profile on load
function loadAdminProfile() {
    fetch("/profile/admin-profile")
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            return res.json();
        })
        .then(data => {
            document.getElementById("profileName").innerText = data.a_username || "N/A";
            document.getElementById("profileEmail").innerText = data.a_email || "N/A";
            document.getElementById("profilePhoto").src = data.a_photo || "/default.png";
            document.getElementById("editName").value = data.a_username || "";
            document.getElementById("editEmail").value = data.a_email || "";
        })
        .catch(error => {
            console.error("Error loading profile:", error);
            alert("Failed to load profile data.");
        });
}

// Profile photo change
function updateProfilePhoto(event) {
    const file = event.target.files[0];
    if (!file) {
        alert("No file selected!");
        return;
    }
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
        alert("Only JPEG, JPG, and PNG files are allowed!");
        return;
    }
    if (file.size > 800000) {
        alert("File size must be less than 800KB!");
        return;
    }
    const formData = new FormData();
    formData.append("profilePic", file);
    console.log("Uploading file:", file.name, "type:", file.type, "size:", file.size);
    fetch("/profile/update-profile-photo", {
        method: "POST",
        body: formData
    })
        .then(res => {
            console.log("Upload response status:", res.status);
            if (!res.ok) {
                return res.json().then(data => {
                    throw new Error(data.message || `HTTP error! Status: ${res.status}`);
                });
            }
            return res.json();
        })
        .then(data => {
            alert(data.message);
            if (data.photo) {
                document.getElementById("profilePhoto").src = data.photo + `?t=${Date.now()}`;
            }
        })
        .catch(error => {
            console.error("Error uploading photo:", error, "file:", file.name);
            alert("Failed to update photo: " + error.message);
        });
}

// Open/close modals
function openEditProfileModal() {
    document.getElementById("editProfileModal").style.display = "block";
}
function closeEditProfileModal() {
    document.getElementById("editProfileModal").style.display = "none";
}
function openChangePasswordModal() {
    document.getElementById("changePasswordModal").style.display = "block";
}
function closeChangePasswordModal() {
    document.getElementById("changePasswordModal").style.display = "none";
}

// Save profile changes
function saveProfileChanges(event) {
    event.preventDefault();
    const name = document.getElementById("editName").value.trim();
    const email = document.getElementById("editEmail").value.trim();

    if (!name || !email) {
        alert("Name and email are required!");
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert("Please enter a valid email address!");
        return;
    }

    fetch("/profile/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email })
    })
        .then(res => {
            if (!res.ok) {
                return res.json().then(data => {
                    throw new Error(data.message || `HTTP error! Status: ${res.status}`);
                });
            }
            return res.json();
        })
        .then(data => {
            alert(data.message);
            if (data.message.includes("success")) {
                document.getElementById("profileName").innerText = name;
                document.getElementById("profileEmail").innerText = email;
                closeEditProfileModal();
            }
        })
        .catch(error => {
            console.error("Error updating profile:", error);
            alert("Failed to update profile: " + error.message);
        });
}

// Change password
function changePassword(event) {
    event.preventDefault();
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword !== confirmPassword) {
        alert("New passwords do not match!");
        return;
    }
    if (newPassword.length < 8) {
        alert("New password must be at least 8 characters long!");
        return;
    }

    console.log("Sending change-password request:", { currentPassword, newPassword });
    fetch("/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
    })
        .then(res => {
            console.log("Response status:", res.status);
            if (!res.ok) {
                return res.json().then(data => {
                    throw new Error(data.message || `HTTP error! Status: ${res.status}`);
                });
            }
            return res.json();
        })
        .then(data => {
            alert(data.message);
            if (data.message.includes("success")) {
                closeChangePasswordModal();
                document.getElementById("changePasswordForm").reset();
            }
        })
        .catch(error => {
            console.error("Error changing password:", error);
            alert("Failed to change password: " + error.message + ". Is the server running?");
        });
}