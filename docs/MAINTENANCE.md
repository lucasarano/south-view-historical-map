# Keeping the map up to date

The map shows whatever is in one Google Sheet, the **content sheet**. Change the sheet and the map changes: no code, no redeploy. This page is the walkthrough for whoever looks after it.

**Content sheet:** [South-View Historical Map – Content](https://docs.google.com/spreadsheets/d/1TmdpE1abFiaWOeoYWzv-XDwXrCuz3NShifqZV8q9DA4/edit)

## How it works

1. Someone visits the map.
2. The map reads the content sheet's three tabs (Entries, Connections, Settings).
3. It draws one shape per row in Entries and one line per row in Connections.
4. If Google can't be reached, the map shows the **saved copy** in `content/` instead, so it never comes up empty. The saved copy is a snapshot; it doesn't update by itself (see "Refreshing the saved copy").

A change in the sheet shows up the next time someone opens or reloads the map.

**How the map finds the sheet.** The sheet's ID (the long code in its address, after `/d/`) is written once in `content.js`. The map asks Google for each tab as a plain table, which Google allows only because the sheet is shared as "Anyone with the link: Viewer". Nothing else links them: no account, no password, no service in between. To point the map at a different sheet, change that ID and redeploy. The new sheet needs the same three tabs and column names.

## Who can edit (test phase)

- **Anyone the sheet is shared with as an Editor can change the map.** There is no approval step while we test (see [ADR 0002](adr/0002-content-lives-in-a-google-sheet.md)).
- **The sheet must stay "Anyone with the link: Viewer".** That's how the public map reads it. Viewers can only read, and they see exactly what the map already shows. To set it: open the sheet, **Share**, **General access**, **Anyone with the link**, **Viewer**.

## The Entries tab: one row per person or event

| Column | What goes in it | Example |
|---|---|---|
| Name | The name shown on the map. Connections use it, so spell it the same everywhere. | Lucius L. Lee |
| Type | `Person` or `Event` | Person |
| Dates | Shown next to the name. Write "Dates unknown" rather than guess. | 1854–1915 |
| Year on map | Where it sits on the timeline: a single year, as a plain number in every row. Google's feed drops cells that don't match the rest of the column. For a person, usually the year of the event they belong to. | 1893 |
| Body | The text from the team notes, word for word. The card shows its first lines, and "Learn more" (or "More") opens the rest. A blank line starts a new paragraph. | |
| Source | Each source on its own line, or numbered as `1. … 2. …`. The card lists them one by one. `*Stars*` make a title italic, and web addresses become links. | 1. Henderson, *South-View*, p. 46.  2. https://example.org/page |
| Rests at South-View | `Yes`, or where they rest instead. Blank for events. | No, Oakland Cemetery (family plot) |
| Picture link | A direct link to a picture, or `media/people/<file>.jpg` for a photo stored with the map (see "Pictures"). Blank means the map shows a symbol. | |
| Picture credit | Who or what it shows, who made it, where it's held, and that it's public domain, ending with the web address of its source. Shown on the card, and the address becomes a link. Name people in full here: the caption stops at the first ". ". | |
| Show on map | `Yes` to show it, `No` to hide it without deleting it. | Yes |

A name that appears on two rows makes one card: the second row's Body and Source are added to the first row's.

Nothing is hidden for being incomplete. A row with no Body or too few sources (events need 3, people need 1; "Team notes" doesn't count) stays on the map, and its open card ends with "Information may be incomplete." Fill in the sheet and the line goes away by itself.

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
1. Add a row to Entries: Name, `Person`, Dates, Year on map, Body, Source, Rests at South-View, `Yes` under Show on map.
2. Add a row to Connections linking them to their event, for example "*Name* · part of · *Panic of 1893*".
3. Reload the map and find them in the Index.

**Add an event.** Add a row with Type `Event` and a Year on map, then connect people to it.

**Hide something without deleting it.** Set Show on map to `No`.

**Remove a line.** Delete its row in Connections.

## When new research comes in

The sheet is the only thing to update; nothing else feeds the map.

1. Add the new facts to the sheet: new rows in Entries, new lines in Connections, or a corrected cell.
2. Quote the research word for word in Body, with the book and page in Source.
3. Optionally, keep the team's own record in step by adding the same text to `sources/team-notes.md`. The map doesn't read that file; it's the archive.

The files in `sources/` (the team notes and South-View's scripts and flyers) are reference only. Editing them changes nothing on the map.

## Rules for what goes on the map

These come from the team's decisions (`docs/adr/`):

1. **The team notes are the source of truth** ([ADR 0001](adr/0001-team-notes-are-the-primary-source.md)). Only people and events from the notes go on the map. South-View's tour scripts and flyers are never quoted on it.
2. **Quote the notes word for word, with the page** ([ADR 0003](adr/0003-cards-quote-the-notes.md)). Fixing a scan error is fine; list it in [content-fixes.md](content-fixes.md).
3. **Assume a person rests at South-View unless something says otherwise** ([ADR 0004](adr/0004-assume-they-rest-at-south-view.md)). [ADR 0004](adr/0004-assume-they-rest-at-south-view.md) lists whose burial is assumed.
4. **Pictures must be public, or South-View's own photos, and must clearly show that person or event.** If there isn't one, leave it blank and the map draws a symbol.

## Pictures

Use one of two kinds:

- **South-View's own photos.** These are the best choice; Charles H. Morgan's and Albert Watts's portraits come from South-View, via Georgia Tech's Building Memories project. Most websites don't let the map draw their images, so these photos are stored with the map in `media/people/`. Adding one means a developer puts the file there and redeploys. The Picture link is then `media/people/<file>.jpg`.
- **Public domain or openly licensed pictures** that clearly show the person or event. Good places are [Wikimedia Commons](https://commons.wikimedia.org) (check the license on the file's page) and the [Library of Congress](https://www.loc.gov/pictures/) (look for "No known restrictions"). Paste a direct link to the image file. On Wikimedia Commons, open the file and copy the address of the "Original file" link, which starts with `https://upload.wikimedia.org/`. These links work in the sheet with no developer needed.

For both kinds:
- **Fill in Picture credit:** who or what it shows, and where it comes from ("Photo courtesy of the South-View Cemetery Association", or "Library of Congress. Public domain.").
- **Never use** photos from Find a Grave, family or funeral-home sites, or news agencies.

## Corrections from visitors

The "Suggest a correction" buttons open the [corrections form](https://docs.google.com/forms/d/e/1FAIpQLScbkWoLiCwX2orTXdWUKgRNx_vihMOkPgxnnYfkHpQqNo7rgA/viewform) ("South-View Historical Map – Corrections form" in Drive). It asks four questions:
- Which person or event?
- What should change? (required)
- Source, if you have one
- Your name and how you're connected (optional)

Every answer lands in the content sheet's **Form Responses 1** tab. Read them, check each against the notes or a source, and make the change in Entries yourself. The map never changes on its own from a form answer.

- **To change the questions,** edit the form in Google Forms. The link stays the same.
- **To use a different form,** paste its link into the Settings tab, next to "Corrections form link". To make a new linked form, use **Tools**, **Create a new form** in the content sheet, then **Publish**.

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
