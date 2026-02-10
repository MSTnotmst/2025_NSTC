const METADATA_INDEX = "index.json"

const els = {
  status: document.getElementById("status"),
  grid: document.getElementById("grid"),
    search: document.getElementById("search"),
    source: document.getElementById("source"),
    artist: document.getElementById("artist"),
    category: document.getElementById("category"),
  widthMinInput: document.getElementById("width_min_input"),
  widthMaxInput: document.getElementById("width_max_input"),
  heightMinInput: document.getElementById("height_min_input"),
  heightMaxInput: document.getElementById("height_max_input"),
  clear: document.getElementById("clear"),
  modal: document.getElementById("modal"),
  modalImg: document.getElementById("modal-img"),
  modalTitle: document.getElementById("modal-title"),
  modalMeta: document.getElementById("modal-meta"),
  modalOpen: document.getElementById("modal-open"),
  modalCopy: document.getElementById("modal-copy"),
  modalClose: document.getElementById("modal-close"),
};

const state = {
  rows: [],
  widthRange: [0, 0],
  heightRange: [0, 0],
};

function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];

        if (inQuotes) {
        if (char === '"') {
            const next = text[i + 1];
            if (next === '"') {
            field += '"';
            i += 1;
            } else {
            inQuotes = false;
            }
        } else {
            field += char;
        }
        continue;
        }

        if (char === '"') {
        inQuotes = true;
        continue;
        }

        if (char === ",") {
        row.push(field);
        field = "";
        continue;
        }

        if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        continue;
        }

        if (char === "\r") {
        continue;
        }

        field += char;
    }

    row.push(field);
    rows.push(row);

    if (rows.length === 0) return [];

    const headers = rows[0].map((h) => h.replace(/^\uFEFF/, "").trim());
    return rows.slice(1).map((cols) => {
        const obj = {};
        headers.forEach((h, idx) => {
        obj[h] = (cols[idx] ?? "").trim();
        });
        return obj;
    });
}

function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function normalizeRow(row) {
  return {
    raw: row,
    source: row.source,
    id: row.id,
    artist: row.artist,
        title: row.title,
    category: row.category,
    image_url: row.image_url,
    width: toNumber(row.width),
    height: toNumber(row.height),
    path: row.path,
    ts: row.ts,
    _src_file: row._src_file,
    _src_line: row._src_line,
    new_filename: row.new_filename,
    file_rel: row.file_rel,
    is_deleted: row.is_deleted,
  };
}

function uniqueSorted(rows, key) {
    const set = new Set();
    rows.forEach((r) => {
        if (r[key]) set.add(r[key]);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function fillSelect(selectEl, values) {
    selectEl.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "All";
    selectEl.appendChild(allOption);

    values.forEach((v) => {
        const option = document.createElement("option");
        option.value = v;
        option.textContent = v;
        selectEl.appendChild(option);
    });
}

function matchesFilters(row) {
  if (row.is_deleted === "1") return false;

  const keyword = els.search.value.trim().toLowerCase();
  const source = els.source.value;
  const artist = els.artist.value;
  const category = els.category.value;
  const minWidth = toNumber(els.widthMinInput.value);
  const maxWidth = toNumber(els.widthMaxInput.value);
  const minHeight = toNumber(els.heightMinInput.value);
  const maxHeight = toNumber(els.heightMaxInput.value);

    if (keyword) {
        const hay = `${row.artist} ${row.title}`.toLowerCase();
        if (!hay.includes(keyword)) return false;
    }

    if (source && row.source !== source) return false;
    if (artist && row.artist !== artist) return false;
    if (category && row.category !== category) return false;

  if (minWidth !== null && (row.width ?? 0) < minWidth) return false;
  if (maxWidth !== null && (row.width ?? 0) > maxWidth) return false;
  if (minHeight !== null && (row.height ?? 0) < minHeight) return false;
  if (maxHeight !== null && (row.height ?? 0) > maxHeight) return false;

  return true;
}

function createCard(row) {
  const card = document.createElement("div");
  card.className = "card";

    const img = document.createElement("img");
    img.loading = "lazy";
  img.src = row.path || row.file_rel || row.image_url || "";

    if (row.image_url) {
        img.onerror = () => {
        if (img.src !== row.image_url) img.src = row.image_url;
        };
    }

    const meta = document.createElement("div");
    meta.className = "meta";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = row.title || "(Untitled)";

    const artist = document.createElement("div");
    artist.className = "row";
    artist.textContent = `Artist: ${row.artist || ""}`;

    const source = document.createElement("div");
    source.className = "row";
    source.textContent = `Source: ${row.source || ""}`;

    const category = document.createElement("div");
    category.className = "row";
    category.textContent = `Category: ${row.category || ""}`;

    const size = document.createElement("div");
    size.className = "row";
    size.textContent = `Size: ${row.width || "-"} x ${row.height || "-"}`;

    const path = document.createElement("div");
    path.className = "row";
  path.textContent = `File: ${row.path || row.file_rel || ""}`;

    meta.appendChild(title);
    meta.appendChild(artist);
    meta.appendChild(source);
    meta.appendChild(category);
    meta.appendChild(size);
    meta.appendChild(path);

  card.appendChild(img);
  card.appendChild(meta);

  card.addEventListener("click", () => {
    openModal(row);
  });

  return card;
}

function buildMetaList(raw) {
  els.modalMeta.innerHTML = "";

  const entries = Object.entries(raw).filter(([, v]) => v !== null && v !== "");
  const frag = document.createDocumentFragment();

  entries.forEach(([key, value]) => {
    const item = document.createElement("div");
    item.className = "meta-item";

    const k = document.createElement("div");
    k.className = "key";
    k.textContent = key;

    const v = document.createElement("div");
    v.className = "value";
    v.textContent = value;

    item.appendChild(k);
    item.appendChild(v);
    frag.appendChild(item);
  });

  els.modalMeta.appendChild(frag);
}

function openModal(row) {
  const imgSrc = row.file_rel || row.path || row.image_url || "";
  els.modalImg.src = imgSrc;
  els.modalTitle.textContent = row.title || "(Untitled)";
  els.modalOpen.href = imgSrc || "#";
  els.modalOpen.style.pointerEvents = imgSrc ? "auto" : "none";
  els.modalOpen.style.opacity = imgSrc ? "1" : "0.5";
  els.modalCopy.dataset.path = row.path || row.file_rel || "";

  buildMetaList(row.raw || {});
  els.modal.classList.add("open");
}

function closeModal() {
  els.modal.classList.remove("open");
}

function render() {
  const filtered = state.rows.filter(matchesFilters);

    els.status.textContent = `Total: ${state.rows.length} | Showing: ${filtered.length}`;

    els.grid.innerHTML = "";
    const frag = document.createDocumentFragment();
    filtered.forEach((row) => frag.appendChild(createCard(row)));
    els.grid.appendChild(frag);
}

function attachEvents() {
  const inputs = [
    els.search,
    els.source,
    els.artist,
    els.category,
    els.widthMinInput,
    els.widthMaxInput,
    els.heightMinInput,
    els.heightMaxInput,
  ].filter(Boolean);

  inputs.forEach((el) => {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
    el.addEventListener("input", updateRangeInputs);
  });

  els.clear.addEventListener("click", () => {
    els.search.value = "";
    els.source.value = "";
    els.artist.value = "";
    els.category.value = "";
    const [minW, maxW] = state.widthRange;
    const [minH, maxH] = state.heightRange;
    els.widthMinInput.value = minW;
    els.widthMaxInput.value = maxW;
    els.heightMinInput.value = minH;
    els.heightMaxInput.value = maxH;
    updateRangeInputs();
    render();
  });

  els.modalClose.addEventListener("click", closeModal);
  els.modal.addEventListener("click", (event) => {
    if (event.target === els.modal) closeModal();
  });
  els.modalCopy.addEventListener("click", async () => {
    const path = els.modalCopy.dataset.path || "";
    if (!path) return;
    try {
      await navigator.clipboard.writeText(path);
      els.modalCopy.textContent = "Copied";
      setTimeout(() => {
        els.modalCopy.textContent = "Copy Path";
      }, 1200);
    } catch (err) {
      console.error(err);
    }
  });

  els.widthMinInput.addEventListener("input", () => {
    clampRange(els.widthMinInput, els.widthMaxInput);
    render();
  });
  els.widthMaxInput.addEventListener("input", () => {
    clampRange(els.widthMinInput, els.widthMaxInput);
    render();
  });
  els.heightMinInput.addEventListener("input", () => {
    clampRange(els.heightMinInput, els.heightMaxInput);
    render();
  });
  els.heightMaxInput.addEventListener("input", () => {
    clampRange(els.heightMinInput, els.heightMaxInput);
    render();
  });
}

function parseJsonl(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      rows.push(JSON.parse(trimmed));
    } catch (err) {
      console.warn("Bad JSONL line", err);
    }
  });
  return rows;
}

function normalizeJsonlRow(row) {
  const imageUrl = row.image_url || row.imageUrl || row.image || "";
  const filePath = row.path || row.file_rel || row.file || row.input_path || "";
  return {
    raw: row,
    source: row.source || row.site || "",
    id: row.id || row.objectid || row.objectNumber || "",
    artist: row.artist || row.artist_title || row.artistDisplayName || row.artist_name || row.maker || "",
    title: row.title || row.objectTitle || row.name || "",
    category: row.category || row.classification || row.objectType || "",
    image_url: imageUrl,
    width: toNumber(row.width),
    height: toNumber(row.height),
    path: filePath,
    ts: row.ts || "",
    _src_file: row._src_file,
    _src_line: row._src_line,
    new_filename: row.new_filename,
    file_rel: row.file_rel,
    is_deleted: row.is_deleted,
  };
}

async function loadMetadataIndex() {
  const res = await fetch(METADATA_INDEX);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const list = await res.json();
  if (!Array.isArray(list)) throw new Error("metadata/index.json must be an array");
  return list;
}

async function loadAllJsonl(files) {
  const results = await Promise.all(
    files.map(async (file) => {
      const res = await fetch(file);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${file}`);
      const text = await res.text();
      return parseJsonl(text);
    })
  );
  return results.flat();
}

function computeRange(rows, key) {
  let min = null;
  let max = null;
  rows.forEach((r) => {
    const v = toNumber(r[key]);
    if (v === null) return;
    if (min === null || v < min) min = v;
    if (max === null || v > max) max = v;
  });
  return [min ?? 0, max ?? 0];
}

function updateRangeInputs() {
  if (!els.widthMinInput.value) els.widthMinInput.value = els.widthMinInput.min || "";
  if (!els.widthMaxInput.value) els.widthMaxInput.value = els.widthMaxInput.max || "";
  if (!els.heightMinInput.value) els.heightMinInput.value = els.heightMinInput.min || "";
  if (!els.heightMaxInput.value) els.heightMaxInput.value = els.heightMaxInput.max || "";
}

function clampRange(minEl, maxEl) {
  const minVal = toNumber(minEl.value) ?? 0;
  const maxVal = toNumber(maxEl.value) ?? 0;
  if (minVal > maxVal) {
    minEl.value = maxVal;
  }
}

function initRanges(rows) {
  state.widthRange = computeRange(rows, "width");
  state.heightRange = computeRange(rows, "height");

  const [minW, maxW] = state.widthRange;
  els.widthMinInput.min = minW;
  els.widthMinInput.max = maxW;
  els.widthMaxInput.min = minW;
  els.widthMaxInput.max = maxW;
  els.widthMinInput.value = minW;
  els.widthMaxInput.value = maxW;

  const [minH, maxH] = state.heightRange;
  els.heightMinInput.min = minH;
  els.heightMinInput.max = maxH;
  els.heightMaxInput.min = minH;
  els.heightMaxInput.max = maxH;
  els.heightMinInput.value = minH;
  els.heightMaxInput.value = maxH;

  updateRangeInputs();
}

async function init() {
  try {
    const files = await loadMetadataIndex();
    const jsonlRows = await loadAllJsonl(files);
    const rows = jsonlRows.map(normalizeJsonlRow);

    state.rows = rows;

    fillSelect(els.source, uniqueSorted(rows, "source"));
    fillSelect(els.artist, uniqueSorted(rows, "artist"));
    fillSelect(els.category, uniqueSorted(rows, "category"));
    initRanges(rows);

    attachEvents();
    render();
  } catch (err) {
    els.status.textContent = `Failed to load metadata from ${METADATA_INDEX}. Create it as a JSON array of .jsonl paths.`;
    console.error(err);
  }
}

init();
