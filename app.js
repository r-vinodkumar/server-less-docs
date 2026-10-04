let miniSearchInstance = null;
let discoveredDocs = [];
let domainConfig = null;
let currentActiveDoc = '';

// DOM Elements
const contentElement = document.getElementById('content');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const navLinks = document.getElementById('navLinks');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const backdrop = document.getElementById('sidebarBackdrop');
const tabBanner = document.getElementById('tabBanner');
const openWebsiteLink = document.getElementById('openWebsiteLink');
const imageViewer = document.getElementById('imageViewer');
const imageViewerImage = document.getElementById('imageViewerImage');
const imageViewerCaption = document.getElementById('imageViewerCaption');
const imageViewerClose = document.getElementById('imageViewerClose');
let previouslyFocusedImage = null;

// ==========================================
// 1. PATH RESOLUTION HELPERS
// ==========================================
function getLocalUrl(relPath) {
  if (!relPath) return '';
  const cleanPath = relPath.replace(/^[#/]+/, '');
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    return chrome.runtime.getURL(cleanPath);
  }
  return cleanPath;
}

function resolveRelativePath(baseDocPath, relativePath) {
  if (
    relativePath.startsWith('http://') ||
    relativePath.startsWith('https://') ||
    relativePath.startsWith('data:') ||
    relativePath.startsWith('/')
  ) {
    return relativePath;
  }

  const baseDir = baseDocPath.includes('/')
    ? baseDocPath.substring(0, baseDocPath.lastIndexOf('/'))
    : '';

  const stack = baseDir ? baseDir.split('/') : [];
  const parts = relativePath.split('/');

  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }

  return stack.join('/');
}

function getDocumentFromLocation() {
  const queryDoc = new URLSearchParams(window.location.search).get('doc');
  return queryDoc || window.location.hash.slice(1);
}

function updateDocumentLocation(docPath, replace = false) {
  const url = new URL(window.location.href);
  url.searchParams.set('doc', docPath);
  url.hash = '';
  window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
  updateOpenWebsiteLink(docPath);
}

function updateOpenWebsiteLink(docPath = getDocumentFromLocation()) {
  if (!openWebsiteLink) return;
  const targetUrl =
    typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? new URL(chrome.runtime.getURL('index.html'))
      : new URL('index.html', window.location.href);
  if (docPath) targetUrl.searchParams.set('doc', docPath);
  openWebsiteLink.href = targetUrl.href;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function openImageViewer(image) {
  previouslyFocusedImage = image;
  imageViewerImage.src = image.src;
  imageViewerImage.alt = image.alt;
  imageViewerCaption.textContent = image.alt;
  imageViewer.hidden = false;
  imageViewerClose.focus();
}

function closeImageViewer() {
  if (imageViewer.hidden) return;
  imageViewer.hidden = true;
  imageViewerImage.removeAttribute('src');
  previouslyFocusedImage?.focus();
  previouslyFocusedImage = null;
}

contentElement.addEventListener('click', (event) => {
  const image = event.target.closest('.doc-image');
  if (image) openImageViewer(image);
});

contentElement.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.doc-image')) {
    event.preventDefault();
    openImageViewer(event.target);
  }
});

imageViewerClose.addEventListener('click', closeImageViewer);
imageViewer.addEventListener('click', (event) => {
  if (event.target === imageViewer) closeImageViewer();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeImageViewer();
});

// ==========================================
// 2. MARKED.JS CONFIGURATION (v15+ SAFE)
// ==========================================
if (typeof marked !== 'undefined') {
  marked.use({
    renderer: {
      image(token) {
        let src = token.href || '';
        if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
          const resolvedPath = resolveRelativePath(currentActiveDoc, src);
          src = getLocalUrl(resolvedPath);
        }
        const alt = token.text || '';
        const title = token.title || '';
        return `<img class="doc-image" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" title="${escapeHtml(title)}" role="button" tabindex="0" aria-label="Open image: ${escapeHtml(alt)}">`;
      }
    }
  });
}

// ==========================================
// 3. SIDEBAR & DRAWER CONTROLS
// ==========================================
function openMenu() {
  sidebar?.classList.add('open');
  backdrop?.classList.add('active');
}

function closeMenu() {
  sidebar?.classList.remove('open');
  backdrop?.classList.remove('active');
}

if (menuToggle) {
  menuToggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    sidebar?.classList.contains('open') ? closeMenu() : openMenu();
  });
}

if (backdrop) {
  backdrop.addEventListener('click', closeMenu);
}

// ==========================================
// 4. DATA FETCHING (LOCAL JSON FILES)
// ==========================================
async function fetchDocumentationIndex() {
  if (window.location.protocol === 'file:') {
    return window.LOCAL_DOCS_DATA || { documents: [], domains: {} };
  }

  try {
    const res = await fetch(getLocalUrl('manifest-docs.json'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Could not load manifest-docs.json:', err);
    return { documents: [], domains: {} };
  }
}

async function fetchDocumentText(filePath) {
  if (window.location.protocol === 'file:') {
    const bundledContent = window.LOCAL_DOCS_DATA?.content?.[filePath];
    if (typeof bundledContent !== 'string') {
      throw new Error(`No bundled content for ${filePath}`);
    }
    return bundledContent;
  }

  const res = await fetch(getLocalUrl(filePath));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ==========================================
// 5. MARKDOWN LOADING & RENDERING
// ==========================================
async function loadPage(rawPath, bannerMessage = null) {
  if (!rawPath) return;

  // Normalize: strip leading slashes/hashes, trailing slashes, and .md extension
  const requestedPath = rawPath.replace(/^[#/]+/, '').replace(/\/+$/, '').replace(/\.md$/, '');
  const cleanPath = discoveredDocs.some(
    (doc) => doc.path.replace(/\.md$/, '').replace(/^[#/]+/, '') === requestedPath
  )
    ? requestedPath
    : discoveredDocs.some(
          (doc) => doc.path.replace(/\.md$/, '').replace(/^[#/]+/, '') === `${requestedPath}/index`
        )
      ? `${requestedPath}/index`
      : requestedPath;
  const filePath = `${cleanPath}.md`;

  if (currentActiveDoc === cleanPath && !bannerMessage && tabBanner?.style.display === 'none') {
    return;
  }

  try {
    const md = await fetchDocumentText(filePath);
    currentActiveDoc = cleanPath;

    if (typeof marked !== 'undefined') {
      contentElement.innerHTML = marked.parse(md);
    } else {
      contentElement.innerHTML = `<pre>${md}</pre>`;
    }

    // Keep the selected document in the URL for direct links and static hosting.
    if (
      new URLSearchParams(window.location.search).get('doc') !== cleanPath ||
      window.location.hash
    ) {
      updateDocumentLocation(cleanPath, true);
    }

    window.scrollTo(0, 0);

    // Update banner indicator
    if (tabBanner) {
      if (bannerMessage) {
        tabBanner.style.display = 'block';
        tabBanner.innerHTML = bannerMessage;
      } else {
        tabBanner.style.display = 'none';
        tabBanner.innerHTML = '';
      }
    }

    // Update active highlight in menu
    document.querySelectorAll('.nav-link').forEach((link) => {
      const linkPath = (link.getAttribute('data-path') || '')
        .replace(/^[#/]+/, '')
        .replace(/\.md$/, '');
      link.classList.toggle('active', linkPath === cleanPath);
    });
  } catch (err) {
    console.error(`Failed to load: ${filePath}`, err);
    contentElement.innerHTML = `<h2>Document Not Found</h2><p>Cannot open <code>${cleanPath}</code>.</p>`;
  }
}

// ==========================================
// 6. DYNAMIC NAVIGATION GENERATOR
// ==========================================
function renderNavigation(docs) {
  if (!navLinks) return;
  navLinks.innerHTML = '';
  const groups = {};
  const products = new Map();

  docs.forEach((doc) => {
    const path = doc.path.replace(/\.md$/, '').replace(/^[#/]+/, '');
    const parts = path.split('/');
    if (parts[0] === 'docs' && parts[1] === 'products' && parts[2]) {
      const productKey = parts[2];
      if (!products.has(productKey)) products.set(productKey, []);
      products.get(productKey).push({ ...doc, cleanPath: path });
      return;
    }

    const groupName = parts.length > 2 ? parts[1].replace(/[-_]/g, ' ') : 'General';
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push({ ...doc, cleanPath: path });
  });

  const createNavLink = (item) => {
    const a = document.createElement('a');
    a.href = `#${item.cleanPath}`;
    a.className = 'nav-link';
    a.textContent = item.title;
    a.setAttribute('data-path', item.cleanPath);

    a.addEventListener('click', (e) => {
      e.preventDefault();
      updateDocumentLocation(item.cleanPath);
      loadPage(item.cleanPath);
      closeMenu();
    });

    return a;
  };

  for (const [groupName, items] of Object.entries(groups)) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'nav-group';

    const header = document.createElement('h4');
    header.textContent = groupName;
    groupDiv.appendChild(header);

    items.forEach((item) => groupDiv.appendChild(createNavLink(item)));

    navLinks.appendChild(groupDiv);
  }

  for (const [productKey, items] of products) {
    const rootDoc = items.find((item) => item.cleanPath === `docs/products/${productKey}/index`);
    const productGroup = document.createElement('div');
    productGroup.className = 'nav-product';

    if (rootDoc) {
      const rootLink = createNavLink(rootDoc);
      rootLink.classList.add('nav-product-title');
      productGroup.appendChild(rootLink);
    } else {
      const heading = document.createElement('h4');
      heading.className = 'nav-product-title';
      heading.textContent = productKey.replace(/[-_]/g, ' ');
      productGroup.appendChild(heading);
    }

    const productLinks = document.createElement('div');
    productLinks.className = 'nav-product-links';
    items
      .filter((item) => item !== rootDoc)
      .forEach((item) => productLinks.appendChild(createNavLink(item)));
    productGroup.appendChild(productLinks);
    navLinks.appendChild(productGroup);
  }
}

// ==========================================
// 7. FULL-TEXT SEARCH SETUP (MINISEARCH)
// ==========================================
async function buildSearchIndex(docs) {
  if (typeof MiniSearch === 'undefined') return;

  miniSearchInstance = new MiniSearch({
    fields: ['title', 'content'],
    storeFields: ['title', 'path']
  });

  const indexed = await Promise.all(
    docs.map(async (doc, idx) => {
      const cleanPath = doc.path.replace(/\.md$/, '');
      const filePath = `${cleanPath}.md`;
      try {
        const text = await fetchDocumentText(filePath);
        return { id: String(idx + 1), title: doc.title, path: cleanPath, content: text };
      } catch (err) {
        console.error(`Could not index document: ${filePath}`, err);
        return { id: String(idx + 1), title: doc.title, path: cleanPath, content: '' };
      }
    })
  );

  miniSearchInstance.addAll(indexed);
}

searchInput?.addEventListener('input', (e) => {
  const query = e.target.value.trim();
  if (!miniSearchInstance || query.length < 2) {
    if (searchResults) searchResults.style.display = 'none';
    return;
  }

  const results = miniSearchInstance.search(query, { prefix: true, boost: { title: 2 } });
  if (results.length === 0) {
    searchResults.innerHTML = '<div class="search-item">No matches</div>';
    searchResults.style.display = 'block';
    return;
  }

  searchResults.innerHTML = results
    .slice(0, 5)
    .map((r) => `<div class="search-item" data-path="${r.path}"><strong>${r.title}</strong></div>`)
    .join('');
  searchResults.style.display = 'block';
});

searchResults?.addEventListener('click', (e) => {
  const item = e.target.closest('.search-item');
  if (item && item.dataset.path) {
    const cleanSlug = item.dataset.path.replace(/\.md$/, '').replace(/^[#/]+/, '');
    updateDocumentLocation(cleanSlug);
    loadPage(cleanSlug);
    searchResults.style.display = 'none';
    searchInput.value = '';
    closeMenu();
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-box')) {
    if (searchResults) searchResults.style.display = 'none';
  }
});

// ==========================================
// 8. STRUCTURED URL ROUTER (DOMAIN + PATH)
// ==========================================
function matchUrlToDoc(rawUrl, config) {
  if (!config || !config.domains) return null;

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return null;
  }

  const hostname = parsedUrl.hostname.replace(/^www\./, '').toLowerCase();
  const currentPath = parsedUrl.pathname.replace(/\/+$/, '').toLowerCase();

  let domainEntry = null;
  for (const domainKey in config.domains) {
    const cleanKey = domainKey.replace(/^www\./, '').toLowerCase();
    if (hostname === cleanKey || hostname.endsWith(`.${cleanKey}`)) {
      domainEntry = config.domains[domainKey];
      break;
    }
  }

  if (!domainEntry) return null;

  // Match discrete segments: most specific path wins
  if (Array.isArray(domainEntry.routes) && domainEntry.routes.length > 0) {
    let bestMatch = null;
    let maxMatchedSegments = -1;
    const targetSegments = currentPath.split('/').filter(Boolean);

    for (const route of domainEntry.routes) {
      const routePath = route.path.replace(/\/+$/, '').toLowerCase();
      const routeSegments = routePath.split('/').filter(Boolean);

      const isMatch = routeSegments.every((seg, idx) => targetSegments[idx] === seg);

      if (isMatch && routeSegments.length > maxMatchedSegments) {
        maxMatchedSegments = routeSegments.length;
        bestMatch = route.doc.replace(/\.md$/, '');
      }
    }

    if (bestMatch) {
      return { doc: bestMatch, source: `${hostname}${currentPath}` };
    }
  }

  if (domainEntry.default) {
    return { doc: domainEntry.default.replace(/\.md$/, ''), source: hostname };
  }

  return null;
}

// ==========================================
// 9. ACTIVE TAB SYNCHRONIZATION (CHROME + EDGE)
// ==========================================
async function evaluateTabUrl(tab) {
  if (!tab || !tab.url) return;

  const url = tab.url;
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return;
  }

  if (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('devtools://') ||
    url.startsWith('about:')
  ) {
    return;
  }

  // Keep the extension panel aligned when the active tab is this static knowledge base.
  const pageDoc = (parsedUrl.searchParams.get('doc') || parsedUrl.hash.slice(1))
    .replace(/^[#/]+/, '')
    .replace(/\/+$/, '')
    .replace(/\.md$/, '');
  const matchingDoc = discoveredDocs.find(
    (doc) => doc.path.replace(/\.md$/, '').replace(/^[#/]+/, '') === pageDoc
  );
  if (matchingDoc) {
    loadPage(matchingDoc.path);
    return;
  }

  // 1. Structured domain & path routing
  const match = matchUrlToDoc(url, domainConfig);
  if (match) {
    loadPage(match.doc, `Routed from: <strong>${match.source}</strong>`);
    return;
  }

  // 2. Keyword fallback matching
  const lowerUrl = url.toLowerCase();
  for (const doc of discoveredDocs) {
    const slug = doc.title.toLowerCase();
    if (lowerUrl.includes(slug)) {
      loadPage(doc.path, `Matched keyword: <strong>${doc.title}</strong>`);
      return;
    }
  }

  if (tabBanner) tabBanner.style.display = 'none';
}

async function syncWithActiveTab() {
  if (typeof chrome === 'undefined' || !chrome.tabs) return;

  try {
    const tabs = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
      windowType: 'normal'
    });

    let targetTab = tabs && tabs[0];

    if (!targetTab || !targetTab.url) {
      const normalTabs = await chrome.tabs.query({
        active: true,
        windowType: 'normal'
      });
      targetTab = normalTabs.find(
        (t) =>
          t.url &&
          !t.url.startsWith('chrome-extension://') &&
          !t.url.startsWith('chrome://') &&
          !t.url.startsWith('edge://')
      );
    }

    if (targetTab) {
      await evaluateTabUrl(targetTab);
    }
  } catch (err) {
    console.warn('URL sync error:', err);
  }
}

// Real-time tab listeners
if (typeof chrome !== 'undefined' && chrome.tabs) {
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      evaluateTabUrl(tab);
    } catch {
      syncWithActiveTab();
    }
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab && tab.active) {
      evaluateTabUrl(tab);
    }
  });
}

// Hash change router (browser back/forward navigation)
window.addEventListener('hashchange', () => {
  const docPath = getDocumentFromLocation();
  if (docPath) {
    loadPage(docPath);
  }
});

window.addEventListener('popstate', () => {
  const docPath = getDocumentFromLocation();
  if (docPath) {
    loadPage(docPath);
  }
});

// ==========================================
// 10. INITIALIZATION
// ==========================================
async function init() {
  updateOpenWebsiteLink();
  const documentationIndex = await fetchDocumentationIndex();
  discoveredDocs = documentationIndex.documents || [];
  domainConfig = { domains: documentationIndex.domains || {} };

  if (discoveredDocs.length === 0) {
    contentElement.innerHTML = `
      <h2>No Notes Found</h2>
      <p>Ensure <code>manifest-docs.json</code> is located in the extension root.</p>
    `;
    return;
  }

  renderNavigation(discoveredDocs);
  await buildSearchIndex(discoveredDocs);

  // Sync tab context on initial load
  await syncWithActiveTab();

  // If no contextual match was triggered, render the first doc
  if (!currentActiveDoc && discoveredDocs.length > 0) {
    const hashPath = getDocumentFromLocation();
    const defaultDoc = discoveredDocs[0].path.replace(/\.md$/, '');
    loadPage(hashPath || defaultDoc);
  }
}

window.addEventListener('DOMContentLoaded', init);