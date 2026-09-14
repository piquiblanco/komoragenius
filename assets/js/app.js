// Genius parody song page — loads song metadata + lyrics/annotations from /data.
(function () {
  "use strict";

  const els = {
    heroBg: document.getElementById("songHeroBg"),
    art: document.getElementById("songArt"),
    contributors: document.getElementById("songContributors"),
    title: document.getElementById("songTitle"),
    artist: document.getElementById("songArtist"),
    tags: document.getElementById("songTags"),
    lyricsTitle: document.getElementById("lyricsTitle"),
    lyrics: document.getElementById("lyrics"),
    aboutSection: document.getElementById("aboutSection"),
    aboutSongName: document.getElementById("aboutSongName"),
    aboutText: document.getElementById("aboutText"),
    panel: document.getElementById("annotationPanel"),
    drawer: document.getElementById("annotationDrawer"),
    drawerSheet: document.getElementById("annotationDrawerSheet"),
  };

  let annotations = {};
  let activeEls = null;

  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
    return res.json();
  }

  function renderSong(song) {
    document.title = `${song.title} – ${song.artist} | Genius Lyrics`;
    els.title.textContent = song.title;
    els.artist.textContent = song.artist;
    els.lyricsTitle.textContent = `${song.title} Lyrics`;
    els.contributors.textContent = song.contributors || "1 Contributor";

    if (song.albumArt) {
      els.art.src = song.albumArt;
      els.heroBg.style.backgroundImage = `url("${song.albumArt}")`;
    }

    const tagBits = [];
    if (song.album) tagBits.push(`<span class="tag">Album <b>${escapeHTML(song.album)}</b></span>`);
    if (song.releaseDate) tagBits.push(`<span class="tag">Released <b>${escapeHTML(song.releaseDate)}</b></span>`);
    if (song.producer) tagBits.push(`<span class="tag">Prod. <b>${escapeHTML(song.producer)}</b></span>`);
    els.tags.innerHTML = tagBits.join("");

    if (song.about && els.aboutSection && els.aboutSongName && els.aboutText) {
      els.aboutSection.hidden = false;
      els.aboutSongName.textContent = song.title;
      els.aboutText.textContent = song.about;
    }
  }

  function renderLyrics(data) {
    annotations = data.annotations || {};
    const frag = document.createDocumentFragment();

    (data.sections || []).forEach((section) => {
      const sec = document.createElement("div");
      sec.className = "lyrics__section";

      if (section.header) {
        const h = document.createElement("p");
        h.className = "lyrics__section-header";
        h.textContent = section.header;
        sec.appendChild(h);
      }

      (section.lines || []).forEach((line) => {
        const lineEl = document.createElement("span");
        lineEl.className = "lyrics__line";

        if (line === "") {
          lineEl.classList.add("lyrics__line--blank");
        } else {
          // A line is one or more segments: plain strings and/or { text, annotationId }.
          const segments = Array.isArray(line) ? line : [line];
          segments.forEach((seg) => appendSegment(lineEl, seg));
        }
        sec.appendChild(lineEl);
      });

      frag.appendChild(sec);
    });

    els.lyrics.innerHTML = "";
    els.lyrics.appendChild(frag);
  }

  function appendSegment(lineEl, seg) {
    const text = typeof seg === "string" ? seg : seg.text;
    const annotationId = typeof seg === "string" ? null : seg.annotationId;

    if (annotationId && annotations[annotationId]) {
      const hl = document.createElement("span");
      hl.className = "hl";
      hl.textContent = text;
      hl.dataset.annotation = annotationId;
      hl.addEventListener("click", () => showAnnotation(annotationId));
      lineEl.appendChild(hl);
    } else {
      lineEl.appendChild(document.createTextNode(text));
    }
  }

  function annotationMarkup(a) {
    const author = a.author || "Genius Contributor";
    const initial = author.trim().charAt(0).toUpperCase() || "G";
    // Accept a single `image` string or an `images` array.
    const images = a.images || (a.image ? [a.image] : []);
    const imagesHTML = images
      .map((src) => `<img class="annotation__image" src="${escapeHTML(src)}" alt="" loading="lazy" />`)
      .join("");
    return `
      <div class="annotation">
        <div class="annotation__lyric">${escapeHTML(a.lyric || "")}</div>
        <div class="annotation__body">${escapeHTML(a.content || "")}</div>
        ${imagesHTML ? `<div class="annotation__media">${imagesHTML}</div>` : ""}
        <div class="annotation__footer">
          <span class="annotation__avatar">${escapeHTML(initial)}</span>
          <span>${escapeHTML(author)}</span>
        </div>
      </div>`;
  }

  function showAnnotation(id) {
    const a = annotations[id];
    if (!a) return;

    // Highlight every span tied to this annotation (spans can cover multiple lines).
    const spans = els.lyrics.querySelectorAll(`.hl[data-annotation="${id}"]`);
    if (activeEls) activeEls.forEach((el) => el.classList.remove("is-active"));
    spans.forEach((el) => el.classList.add("is-active"));
    activeEls = spans;

    if (!a.lyric && spans.length) {
      a.lyric = Array.from(spans).map((el) => el.textContent).join(" / ");
    }

    const markup = annotationMarkup(a);
    const isMobile = window.matchMedia("(max-width: 860px)").matches;

    if (isMobile) {
      els.drawerSheet.innerHTML = markup;
      els.drawer.classList.add("is-open");
      els.drawer.setAttribute("aria-hidden", "false");
    } else {
      els.panel.innerHTML = markup;
    }
  }

  // Close mobile drawer on backdrop click.
  els.drawer.addEventListener("click", (e) => {
    if (e.target === els.drawer) {
      els.drawer.classList.remove("is-open");
      els.drawer.setAttribute("aria-hidden", "true");
      if (activeEls) { activeEls.forEach((el) => el.classList.remove("is-active")); activeEls = null; }
    }
  });

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function init() {
    try {
      const [song, lyrics] = await Promise.all([
        loadJSON("data/song.json"),
        loadJSON("data/lyrics.json"),
      ]);
      renderSong(song);
      renderLyrics(lyrics);
    } catch (err) {
      els.lyrics.innerHTML =
        `<p class="lyrics__loading">Could not load content: ${escapeHTML(err.message)}.<br />` +
        `If you opened this file directly, run a local server or view it on GitHub Pages.</p>`;
      console.error(err);
    }
  }

  init();
})();
