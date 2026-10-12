# South-View Historical Map

A 3D map of the people, events and places connected to Historic South-View Cemetery in Atlanta. An LMC 3403 project by Krishna, Lucas, Grant and Matthew.

**Live:** https://south-view-historical-map.vercel.app

> **Prototype.** Stories, dates and connections are drafts that still need checking against the team's source log and review by South-View. Images are placeholders.

![Focus view](screenshots/focus.png)

## How to read it

- **Time is depth.** Each item sits at its year. Recent years are closest to you; older ones sit further back.
- **Reduce motion** (top bar) turns off every animation and lays the map out flat as a 2D graph: time runs left to right, with a decade rail along the bottom. Everything else works the same (Focus, Explore, arrows, cards). It turns on by itself when the visitor's device asks for reduced motion, the choice is remembered, and `&motion=reduced` opens it directly.
- **Corrections:** "Something need correcting? Send a request" (bottom left, or in any expanded card) opens a short form. In this prototype the form is not connected to anything, so nothing is sent.
- **Learn more:** expanded cards carry a sample link to South-View's website.
- **Shapes:** circles are people, diamonds are events, squares are places.
- **Lines** run from source to target with a small arrowhead. A **dashed** line is a connection that still needs verifying.
- **Numbers** on shapes show how many steps away they are from the selected item.

## How to use it

- **Focus** (default): click anything to select it. A short card appears; click the name for the full story, source and every connection. Click an arrow pill to travel. Scroll to zoom. Drag shapes and images to move them.
- **Explore** (switch in the top bar): scroll to move through time, drag to look around. Click anything to focus on it, or press Esc to go back.
- **Index** (top left): search and jump to any item.
- **Keys:** ← → earlier and later · `/` search · Esc close.

## Run it locally

```bash
python3 -m http.server 8790
```

Then open http://127.0.0.1:8790. No build step.

## Edit the content

Everything lives in `data.js`:

- `nodes`: one entry per person, event or place (`name`, `type`, `year`, `when`, `text`, `source`, `status`).
- `links`: one entry per connection, `{ a, b, rel }` reads "a rel b". Add `verify: true` while a link is unconfirmed (it draws dashed), and remove it once it's confirmed.

## Publish

```bash
vercel deploy --prod
```

## Files

| File | What it is |
|---|---|
| `index.html` | Page layout and styles |
| `app.js` | The 3D scene and all interaction |
| `data.js` | All content |
| `media/`, `logo/`, `fonts/` | Images, logo files, Libron font |
| `vendor/` | three.js r165 |
| `IDEAS.md` | Early design ideas |
