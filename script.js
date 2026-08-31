const PHONE = "917666767484";
const SHEET_ID = "1Nk2EYh-vV5psAIMAXXmqzhGmGDD3RHwVCUb5yg_muaw";
// Read from the filter-independent mirror tab. The editable Products tab can
// be filtered or sorted without hiding catalogue rows from website visitors.
const SHEET_NAME = "Website Data";
const SHEET_QUERY_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(SHEET_NAME)}`;
// Paste the deployed Google Apps Script /exec URL here after the one-time setup.
const REVIEWS_API_URL = "https://script.google.com/macros/s/AKfycbx_cxkT1_COjXje_neUav6nzp_el75DPcDkDGLq5uCdrgilxM6snoWbYBZivPu36Y1sNw/exec";

let products = [];
let categories = ["All"];
let activeCategory = "All";
let searchTerm = "";
let sortMode = "latest";
let currentPage = 1;
let showAllProducts = false;
const PRODUCTS_PER_PAGE = 10;
// Curated order for the initial public collection. Products added after this
// launch (IDs above 043) still appear automatically at the top, newest first.
const CURATED_LAUNCH_ORDER = [
  "036", "039", "001", "043", "015", "029", "004", "038", "027",
  "034", "032", "014", "021", "009", "007", "008", "003", "041"
];
const CURATED_LAUNCH_POSITION = new Map(
  CURATED_LAUNCH_ORDER.map((id, index) => [id, index])
);
const CURATED_LAUNCH_LAST_ID = 43;
const CATEGORY_PRIORITY = [
  "Home Decor",
  "Bags & Pouches",
  "Bouquets and Flowers",
  "Kids Decor",
  "Keychains",
  "Home Organizers"
];
const filters = document.getElementById("filters");
const grid = document.getElementById("productGrid");
const pagination = document.getElementById("productPagination");
const productSearch = document.getElementById("productSearch");
const productSort = document.getElementById("productSort");
const productViewToggle = document.getElementById("productViewToggle");
const collectionSection = document.getElementById("collection");
const heroImages = [...document.querySelectorAll(".hero-shot img")];
const heroCollage = document.querySelector?.(".hero-collage");
let heroInitialized = false;

// Only these products may appear in the three-image homepage collage.
// Each product's primary image is the first image URL from the product sheet.
const HERO_PRODUCT_IDS = new Set([
  "001", "002", "003", "004", "007", "008", "009", "010", "011", "014", "015",
  "024", "025", "026", "027", "028", "029", "032", "033", "034", "036"
]);
const HERO_CACHE_KEY = "sjaHeroProductsV2";
const HERO_HISTORY_KEY = "sjaHeroProductIdsV2";

// Keep the shop usable when Google Sheets is private, temporarily unavailable,
// or blocked by a visitor's network. Sheet data replaces this list when the
// public CSV endpoint is available.
const LOCAL_PRODUCTS = [
  { id: "001", name: "Set of Owls", category: "Home Decor", price: "₹700", description: "2 cute Handmade crochet owl set", detailedDescription: "A charming pair of hand-crocheted owls in lilac and earthy brown, finished with oversized eyes, tiny beaks and beautiful floral-style stitching on their bellies. Full of character and handmade warmth, they make a cheerful accent for a shelf, desk or cosy corner and a thoughtful gift for bird lovers.", image: "images/001-owl-set/001-owl-set-1.jpg", images: ["images/001-owl-set/001-owl-set-1.jpg", "images/001-owl-set/001-owl-set-2.jpg", "images/001-owl-set/001-owl-set-3.jpg", "images/001-owl-set/001-owl-set-4.jpeg"] },
  { id: "002", name: "Crochet Panda", category: "Kids Decor", price: "₹450", description: "Handmade crochet panda soft toy", detailedDescription: "A lovable hand-crocheted panda in classic cream and black, with rounded ears, expressive eye patches and a neatly stitched little face. Its soft, plump shape and outstretched arms give it an irresistibly friendly personality, making it a delightful display companion or handmade gift.", image: "images/002-crochet-panda/002-crochet-panda-1.jpg", images: ["images/002-crochet-panda/002-crochet-panda-1.jpg", "images/002-crochet-panda/002-crochet-panda-2.jpg", "images/002-crochet-panda/002-crochet-panda-3.jpg", "images/002-crochet-panda/002-crochet-panda-4.jpg", "images/002-crochet-panda/002-crochet-panda-5.jpg", "images/002-crochet-panda/002-crochet-panda-6.jpeg"] },
  { id: "003", name: "Cute Elephant Soft Toy", category: "Kids Decor", price: "₹500", description: "Handmade crochet elephant soft toy", detailedDescription: "A cheerful hand-crocheted elephant in soft blue, brought to life with deep-blue floppy ears, a gently curved trunk, rosy cheeks and a bright red bow. The carefully shaped details and seated pose make it an adorable keepsake, nursery accent or gift for anyone who loves whimsical animals.", socialUrl: "https://www.instagram.com/smritijainarts/reel/DaKVSewNxYB/", image: "images/003-elephant-soft-toy/003-elephant-soft-toy-1.jpg", images: ["images/003-elephant-soft-toy/003-elephant-soft-toy-1.jpg", "images/003-elephant-soft-toy/003-elephant-soft-toy-2.jpg", "images/003-elephant-soft-toy/003-elephant-soft-toy-3.jpg", "images/003-elephant-soft-toy/003-elephant-soft-toy-4.jpg", "images/003-elephant-soft-toy/003-elephant-soft-toy-5.jpeg"] },
  { id: "004", name: "Monster Keychain Holder", category: "Keychains", price: "₹500", description: "Crochet monster-style keychain holder", detailedDescription: "A playful navy-blue crochet key holder designed like a quirky little monster, complete with wide eyes, bright red lips, a yellow top detail and a heart-tipped drawstring. The pouch-style design helps tuck keys neatly inside while adding a fun handmade character to a handbag or everyday key set.", image: "images/004-monster-key-holder/004-monster-key-holder-1.jpeg", images: ["images/004-monster-key-holder/004-monster-key-holder-1.jpeg", "images/004-monster-key-holder/004-monster-key-holder-2.jpg", "images/004-monster-key-holder/004-monster-key-holder-3.jpg", "images/004-monster-key-holder/004-monster-key-holder-4.jpg"] },
  { id: "006", name: "Crochet Curtain Ties", category: "Home Decor", price: "₹1,000", description: "Decorative handmade crochet curtain tie set", detailedDescription: "A decorative pair of hand-crocheted curtain tiebacks in a warm natural beige, each accented with a layered pink flower and long tasselled cords. Their textured stitches and soft handcrafted finish add a graceful boho touch while holding curtains neatly to the side.", image: "images/006-curtain-ties/006-curtain-ties-1.jpeg" },
  { id: "007", name: "Softy Ice Cream Keychain", category: "Keychains", price: "₹400", description: "Cute handmade crochet ice cream keychain", detailedDescription: "A cheerful hand-crocheted soft-serve ice cream keychain featuring a textured cone, chocolate-coloured band, smiling cream centre, pink swirl and a playful red topping. Its sweet expression and compact design add a fun handmade touch to keys, handbags or backpacks.", image: "images/007-ice-cream-keychain/007-ice-cream-keychain-1.jpeg", images: ["images/007-ice-cream-keychain/007-ice-cream-keychain-1.jpeg", "images/007-ice-cream-keychain/007-ice-cream-keychain-2.jpg", "images/007-ice-cream-keychain/007-ice-cream-keychain-3.jpg", "images/007-ice-cream-keychain/007-ice-cream-keychain-4.jpg", "images/007-ice-cream-keychain/007-ice-cream-keychain-5.jpg"] },
  { id: "008", name: "Crochet Flower Bouquet", category: "Bouquets and Flowers, Home Decor", price: "₹400", description: "Handmade crochet flower bouquet", detailedDescription: "A bright, everlasting-style bouquet featuring hand-crocheted flowers in soft pink, lilac and sunny yellow, arranged with leafy green stems and delicate filler foliage. Presented in a heart-patterned wrap, it brings lasting colour to a desk or room and makes a lovely handmade gift for celebrations and special moments.", socialUrl: "https://www.instagram.com/smritijainarts/reel/DazpCISNw92/", image: "images/008-flower-bouquet/008-flower-bouquet-1.jpeg" },
  { id: "009", name: "Crochet Cactus Plants Set", category: "Home Decor", price: "₹1,400", description: "Set of handmade crochet cactus plants", detailedDescription: "A delightful set of three hand-crocheted cactus plants, each with its own shape, stitched spines and colourful flower detail. Arranged in coordinating cream pots, this cheerful low-maintenance décor set adds handcrafted greenery to desks, shelves and cosy corners without the need for watering.", socialUrl: "https://www.instagram.com/smritijainarts/reel/DbgAH5OtSdA/", image: "images/009-cactus-set/009-cactus-set-1.jpeg" }
];

function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else {
      if (ch === '"') quoted = true;
      else if (ch === ',') { row.push(cell); cell = ""; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (ch !== '\r') cell += ch;
    }
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function cleanPrice(value) {
  const s = String(value || "").trim();
  if (!s) return "Price on request";
  if (s.includes("₹")) return s;
  const n = Number(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? `₹${n.toLocaleString("en-IN")}` : s;
}

function splitImages(value) {
  return String(value || "").split(/[\n|;]/).map(url => url.trim()).filter(Boolean);
}

function splitCategories(value) {
  return [...new Set(String(value || "Handmade").split(/[,;|]/).map(category => category.trim()).filter(Boolean))];
}

function productHasCategory(product, category) {
  return category === "All" || splitCategories(product.category).includes(category);
}

function orderCategories(values) {
  const uniqueCategories = [...new Set(values.filter(Boolean))];
  return [
    "All",
    ...CATEGORY_PRIORITY.filter(category => uniqueCategories.includes(category)),
    ...uniqueCategories.filter(category => !CATEGORY_PRIORITY.includes(category)).sort((a, b) => a.localeCompare(b))
  ];
}

function getImages(product) {
  return [...new Set([...(product.images || []), product.image].filter(Boolean))];
}

function getThumbnailUrl(product) {
  const primaryImage = String(product?.image || "images/logo.png");
  const localFolder = primaryImage.match(/^images\/([^/]+)\//i);
  return localFolder ? `images/${localFolder[1]}/thumbnail.webp` : primaryImage;
}

function getWatermarkedUrl(url) {
  const imageUrl = String(url || "images/logo.png");
  const localImage = imageUrl.match(/^images\/([^/]+)\/([^/]+)\.(?:jpe?g|png|webp)$/i);
  return localImage
    ? `images/${localImage[1]}/watermarked/${localImage[2]}.webp`
    : imageUrl;
}

function setImageWithFallback(imageElement, source, fallback) {
  imageElement.onerror = () => {
    imageElement.onerror = null;
    imageElement.src = fallback || "images/logo.png";
  };
  imageElement.src = source;
}

function chooseHeroProducts(sourceProducts, previousIds = [], count = 3) {
  const candidates = sourceProducts.filter(product =>
    HERO_PRODUCT_IDS.has(String(product?.id || "").padStart(3, "0")) &&
    product?.image &&
    product.image !== "images/logo.png"
  );
  const freshCandidates = candidates.filter(product => !previousIds.includes(String(product.id)));
  const pool = freshCandidates.length >= count ? freshCandidates : candidates;
  const shuffled = [...pool];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function updateHeroImages(sourceProducts = products) {
  if (!heroImages.length) return;
  let previousIds = [];
  try {
    previousIds = JSON.parse(globalThis.sessionStorage?.getItem(HERO_HISTORY_KEY) || "[]");
  } catch {
    previousIds = [];
  }
  const selected = chooseHeroProducts(sourceProducts, previousIds, heroImages.length);
  selected.forEach((product, index) => {
    setImageWithFallback(heroImages[index], getThumbnailUrl(product), product.image);
    heroImages[index].alt = product.name;
  });
  try {
    globalThis.sessionStorage?.setItem(HERO_HISTORY_KEY, JSON.stringify(selected.map(product => String(product.id))));
  } catch {
    // The rotating hero still works when storage is unavailable.
  }
  heroInitialized = selected.length > 0;
  heroCollage?.classList.add("is-ready");
  heroCollage?.style.removeProperty("opacity");
  heroCollage?.removeAttribute("aria-busy");
}

function readCachedHeroProducts() {
  try {
    const cached = JSON.parse(globalThis.localStorage?.getItem(HERO_CACHE_KEY) || "[]");
    return Array.isArray(cached) ? cached.filter(product => product?.id && product?.image) : [];
  } catch {
    return [];
  }
}

function cacheHeroProducts(sourceProducts) {
  try {
    const compactProducts = sourceProducts.map(({ id, name, image }) => ({ id, name, image }));
    globalThis.localStorage?.setItem(HERO_CACHE_KEY, JSON.stringify(compactProducts));
  } catch {
    // The local fallback still prevents static-image flashing when storage is unavailable.
  }
}

const cachedHeroProducts = readCachedHeroProducts();
updateHeroImages(cachedHeroProducts.length >= heroImages.length ? cachedHeroProducts : LOCAL_PRODUCTS);

// Google does not allow a normal cross-origin fetch to its Sheet CSV endpoint.
// The Visualization endpoint supports JSONP, which works from both file://
// previews and normally hosted static websites without exposing edit access.
function loadSheetRows() {
  return new Promise((resolve, reject) => {
    const callbackName = `sjaSheetCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const cleanup = () => {
      clearTimeout(timer);
      script.remove();
      delete window[callbackName];
    };

    window[callbackName] = payload => {
      try {
        if (payload?.status === "error" || !payload?.table) {
          throw new Error("Google Sheet returned an invalid response");
        }
        const headers = payload.table.cols.map(column => column.label || column.id || "");
        const dataRows = payload.table.rows.map(row => payload.table.cols.map((_, index) => {
          const cell = row.c?.[index];
          if (!cell) return "";
          if (cell.f != null) return String(cell.f);
          return cell.v == null ? "" : String(cell.v);
        }));
        cleanup();
        resolve([headers, ...dataRows]);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Google Sheet request timed out"));
    }, 10000);
    script.onerror = () => {
      cleanup();
      reject(new Error("Google Sheet could not be loaded"));
    };
    script.src = `${SHEET_QUERY_URL}&tqx=out:json;responseHandler:${callbackName}&_=${Date.now()}`;
    document.head.appendChild(script);
  });
}

function waLink(p) {
  const price = p.price === "Price on request" ? "price on request" : p.price;
  const msg = `Hi Smriti Jain! I'm interested in "${p.name}" (${price}). Is it available?`;
  return `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;
}

function getProductStatus(product) {
  const sheetStatus = String(product.status || "").trim();
  return sheetStatus.toLowerCase() === "sold out" ? "Sold Out" : "";
}

const SEARCH_SYNONYM_GROUPS = [
  ["bag", "bags", "sling", "slings", "purse", "purses", "pouch", "pouches", "handbag", "handbags"],
  ["keychain", "keychains", "keyring", "keyrings", "keyholder", "keyholders"],
  ["toy", "toys", "softtoy", "softtoys", "softie", "softies", "softy", "plush", "plushie", "plushies"],
  ["dreamcatcher", "dreamcatchers", "wallhanging", "wallhangings"],
  ["coaster", "coasters", "tablemat", "tablemats"],
  ["bouquet", "bouquets", "flowerarrangement", "flowerarrangements", "floralarrangement", "floralarrangements"],
  ["pooja", "puja", "prayer", "worship"],
  ["decor", "decoration", "decorations", "decorative", "homedecor"],
  ["kid", "kids", "child", "children"]
];

function normalizeSearchText(value) {
  return String(value || "")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function searchAlternatives(token) {
  const compactToken = token.replace(/\s+/g, "");
  return SEARCH_SYNONYM_GROUPS.find(group => group.includes(compactToken)) || [compactToken];
}

function productMatchesSearch(product, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const searchableText = normalizeSearchText([
    product.name,
    product.category,
    product.description,
    product.detailedDescription
  ].join(" "));
  const compactText = searchableText.replace(/\s+/g, "");
  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  const queryParts = SEARCH_SYNONYM_GROUPS.some(group => group.includes(compactQuery))
    ? [compactQuery]
    : normalizedQuery.split(/\s+/);
  return queryParts.every(token =>
    searchAlternatives(token).some(alternative => compactText.includes(alternative))
  );
}

function clearProductSearch(resetCategory = true, resetSorting = true) {
  searchTerm = "";
  currentPage = 1;
  productSearch.value = "";
  if (resetSorting) {
    sortMode = "latest";
    productSort.value = "latest";
  }
  if (resetCategory) {
    renderFilters("All");
    renderProducts("All");
  }
}

function renderFilters(active = "All") {
  activeCategory = active;
  filters.innerHTML = categories.map(c => `<button class="filter ${c === active ? "active" : ""}" data-cat="${c}">${c}</button>`).join("");
  filters.querySelectorAll(".filter").forEach(btn => btn.addEventListener("click", () => {
    clearProductSearch(false, false);
    currentPage = 1;
    renderFilters(btn.dataset.cat);
    renderProducts(btn.dataset.cat);
  }));
}

function paginateProducts(list, requestedPage = 1, pageSize = PRODUCTS_PER_PAGE) {
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;
  return { items: list.slice(start, start + pageSize), page, totalPages };
}

function sortProductsLatestFirst(list) {
  return [...list].sort((a, b) => {
    const aId = Number.parseInt(String(a.id || "").replace(/\D/g, ""), 10);
    const bId = Number.parseInt(String(b.id || "").replace(/\D/g, ""), 10);

    // Keep future additions automatic, but honour the owner's chosen order for
    // the first public collection before showing other older products.
    const aIsFuture = Number.isFinite(aId) && aId > CURATED_LAUNCH_LAST_ID;
    const bIsFuture = Number.isFinite(bId) && bId > CURATED_LAUNCH_LAST_ID;
    if (aIsFuture !== bIsFuture) return aIsFuture ? -1 : 1;

    const aPosition = CURATED_LAUNCH_POSITION.get(String(a.id || "").padStart(3, "0"));
    const bPosition = CURATED_LAUNCH_POSITION.get(String(b.id || "").padStart(3, "0"));
    const aIsCurated = aPosition !== undefined;
    const bIsCurated = bPosition !== undefined;
    if (aIsCurated !== bIsCurated) return aIsCurated ? -1 : 1;
    if (aIsCurated && bIsCurated) return aPosition - bPosition;

    if (Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) return bId - aId;
    return String(b.id || "").localeCompare(String(a.id || ""), undefined, { numeric: true });
  });
}

function getNumericPrice(product) {
  const value = Number(String(product.price || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function sortProducts(list, mode = "latest") {
  if (mode === "name") return [...list].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  if (mode === "price-low" || mode === "price-high") {
    return [...list].sort((a, b) => {
      const aPrice = getNumericPrice(a);
      const bPrice = getNumericPrice(b);
      if (aPrice === null && bPrice === null) return 0;
      if (aPrice === null) return 1;
      if (bPrice === null) return -1;
      return mode === "price-low" ? aPrice - bPrice : bPrice - aPrice;
    });
  }
  return sortProductsLatestFirst(list);
}

function renderPagination(totalItems, totalPages) {
  if (totalPages <= 1 && !showAllProducts) {
    pagination.hidden = true;
    pagination.innerHTML = "";
    return;
  }
  if (showAllProducts) {
    pagination.hidden = false;
    pagination.innerHTML = `
      <div class="pagination-summary">Showing all ${totalItems} products</div>
      <div class="pagination-controls">
        <button type="button" class="pagination-view-toggle" data-view="paged">Show ${PRODUCTS_PER_PAGE} per page</button>
      </div>`;
    pagination.querySelector("button[data-view='paged']")?.addEventListener("click", () => {
      showAllProducts = false;
      currentPage = 1;
      renderProducts(activeCategory);
      grid.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return;
  }
  const visiblePages = [];
  for (let page = 1; page <= totalPages; page++) {
    if (page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1) visiblePages.push(page);
  }
  let lastPage = 0;
  const pageButtons = visiblePages.map(page => {
    const separator = page - lastPage > 1 ? `<span class="pagination-gap" aria-hidden="true">…</span>` : "";
    lastPage = page;
    return `${separator}<button type="button" class="pagination-page ${page === currentPage ? "active" : ""}" data-page="${page}" ${page === currentPage ? 'aria-current="page"' : ""}>${page}</button>`;
  }).join("");
  pagination.hidden = false;
  pagination.innerHTML = `
    <div class="pagination-summary">Page ${currentPage} of ${totalPages} · ${totalItems} products</div>
    <div class="pagination-controls">
      <button type="button" class="pagination-nav" data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""} aria-label="Previous product page">← <span>Previous</span></button>
      ${pageButtons}
      <button type="button" class="pagination-nav" data-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""} aria-label="Next product page"><span>Next</span> →</button>
      <button type="button" class="pagination-view-toggle" data-view="all">View all ${totalItems}</button>
    </div>`;
  pagination.querySelectorAll("button[data-page]").forEach(button => button.addEventListener("click", () => {
    const nextPage = Number(button.dataset.page);
    if (!Number.isInteger(nextPage) || nextPage === currentPage || nextPage < 1 || nextPage > totalPages) return;
    currentPage = nextPage;
    renderProducts(activeCategory);
    grid.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  pagination.querySelector("button[data-view='all']")?.addEventListener("click", () => {
    showAllProducts = true;
    currentPage = 1;
    renderProducts(activeCategory);
    grid.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderProducts(cat = "All") {
  activeCategory = cat;
  const query = searchTerm.trim();
  const sortedProducts = sortProducts(products, sortMode);
  const categoryProducts = sortedProducts.filter(p => productHasCategory(p, cat));
  const list = query ? categoryProducts.filter(p => productMatchesSearch(p, query)) : categoryProducts;
  if (!list.length) {
    grid.innerHTML = `<p class="catalog-message">${query ? "No products match your search." : "No products are currently available in this category."}</p>`;
    pagination.hidden = true;
    pagination.innerHTML = "";
    productViewToggle.hidden = true;
    return;
  }
  const paged = paginateProducts(list, currentPage);
  currentPage = paged.page;
  productViewToggle.hidden = paged.totalPages <= 1 && !showAllProducts;
  productViewToggle.textContent = showAllProducts ? `Show ${PRODUCTS_PER_PAGE} per page` : `View all ${list.length} products`;
  productViewToggle.setAttribute("aria-pressed", String(showAllProducts));
  const visibleProducts = showAllProducts ? list : paged.items;
  grid.innerHTML = visibleProducts.map(p => {
    const productIndex = products.indexOf(p);
    const primaryImage = p.image || "images/logo.png";
    return `
    <article class="product" data-index="${productIndex}" tabindex="0" aria-label="View details for ${p.name}">
      <div class="product-image"><img src="${getThumbnailUrl(p)}" data-fallback="${primaryImage}" alt="${p.name}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=this.dataset.fallback||'images/logo.png'"></div>
      <div class="product-info">
        <div class="cat">${p.category || "Handmade"}</div>
        <h3>${p.name}</h3>
        <div class="price">${p.price}</div>
        <span class="product-hint">View photos &amp; details →</span>
      </div>
    </article>`;
  }).join("");
  renderPagination(list.length, paged.totalPages);
}

async function loadProducts() {
  grid.innerHTML = `<p class="catalog-message">Loading handmade collection…</p>`;
  try {
    const rows = await loadSheetRows();
    if (rows.length < 2) throw new Error("No product rows found");
    const headers = rows[0].map(h => h.trim().toLowerCase());
    const ix = name => headers.indexOf(name.toLowerCase());
    const field = (row, names) => {
      for (const name of names) {
        const index = ix(name);
        if (index >= 0 && row[index]) return row[index];
      }
      return "";
    };
    const numberedImageColumns = headers.map((header, index) => {
      const match = header.match(/^image\s+(\d+)\s+url$/);
      return match ? { index, number: Number(match[1]) } : null;
    }).filter(Boolean).sort((a, b) => a.number - b.number);
    products = rows.slice(1).filter(r => r.some(v => String(v).trim())).map(r => {
      const numberedImages = numberedImageColumns.flatMap(column => splitImages(r[column.index]));
      const primaryImage = numberedImages[0] || field(r, ["image url", "primary image url"]);
      const galleryImages = [
        ...numberedImages,
        ...splitImages(field(r, ["additional image urls", "image urls", "gallery images"]))
      ];
      const available = (r[ix("available")] || "Yes").trim().toLowerCase();
      return {
        id: r[ix("id")] || "",
        name: r[ix("product name")] || "Untitled product",
        category: r[ix("category")] || "Handmade",
        price: cleanPrice(r[ix("price")]),
        description: r[ix("description")] || "",
        detailedDescription: field(r, ["detailed description", "product details", "full description"]) || r[ix("description")] || "",
        socialUrl: field(r, ["social post url", "instagram post url", "instagram url", "instagram link", "facebook post url", "facebook url", "facebook link"]),
        image: primaryImage || galleryImages[0] || "images/logo.png",
        images: galleryImages,
        available,
        status: field(r, ["product status", "status"]) || (available === "no" ? "Sold Out" : ""),
        featured: (r[ix("featured")] || "No").trim().toLowerCase()
      };
    });
    categories = orderCategories(products.flatMap(p => splitCategories(p.category)));
    currentPage = 1;
    cacheHeroProducts(products);
    if (!heroInitialized) updateHeroImages(products);
    renderFilters();
    renderProducts();
    populateReviewProducts();
  } catch {
    products = LOCAL_PRODUCTS;
    categories = orderCategories(products.flatMap(p => splitCategories(p.category)));
    currentPage = 1;
    if (!heroInitialized) updateHeroImages(products);
    renderFilters();
    renderProducts();
    populateReviewProducts();
  }
}

loadProducts();

productSearch.addEventListener("input", () => {
  searchTerm = productSearch.value;
  currentPage = 1;
  renderProducts(activeCategory);
  if (searchTerm.trim()) {
    const resultsBounds = grid.getBoundingClientRect();
    const headerOffset = window.innerWidth <= 640 ? 122 : 76;
    const resultsAreVisible = resultsBounds.top < window.innerHeight * .7 && resultsBounds.bottom > headerOffset;
    if (!resultsAreVisible) {
      grid.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
});

productSort.addEventListener("change", () => {
  sortMode = productSort.value;
  currentPage = 1;
  renderProducts(activeCategory);
});

productViewToggle.addEventListener("click", () => {
  showAllProducts = !showAllProducts;
  currentPage = 1;
  renderProducts(activeCategory);
  grid.scrollIntoView({ behavior: "smooth", block: "start" });
});

const productDialog = document.getElementById("productDialog");
const dialogClose = document.getElementById("dialogClose");
const dialogImage = document.getElementById("dialogImage");
const dialogThumbs = document.getElementById("dialogThumbs");
const dialogCategory = document.getElementById("dialogCategory");
const dialogProductName = document.getElementById("dialogProductName");
const dialogPrice = document.getElementById("dialogPrice");
const dialogStatus = document.getElementById("dialogStatus");
const dialogSoldOutNote = document.getElementById("dialogSoldOutNote");
const dialogDescription = document.getElementById("dialogDescription");
const dialogOrder = document.getElementById("dialogOrder");
const dialogSocial = document.getElementById("dialogSocial");
const dialogZoom = document.getElementById("dialogZoom");
let pageScrollBeforeDialog = 0;
let dialogTriggerElement = null;

function restorePageScrollInstantly(top) {
  const root = document.documentElement;
  const previousScrollBehavior = root?.style?.scrollBehavior || "";
  if (root?.style) root.style.scrollBehavior = "auto";
  globalThis.scrollTo?.(0, top);
  const restoreScrollBehavior = () => {
    if (root?.style) root.style.scrollBehavior = previousScrollBehavior;
  };
  if (typeof globalThis.requestAnimationFrame === "function") {
    globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(restoreScrollBehavior));
  } else {
    restoreScrollBehavior();
  }
}

function selectDialogImage(url, alt, button, fallback) {
  setImageWithFallback(dialogImage, url, fallback);
  dialogImage.alt = alt;
  dialogZoom.classList.remove("is-zoomed");
  dialogImage.style.transformOrigin = "50% 50%";
  dialogThumbs.querySelectorAll(".dialog-thumb").forEach(thumb => thumb.classList.remove("active"));
  if (button) button.classList.add("active");
}

function getSocialPlatform(url = "") {
  if (/(?:facebook\.com|fb\.watch)/i.test(url)) return "facebook";
  if (/instagram\.com/i.test(url)) return "instagram";
  return "social";
}

function openProduct(index, triggerElement = null) {
  const product = products[index];
  if (!product) return;
  pageScrollBeforeDialog = Number(globalThis.scrollY || 0);
  dialogTriggerElement = triggerElement;
  productDialog.scrollTop = 0;
  const images = getImages(product).map(original => ({
    url: getWatermarkedUrl(original),
    fallback: original
  }));
  dialogCategory.textContent = product.category || "Handmade";
  dialogProductName.textContent = product.name;
  dialogPrice.textContent = product.price;
  dialogStatus.textContent = getProductStatus(product);
  dialogStatus.hidden = !dialogStatus.textContent;
  dialogSoldOutNote.hidden = dialogStatus.textContent !== "Sold Out";
  dialogDescription.textContent = product.detailedDescription || product.description || "Contact us for materials, dimensions, custom colours and availability.";
  dialogOrder.href = waLink(product);
  const socialUrl = product.socialUrl || "";
  const socialPlatform = getSocialPlatform(socialUrl);
  dialogSocial.href = socialUrl || "#";
  dialogSocial.hidden = !socialUrl;
  dialogSocial.textContent = socialPlatform === "facebook"
    ? "View this product on Facebook ↗"
    : socialPlatform === "instagram"
      ? "View this product on Instagram ↗"
      : "View this product post ↗";
  dialogSocial.classList.remove("is-instagram", "is-facebook");
  if (socialUrl) dialogSocial.classList.add(`is-${socialPlatform}`);
  dialogThumbs.innerHTML = images.map((image, imageIndex) => `
    <button class="dialog-thumb ${imageIndex === 0 ? "active" : ""}" type="button" data-image="${imageIndex}" aria-label="View image ${imageIndex + 1} of ${images.length}">
      <img src="${image.url}" data-fallback="${image.fallback}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=this.dataset.fallback||'images/logo.png'">
    </button>`).join("");
  dialogThumbs.hidden = images.length <= 1;
  const thumbnailButtons = dialogThumbs.querySelectorAll(".dialog-thumb");
  const firstImage = images[0] || { url: "images/logo.png", fallback: "images/logo.png" };
  selectDialogImage(firstImage.url, product.name, thumbnailButtons[0], firstImage.fallback);
  thumbnailButtons.forEach(button => {
    button.addEventListener("click", () => {
      const image = images[Number(button.dataset.image)];
      selectDialogImage(image.url, product.name, button, image.fallback);
    });
  });
  productDialog.showModal();
  productDialog.scrollTop = 0;
  dialogClose.focus?.({ preventScroll: true });
}

grid.addEventListener("click", event => {
  const card = event.target.closest(".product");
  if (card) {
    openProduct(Number(card.dataset.index), card);
  }
});
grid.addEventListener("keydown", event => {
  if ((event.key === "Enter" || event.key === " ") && event.target.classList.contains("product")) {
    event.preventDefault();
    openProduct(Number(event.target.dataset.index), event.target);
  }
});
dialogClose.addEventListener("click", () => productDialog.close());
productDialog.addEventListener("click", event => {
  if (event.target === productDialog) productDialog.close();
});
// Open social posts separately so the current product dialog, collection page
// and scroll position remain untouched when the visitor returns.
dialogSocial.addEventListener("click", event => {
  const socialUrl = dialogSocial.href;
  if (!socialUrl || socialUrl === "#") return;
  event.preventDefault();
  globalThis.open(socialUrl, "_blank", "noopener,noreferrer");
});
productDialog.addEventListener("close", () => {
  productDialog.scrollTop = 0;
  dialogZoom.classList.remove("is-zoomed");
  dialogImage.style.transformOrigin = "50% 50%";
  const returnTop = pageScrollBeforeDialog;
  const trigger = dialogTriggerElement;
  dialogTriggerElement = null;
  // Let the dialog fully release its focus and scroll lock before returning to
  // the exact product card and its original collection-page position.
  const restoreReturnPosition = () => {
    restorePageScrollInstantly(returnTop);
    trigger?.focus?.({ preventScroll: true });
  };
  if (typeof globalThis.requestAnimationFrame === "function") {
    globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(restoreReturnPosition);
    });
  } else {
    setTimeout(restoreReturnPosition, 0);
  }
  // Chromium may apply its native dialog focus restoration just after the
  // close event. Repeat once after that pass so it cannot pull the page away.
  setTimeout(restoreReturnPosition, 80);
});
let zoomPointerType = "mouse";
let touchZoomStart = null;
let touchZoomMoved = false;
dialogZoom.addEventListener("pointerdown", event => {
  zoomPointerType = event.pointerType;
  if (event.pointerType === "touch") {
    touchZoomStart = { x: event.clientX, y: event.clientY };
    touchZoomMoved = false;
  }
});
dialogZoom.addEventListener("pointerenter", event => {
  if (event.pointerType !== "touch") dialogZoom.classList.add("is-zoomed");
});
dialogZoom.addEventListener("pointermove", event => {
  if (event.pointerType === "touch" && touchZoomStart) {
    const distance = Math.hypot(event.clientX - touchZoomStart.x, event.clientY - touchZoomStart.y);
    if (distance > 8) touchZoomMoved = true;
  }
  const rect = dialogZoom.getBoundingClientRect();
  const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
  const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
  dialogImage.style.transformOrigin = `${x}% ${y}%`;
});
dialogZoom.addEventListener("pointerleave", () => {
  if (zoomPointerType !== "touch") {
    dialogZoom.classList.remove("is-zoomed");
    dialogImage.style.transformOrigin = "50% 50%";
  }
});
dialogZoom.addEventListener("click", () => {
  if (zoomPointerType === "touch" && !touchZoomMoved) dialogZoom.classList.toggle("is-zoomed");
  touchZoomStart = null;
});

const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");
menuBtn.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", String(isOpen));
});
nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
  clearProductSearch();
  nav.classList.remove("open");
  menuBtn.setAttribute("aria-expanded", "false");
}));
document.querySelectorAll('a[href^="#"]:not(#nav a)').forEach(link => {
  link.addEventListener("click", () => clearProductSearch());
});

const reviewForm = document.getElementById("reviewForm");
const reviewProduct = document.getElementById("reviewProduct");
const reviewText = document.getElementById("reviewText");
const reviewCount = document.getElementById("reviewCount");
const reviewSubmit = document.getElementById("reviewSubmit");
const reviewMessage = document.getElementById("reviewMessage");
const reviewSlide = document.getElementById("reviewSlide");
const reviewControls = document.getElementById("reviewControls");
const reviewPrevious = document.getElementById("reviewPrevious");
const reviewNext = document.getElementById("reviewNext");
const reviewPosition = document.getElementById("reviewPosition");
const reviewShowcase = document.querySelector(".review-showcase");
let approvedReviews = [];
let reviewIndex = 0;
let reviewTimer = null;

function reviewsApiConfigured() {
  return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?|$)/.test(REVIEWS_API_URL);
}

function populateReviewProducts() {
  if (!reviewProduct) return;
  const previousValue = reviewProduct.value;
  const names = [...new Set(products.map(product => String(product.name || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  reviewProduct.replaceChildren(new Option("General review", ""));
  names.forEach(name => reviewProduct.add(new Option(name, name)));
  if (names.includes(previousValue)) reviewProduct.value = previousValue;
}

function formatReviewDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function renderReviewSlide() {
  const review = approvedReviews[reviewIndex];
  if (!review) return;
  reviewSlide.replaceChildren();
  reviewSlide.classList.remove("review-slide");
  void reviewSlide.offsetWidth;
  reviewSlide.classList.add("review-slide");

  const stars = document.createElement("div");
  const rating = Math.max(1, Math.min(5, Number(review.rating) || 5));
  stars.className = "review-stars";
  stars.textContent = `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
  stars.setAttribute("aria-label", `${rating} out of 5 stars`);

  const quote = document.createElement("blockquote");
  quote.textContent = review.review;

  const byline = document.createElement("p");
  byline.className = "review-byline";
  byline.append(document.createTextNode(`— ${review.name || "Customer"}`));
  const details = [review.product, formatReviewDate(review.date)].filter(Boolean).join(" · ");
  if (details) {
    const detail = document.createElement("span");
    detail.className = "review-product";
    detail.textContent = ` · ${details}`;
    byline.append(detail);
  }

  reviewSlide.append(stars, quote, byline);
  reviewPosition.textContent = `${reviewIndex + 1} / ${approvedReviews.length}`;
}

function showReview(offset) {
  if (!approvedReviews.length) return;
  reviewIndex = (reviewIndex + offset + approvedReviews.length) % approvedReviews.length;
  renderReviewSlide();
}

function stopReviewTimer() {
  if (reviewTimer) clearInterval(reviewTimer);
  reviewTimer = null;
}

function startReviewTimer() {
  stopReviewTimer();
  if (approvedReviews.length > 1 && !globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    reviewTimer = setInterval(() => showReview(1), 4000);
  }
}

async function loadApprovedReviews() {
  if (!reviewsApiConfigured()) return;
  try {
    const response = await fetch(`${REVIEWS_API_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Review service unavailable");
    const data = await response.json();
    approvedReviews = Array.isArray(data.reviews) ? data.reviews.filter(review => review?.review) : [];
    if (!approvedReviews.length) return;
    reviewIndex = 0;
    reviewControls.hidden = approvedReviews.length <= 1;
    renderReviewSlide();
    startReviewTimer();
  } catch (error) {
    console.warn("Reviews could not be loaded:", error);
  }
}

reviewText?.addEventListener("input", () => {
  reviewCount.textContent = `${reviewText.value.length} / 500`;
});

reviewPrevious?.addEventListener("click", () => {
  showReview(-1);
  startReviewTimer();
});

reviewNext?.addEventListener("click", () => {
  showReview(1);
  startReviewTimer();
});

reviewShowcase?.addEventListener("mouseenter", stopReviewTimer);
reviewShowcase?.addEventListener("mouseleave", startReviewTimer);
reviewShowcase?.addEventListener("focusin", stopReviewTimer);
reviewShowcase?.addEventListener("focusout", startReviewTimer);

reviewForm?.addEventListener("submit", async event => {
  event.preventDefault();
  reviewMessage.classList.remove("is-error");
  if (!reviewsApiConfigured()) {
    reviewMessage.textContent = "The review form is being connected. Please try again shortly.";
    reviewMessage.classList.add("is-error");
    return;
  }

  const formData = new FormData(reviewForm);
  const payload = {
    name: String(formData.get("name") || "").trim(),
    product: String(formData.get("product") || "").trim(),
    rating: Number(formData.get("rating")),
    review: String(formData.get("review") || "").trim(),
    website: String(formData.get("website") || "").trim()
  };

  reviewSubmit.disabled = true;
  reviewSubmit.textContent = "Submitting…";
  reviewMessage.textContent = "";
  try {
    const response = await fetch(REVIEWS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow"
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || "Submission failed");
    reviewForm.reset();
    reviewCount.textContent = "0 / 500";
    reviewMessage.textContent = "Thank you! Your review was submitted for approval.";
  } catch (error) {
    reviewMessage.textContent = error.message || "We could not submit your review. Please try again.";
    reviewMessage.classList.add("is-error");
  } finally {
    reviewSubmit.disabled = false;
    reviewSubmit.textContent = "Submit review";
  }
});

loadApprovedReviews();
