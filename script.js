/* -------------------- PERSISTENSI -------------------- */
const STORAGE_KEY = "crud_mahasiswa";

// Ambil data dari localStorage
const loadData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];  // kalau kosong, return array kosong
  } catch (err) {
    console.error("Load data error:", err);
    return [];
  }
};

// Simpan data ke localStorage
const saveData = (list) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Save data error:", err);
  }
};

/* -------------------- STATE -------------------- */
let data = loadData(); // data mahasiswa aktif
let autoId = data.length ? data.reduce((m, o) => Math.max(m, o.id), 0) + 1 : 1; // auto increment ID
let sortState = { column: null, direction: "asc" }; // state untuk sort

/* -------------------- ELEMEN HTML -------------------- */
// Ambil referensi ke elemen-elemen HTML
const form = document.getElementById("form-mahasiswa");
const elId = document.getElementById("id");
const elNama = document.getElementById("nama");
const elNim = document.getElementById("nim");
const elDepartemen = document.getElementById("departemen");

const tbody = document.getElementById("tbody");
const elSearch = document.getElementById("search");
const elFilter = document.getElementById("filter");
const fileInput = document.getElementById("fileUpload");
const btnImport = document.getElementById("btn-import");

const btnExport = document.getElementById("btn-export");
const exportOptions = document.getElementById("export-options");

/* -------------------- HELPER -------------------- */
// Normalisasi string (hapus spasi ekstra, null jadi string kosong)
const norm = (s) => (s || "").toString().trim();

// Update simbol panah pada header tabel saat sort
function updateSortIndicators() {
  document.querySelectorAll(".sortable-header").forEach((header) => {
    const indicator = header.querySelector(".sort-indicator");
    const col = header.dataset.column;
    if (!indicator) return;
    if (sortState.column === col) {
      indicator.textContent = sortState.direction === "asc" ? " ▲" : " ▼";
      indicator.style.opacity = "1";
    } else {
      indicator.textContent = " ↕";
      indicator.style.opacity = "0.5";
    }
  });
}

/* -------------------- RENDER -------------------- */
function render() {
  if (!Array.isArray(data)) data = [];
  updateSortIndicators();

  // Duplikasi data untuk ditampilkan
  let displayData = [...data];

  // Jika ada sort aktif → urutkan
  if (sortState.column) {
    displayData.sort((a, b) => {
      const A = (a[sortState.column] || "").toString().toLowerCase();
      const B = (b[sortState.column] || "").toString().toLowerCase();
      if (A < B) return sortState.direction === "asc" ? -1 : 1;
      if (A > B) return sortState.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  // Filter + pencarian
  const keyword = norm(elSearch.value).toLowerCase();
  const filterBy = elFilter.value || "all";
  displayData = displayData.filter((row) => {
    if (!keyword) return true;
    if (filterBy === "all") {
      return (
        (row.nama || "").toLowerCase().includes(keyword) ||
        (row.nim || "").toLowerCase().includes(keyword) ||
        (row.departemen || "").toLowerCase().includes(keyword)
      );
    }
    return ((row[filterBy] || "").toLowerCase().includes(keyword));
  });

  // Render data ke tabel
  tbody.innerHTML = "";
  displayData.forEach((row, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td style="text-align:left; padding-left:18px;">${escapeHtml(row.nama)}</td>
      <td>${escapeHtml(row.nim)}</td>
      <td>${escapeHtml(row.departemen)}</td>
      <td>
        <button type="button" data-edit="${row.id}">Edit</button>
        <button type="button" data-del="${row.id}">Hapus</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Escape HTML untuk keamanan (hindari XSS)
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* -------------------- FORM SUBMIT (SIMPAN / EDIT) -------------------- */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const idVal = norm(elId.value);
  const nama = norm(elNama.value);
  const nim = norm(elNim.value);
  const departemen = norm(elDepartemen.value);

  if (!nama || !nim || !departemen) {
    return alert("Semua field wajib diisi.");
  }

  if (idVal) {
    // Edit data
    const idNum = Number(idVal);
    const idx = data.findIndex((x) => x.id === idNum);
    if (idx >= 0) {
      data[idx].nama = nama;
      data[idx].nim = nim;
      data[idx].departemen = departemen;
    }
  } else {
    // Tambah data baru
    data.push({ id: autoId++, nama, nim, departemen });
  }

  saveData(data);
  render();
  form.reset();
  elId.value = "";
  elNama.focus();
});

// Tombol reset form
document.getElementById("btn-reset").addEventListener("click", () => {
  form.reset();
  elId.value = "";
  elNama.focus();
});

/* -------------------- EDIT / HAPUS pada TABEL -------------------- */
tbody.addEventListener("click", (e) => {
  const editId = e.target.getAttribute("data-edit");
  const delId = e.target.getAttribute("data-del");

  // Klik tombol Edit
  if (editId) {
    const item = data.find((x) => x.id === Number(editId));
    if (item) {
      elId.value = item.id;
      elNama.value = item.nama;
      elNim.value = item.nim;
      elDepartemen.value = item.departemen;
      elNama.focus();
    }
  }

  // Klik tombol Hapus
  if (delId) {
    const idNum = Number(delId);
    if (confirm("Yakin ingin menghapus data ini?")) {
      data = data.filter((x) => x.id !== idNum);
      saveData(data);
      render();
    }
  }
});

/* SEARCH & FILTER */
elSearch.addEventListener("input", render);
elFilter.addEventListener("change", render);

/* SORT HEADER */
document.querySelectorAll(".sortable-header").forEach((header) => {
  header.addEventListener("click", () => {
    const column = header.dataset.column;
    if (sortState.column === column) {
      // toggle arah sort
      sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
    } else {
      // sort baru
      sortState.column = column;
      sortState.direction = "asc";
    }
    render();
  });
});

/* IMPORT FILE (CSV / XLSX) */
// Parser CSV (support kutipan "")
function parseCSVLine(line) {
  const res = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' ) {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'; i++; // escape kutipan ganda
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      res.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  res.push(cur);
  return res.map(s => s.trim().replace(/^"|"$/g, ""));
}

// Mapping data XLSX ke field nama/nim/departemen
function mapRowFromObject(obj) {
  const map = {};
  for (const k in obj) {
    map[k.toLowerCase().replace(/\s/g, "")] = obj[k];
  }
  const nama = map["nama"] || map["name"] || map["fullname"] || map["full_name"] || "";
  const nim = map["nim"] || map["npm"] || map["id"] || "";
  const departemen = map["departemen"] || map["jurusan"] || map["department"] || "";
  return { nama: norm(nama), nim: norm(nim), departemen: norm(departemen) };
}

// Tombol import
btnImport.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (!file) return alert("Pilih file terlebih dahulu (CSV atau XLSX).");

  const ext = file.name.split(".").pop().toLowerCase();
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      if (ext === "csv") {
        // Parsing file CSV
        const txt = e.target.result;
        const lines = txt.split(/\r?\n/).filter(l => l.trim() !== "");
        if (lines.length === 0) return alert("File CSV kosong.");
        
        // Deteksi header
        const header = parseCSVLine(lines[0]).map(h => h.toLowerCase());
        let startIdx = 1;
        const hasHeader = header.some(h => h.includes("nama") || h.includes("nim") || h.includes("departemen") || h.includes("jurusan"));
        if (!hasHeader) startIdx = 0;

        // Loop isi baris
        for (let i = startIdx; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i]);
          let nama="", nim="", departemen="";
          if (hasHeader) {
            const idxNama = header.findIndex(h => h.includes("nama"));
            const idxNim = header.findIndex(h => h.includes("nim") || h.includes("npm"));
            const idxDep = header.findIndex(h => h.includes("departemen") || h.includes("jurusan") || h.includes("department"));
            nama = cols[idxNama] || cols[0] || "";
            nim = cols[idxNim] || cols[1] || "";
            departemen = cols[idxDep] || cols[2] || "";
          } else {
            // fallback urutan standar
            nama = cols[0] || "";
            nim = cols[1] || "";
            departemen = cols[2] || "";
          }
          if (nama && nim && departemen) {
            data.push({ id: autoId++, nama: norm(nama), nim: norm(nim), departemen: norm(departemen) });
          }
        }

      } else if (ext === "xlsx") {
        // Parsing file XLSX dengan library XLSX.js
        const dataArray = new Uint8Array(e.target.result);
        const workbook = XLSX.read(dataArray, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        json.forEach(item => {
          const mapped = mapRowFromObject(item);
          if (mapped.nama && mapped.nim && mapped.departemen) {
            data.push({ id: autoId++, nama: mapped.nama, nim: mapped.nim, departemen: mapped.departemen });
          }
        });
      } else {
        alert("Format file harus CSV atau XLSX!");
        return;
      }

      // Simpan & render ulang
      saveData(data);
      render();
      fileInput.value = "";
      alert("Import selesai.");
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat import.");
    }
  };

  if (ext === "csv") reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
});

/* -------------------- EXPORT (CSV / PDF) -------------------- */
// Ambil data yang sedang ditampilkan (filtered & sorted)
function getFilteredData() {
  let displayData = [...data];
  if (sortState.column) {
    displayData.sort((a, b) => {
      const A = (a[sortState.column] || "").toString().toLowerCase();
      const B = (b[sortState.column] || "").toString().toLowerCase();
      if (A < B) return sortState.direction === "asc" ? -1 : 1;
      if (A > B) return sortState.direction === "asc" ? 1 : -1;
      return 0;
    });
  }
  const keyword = norm(elSearch.value).toLowerCase();
  const filterBy = elFilter.value || "all";
  return displayData.filter(row => {
    if (!keyword) return true;
    if (filterBy === "all") {
      return (
        (row.nama || "").toLowerCase().includes(keyword) ||
        (row.nim || "").toLowerCase().includes(keyword) ||
        (row.departemen || "").toLowerCase().includes(keyword)
      );
    }
    return ((row[filterBy] || "").toLowerCase().includes(keyword));
  });
}

// Export ke CSV
function exportToCSV(list) {
  const rows = [["No","Nama","NIM","Departemen"], ...list.map((r,i)=>[i+1, r.nama, r.nim, r.departemen])];
  const csv = rows.map(row => row.map(field => `"${String(field).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "mahasiswa.csv";
  link.click();
}

// Export ke PDF menggunakan jsPDF + AutoTable
function exportToPDF(list) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const head = [["No","Nama","NIM","Departemen"]];
  const body = list.map((r,i)=>[i+1, r.nama, r.nim, r.departemen]);
  doc.autoTable({ head, body, styles: { fontSize: 10 }, headStyles: { fillColor: [76,175,80] } });
  doc.save("mahasiswa.pdf");
}

// Toggle dropdown export
btnExport.addEventListener("click", (e) => {
  e.stopPropagation();
  exportOptions.style.display = exportOptions.style.display === "block" ? "none" : "block";
});

// Klik opsi export
document.querySelectorAll(".export-options .opt").forEach(btn => {
  btn.addEventListener("click", (ev) => {
    const type = ev.currentTarget.dataset.type;
    const filtered = getFilteredData();
    if (filtered.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      exportOptions.style.display = "none";
      return;
    }
    if (type === "csv") exportToCSV(filtered);
    else if (type === "pdf") exportToPDF(filtered);
    exportOptions.style.display = "none";
  });
});

// Klik di luar dropdown → tutup
document.addEventListener("click", (e) => {
  if (!e.target.closest(".export-wrapper")) {
    exportOptions.style.display = "none";
  }
});

/* -------------------- INIT -------------------- */
render();
