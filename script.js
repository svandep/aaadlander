const dateLabel = document.querySelector('[data-role="today-date"]');
const menuLinks = Array.from(document.querySelectorAll('.menu a'));
const searchInput = document.querySelector('.search input');
const rows = Array.from(document.querySelectorAll('tbody tr'));

if (dateLabel) {
  const formatter = new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  dateLabel.textContent = `Vandaag · ${formatter.format(new Date())}`;
}

menuLinks.forEach((link) => {
  link.addEventListener('click', () => {
    menuLinks.forEach((item) => item.classList.remove('active'));
    link.classList.add('active');
  });
});

if (searchInput) {
  searchInput.addEventListener('input', (event) => {
    const query = event.target.value.trim().toLowerCase();

    rows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      row.hidden = query.length > 0 && !text.includes(query);
    });
  });
}
