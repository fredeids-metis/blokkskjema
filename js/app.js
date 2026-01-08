/**
 * Blokkskjema - Main Application
 * Bergen Private Gymnas - 2026-2027
 *
 * Handles data fetching, state management, and rendering
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  API_URL: 'https://raw.githubusercontent.com/fredeids-metis/school-data/main/data/skoler/bergen-private-gymnas/blokkskjema/26-27_vedtatt.yml',
  CURRICULUM_API_URL: 'https://fredeids-metis.github.io/school-data/api/v2/schools/bergen-private-gymnas/studieplanlegger.json',
  IMAGE_BASE_URL: 'https://fredeids-metis.github.io/school-data/images/fag',
  PROGRAMS: {
    'studiespesialisering': { name: 'Studiespesialisering', short: 'SSP', color: 'ssp' },
    'musikk-dans-drama': { name: 'Musikk', short: 'MUS', color: 'musikk' },
    'medier-kommunikasjon': { name: 'MK', short: 'MK', color: 'mk' }
  }
};

// ============================================
// STATE
// ============================================
const state = {
  data: null,
  curriculum: null,  // Extended curriculum data from studieplanlegger.json
  loading: true,
  error: null,
  selectedProgram: 'studiespesialisering',
  selectedYear: 'vg2',
  modalOpen: false,
  selectedSubject: null
};

// ============================================
// DOM REFERENCES
// ============================================
let elements = {};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', init);

async function init() {
  cacheElements();
  bindEvents();
  await loadData();
}

function cacheElements() {
  elements = {
    app: document.getElementById('blokkskjema'),
    main: document.getElementById('bs-main'),
    blocksGrid: document.getElementById('bs-blocks-grid'),
    programDropdown: document.querySelector('[data-dropdown="program"]'),
    yearDropdown: document.querySelector('[data-dropdown="year"]'),
    programValue: document.getElementById('program-value'),
    yearValue: document.getElementById('year-value'),
    modalBackdrop: document.getElementById('bs-modal-backdrop'),
    modal: document.getElementById('bs-modal'),
    modalContent: document.getElementById('bs-modal-content')
  };
}

function bindEvents() {
  // Dropdown filters
  setupDropdowns();

  // Modal close
  elements.modalBackdrop?.addEventListener('click', closeModal);
  document.getElementById('bs-modal-close')?.addEventListener('click', closeModal);

  // Keyboard navigation
  document.addEventListener('keydown', handleKeydown);

  // Close dropdowns on outside click
  document.addEventListener('click', handleOutsideClick);
}

function setupDropdowns() {
  // Program dropdown
  const programBtn = elements.programDropdown?.querySelector('.bs-filter-dropdown__btn');
  const programMenu = elements.programDropdown?.querySelector('.bs-filter-dropdown__menu');

  programBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown(elements.programDropdown, programBtn, programMenu);
  });

  elements.programDropdown?.querySelectorAll('.bs-filter-dropdown__item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      handleProgramSelect(item);
      closeAllDropdowns();
    });
  });

  // Year dropdown
  const yearBtn = elements.yearDropdown?.querySelector('.bs-filter-dropdown__btn');
  const yearMenu = elements.yearDropdown?.querySelector('.bs-filter-dropdown__menu');

  yearBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown(elements.yearDropdown, yearBtn, yearMenu);
  });

  elements.yearDropdown?.querySelectorAll('.bs-filter-dropdown__item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      handleYearSelect(item);
      closeAllDropdowns();
    });
  });
}

function toggleDropdown(dropdown, btn, menu) {
  const isOpen = !menu.classList.contains('hidden');

  // Close all other dropdowns first
  closeAllDropdowns();

  if (!isOpen) {
    menu.classList.remove('hidden');
    btn.setAttribute('aria-expanded', 'true');
  }
}

function closeAllDropdowns() {
  document.querySelectorAll('.bs-filter-dropdown__menu').forEach(menu => {
    menu.classList.add('hidden');
  });
  document.querySelectorAll('.bs-filter-dropdown__btn').forEach(btn => {
    btn.setAttribute('aria-expanded', 'false');
  });
}

function handleOutsideClick(e) {
  if (!e.target.closest('.bs-filter-dropdown')) {
    closeAllDropdowns();
  }
}

function handleProgramSelect(item) {
  const program = item.dataset.program;
  state.selectedProgram = program;

  // Update visual state
  elements.programDropdown?.querySelectorAll('.bs-filter-dropdown__item').forEach(i => {
    i.classList.remove('bs-filter-dropdown__item--active');
    i.setAttribute('aria-selected', 'false');
  });
  item.classList.add('bs-filter-dropdown__item--active');
  item.setAttribute('aria-selected', 'true');

  // Update displayed value
  if (elements.programValue) {
    elements.programValue.textContent = item.textContent;
  }

  render();
}

function handleYearSelect(item) {
  const year = item.dataset.year;
  state.selectedYear = year;

  // Update visual state
  elements.yearDropdown?.querySelectorAll('.bs-filter-dropdown__item').forEach(i => {
    i.classList.remove('bs-filter-dropdown__item--active');
    i.setAttribute('aria-selected', 'false');
  });
  item.classList.add('bs-filter-dropdown__item--active');
  item.setAttribute('aria-selected', 'true');

  // Update displayed value
  if (elements.yearValue) {
    elements.yearValue.textContent = item.textContent;
  }

  render();
}

// ============================================
// DATA LOADING
// ============================================
async function loadData() {
  showLoading();

  try {
    if (typeof jsyaml === 'undefined') {
      throw new Error('js-yaml library not loaded');
    }

    // Load blokkskjema data (YAML)
    const blokkResponse = await fetch(CONFIG.API_URL);
    if (!blokkResponse.ok) throw new Error(`Failed to fetch blokkskjema: ${blokkResponse.status}`);
    const yamlText = await blokkResponse.text();
    state.data = jsyaml.load(yamlText);

    // Load curriculum data (JSON) for extended fag info
    try {
      const currResponse = await fetch(CONFIG.CURRICULUM_API_URL);
      if (currResponse.ok) {
        const currData = await currResponse.json();
        state.curriculum = currData.curriculum || null;
      }
    } catch (currError) {
      console.warn('Could not load curriculum data:', currError);
      // Continue without curriculum - modal will show basic info
    }

    state.loading = false;
    render();
  } catch (error) {
    console.error('Error loading data:', error);
    state.error = error.message;
    state.loading = false;
    showError();
  }
}

function showLoading() {
  if (elements.blocksGrid) {
    elements.blocksGrid.innerHTML = `
      <div class="app-loading" style="grid-column: 1 / -1;">
        <div class="app-loading__spinner"></div>
        <p class="app-loading__text">Laster blokkskjema...</p>
      </div>
    `;
  }
}

function showError() {
  if (elements.blocksGrid) {
    elements.blocksGrid.innerHTML = `
      <div class="app-error" style="grid-column: 1 / -1;">
        <svg class="app-error__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h2 class="app-error__title">Kunne ikke laste data</h2>
        <p class="app-error__message">Det oppstod en feil ved lasting av blokkskjemaet. Vennligst prøv igjen.</p>
        <button class="app-error__retry" onclick="loadData()">Prøv igjen</button>
      </div>
    `;
  }
}

// ============================================
// RENDERING
// ============================================
function render() {
  renderBlocks();
}

function renderBlocks() {
  if (!elements.blocksGrid || !state.data?.blokker) return;

  const { blokker } = state.data;
  const { selectedProgram, selectedYear } = state;

  // Clear existing content
  elements.blocksGrid.innerHTML = '';

  // Always render all 4 blocks
  Object.entries(blokker).forEach(([blockKey, block], index) => {
    const filteredSubjects = filterSubjects(block.fag, selectedProgram, selectedYear);
    const isEmpty = filteredSubjects.length === 0;

    const blockEl = document.createElement('article');
    blockEl.className = `bs-block${isEmpty ? ' bs-block--placeholder' : ''}`;
    blockEl.dataset.blokkId = blockKey;
    blockEl.innerHTML = `
      <div class="bs-block__header">${block.navn}</div>
      <div class="bs-block__fag-liste">
        ${filteredSubjects.length > 0
          ? filteredSubjects.map((fag, i) => renderSubjectItem(fag, i)).join('')
          : renderEmptyState()
        }
      </div>
    `;

    elements.blocksGrid.appendChild(blockEl);
  });

  // Bind click events to info buttons
  elements.blocksGrid.querySelectorAll('.bs-fag-info-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(btn.dataset.fagInfo);
    });
  });
}

function renderSubjectItem(fag, index) {
  const safeId = fag.id.replace(/'/g, "\\'");
  const safeName = formatSubjectName(fag.id).replace(/'/g, "\\'");
  const delay = index * 30;
  const fargeKlasse = getFagomradeFargeKlasse(fag.id);

  return `
    <div class="bs-blokk-fag-item ${fargeKlasse}" style="animation-delay: ${delay}ms">
      <div class="bs-blokk-fag-row">
        <span class="bs-blokk-fag-navn">${formatSubjectName(fag.id)}</span>
        <div class="bs-blokk-fag-right">
          <span class="bs-blokk-fag-timer">${fag.timer}t</span>
          <button class="bs-fag-info-btn" data-fag-info="${safeId}" title="Se fagdetaljer" aria-label="Se detaljer for ${safeName}">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <text x="8" y="12" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">i</text>
            </svg>
          </button>
        </div>
      </div>
      ${fag.merknad ? `<div class="bs-blokk-fag-note">${fag.merknad}</div>` : ''}
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="bs-blokk-placeholder-message">
      <span class="bs-placeholder-icon">&#9675;</span>
      <span class="bs-placeholder-text">Ingen valgbare fag</span>
    </div>
  `;
}

// ============================================
// MODAL
// ============================================
function openModal(subjectId) {
  // Find basic subject from blokkskjema
  const basicSubject = findSubject(subjectId);
  if (!basicSubject) return;

  // Find extended info from curriculum data
  const extendedInfo = findExtendedFagInfo(subjectId);

  // Merge data (extended takes priority)
  const subject = { ...basicSubject, ...extendedInfo };

  state.modalOpen = true;
  state.selectedSubject = subject;

  renderModalContent(subject);

  elements.modalBackdrop?.classList.add('is-open');
  elements.modal?.classList.add('is-open');
  document.body.style.overflow = 'hidden';

  // Focus the close button
  setTimeout(() => {
    document.getElementById('bs-modal-close')?.focus();
  }, 100);
}

function closeModal() {
  state.modalOpen = false;
  state.selectedSubject = null;

  elements.modalBackdrop?.classList.remove('is-open');
  elements.modal?.classList.remove('is-open');
  document.body.style.overflow = '';
}

function findExtendedFagInfo(fagId) {
  if (!state.curriculum) return null;

  // Search in valgfrieProgramfag
  let fag = state.curriculum.valgfrieProgramfag?.find(f => f.id === fagId);

  // Search in obligatoriskeProgramfag
  if (!fag) {
    fag = state.curriculum.obligatoriskeProgramfag?.find(f => f.id === fagId);
  }

  // Search in fellesfag
  if (!fag) {
    fag = state.curriculum.fellesfag?.find(f => f.id === fagId);
    // Try without -vg1/-vg2/-vg3 suffix
    if (!fag) {
      const strippedId = fagId.replace(/-vg[123]$/, '');
      fag = state.curriculum.fellesfag?.find(f => f.id === strippedId);
    }
  }

  return fag || null;
}

function renderModalContent(subject) {
  if (!elements.modalContent) return;

  const fagNavn = subject.shortTitle || subject.title || formatSubjectName(subject.id);
  const imageUrl = subject.bilde ? `${CONFIG.IMAGE_BASE_URL}/${subject.bilde}` : null;

  // Build hero section (with or without image)
  const heroHTML = buildHeroSection(subject, fagNavn, imageUrl);

  // Build Vimeo video section
  const vimeoHTML = buildVimeoSection(subject);

  // Build body content
  const bodyHTML = buildBodySection(subject);

  elements.modalContent.innerHTML = `
    ${heroHTML}
    ${vimeoHTML}
    ${bodyHTML}
  `;

  // Setup event handlers
  document.getElementById('bs-modal-close')?.addEventListener('click', closeModal);
  setupAccordionHandlers();
}

function buildHeroSection(subject, fagNavn, imageUrl) {
  const fagkodeBadge = subject.fagkode
    ? `<span class="bs-modal__fagkode-badge">${subject.fagkode}</span>`
    : '';

  const relatedBadge = subject.related && subject.related.length > 0
    ? `<span class="bs-modal__related-badge">Fordypning med: ${subject.related.map(r => formatSubjectName(r)).join(', ')}</span>`
    : '';

  if (imageUrl) {
    return `
      <div class="bs-modal__hero">
        <button class="bs-modal__close" id="bs-modal-close" aria-label="Lukk">&times;</button>
        <img src="${imageUrl}" alt="${fagNavn}" class="bs-modal__hero-image" onerror="this.parentElement.classList.add('no-image'); this.remove();" />
        <div class="bs-modal__hero-overlay"></div>
        <div class="bs-modal__hero-content">
          <h2>${fagNavn}</h2>
          <div class="bs-modal__hero-badges">
            ${fagkodeBadge}
            ${relatedBadge}
          </div>
        </div>
      </div>
    `;
  } else {
    return `
      <div class="bs-modal__hero no-image">
        <button class="bs-modal__close" id="bs-modal-close" aria-label="Lukk">&times;</button>
        <div class="bs-modal__hero-content">
          <h2>${fagNavn}</h2>
          <div class="bs-modal__hero-badges">
            ${fagkodeBadge}
            ${relatedBadge}
          </div>
        </div>
      </div>
    `;
  }
}

function buildVimeoSection(subject) {
  if (!subject.vimeo) return '';

  const vimeoId = extractVimeoId(subject.vimeo);
  if (!vimeoId) return '';

  return `
    <div class="bs-modal__vimeo">
      <iframe
        src="https://player.vimeo.com/video/${vimeoId}"
        frameborder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>
  `;
}

function extractVimeoId(vimeoUrl) {
  if (!vimeoUrl) return null;
  const match = vimeoUrl.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : vimeoUrl; // Return as-is if it's already just an ID
}

function buildBodySection(subject) {
  const omFaget = subject.omFaget || '';
  const hvordanArbeiderMan = subject.hvordanArbeiderMan || '';
  const fagetsRelevans = subject.fagetsRelevans || '';
  const kjerneelementer = subject.kjerneelementer || [];

  // Build "Om faget" section
  const omFagetHTML = omFaget
    ? `<div class="bs-modal__om-faget">
        <h3>Om faget</h3>
        <p>${omFaget}</p>
       </div>`
    : '';

  // Build accordions
  const accordions = [];

  if (hvordanArbeiderMan) {
    accordions.push(buildAccordion('hvordan', 'Hvordan arbeider man i faget?', formatTextContent(hvordanArbeiderMan)));
  }

  if (fagetsRelevans) {
    accordions.push(buildAccordion('relevans', 'Fagets relevans', formatTextContent(fagetsRelevans)));
  }

  if (kjerneelementer.length > 0) {
    const kjerneHTML = kjerneelementer.map(k => `
      <div class="bs-modal__kjerne-item">
        <strong>${k.title || k.tittel || ''}</strong>
        ${k.content || k.innhold ? `<p>${k.content || k.innhold}</p>` : ''}
      </div>
    `).join('');
    accordions.push(buildAccordion('kjerne', `Kjerneelementer (${kjerneelementer.length})`, kjerneHTML));
  }

  // Prerequisites section
  const prereqHTML = subject.krever && subject.krever.length > 0
    ? `<div class="bs-modal__prereq">
        <h4>Forutsetter</h4>
        <ul>${subject.krever.map(p => `<li>${formatSubjectName(p)}</li>`).join('')}</ul>
       </div>`
    : '';

  // Læreplan link
  const lareplanHTML = subject.fagkode
    ? `<a href="https://sokeresultat.udir.no/?LpFilter=${subject.fagkode}" target="_blank" rel="noopener" class="bs-modal__lareplan-btn">
        Se læreplanen hos UDIR
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
       </a>`
    : '';

  return `
    <div class="bs-modal__body">
      ${omFagetHTML}
      ${accordions.length > 0 ? `<div class="bs-modal__accordions">${accordions.join('')}</div>` : ''}
      ${prereqHTML}
      ${lareplanHTML}
    </div>
  `;
}

function buildAccordion(id, title, content) {
  return `
    <div class="bs-modal__accordion" data-accordion-id="${id}">
      <button class="bs-modal__accordion-header" aria-expanded="false">
        <span>${title}</span>
        <span class="bs-modal__accordion-icon">&#9662;</span>
      </button>
      <div class="bs-modal__accordion-content">
        ${content}
      </div>
    </div>
  `;
}

function formatTextContent(text) {
  if (!text) return '<p class="placeholder-text">Innhold kommer snart</p>';

  // Check if text contains bullet point indicators
  const lines = text.split('\n');
  const bulletLines = lines.filter(l => /^[\-•*]\s/.test(l.trim()));

  // If most lines are bullet points, render as list
  if (bulletLines.length > 0 && bulletLines.length >= lines.length / 2) {
    const listItems = lines
      .filter(l => l.trim())
      .map(l => {
        const cleaned = l.trim().replace(/^[\-•*]\s*/, '');
        return `<li>${cleaned}</li>`;
      })
      .join('');
    return `<ul>${listItems}</ul>`;
  }

  // Otherwise, split into paragraphs
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];

  // Group sentences into paragraphs (2-3 sentences each)
  const paragraphs = [];
  let currentPara = [];

  sentences.forEach((sentence, i) => {
    currentPara.push(sentence.trim());
    if (currentPara.length >= 2 && (
      sentence.includes('viktig') ||
      sentence.includes('også') ||
      sentence.includes('I tillegg') ||
      i === sentences.length - 1 ||
      currentPara.length >= 3
    )) {
      paragraphs.push(currentPara.join(' '));
      currentPara = [];
    }
  });

  if (currentPara.length > 0) {
    paragraphs.push(currentPara.join(' '));
  }

  return paragraphs.map(p => `<p>${p}</p>`).join('');
}

function setupAccordionHandlers() {
  document.querySelectorAll('.bs-modal__accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const accordion = header.closest('.bs-modal__accordion');
      const isOpen = accordion.classList.contains('open');

      if (isOpen) {
        accordion.classList.remove('open');
        header.setAttribute('aria-expanded', 'false');
      } else {
        accordion.classList.add('open');
        header.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

// ============================================
// EVENT HANDLERS
// ============================================
function handleKeydown(e) {
  if (e.key === 'Escape') {
    if (state.modalOpen) {
      closeModal();
    }
    closeAllDropdowns();
  }
}

// ============================================
// FAGOMRÅDE COLOR MAPPING
// ============================================
/**
 * Get CSS class for fagområde color based on fag-ID
 * @param {string} fagId - Subject ID (e.g., 'fysikk-1', 'matematikk-r1')
 * @returns {string} CSS class (e.g., 'fagomrade-realfag', 'fag-matematikk-r')
 */
function getFagomradeFargeKlasse(fagId) {
  if (!fagId) return '';

  const id = fagId.toLowerCase();

  // Matematikk fellesfag (2P) - grå
  if (id.includes('matematikk-2p') || id.includes('matematikk_2p') || id === '2p') {
    return 'fag-matematikk-2p';
  }

  // Matematikk programfag R - gradient grønn/gul
  if (id.includes('matematikk-r') || id.includes('matematikk_r')) {
    return 'fag-matematikk-r';
  }

  // Matematikk programfag S - gradient gul/grønn
  if (id.includes('matematikk-s') || id.includes('matematikk_s')) {
    return 'fag-matematikk-s';
  }

  // Map fag-ID til fagområde basert på prefiks
  const fagomradeMap = {
    // Realfag (grønn)
    'fysikk': 'realfag',
    'kjemi': 'realfag',
    'biologi': 'realfag',
    'geofag': 'realfag',
    'informasjonsteknologi': 'realfag',
    'it': 'realfag',
    'teknologi': 'realfag',

    // Samfunn/språk/økonomi (gul)
    'psykologi': 'samfunn',
    'rettslare': 'samfunn',
    'rettslaere': 'samfunn',
    'sosialkunnskap': 'samfunn',
    'sosiologi': 'samfunn',
    'okonomi': 'samfunn',
    'samfunnsokonomi': 'samfunn',
    'markedsforing': 'samfunn',
    'entreprenorskap': 'samfunn',
    'politikk': 'samfunn',
    'historie': 'samfunn',
    'samfunnsgeografi': 'samfunn',
    'geografi': 'samfunn',
    'engelsk': 'samfunn',
    'spansk': 'samfunn',
    'tysk': 'samfunn',
    'fransk': 'samfunn',
    'kinesisk': 'samfunn',

    // Musikk (rød)
    'musikk': 'musikk',
    'hovedinstrument': 'musikk',
    'dans': 'musikk',
    'drama': 'musikk',

    // Mediefag (blå)
    'bilde': 'medier',
    'grafisk': 'medier',
    'medie': 'medier'
  };

  for (const [prefix, fagomrade] of Object.entries(fagomradeMap)) {
    if (id.startsWith(prefix)) {
      return `fagomrade-${fagomrade}`;
    }
  }

  return '';
}

// ============================================
// HELPERS
// ============================================
function isBlockAvailable(block, program, year) {
  const yearAccess = block.tilgjengeligFor?.[year];
  if (!yearAccess) return false;

  return yearAccess.includes(program);
}

function filterSubjects(subjects, program, year) {
  if (!subjects) return [];

  return subjects.filter(fag => {
    // Filter by year
    if (fag.trinn !== year) return false;

    // Filter by program
    if (!fag.tilgjengeligFor?.includes(program)) return false;

    return true;
  });
}

function findSubject(subjectId) {
  if (!state.data?.blokker) return null;

  for (const block of Object.values(state.data.blokker)) {
    const subject = block.fag?.find(f => f.id === subjectId);
    if (subject) return subject;
  }

  return null;
}

function formatSubjectName(id) {
  // Map common subject IDs to readable names
  const subjectNames = {
    'matematikk-2p': 'Matematikk 2P',
    'matematikk-s1': 'Matematikk S1',
    'matematikk-s2': 'Matematikk S2',
    'matematikk-r1': 'Matematikk R1',
    'matematikk-r2': 'Matematikk R2',
    'fysikk-1': 'Fysikk 1',
    'fysikk-2': 'Fysikk 2',
    'kjemi-1': 'Kjemi 1',
    'kjemi-2': 'Kjemi 2',
    'biologi-1': 'Biologi 1',
    'biologi-2': 'Biologi 2',
    'geofag-1': 'Geofag 1',
    'geofag-2': 'Geofag 2',
    'psykologi-1': 'Psykologi 1',
    'psykologi-2': 'Psykologi 2',
    'rettslaere-1': 'Rettslære 1',
    'rettslaere-2': 'Rettslære 2',
    'sosiologi-og-sosialantropologi': 'Sosiologi og sosialant.',
    'sosialkunnskap': 'Sosialkunnskap',
    'politikk-og-menneskerettigheter': 'Politikk og mennesker.',
    'samfunnsgeografi': 'Samfunnsgeografi',
    'samfunnsokonomi-1': 'Samfunnsøkonomi 1',
    'samfunnsokonomi-2': 'Samfunnsøkonomi 2',
    'markedsforing-og-ledelse-1': 'Markedsføring og ledelse 1',
    'markedsforing-og-ledelse-2': 'Markedsføring og ledelse 2',
    'okonomistyring': 'Økonomistyring',
    'okonomi-og-ledelse': 'Økonomi og ledelse',
    'entreprenorskap-og-bedriftsutvikling-1': 'Entrepr. og bedriftsutv. 1',
    'entreprenorskap-og-bedriftsutvikling-2': 'Entrepr. og bedriftsutv. 2',
    'historie-og-filosofi-1': 'Historie og filosofi 1',
    'historie-og-filosofi-2': 'Historie og filosofi 2',
    'historie': 'Historie',
    'historie-pabygg': 'Historie (påbygg)',
    'engelsk-1': 'Engelsk 1',
    'engelsk-2': 'Engelsk 2',
    'spansk-i+ii': 'Spansk I+II',
    'grafisk-design-1': 'Grafisk design 1',
    'grafisk-design-2': 'Grafisk design 2',
    'bilde': 'Bilde',
    'musikk-fordypning-1': 'Musikk fordypning 1',
    'musikk-fordypning-2': 'Musikk fordypning 2',
    'musikk-i-perspektiv-1': 'Musikk i perspektiv 1',
    'musikk-i-perspektiv-2': 'Musikk i perspektiv 2',
    'hovedinstrument-1': 'Hovedinstrument 1',
    'hovedinstrument-2': 'Hovedinstrument 2',
    'hovedinstrument-3': 'Hovedinstrument 3',
    'geografi': 'Geografi'
  };

  return subjectNames[id] || id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Make loadData globally accessible for retry button
window.loadData = loadData;
