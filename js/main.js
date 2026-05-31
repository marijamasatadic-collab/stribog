const nav       = document.getElementById('site-nav');
const hamburger = document.querySelector('.site-nav__hamburger');
const navLinks  = document.getElementById('nav-links');

/* ── Sticky shadow ── */
window.addEventListener('scroll', () => {
  nav.classList.toggle('site-nav--scrolled', window.scrollY > 40);
}, { passive: true });

/* ── Hamburger ── */
hamburger?.addEventListener('click', () => {
  const open = nav.classList.toggle('site-nav--open');
  hamburger.setAttribute('aria-expanded', String(open));
});

navLinks?.querySelectorAll('.site-nav__link').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('site-nav--open');
    hamburger?.setAttribute('aria-expanded', 'false');
  });
});

/* ── Desktop: reveal phone number on call-CTA click instead of opening dialer ── */
function formatTel(href) {
  const digits = href.replace(/[^\d+]/g, '').replace(/^\+381/, '0');
  return digits.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
}

const isDesktop = () => window.matchMedia('(min-width: 768px)').matches;

const COPY_SVG  = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const CHECK_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

document.querySelectorAll('a.btn[href^="tel:"]').forEach(btn => {
  const number = formatTel(btn.getAttribute('href'));

  btn.addEventListener('click', e => {
    if (!isDesktop()) return;            // phone: keep native dialer
    e.preventDefault();                  // desktop: never open the dialer prompt
    if (btn.dataset.revealed) return;    // already showing the number

    btn.dataset.revealed = 'true';
    btn.title = 'Pozovite nas na ovaj broj';
    btn.textContent = '';

    const label = document.createElement('span');
    label.textContent = `📞 ${number}`;

    const copy = document.createElement('span');
    copy.className = 'btn-copy';
    copy.setAttribute('role', 'button');
    copy.setAttribute('tabindex', '0');
    copy.setAttribute('aria-label', `Kopiraj broj ${number}`);
    copy.title = 'Kopiraj broj';
    copy.innerHTML = COPY_SVG;

    const doCopy = async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      try {
        await navigator.clipboard.writeText(number);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = number;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      copy.innerHTML = CHECK_SVG;
      copy.classList.add('btn-copy--done');
      setTimeout(() => {
        copy.innerHTML = COPY_SVG;
        copy.classList.remove('btn-copy--done');
      }, 1500);
    };

    copy.addEventListener('click', doCopy);
    copy.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ') doCopy(ev);
    });

    btn.append(label, copy);
  });
});

/* ── Rituali sub-nav active highlight ── */
const subNav = document.getElementById('sub-nav');
if (subNav) {
  const sections = document.querySelectorAll('.ritual[id], .spa-days[id]');
  const subLinks = subNav.querySelectorAll('a[href^="#"]');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        subLinks.forEach(a => a.classList.remove('sub-nav__link--active'));
        const active = subNav.querySelector(`a[href="#${entry.target.id}"]`);
        active?.classList.add('sub-nav__link--active');
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });

  sections.forEach(s => observer.observe(s));

  subLinks.forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}
