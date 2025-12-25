// Mobile Navbar Toggle
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
menuToggle.addEventListener('click', () => {
  navLinks.classList.toggle('mobile-active');
  // Animate hamburger to close icon (optional)
  menuToggle.textContent =
    navLinks.classList.contains('mobile-active') ? '✖' : '☰';
});

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('mobile-active');
    menuToggle.textContent = '☰';
  });
});

// Smooth Scroll to Sections
document.querySelectorAll('a.scroll-link').forEach(link => {
  link.addEventListener('click', function(e){
    const targetId = this.getAttribute('href').slice(1);
    const target = document.getElementById(targetId);
    if(target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, null, `#${targetId}`);
    }
  });
});

// Highlight nav on scroll (simple)
window.addEventListener('scroll', () => {
  const sections = document.querySelectorAll('section');
  const scrollPos = window.scrollY + 80;
  sections.forEach(section => {
    if (scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight) {
      document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
      const id = section.getAttribute('id');
      const current = document.querySelector(`.nav-link[href="#${id}"]`);
      if(current) current.classList.add('active');
    }
  });
});

// Light/Dark Mode Toggle
const modeToggle = document.getElementById('modeToggle');
if (localStorage.getItem('portfolio-theme') === 'dark')
  document.body.classList.add('dark-mode');

modeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  if(document.body.classList.contains('dark-mode')) {
    modeToggle.textContent = '☀️';
    localStorage.setItem('portfolio-theme','dark');
  } else {
    modeToggle.textContent = '🌙';
    localStorage.setItem('portfolio-theme','light');
  }
});
// Initial toggle icon:
modeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';

// Contact Form Validation
const contactForm = document.getElementById('contactForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const messageInput = document.getElementById('message');

contactForm.addEventListener('submit', function(e) {
  e.preventDefault();
  let valid = true;

  // Name
  if (nameInput.value.trim().length < 2) {
    showError('nameError', 'Please enter your name.');
    valid = false;
  } else {
    showError('nameError', '');
  }

  // Email
  const emailVal = emailInput.value.trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailVal.match(emailPattern)) {
    showError('emailError', 'Enter a valid email.');
    valid = false;
  } else {
    showError('emailError', '');
  }

  // Message
  if (messageInput.value.trim().length < 6) {
    showError('messageError', 'Message must be at least 6 characters.');
    valid = false;
  } else {
    showError('messageError', '');
  }

  // Success
  if (valid) {
    showSuccess('formSuccess', 'Your message has been sent! (Demo only; not actually sent)');
    contactForm.reset();
    setTimeout(() => showSuccess('formSuccess', ''), 4000);
  }
});

function showError(id, msg) {
  document.getElementById(id).textContent = msg;
}
function showSuccess(id, msg) {
  document.getElementById(id).textContent = msg;
}

// Animate on Scroll (simple implementation)
const animElems = document.querySelectorAll('[data-animate], .project-card, .about-img, .about-text');
function animateOnScroll() {
  animElems.forEach(el => {
    const rect = el.getBoundingClientRect();
    if(rect.top < window.innerHeight - 60) {
      el.classList.add('in-view');
    }
  });
}
window.addEventListener('scroll', animateOnScroll);
window.addEventListener('DOMContentLoaded', animateOnScroll);

// Optionally add data-animate to .about-img, .about-text, .project-card in your HTML for stronger effect