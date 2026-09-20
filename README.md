# My-Entire

A presentation about the Developer Platform of the future.

A web-based deck for Entire.io — 24 slides across 3 acts (with a Bollywood interval in each) plus a closing invitation, built with plain HTML/CSS/JS and the Entire brand system (Entire Headline / Entire Mono, `#f25533` accent, dark neutrals). Sized for a 30–40 minute talk with a live demo in the middle.

## Presenting

Open `index.html` directly in a browser, or serve the folder:

```sh
python -m http.server 8000
# then open http://localhost:8000
```

### Controls

| Key | Action |
| --- | --- |
| `→` `↓` `Space` `PgDn` | next slide / reveal fragment |
| `←` `↑` `PgUp` | previous slide |
| `Home` / `End` | first / last slide |
| `F` | toggle fullscreen |
| `B` | toggle blackout (blank screen while demoing; `Esc` also clears) |
| `M` | toggle Marvin party (visors rain down; meant for the closing slide once the applause starts) |
| click right/left edge | next / previous |

The URL hash tracks the current slide (`#12`), so a refresh keeps your place.
