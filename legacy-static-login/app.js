(function () {
  var form = document.getElementById("login-form");
  var email = document.getElementById("email");
  var password = document.getElementById("password");
  var chips = document.querySelectorAll(".user-chip");

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var e = chip.getAttribute("data-email") || "";
      var p = chip.getAttribute("data-password") || "";
      email.value = e;
      password.value = p;
      email.focus();
    });
  });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (!email.value.trim()) {
      email.focus();
      return;
    }
    if (!password.value) {
      password.focus();
      return;
    }
    alert("Demo only — no backend. Signed in as: " + email.value);
  });
})();
