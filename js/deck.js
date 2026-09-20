/* Entire deck — navigation, fragments, hash routing */

/* Marvin's cameos - he pops into the corner on a few slides, says one
   thing (or two), and leaves. A slide opts in with data-marvin="mood|line";
   chain beats with "||" for a reversal: "smug|line one||blank|line two".
   data-marvin-delay (enter), data-marvin-beat (gap between beats) and
   data-marvin-dwell (how long the last beat stays) tune the comic timing. */
(() => {
  const hud = document.getElementById("marvinHud");
  if (!hud) return;
  const say = hud.querySelector(".marvin-say");
  const ENTER_MS = 1500;
  const BEAT_MS = 2600;
  const DWELL_MS = 8000;
  let timers = [];

  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  function clear() {
    timers.forEach(clearTimeout);
    timers = [];
    hud.classList.remove("is-on", "is-swapping");
  }

  function speak(mood, line) {
    hud.dataset.mood = mood;
    say.textContent = line;
  }

  function parse(cue) {
    return cue.split("||").map((beat) => {
      const [mood, line = ""] = beat.split("|");
      return { mood: mood.trim(), line: line.trim() };
    });
  }

  // exposed so the party gag can borrow the corner for a moment
  window.marvinCameo = { clear, speak, hud };

  document.addEventListener("deck:slidechange", (e) => {
    clear();
    const cue = e.detail.slide.dataset.marvin;
    if (!cue) return;
    const beats = parse(cue);
    const delay = Number(e.detail.slide.dataset.marvinDelay) || ENTER_MS;
    const gap = Number(e.detail.slide.dataset.marvinBeat) || BEAT_MS;
    const dwell = Number(e.detail.slide.dataset.marvinDwell) || DWELL_MS;

    later(() => {
      speak(beats[0].mood, beats[0].line);
      hud.classList.add("is-on");
    }, delay);

    beats.slice(1).forEach((beat, i) => {
      later(() => {
        // a quick pop on the bubble so the reversal reads as a new line
        hud.classList.add("is-swapping");
        speak(beat.mood, beat.line);
        later(() => hud.classList.remove("is-swapping"), 320);
      }, delay + gap * (i + 1));
    });

    // the gag is a cameo, not a permanent fixture: he leaves on his own
    later(() => hud.classList.remove("is-on"), delay + gap * (beats.length - 1) + dwell);
  });
})();


/* Marvin party - press M and the visors rain down. Meant for the closing
   slide once the applause starts; press M again (or move on) to clean up. */
(() => {
  const COUNT = 22;
  let box = null;

  function stop({ keepCameo = false } = {}) {
    if (!box) return;
    box.remove();
    box = null;
    document.body.classList.remove("party");
    // on a slide change the cameo script has already reset the corner for
    // the new slide, so leave its timers alone
    if (!keepCameo) window.marvinCameo?.clear();
  }

  function start() {
    const proto = document.querySelector(".marvin-svg");
    if (!proto) return;
    box = document.createElement("div");
    box.id = "party";
    box.setAttribute("aria-hidden", "true");
    for (let i = 0; i < COUNT; i++) {
      const v = proto.cloneNode(true);
      v.setAttribute("class", "marvin-svg party-visor");
      v.style.setProperty("--x", `${(i / COUNT) * 100 + (Math.random() * 6 - 3)}vw`);
      v.style.setProperty("--delay", `${Math.random() * 1.8}s`);
      v.style.setProperty("--dur", `${3.2 + Math.random() * 2.4}s`);
      v.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
      v.style.setProperty("--size", `${44 + Math.random() * 52}px`);
      box.appendChild(v);
    }
    document.body.appendChild(box);
    document.body.classList.add("party");
    const cameo = window.marvinCameo;
    if (cameo) {
      cameo.clear();
      cameo.speak("party", "sakkath, bengaluru!");
      cameo.hud.classList.add("is-on");
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key !== "m" && e.key !== "M") return;
    box ? stop() : start();
  });

  document.addEventListener("deck:slidechange", () => stop({ keepCameo: true }));
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
