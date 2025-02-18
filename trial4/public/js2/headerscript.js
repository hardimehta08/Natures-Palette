window.addEventListener("load", () => {
    const header = document.getElementById("header");
    if (header) {
      const script = document.createElement("script");
      script.src = "../js2/search.js";
      document.body.appendChild(script);
    }
  });