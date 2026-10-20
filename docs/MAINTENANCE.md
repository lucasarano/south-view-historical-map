# Keeping the map up to date

The map shows whatever is in one Google Sheet, the **content sheet**. Change the sheet and the map changes: no code, no redeploy. This page is the walkthrough for whoever looks after it.

**Content sheet:** [South-View Historical Map – Content](https://docs.google.com/spreadsheets/d/1TmdpE1abFiaWOeoYWzv-XDwXrCuz3NShifqZV8q9DA4/edit)

## How it works

1. Someone visits the map.
2. The map reads the content sheet's three tabs (Entries, Connections, Settings).
3. It draws one shape per row in Entries and one line per row in Connections.
4. If Google can't be reached, the map shows the **saved copy** in `content/` instead, so it never comes up empty. The saved copy is a snapshot; it doesn't update by itself (see "Refreshing the saved copy").

A change in the sheet shows up the next time someone opens or reloads the map.

## Who can edit (test phase)

- **Anyone the sheet is shared with as an Editor can change the map.** There is no approval step while we test (see [ADR 0002](adr/0002-content-lives-in-a-google-sheet.md)).
- **The sheet must stay "Anyone with the link: Viewer".** That's how the public map reads it. Viewers can only read, and they see exactly what the map already shows. To set it: open the sheet, **Share**, **General access**, **Anyone with the link**, **Viewer**.

## The Entries tab: one row per person or event

| Column | What goes in it | Example |
|---|---|---|
| Name | The name shown on the map. Connections use it, so spell it the same everywhere. | Lucius L. Lee |
| Type | `Person` or `Event` | Person |
| Dates | Shown next to the name. Write "Dates unknown" rather than guess. | 1854–1915 |
| Year on map | Where it sits on the timeline: a single year. For a person, usually the year of the event they belong to. | 1893 |
| One line | The first thing the card says. A sentence from the notes that makes sense on its own. | An undertaker who handled many of the earliest burials at South-View. |
| Text from the notes | The full text from the team notes, word for word. Shown when someone opens the card. A blank line starts a new paragraph. | |
| Source | Book and page. | Henderson, South-View: An African American City of the Dead, p. 46 |
| Rests at South-View | `Yes`, or where they rest instead. Blank for events. | No, Oakland Cemetery (family plot) |
| How we know where they rest | For editors only, not shown on the map: "Stated in the team notes" or "Assumed…" (see [ADR 0004](adr/0004-assume-they-rest-at-south-view.md)). | |
| Picture link | A direct link to a public picture (see "Pictures"). Blank means the map shows a symbol. | |
| Picture credit | Who made it, where it's held, and that it's public domain. Shown on the card. | |
| Show on map | `Yes` to show it, `No` to hide it without deleting it. | Yes |

## The Connections tab: one row per line between two entries

| From | Connection | To |
|---|---|---|
| Lucius L. Lee | lost the pauper burial contract to | David T. Howard |

- It reads as a sentence: "Lucius L. Lee *lost the pauper burial contract to* David T. Howard."
- **From** and **To** must match a Name in Entries exactly. A row whose name doesn't match is skipped.
- Every person should connect to at least one event. That's what places them in that event's group on the map.

## The Settings tab

| Setting | What it does |
|---|---|
| Corrections form link | The Google Form the "Suggest a correction" buttons open (see below). Blank means the buttons show a "not connected yet" note. |
| Learn more link | Where "Learn more at South-View" goes. |

## Everyday tasks

**Fix a typo or a date.** Edit the cell. That's all.

**Add a person.**
1. Add a row to Entries: Name, `Person`, Dates, Year on map, One line, Text from the notes, Source, Rests at South-View, `Yes` under Show on map.
2. Add a row to Connections linking them to their event, for example "*Name* · part of · *Panic of 1893*".
3. Reload the map and find them in the Index.

**Add an event.** Add a row with Type `Event` and a Year on map, then connect people to it.

**Hide something without deleting it.** Set Show on map to `No`.

**Remove a line.** Delete its row in Connections.

## Rules for what goes on the map

These come from the team's decisions (`docs/adr/`):

1. **The team notes are the source of truth** ([ADR 0001](adr/0001-team-notes-are-the-primary-source.md)). Only people and events from the notes go on the map. South-View's tour scripts and flyers are never quoted on it.
2. **Quote the notes word for word, with the page** ([ADR 0003](adr/0003-cards-quote-the-notes.md)). Fixing a scan error is fine; list it in [content-fixes.md](content-fixes.md).
3. **Assume a person rests at South-View unless something says otherwise** ([ADR 0004](adr/0004-assume-they-rest-at-south-view.md)). Mark it as assumed in the editors' column.
4. **Pictures must be public and must clearly show that person or event.** If there isn't one, leave it blank and the map draws a symbol.

## Pictures

- **Use only public domain or openly licensed pictures** that clearly show the person or event. Good places: [Wikimedia Commons](https://commons.wikimedia.org) (check the license on the file's page) and the [Library of Congress](https://www.loc.gov/pictures/) (look for "No known restrictions").
- **Paste a direct link to the image file.** On Wikimedia Commons, open the file and copy the address of the "Original file" link. It starts with `https://upload.wikimedia.org/`. A link to the page around the image won't work.
- **Fill in Picture credit:** what it shows, who made it or where it's held, and "Public domain".
- **Never use** photos from Find a Grave, family or funeral-home sites, or news agencies.

## Corrections from visitors

The "Suggest a correction" buttons open a Google Form, and every answer lands in a new tab of the content sheet. To set it up once (about two minutes):

1. In the content sheet: **Tools**, **Create a new form**.
2. Title it "Suggest a correction to the South-View map" and add four questions:
   - "Which person or event?" (short answer)
   - "What should change?" (paragraph, required)
   - "Source, if you have one" (short answer)
   - "Your name and how you're connected (optional)" (short answer)
3. Click **Send**, choose the link icon, and copy the link.
4. Paste the link into the Settings tab, next to "Corrections form link".

Answers appear in a tab called "Form Responses 1". Read them, check them against the notes or a source, and make the change in Entries yourself. The map never changes on its own from a form answer.

## If something looks wrong

| What you see | Why | Fix |
|---|---|---|
| An entry is missing | Show on map is `No`, or it has no year in Year on map or Dates | Fix the row |
| A line is missing | From or To doesn't match a Name exactly | Copy the name from Entries |
| The map shows old content | It's using the saved copy because it can't read the sheet | Check the sheet is "Anyone with the link: Viewer" |
| A picture doesn't appear | The link isn't a direct image link, or the site blocks it | Use the upload.wikimedia.org link to the original file |
| A year typed as a number disappears | Google reads each column as one type | Leave it: the map falls back to the year in Dates, then to its event's year |

## Refreshing the saved copy

The saved copy in `content/` is what visitors see if Google is down. Refresh it now and then, for example before a presentation:

```bash
for tab in Entries Connections Settings; do curl -sL "https://docs.google.com/spreadsheets/d/1TmdpE1abFiaWOeoYWzv-XDwXrCuz3NShifqZV8q9DA4/gviz/tq?tqx=out:csv&headers=1&sheet=$tab" -o "content/$(echo $tab | tr A-Z a-z).csv"; done
```

Then commit and deploy as usual. To test the saved copy in the browser, add `?content=saved` to the map's address.

## Where things are

| File | What it is |
|---|---|
| `content.js` | Reads the content sheet (or the saved copy) and lays out the shapes |
| `app.js`, `index.html` | The map itself |
| `content/` | The saved copy, plus the spreadsheet that first seeded the sheet |
| `tools/notes_to_sheet.py` | Turned the team notes into the first content. Not needed for day-to-day edits |
| `sources/` | The team notes and South-View's documents (private, never deployed) |
| `GLOSSARY.md`, `docs/adr/` | The words we use and the decisions behind them |
