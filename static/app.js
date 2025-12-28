/* =====================
   GLOBAL STATE
===================== */

let songs = [];
let selectedSongId = null;   // 🔥 USE ID, NOT INDEX
let currentTranspose = 0;
let originalChords = "";
let detectedKey = "C";
let isApplyingTranspose = false;


/* =====================
   DOM ELEMENTS
===================== */

const songListEl = document.getElementById("songs");
const songForm = document.getElementById("songForm");
const titleInput = document.getElementById("title");
const chordsInput = document.getElementById("chords");
const transposeUpBtn = document.getElementById("transposeUp");
const transposeDownBtn = document.getElementById("transposeDown");
const currentKeyEl = document.getElementById("currentKey");
const cancelBtn = document.getElementById("cancelBtn");
const deleteBtn = document.getElementById("deleteBtn");
const duplicateBtn = document.getElementById("duplicateBtn");
const addSongBtn = document.getElementById("addSongBtn");
const searchInput = document.getElementById("search");


/* =====================
   CHORD MAPS
===================== */

const SHARPS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLATS  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];

const NOTE_INDEX = {
  C:0,"C#":1,Db:1,
  D:2,"D#":3,Eb:3,
  E:4,
  F:5,"F#":6,Gb:6,
  G:7,"G#":8,Ab:8,
  A:9,"A#":10,Bb:10,
  B:11
};


/* =====================
   TRANSPOSER
===================== */

function parseChord(chord) {
  const match = chord.match(
    /^([A-G](?:#|b)?)([^/\s]*)(?:\/([A-G](?:#|b)?))?$/
  );
  if (!match) return null;
  return { root: match[1], quality: match[2] || "", bass: match[3] || null };
}

function transposeNote(note, steps, preferFlats = false) {
  const index = NOTE_INDEX[note];
  if (index === undefined) return note;
  const newIndex = (index + steps + 12) % 12;
  return preferFlats ? FLATS[newIndex] : SHARPS[newIndex];
}

function transposeChord(chord, steps) {
  const parsed = parseChord(chord);
  if (!parsed) return chord;

  const newRoot = transposeNote(parsed.root, steps, parsed.root.includes("b"));
  let result = newRoot + parsed.quality;

  if (parsed.bass) {
    result += "/" + transposeNote(parsed.bass, steps, parsed.bass.includes("b"));
  }
  return result;
}

function transposeText(text, steps) {
  // Split text line by line
  return text.split("\n").map(line => {
    // Detect chord-only lines or lines starting with chords
    return line.replace(
      /\b([A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-G](?:#|b)?)?)\b/g,
      chord => transposeChord(chord, steps)
    );
  }).join("\n");
}



/* =====================
   KEY DETECTION
===================== */

function detectKey(text) {
  // Only look for chord-like words
  const matches = text.match(/\b[A-G](?:#|b)?\b/g);
  if (!matches) return "C";
  const counts = {};
  matches.forEach(n => counts[n] = (counts[n] || 0) + 1);
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
}


function updateKeyDisplay() {
  const baseIndex = NOTE_INDEX[detectedKey] || 0;
  const finalIndex = (baseIndex + currentTranspose + 12) % 12;
  currentKeyEl.textContent = `Key: ${SHARPS[finalIndex]}`;
}


/* =====================
   TRANSPOSE CONTROLS
===================== */

transposeUpBtn.onclick = () => applyTranspose(1);
transposeDownBtn.onclick = () => applyTranspose(-1);

function applyTranspose(step) {
  if (!originalChords) return;
  isApplyingTranspose = true;
  currentTranspose += step;
  chordsInput.value = transposeText(originalChords, currentTranspose);
  updateKeyDisplay();
  isApplyingTranspose = false;
}


/* =====================
   CRUD
===================== */

songForm.onsubmit = async e => {
  e.preventDefault();

  const payload = {
    title: titleInput.value.trim(),
    chords: chordsInput.value
  };

  if (!payload.title) return;

  if (selectedSongId === null) {
    await fetch("/api/songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } else {
    await fetch(`/api/songs/${selectedSongId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  resetForm();
  fetchSongs();
};

deleteBtn.onclick = async () => {
  if (selectedSongId === null) return;
  if (!confirm("Delete this song?")) return;

  await fetch(`/api/songs/${selectedSongId}`, { method: "DELETE" });
  resetForm();
  fetchSongs();
};

duplicateBtn.onclick = async () => {
  if (selectedSongId === null) return;
  const song = songs.find(s => s.id === selectedSongId);

  await fetch("/api/songs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: song.title + " (Copy)",
      chords: song.chords
    })
  });

  fetchSongs();
};


/* =====================
   UI HELPERS
===================== */

function renderSongList(filter = "") {
  songListEl.innerHTML = "";
  const query = filter.toLowerCase();

  songs
    .filter(s => s.title.toLowerCase().includes(query))
    .forEach(song => {
      const li = document.createElement("li");
      li.textContent = song.title;
      if (song.id === selectedSongId) li.classList.add("active");
      li.onclick = () => loadSong(song.id);
      songListEl.appendChild(li);
    });

  if (!songListEl.children.length) {
    const li = document.createElement("li");
    li.textContent = "No songs found";
    li.style.opacity = "0.6";
    songListEl.appendChild(li);
  }
}

function loadSong(id) {
  const song = songs.find(s => s.id === id);
  if (!song) return;

  selectedSongId = id;
  titleInput.value = song.title;
  chordsInput.value = song.chords;

  originalChords = song.chords;
  detectedKey = detectKey(originalChords);
  currentTranspose = 0;

  updateKeyDisplay();
  renderSongList(searchInput.value);
  updateActionButtons();
}

function resetForm() {
  songForm.reset();
  selectedSongId = null;
  originalChords = "";
  detectedKey = "C";
  currentTranspose = 0;
  updateKeyDisplay();
  updateActionButtons();
}

function updateActionButtons() {
  const enabled = selectedSongId !== null;
  deleteBtn.disabled = !enabled;
  duplicateBtn.disabled = !enabled;
}


/* =====================
   EVENTS
===================== */

chordsInput.oninput = () => {
  if (isApplyingTranspose) return;
  originalChords = chordsInput.value;
  detectedKey = detectKey(originalChords);
  currentTranspose = 0;
  updateKeyDisplay();
};

cancelBtn.onclick = resetForm;
addSongBtn.onclick = () => { resetForm(); titleInput.focus(); };
searchInput.oninput = () => renderSongList(searchInput.value);


/* =====================
   DATA FETCH
===================== */

async function fetchSongs() {
  const res = await fetch("/api/songs");
  songs = await res.json();
  renderSongList(searchInput.value);
  updateActionButtons();
}


/* =====================
   INIT
===================== */

fetchSongs();
updateKeyDisplay();
updateActionButtons();