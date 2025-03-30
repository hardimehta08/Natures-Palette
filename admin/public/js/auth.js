// ../js/auth.js
document.addEventListener("DOMContentLoaded", () => {
    // Session check
    fetch("/auth/check-session")
        .then(response => {
            if (!response.ok) throw new Error("Session check failed");
            return response.json();
        })
        .then(data => {
            if (!data.loggedIn) window.location.href = "/html/login.html";
        })
        .catch(error => {
            console.error("Error checking session:", error);
            window.location.href = "/html/login.html"; // Redirect on error
        });

    // Logout handler
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            try {
                const response = await fetch("/auth/logout", { method: "POST" });
                const result = await response.json();
                if (response.ok && result.success) {
                    window.location.href = "/html/login.html";
                } else {
                    alert(result.message || "Logout failed. Please try again.");
                }
            } catch (error) {
                console.error("Error logging out:", error);
                alert("Error logging out. Please try again.");
            }
        });
    } else {
        console.warn("Logout button not found in the DOM");
    }
});