// script.js — lengkap
document.addEventListener("DOMContentLoaded", () => {
  // ---- persistence ----
  const STORAGE_KEY = "crud_mahasiswa";
  const loadData = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      console.error("Load error:", e);
      return [];
    }
  };
  const saveData = (d) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    } catch (e) {
      console.error("Save error:", e);
    }
  };

  // ---- state & refs ----
  let data = loadData();
  let autoId = data.length ? Math.max(...data.map(x => x.id || 0)) + 1 : 1;
  let sortState = { column: null, dir: "asc" };

  const $ = sel => document.querySelector(sel);
  const form = $("#form-mahasiswa"), elId = $("#id"), elNama = $("#nama"),
        elNim = $("#nim"), elDepartemen = $("#departemen"),
        tbody = $("#tbody"), elSearch = $("#search"), elFilter = $("#filter"),
        fileInput = $("#fileUpload"), btnImport = $("#btn-import"),
        btnExport = $("#btn-export"), exportOptions = $("#export-options");

  // ---- helpers ----
  const norm = s => (s || "").toString().trim();
  const esc = s => (s == null ? "" : String(s)).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lower = s => norm(s).toLowerCase();

  function sortArray(arr, col, dir) {
    if (!col) return arr;
    return arr.sort((a, b) => {
      const A = (a[col] || "").toString().toLowerCase();
      const B = (b[col] || "").toString().toLowerCase();
      if (A < B) return dir === "asc" ? -1 : 1;
      if (A > B) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }

  // ---- render ----
  function updateSortIndicators() {
    document.querySelectorAll(".sortable-header").forEach(h => {
      const i = h.querySelector(".sort-indicator"), col = h.dataset.column;
      if (!i) return;
      if (sortState.column === col) {
        i.textContent = sortState.dir === "asc" ? " ▲" : " ▼";
        i.style.opacity = "1";
      } else {
        i.textContent = " ↕";
        i.style.opacity = "0.5";
      }
    });
  }

  function getFilteredData() {
    let out = [...data];
    out = sortArray(out, sortState.column, sortState.dir);
    const kw = lower(elSearch.value);
    const by = elFilter.value || "all";
    return out.filter(r => {
      if (!kw) return true;
      if (by === "all") {
        return [r.nama, r.nim, r.departemen].some(x => (x || "").toLowerCase().includes(kw));
      }
      return ((r[by] || "").toLowerCase().includes(kw));
    });
  }

  function render() {
    updateSortIndicators();
    const rows = getFilteredData();
    tbody.innerHTML = rows.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td style="text-align:left;padding-left:18px;">${esc(r.nama)}</td>
        <td>${esc(r.nim)}</td>
        <td>${esc(r.departemen)}</td>
        <td>
          <button data-edit="${r.id}">Edit</button>
          <button data-del="${r.id}">Hapus</button>
        </td>
      </tr>
    `).join("");
  }

  // ---- form submit (add/edit) ----
  form.addEventListener("submit", e => {
    e.preventDefault();
    const idVal = norm(elId.value), nama = norm(elNama.value), nim = norm(elNim.value), dep = norm(elDepartemen.value);
    if (!nama || !nim || !dep) return alert("Semua field wajib diisi.");
    const nimL = nim.toLowerCase();
    if (idVal) {
      const idNum = Number(idVal);
      const idx = data.findIndex(x => x.id === idNum);
      if (idx >= 0) {
        if (data.some(x => x.id !== idNum && lower(x.nim) === nimL)) return alert(`Data tersebut sudah ada`);
        data[idx] = { ...data[idx], nama, nim, departemen: dep };
      }
    } else {
      if (data.some(x => lower(x.nim) === nimL)) return alert(`Data tersebut sudah ada`);
      data.push({ id: autoId++, nama, nim, departemen: dep });
    }
    saveData(data); render(); form.reset(); elId.value = ""; elNama.focus();
  });

  $("#btn-reset").addEventListener("click", () => { form.reset(); elId.value = ""; elNama.focus(); });

  // ---- edit / delete in table ----
  tbody.addEventListener("click", e => {
    const editId = e.target.getAttribute("data-edit"), delId = e.target.getAttribute("data-del");
    if (editId) {
      const it = data.find(x => x.id === Number(editId)); if (!it) return;
      elId.value = it.id; elNama.value = it.nama; elNim.value = it.nim; elDepartemen.value = it.departemen; elNama.focus();
    }
    if (delId) {
      if (!confirm("Yakin ingin menghapus?")) return;
      data = data.filter(x => x.id !== Number(delId));
      saveData(data); render();
    }
  });

  // ---- search/filter/sort handlers ----
  elSearch.addEventListener("input", render);
  elFilter.addEventListener("change", render);
  document.querySelectorAll(".sortable-header").forEach(h => {
    h.addEventListener("click", () => {
      const col = h.dataset.column;
      if (sortState.column === col) sortState.dir = sortState.dir === "asc" ? "desc" : "asc";
      else { sortState.column = col; sortState.dir = "asc"; }
      render();
    });
  });

  // ---- CSV parser & map XLSX ----
  function parseCSVLine(line) {
    const res = [], len = line.length; let cur = "", inQ = false;
    for (let i = 0; i < len; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        res.push(cur); cur = "";
      } else cur += ch;
    }
    res.push(cur);
    return res.map(s => s.trim().replace(/^"|"$/g, ""));
  }

  function mapRowFromObject(obj) {
    const map = {};
    for (const k in obj) map[k.toLowerCase().replace(/\s/g, "")] = obj[k];
    const nama = map.nama || map.name || map.fullname || map.full_name || "";
    const nim = map.nim || map.npm || map.id || "";
    const dep = map.departemen || map.jurusan || map.department || "";
    return { nama: norm(nama), nim: norm(nim), departemen: norm(dep) };
  }

  // ---- import handler (singkat & aman) ----
  btnImport.addEventListener("click", () => {
    const file = fileInput.files[0];
    if (!file) return alert("Pilih file (CSV/XLSX).");
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const raw = [];
        if (ext === "csv") {
          const txt = e.target.result;
          const lines = txt.split(/\r?\n/).filter(l => l.trim() !== "");
          if (!lines.length) return alert("File CSV kosong.");
          const header = parseCSVLine(lines[0]).map(h => h.toLowerCase());
          const hasHeader = header.some(h => h.includes("nama") || h.includes("nim") || h.includes("departemen") || h.includes("jurusan"));
          const start = hasHeader ? 1 : 0;
          for (let i = start; i < lines.length; i++) {
            const cols = parseCSVLine(lines[i]);
            const nama = hasHeader ? (cols[header.findIndex(h => h.includes("nama"))] || cols[0]) : cols[0] || "";
            const nim = hasHeader ? (cols[header.findIndex(h => h.includes("nim"))] || cols[1]) : cols[1] || "";
            const dep = hasHeader ? (cols[header.findIndex(h => h.includes("departemen"))] || cols[2]) : cols[2] || "";
            if (nama && nim && dep) raw.push({ nama: norm(nama), nim: norm(nim), departemen: norm(dep) });
          }
        } else if (ext === "xlsx") {
          if (typeof XLSX === "undefined") return alert("Library XLSX belum ter-load.");
          const arr = new Uint8Array(e.target.result);
          const wb = XLSX.read(arr, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
          json.forEach(o => { const m = mapRowFromObject(o); if (m.nama && m.nim && m.departemen) raw.push(m); });
        } else return alert("Format harus CSV atau XLSX.");

        if (!raw.length) return alert("Tidak ada baris valid untuk diimport.");
        const total = raw.length;

        // internal dedupe by nim (case-insensitive)
        const uniqMap = new Map();
        raw.forEach(r => { const k = lower(r.nim); if (!uniqMap.has(k)) uniqMap.set(k, r); });
        const uniqueFromFile = Array.from(uniqMap.values());
        const internalDup = total - uniqueFromFile.length;

        // dedupe against existing
        const existing = new Set(data.map(x => lower(x.nim)));
        const toAdd = uniqueFromFile.filter(r => !existing.has(lower(r.nim)));
        const dupAgainstExisting = uniqueFromFile.length - toAdd.length;

        const totalDup = total - toAdd.length;
        if (totalDup > 0) {
          const ok = confirm(`${totalDup} data duplikat dari total ${total} data.\nLanjutkan import untuk data yang tidak duplikat?`);
          if (!ok) { fileInput.value = ""; return; }
        }

        if (!toAdd.length) { fileInput.value = ""; return alert(`Import selesai. Tidak ada data baru dari ${total} baris.`); }

        // add
        toAdd.forEach(it => data.push({ id: autoId++, nama: it.nama, nim: it.nim, departemen: it.departemen }));
        saveData(data); render(); fileInput.value = "";
        alert(`${toAdd.length} data berhasil diimport.`);
      } catch (err) {
        console.error(err); alert("Kesalahan saat import: " + (err.message || err));
        fileInput.value = "";
      }
    };

    if (ext === "csv") reader.readAsText(file, "UTF-8");
    else reader.readAsArrayBuffer(file);
  });

  // ---- export ----
  const getExportList = () => getFilteredData();

  // helper kecil: kapitalisasi kata
  function toTitleCase(s) {
    return String(s || "")
      .split(/\s+/)
      .filter(Boolean)
      .map(w => (w[0] ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
      .join(" ");
  }

  // sanitize filename: hapus karakter ilegal + collapse spasi + batasi panjang
  function sanitizeFilename(s, maxLen = 80) {
    let out = String(s || "")
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[\/\\?%*:|"<>]/g, "")
      .replace(/[\(\)]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (out.length > maxLen) out = out.slice(0, maxLen).trim();
    return out;
  }

  function getExportMeta() {
    const by = (elFilter && elFilter.value) ? elFilter.value : "all";
    const searchKw = norm(elSearch && elSearch.value ? elSearch.value : "");
    let filenameBase = "Mahasiswa Semua Departemen";
    let title = "Mahasiswa — Semua Departemen";

    if (by === "departemen") {
      // prioritas: kalau user memilih departemen di dropdown form (elDepartemen)
      const sel = (elDepartemen && elDepartemen.value) ? String(elDepartemen.value).trim() : "";
      if (sel) {
        const deptDisplay = toTitleCase(sel);
        filenameBase = `Mahasiswa Departemen ${deptDisplay}`;
        title = `Mahasiswa Departemen ${deptDisplay}`;
      } else if (searchKw) {
        // cocokkan dengan option jika memungkinkan (ketat)
        const cleaned = searchKw.toLowerCase().replace(/\s+/g, " ").trim();
        const options = elDepartemen ? Array.from(elDepartemen.options).map(o => (o.value || "").trim()) : [];
        let opt = options.find(o => o.toLowerCase() === cleaned);
        if (!opt) opt = options.find(o => (o.toLowerCase().includes(cleaned) && cleaned.length >= 3));
        const deptDisplay = opt ? opt : toTitleCase(cleaned);
        filenameBase = `Mahasiswa Departemen ${deptDisplay}`;
        title = `Mahasiswa Departemen ${deptDisplay}`;
      } else {
        filenameBase = "Mahasiswa Semua Departemen";
        title = "Mahasiswa — Semua Departemen";
      }
    } else if (by !== "all" && searchKw) {
      const cleaned = toTitleCase(searchKw);
      filenameBase = `Mahasiswa (${by}: ${cleaned})`;
      title = `Mahasiswa — ${toTitleCase(by)}: ${cleaned}`;
    } else {
      filenameBase = "Mahasiswa Semua Departemen";
      title = "Mahasiswa — Semua Departemen";
    }

    const safeFilenameBase = sanitizeFilename(filenameBase).replace(/\s+/g, " ");
    return { filenameBase: safeFilenameBase, title };
  }

  // Export ke CSV (terima nama file)
  function exportToCSV(list, filename) {
    const rows = [["No", "Nama", "NIM", "Departemen"], ...list.map((r, i) => [i + 1, r.nama, r.nim, r.departemen])];
    const csv = rows.map(row => row.map(f => `"${String(f).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  // Export ke PDF (beri judul sesuai meta)
  function exportToPDF(list, filename, title) {
    if (typeof window.jspdf === "undefined") return alert("jsPDF belum tersedia.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(14);
    const pageWidth = doc.internal.pageSize.getWidth();
    const textWidth = doc.getTextWidth(title);
    const x = Math.max((pageWidth - textWidth) / 2, 10);
    doc.text(title, x, 14);

    const head = [["No", "Nama", "NIM", "Departemen"]];
    const body = list.map((r, i) => [i + 1, r.nama, r.nim, r.departemen]);

    if (doc.autoTable) {
      doc.autoTable({
        startY: 20,
        head,
        body,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [76, 175, 80] },
        margin: { left: 10, right: 10 }
      });
    } else {
      let y = 24;
      body.forEach(row => {
        doc.text(row.join(" | "), 10, y);
        y += 6;
        if (y > doc.internal.pageSize.getHeight() - 10) { doc.addPage(); y = 14; }
      });
    }

    doc.save(filename);
  }

  // Handler export
  btnExport.addEventListener("click", e => {
    e.stopPropagation();
    exportOptions.style.display = exportOptions.style.display === "block" ? "none" : "block";
  });

  document.querySelectorAll(".export-options .opt").forEach(b => b.addEventListener("click", ev => {
    const type = ev.currentTarget.dataset.type;
    const list = getExportList();
    if (!list.length) { alert("Tidak ada data untuk diekspor."); exportOptions.style.display = "none"; return; }

    const meta = getExportMeta();
    const fname = `${meta.filenameBase}.${type === "csv" ? "csv" : "pdf"}`;
    if (type === "csv") exportToCSV(list, fname);
    else if (type === "pdf") exportToPDF(list, fname, meta.title);

    exportOptions.style.display = "none";
  }));

  document.addEventListener("click", e => { if (!e.target.closest(".export-wrapper")) exportOptions.style.display = "none"; });

  // ---- init ----
  render();
});
