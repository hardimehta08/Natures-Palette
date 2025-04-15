document
  .getElementById("review_form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const subject = document.getElementById("subject").value;
    const message = document.getElementById("message").value;

    try {
      const response = await fetch("/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const result = await response.text();
      alert(result);
      document.getElementById("review_form").reset();
    } catch (error) {
      alert("Error: Unable to submit your message. Please try again.");
    }
  });
