// Thin loader to keep the main implementation in app.js
// while exposing a script.js entrypoint for the static site.
(() => {
  const script = document.createElement("script");
  script.src = "./app.js";
  script.async = false;
  document.head.appendChild(script);
})();

