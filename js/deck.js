/* Entire deck — navigation, fragments, hash routing */

/* Marvin's cameos - he pops into the corner on a few slides, says one
   thing, and leaves. A slide opts in with data-marvin="mood|line";
   data-marvin-delay and data-marvin-dwell tune the comic timing. */
(() => {
  const hud = document.getElementById("marvinHud");
  if (!hud) return;
  const say = hud.querySelector(".marvin-say");
  const ENTER_MS = 1500;
  const DWELL_MS = 8000;
  let enterTimer = null;
  let exitTimer = null;

  document.addEventListener("deck:slidechange", (e) => {
    clearTimeout(enterTimer);
    clearTimeout(exitTimer);
    hud.classList.remove("is-on");

    const cue = e.detail.slide.dataset.marvin;
    if (!cue) return;
    const [mood, line = ""] = cue.split("|");
    const delay = Number(e.detail.slide.dataset.marvinDelay) || ENTER_MS;
    const dwell = Number(e.detail.slide.dataset.marvinDwell) || DWELL_MS;

    enterTimer = setTimeout(() => {
      hud.dataset.mood = mood.trim();
      say.textContent = line.trim();
      hud.classList.add("is-on");
      // the gag is a cameo, not a permanent fixture: he leaves on his own
      exitTimer = setTimeout(() => hud.classList.remove("is-on"), dwell);
    }, delay);
  });
})();


/* Language rotation — the title and closing slides cycle their native lines.
   Runs only while its slide is on screen and always restarts on Kannada,
   so the host language is what the room sees first. */
(() => {
  const HOLD_MS = 3400;

  const cycles = Array.from(document.querySelectorAll("[data-lang-cycle]")).map((slide) => ({
    slide,
    groups: Array.from(slide.querySelectorAll(".lang-cycle"), (el) =>
      Array.from(el.querySelectorAll(":scope > .lang-line"))
    ),
    timer: null,
    index: 0,
  }));

  function paint(cycle) {
    cycle.groups.forEach((lines) => {
      // shorter groups just hold their last line rather than blanking out
      const i = Math.min(cycle.index, lines.length - 1);
      lines.forEach((line, n) => line.classList.toggle("is-current", n === i));
    });
  }

  function stop(cycle) {
    clearInterval(cycle.timer);
    cycle.timer = null;
  }

  function start(cycle) {
    stop(cycle);
    cycle.index = 0;
    paint(cycle);
    const count = Math.max(0, ...cycle.groups.map((lines) => lines.length));
    if (count < 2) return;
    cycle.timer = setInterval(() => {
      cycle.index = (cycle.index + 1) % count;
      paint(cycle);
    }, HOLD_MS);
  }

  cycles.forEach(paint);

  document.addEventListener("deck:slidechange", (e) => {
    cycles.forEach((cycle) => (cycle.slide === e.detail.slide ? start(cycle) : stop(cycle)));
  });
})();

(() => {
  const slides = Array.from(document.querySelectorAll(".slide"));
  const progress = document.getElementById("progress");
  const hudCounter = document.getElementById("hudCounter");
  const hudAct = document.getElementById("hudAct");
  const total = slides.length;
  let current = -1;

  const clamp = (n) => Math.max(0, Math.min(total - 1, n));

  function fragmentsOf(slide) {
    return Array.from(slide.querySelectorAll("[data-fragment]"));
  }

  function show(n, { revealAll = false } = {}) {
    n = clamp(n);
    if (n === current) return;
    const prev = slides[current];
    if (prev) {
      prev.classList.remove("active");
      // reset fragments so re-entering replays them
      fragmentsOf(prev).forEach((f) => f.classList.remove("revealed"));
    }
    current = n;
    const slide = slides[n];
    // force animation restart: reflow between class removal and re-add
    void slide.offsetWidth;
    slide.classList.add("active");
    if (revealAll) fragmentsOf(slide).forEach((f) => f.classList.add("revealed"));

    progress.style.width = `${((n + 1) / total) * 100}%`;
    hudCounter.textContent = `${String(n + 1).padStart(2, "0")} / ${total}`;
    const act = slide.dataset.act || "";
    hudAct.innerHTML = act ? act.replace(/^(Act \d+)/, "<em>$1</em>") : "";
    history.replaceState(null, "", `#${n + 1}`);
    document.dispatchEvent(new CustomEvent("deck:slidechange", { detail: { slide, index: n } }));
  }

  function next() {
    const pending = fragmentsOf(slides[current]).find((f) => !f.classList.contains("revealed"));
    if (pending) { pending.classList.add("revealed"); return; }
    show(current + 1);
  }

  function back() {
    const revealed = fragmentsOf(slides[current]).filter((f) => f.classList.contains("revealed"));
    if (revealed.length) { revealed[revealed.length - 1].classList.remove("revealed"); return; }
    // going backwards: land with fragments already revealed
    show(current - 1, { revealAll: true });
  }

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
      case " ":
      case "PageDown":
        e.preventDefault(); next(); break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
        e.preventDefault(); back(); break;
      case "Home":
        e.preventDefault(); show(0); break;
      case "End":
        e.preventDefault(); show(total - 1); break;
      case "f":
      case "F":
        toggleFullscreen(); break;
      case "b":
      case "B":
        document.body.classList.toggle("blackout"); break;
      case "Escape":
        document.body.classList.remove("blackout"); break;
    }
  });

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  // click left/right thirds to navigate (ignore clicks on links)
  document.addEventListener("click", (e) => {
    if (e.target.closest("a, button")) return;
    const x = e.clientX / window.innerWidth;
    if (x > 0.72) next();
    else if (x < 0.28) back();
  });

  // touch swipe
  let touchX = null;
  document.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 48) (dx < 0 ? next() : back());
    touchX = null;
  }, { passive: true });

  // respond to manual hash edits
  window.addEventListener("hashchange", () => {
    const n = parseInt(location.hash.slice(1), 10);
    if (!Number.isNaN(n)) show(n - 1);
  });

  // start at hash or 0
  const start = parseInt(location.hash.slice(1), 10);
  show(Number.isNaN(start) ? 0 : start - 1);
})();
