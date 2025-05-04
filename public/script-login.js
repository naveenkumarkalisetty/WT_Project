(() => {
    'use strict';
    const forms = document.querySelectorAll('.needs-validation');
    Array.from(forms).forEach(form => {
      form.addEventListener('submit', function (event) {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }
        form.classList.add('was-validated');
      }, false);
    });
  })();
  
  const passwordInput = document.getElementById('password');
  const strengthBar = document.getElementById('password-strength');
  
  passwordInput.addEventListener('input', () => {
    const value = passwordInput.value;
    strengthBar.className = 'password-strength';
    strengthBar.style.display = value ? 'block' : 'none';
  
    if (value.length >= 6 && /[A-Z]/.test(value) && /[0-9]/.test(value)) {
      strengthBar.classList.add('strength-strong');
    } else if (value.length >= 4) {
      strengthBar.classList.add('strength-medium');
    } else if (value.length > 0) {
      strengthBar.classList.add('strength-weak');
    }
  });
  
  const loginForm = document.getElementById('loginForm');
  const card = document.querySelector('.card');
  
  loginForm.addEventListener('submit', function (e) {
    if (loginForm.checkValidity()) {
      e.preventDefault();
      card.classList.add('fade-out');
      setTimeout(() => {
        loginForm.submit();
      }, 1000);
    }
  });
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
  
    if (!loginForm.checkValidity()) {
      loginForm.classList.add('was-validated');
      return;
    }
  
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
  
    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
  
      const result = await response.json();
  
      if (response.ok) {
        card.classList.add('fade-out');
        setTimeout(() => {
          new bootstrap.Toast(document.getElementById('loginSuccessToast')).show();
          setTimeout(() => {
            window.location.href = "/dashboard"; // Adjust this to your success route
          }, 3500);
        }, 1000);
      } else {
        new bootstrap.Toast(document.getElementById('loginFailedToast')).show();
      }
  
    } catch (error) {
      console.error("Login error:", error);
      new bootstrap.Toast(document.getElementById('loginFailedToast')).show();
    }
  });


  
  

  