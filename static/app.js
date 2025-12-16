/* =====================
   iChords – Advanced app.js
   ✔ Sharp + flat support
   ✔ Automatic key detection
   ✔ Chord highlighting
===================== */

/* =====================
   GLOBAL STATE
===================== */

let songs = JSON.parse(localStorage.getItem("songs")) || [];
let selectedSongIndex = null;
let currentTranspose = 0;
let originalChords = "";
let detectedKey = "C";

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
   PARSER
===================== */

function parseChord(chord) {
  const match = chord.match(/^([A-G](?:#|b)?)(m|maj7|m7|7|sus4|dim)?(.*)$/);
  if (!match) return null;

  return {
    root: match[1],
    quality: match[2] || "",
    extra: match[3] || ""
  };
}

/* =====================
   TRANSPOSER (slash-chord aware)
===================== */

function parseChord(chord) {
  // Matches: C, Am7, Bbmaj7, G/B, Dbm7/F
  const match = chord.match(
    /^([A-G](?:#|b)?)([^/\s]*)(?:\/([A-G](?:#|b)?))?$/
  );

  if (!match) return null;

  return {
    root: match[1],
    quality: match[2] || "",
    bass: match[3] || null
  };
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

  const preferFlats = parsed.root.includes("b");

  const newRoot = transposeNote(parsed.root, steps, preferFlats);
  let result = newRoot + parsed.quality;

  if (parsed.bass) {
    const newBass = transposeNote(
      parsed.bass,
      steps,
      parsed.bass.includes("b")
    );
    result += "/" + newBass;
  }

  return result;
}

function transposeText(text, steps) {
  return text.replace(
    /\b[A-G](?:#|b)?[^\s]*/g,
    chord => transposeChord(chord, steps)
  );
}



/* =====================
   KEY DETECTION
===================== */

function detectKey(text) {
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

transposeUpBtn.addEventListener("click", () => {
  if (!originalChords) return;
  currentTranspose++;
  chordsInput.value = transposeText(originalChords, currentTranspose);
  updateKeyDisplay();
});

transposeDownBtn.addEventListener("click", () => {
  if (!originalChords) return;
  currentTranspose--;
  chordsInput.value = transposeText(originalChords, currentTranspose);
  updateKeyDisplay();
});

/* =====================
   CRUD
===================== */

songForm.addEventListener("submit", e => {
  e.preventDefault();

  const songData = {
    title: titleInput.value.trim(),
    chords: originalChords || chordsInput.value
  };

  if (selectedSongIndex === null) songs.push(songData);
  else songs[selectedSongIndex] = songData;

  localStorage.setItem("songs", JSON.stringify(songs));
  resetForm();
  renderSongList();
});

/*----SEARCH SONG-----*/
const searchInput = document.getElementById("search");

function renderSongList(filter = "") {
  songListEl.innerHTML = "";

  const query = filter.toLowerCase();

  songs.forEach((song, index) => {
    if (!song.title.toLowerCase().includes(query)) return;

    const li = document.createElement("li");
    li.textContent = song.title;

    if (index === selectedSongIndex) {
      li.classList.add("active");
    }

    li.onclick = () => loadSong(index);
    songListEl.appendChild(li);
  });
  if (!songListEl.children.length) {
  const li = document.createElement("li");
  li.textContent = "No songs found";
  li.style.opacity = "0.6";
  li.style.pointerEvents = "none";
  songListEl.appendChild(li);
}

}

searchInput.addEventListener("input", () => {
  renderSongList(searchInput.value);
});



function loadSong(index) {
  selectedSongIndex = index;
  titleInput.value = songs[index].title;
  chordsInput.value = songs[index].chords;

  originalChords = songs[index].chords;
  detectedKey = detectKey(originalChords);
  currentTranspose = 0;
  updateKeyDisplay();
  renderSongList();
}

cancelBtn.addEventListener("click", resetForm);

function resetForm() {
  songForm.reset();
  selectedSongIndex = null;
  currentTranspose = 0;
  originalChords = "";
  detectedKey = "C";
  updateKeyDisplay();
  renderSongList();
}

/* =====================
   LIVE EDIT TRACKING
===================== */

chordsInput.addEventListener("input", () => {
  if (currentTranspose === 0) {
    originalChords = chordsInput.value;
    detectedKey = detectKey(originalChords);
    updateKeyDisplay();
  }
});

/* =====================
   INIT
===================== */
renderSongList();
updateKeyDisplay();


/* =====================
   DELETE SONG
===================== */

const deleteBtn = document.getElementById("deleteBtn");
const duplicateBtn = document.getElementById("duplicateBtn");

deleteBtn.addEventListener("click", () => {
  if (selectedSongIndex === null) return;

  const confirmDelete = confirm(
    `Delete "${songs[selectedSongIndex].title}"?`
  );

  if (!confirmDelete) return;

  songs.splice(selectedSongIndex, 1);
  localStorage.setItem("songs", JSON.stringify(songs));

  resetForm();
});



/* =====================
   DUPLICATE SONG
===================== */

duplicateBtn.addEventListener("click", () => {
  if (selectedSongIndex === null) return;

  const original = songs[selectedSongIndex];

  const copy = {
    title: original.title + " (Copy)",
    chords: original.chords
  };

  songs.splice(selectedSongIndex + 1, 0, copy);
  localStorage.setItem("songs", JSON.stringify(songs));

  renderSongList();
});

function updateActionButtons() {
  const enabled = selectedSongIndex !== null;
  deleteBtn.disabled = !enabled;
  duplicateBtn.disabled = !enabled;
}

/*----ADD SONG-----*/
const addSongBtn = document.getElementById("addSongBtn");

addSongBtn.addEventListener("click", () => {
  resetForm();
  titleInput.focus();
});


