"""Turn the team notes into the map's first content.

Run once to seed the content sheet:  python tools/notes_to_sheet.py
It reads sources/team-notes.md and writes:
  content/entries.csv, content/connections.csv, content/settings.csv  (the saved copy the site falls back to)
  content/south-view-map-content.xlsx                                (uploaded to Google Drive as the content sheet)

Card text is copied from the notes, never retyped. The only changes are the scan
fixes in FIXES, and each one is listed in docs/content-fixes.md.
After seeding, the content sheet is the source; edit it, not this script.
"""
import csv, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
notes = open(os.path.join(ROOT, 'sources/team-notes.md'), encoding='utf-8').read().split('---', 2)[2]
bullets = [re.sub(r'^\s*\*\s', '', l).strip() for l in notes.splitlines() if re.match(r'^\s*\*\s+\S', l)]

def bullet(prefix):
    hits = [b for b in bullets if b.startswith(prefix)]
    assert len(hits) == 1, (prefix, len(hits))
    return hits[0]

def after_dash(b):
    return re.split(r'\s+[-–]\s+', b, maxsplit=1)[1].strip()

HENDERSON = 'Henderson, South-View: An African American City of the Dead'
NOT_RECORDED = 'Team notes'   # the notes give no book or page for these

# (entry, old, new, why). Every fix must match exactly once.
FIXES = [
    ('Mitchell Cargile', 'mid-185os', 'mid-1850s', 'scan error'),
    ('Mitchell Cargile', 'earnings-income', 'earnings—income', 'scan error (dash)'),
    ('Mitchell Cargile', ' undertaker. 1 1 Cargile', ' undertaker. Cargile', 'footnote number'),
    ('Mitchell Cargile', 'as well. 18 He', 'as well. He', 'footnote number'),
    ('Mitchell Cargile', 'rich or poor. "21 Cargile', 'rich or poor." Cargile', 'footnote number'),
    ('Mitchell Cargile', 'its mortgage. 22 Cargile', 'its mortgage. Cargile', 'footnote number'),
    ('Lucius L. Lee', '$6 or $7.11 The', '$6 or $7. The', 'footnote number'),
    ('Lucius L. Lee', '0. H. Jones', 'O. H. Jones', 'scan error'),
    ('Lucius L. Lee', 'livery stable.2J Later', 'livery stable. Later', 'footnote number'),
    ('Lucius L. Lee', 'Charles H. Swift.24 Lee', 'Charles H. Swift. Lee', 'footnote number'),
    ('Lucius L. Lee', 'the comer of', 'the corner of', 'scan error'),
    ('Lucius L. Lee', 'history oflung', 'history of lung', 'scan error'),
    ('Lucius L. Lee', 'returned to Atlanta. 2 6 Lee', 'returned to Atlanta. Lee', 'footnote number'),
    ('David T. Howard', '"Toby."27 This', '"Toby." This', 'footnote number'),
    ('David T. Howard', 'business in 1883. 2 s An', 'business in 1883. An', 'footnote number'),
    ('David T. Howard', 'American undertakers. 29 In', 'American undertakers. In', 'footnote number'),
    ('David T. Howard', 'at Westview.3° Throughout', 'at Westview. Throughout', 'footnote number'),
    ('David T. Howard', 'and reliability.31 In', 'and reliability. In', 'footnote number'),
    ('David T. Howard', 'Toe two drivers', 'The two drivers', 'scan error'),
    ('David T. Howard', 'his decision to • 1 • cations in settling accept the contract and lamented the ongomg comp 1 • the matter.',
     'his decision to accept the contract and lamented the ongoing complications in settling the matter.', 'scan error (two lines interleaved)'),
    ('David T. Howard', 'Toe discarded bodies', 'The discarded bodies', 'scan error'),
    ('David T. Howard', 'at South-View.32 David', 'at South-View. David', 'footnote number'),
    ('David T. Howard', 'was honDauid r. Howard Jr. ored as "one of the most proficient and capable embalmers in the United Atlanta Independent, i9o7 States" by his alma mater, and one of his embalmed specimens was r--- placed',
     'was honored as "one of the most proficient and capable embalmers in the United States" by his alma mater, and one of his embalmed specimens was placed', 'photo caption ("David T. Howard Jr., Atlanta Independent, 1907") mixed into the text'),
    ('David T. Howard', 'in Cincinnati.33 His', 'in Cincinnati. His', 'footnote number'),
    ('David T. Howard', 'family business. 34 Howard', 'family business. Howard', 'footnote number'),
    ('David T. Howard', 'state of Georgia. "3s In', 'state of Georgia." In', 'footnote number'),
    ('David T. Howard', 'Cox Brothers.36', 'Cox Brothers.', 'footnote number'),
    ('George Washington', 'GEORGE WASHINGTON: CARRIAGE DRIVER ', '', "the book's section heading, not part of the text"),
    ('George Washington', 'the carriage, or hac~ver.', 'the carriage, or hack, driver.', 'scan error (best reading of "hac~ver")'),
    ('James Harrison', 'Pitsburgh', 'Pittsburgh', 'spelling'),
    ('Milton Risdon', 'burined', 'buried', 'spelling'),
    ('George Union Wilder', 'mu le-loading', 'muzzle-loading', 'scan error'),
    ('George Union Wilder', ' e was the oldest', ' He was the oldest', 'scan error'),
    ('George Union Wilder', ' (p.19 )', '', 'page reference moved to the source line'),
]

def fixed(name, text):
    for who, old, new, _ in FIXES:
        if who != name:
            continue
        assert text.count(old) == 1, (name, old, text.count(old))
        text = text.replace(old, new)
    return text.strip()

def strip_outer_quotes(t):
    t = t.strip().rstrip(',').strip()
    return t[1:-1].strip() if t.startswith('"') and t.endswith('"') else t

Y, ASSUMED = 'Yes', 'Assumed: the notes don\'t say, and nothing says otherwise'
STATED = 'Stated in the team notes'

# name, type, dates, year, one line, text, source, rests, how we know, picture, credit
P = []
def person(name, dates, year, one, text, source, rests=Y, how=ASSUMED, pic='', credit=''):
    P.append(dict(name=name, type='Person', dates=dates, year=year, one=one, text=fixed(name, text),
                  source=source, rests=rests, how=how, pic=pic, credit=credit))

def first_sentence(t):
    # a sentence ends at . ! or ? followed by a capital, but not after an initial like "C." or "L."
    return re.split(r'(?<!\s[A-Z]\.)(?<=[.!?])\s+(?=[A-Z"])', t.strip(), maxsplit=1)[0]

# Founders
b = bullet('Jacob McKinley')
person('Jacob McKinley', '1830–1896', 1886, first_sentence(b), b, HENDERSON + ', p. 18',
       rests='No, Oakland Cemetery (family plot)', how=STATED)
b = bullet('Charles H. Morgan')
person('Charles H. Morgan', 'Birth unknown – 1886', 1886, first_sentence(b), b, HENDERSON + ', p. 18')
b = bullet('George W. Graham')
# The first sentence leans on the one before it ("also began"), so the card uses the next one that stands alone.
person('George W. Graham', '1833–1894', 1886,
       'In 1871, he shattered barriers by becoming one of the first two African Americans elected to the Atlanta City Council, representing the predominantly Black Third Ward.',
       b, HENDERSON + ', pp. 19–20')
b = bullet('John Render')
person('John Render', '1845–1923', 1886, first_sentence(b), b, HENDERSON + ', p. 20', how=STATED)
b = bullet('Robert Grant')
person('Robert Grant', '1826–1896', 1886, first_sentence(b), b, HENDERSON + ', p. 21', how=STATED)
b = bullet('Albert Watts')
person('Albert Watts', 'c. 1843–1903', 1886, first_sentence(b), b, HENDERSON + ', p. 22', how=STATED)

# Panic of 1893 figures
b = after_dash(bullet('Nicodemus Holmes'))
person('Nicodemus Holmes', 'Dates unknown', 1893, "South View's first President.", b, HENDERSON + ', p. 27')
b = strip_outer_quotes(after_dash(bullet('Mitchell Cargile')))
person('Mitchell Cargile', '1811–1896', 1893, 'The first documented African American undertaker in Atlanta.',
       re.sub(r'^The first documented African American undertaker in Atlanta\.\s*"?', '', b).replace('" (pg. 47 - 48).', '').strip(),
       HENDERSON + ', pp. 47–48', how=STATED)
lee1 = after_dash(bullet('Lucius L. Lee')).replace('death " (pg. 46).', 'death"').strip()
lee2 = strip_outer_quotes(bullet('"Lucius Lee was born enslaved').replace('(pg. 48 - 49)', ''))
person('Lucius L. Lee', '1854–1915', 1893, first_sentence(lee1), lee1 + '\n\n' + lee2,
       HENDERSON + ', pp. 46, 48–49', how=STATED)
b = strip_outer_quotes(after_dash(bullet('David T. Howard')))
person('David T. Howard', '1849–1935', 1893, first_sentence(b), b, HENDERSON + ' (page not recorded in the team notes)', how=STATED,
       pic='https://upload.wikimedia.org/wikipedia/commons/1/10/David_Tobias_Howard%2C_an_undertaker%2C_his_mother%2C_and_wife%2C_Atlanta%2C_Georgia%3B_seated_in_a_horse-drawn_carriage_with_tree-shaded_house_in_background_LCCN99472385.jpg',
       credit='David T. Howard (in the carriage) with his mother and wife, about 1899. Library of Congress, African American Photographs Assembled for the 1900 Paris Exposition. Public domain.')
b = after_dash(bullet('George Washington')).replace(' (pg. 50),', '').strip()
b = b[1:] if b.startswith('"') else b   # the outer quote never closes in the notes; its last mark closes the inner quote
b = fixed('George Washington', b)
P_wash = b
P.append(dict(name='George Washington', type='Person', dates='Died 1890', year=1893,
              one="George Washington (d. 1890) worked for Miller & Brady, one of Atlanta's oldest livery stables.",
              text=b, source=HENDERSON + ', p. 50', rests=Y, how=ASSUMED, pic='', credit=''))

# Pittsburgh riot (1902)
person('Will Richardson', 'Died 1902', 1902, 'Man accused of assaulting officer S. A. Kirlan.',
       after_dash(bullet('Will Richardson')), NOT_RECORDED, how=STATED)
b = after_dash(bullet('James Harrison'))
person('James Harrison', 'Dates unknown', 1902, 'Shot while trying to escape the Pittsburgh Riot through the sewers.', b, NOT_RECORDED)
person('Milton Risdon', 'Dates unknown', 1902, "Richardson's partner in crime.",
       after_dash(bullet('Milton Risdon')), NOT_RECORDED, how=STATED)

# 1906
b = re.sub(r'^George Union Wilder \(died 1906\)\s+–\s+', '', bullet('George Union Wilder'))
person('George Union Wilder', 'Died 1906', 1906, first_sentence(fixed('George Union Wilder', b)), b,
       'Bauerlein, Negrophobia: A Race Riot in Atlanta, 1906, p. 198')
person('Frank Smith', 'Dates unknown', 1906, 'Telegraph office messenger.', after_dash(bullet('Frank Smith')), NOT_RECORDED)

# Casket scandal (1922)
b = after_dash(bullet('Samuel F. Ware'))
person('Samuel F. Ware', 'Dates unknown', 1922, first_sentence(b), b, NOT_RECORDED)

# Civil Rights Movement
b = after_dash(bullet('Irene Dobbs Jackson'))
person('Irene Dobbs Jackson', 'Dates unknown', 1961, b[0].upper() + b[1:], b[0].upper() + b[1:], NOT_RECORDED)

EVENTS = [
    dict(name='South-View founded', type='Event', dates='1886', year=1886),
    dict(name='Panic of 1893', type='Event', dates='1893', year=1893,
         pic='https://upload.wikimedia.org/wikipedia/commons/8/89/Panic_at_the_NYSE_5_May_1893_cph.3b13869.jpg',
         credit='"The recent panic," New York Stock Exchange, May 5, 1893. Frank Leslie\'s Illustrated Newspaper. Library of Congress. Public domain.'),
    dict(name='Pittsburgh Riot', type='Event', dates='1902', year=1902),
    dict(name='1906 Atlanta Massacre', type='Event', dates='1906', year=1906,
         pic='https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Atlanta_Constitution%2C_front_page%2C_September_23%2C_1906.png/500px-Atlanta_Constitution%2C_front_page%2C_September_23%2C_1906.png',
         credit='The Atlanta Constitution, front page, September 23, 1906. Public domain (via Wikimedia Commons).'),
    dict(name='Casket Scandal', type='Event', dates='1922', year=1922),
    dict(name='Civil Rights Movement', type='Event', dates='1954–1968', year=1954),
]
for e in EVENTS:
    e.update(one='', text='', source='Team notes', rests='', how='', pic=e.get('pic', ''), credit=e.get('credit', ''))

CONNECTIONS = [(f, 'co-founded', 'South-View founded') for f in
               ['Jacob McKinley', 'Charles H. Morgan', 'George W. Graham', 'John Render', 'Robert Grant', 'Albert Watts']] + [
    ('Nicodemus Holmes', 'first president of', 'South-View founded'),
    ('Nicodemus Holmes', 'helped guide South-View through', 'Panic of 1893'),
    ('Mitchell Cargile', 'lost a hearse in', 'Panic of 1893'),
    ('Lucius L. Lee', 'part of', 'Panic of 1893'),
    ('David T. Howard', 'part of', 'Panic of 1893'),
    ('George Washington', 'part of', 'Panic of 1893'),
    ('Lucius L. Lee', 'lost the pauper burial contract to', 'David T. Howard'),
    ('Will Richardson', 'killed in', 'Pittsburgh Riot'),
    ('James Harrison', 'shot while escaping', 'Pittsburgh Riot'),
    ('Milton Risdon', 'survived', 'Pittsburgh Riot'),
    ('Milton Risdon', 'partner in crime of', 'Will Richardson'),
    ('George Union Wilder', 'shot down in', '1906 Atlanta Massacre'),
    ('Frank Smith', 'part of', '1906 Atlanta Massacre'),
    ('Samuel F. Ware', 'arrested in', 'Casket Scandal'),
    ('Samuel F. Ware', 'nephew of', 'Lucius L. Lee'),
    ('Irene Dobbs Jackson', 'part of', 'Civil Rights Movement'),
]

# Columns as of 2026-10-21 (One line and "How we know where they rest" were dropped; the text column is Body)
ENTRY_COLS = ['Name', 'Type', 'Dates', 'Year on map', 'Body', 'Source',
              'Rests at South-View', 'Picture link', 'Picture credit', 'Show on map']
rows = [[e['name'], e['type'], e['dates'], e['year'], e['text'], e['source'], e['rests'], e['pic'], e['credit'], 'Yes']
        for e in EVENTS + P]
names = {r[0] for r in rows}
for a, _, b in CONNECTIONS:
    assert a in names and b in names, (a, b)
CONN_COLS = ['From', 'Connection', 'To']
SETTINGS = [['Setting', 'Value'], ['Corrections form link', 'https://docs.google.com/forms/d/e/1FAIpQLSeKyaw7jHWupsJnB17tQ6wtHshDZwgVq8WDsldJQIeKMwoyQg/viewform'], ['Learn more link', 'https://southviewcemetery.com/']]

out = os.path.join(ROOT, 'content'); os.makedirs(out, exist_ok=True)
def write_csv(name, header, data):
    with open(os.path.join(out, name), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(header); w.writerows(data)
write_csv('entries.csv', ENTRY_COLS, rows)
write_csv('connections.csv', CONN_COLS, [list(c) for c in CONNECTIONS])
write_csv('settings.csv', SETTINGS[0], SETTINGS[1:])

with open(os.path.join(ROOT, 'docs/content-fixes.md'), 'w', encoding='utf-8') as f:
    f.write('# Fixes made to the team notes\n\nThe cards quote the team notes word for word (see [ADR 0003](adr/0003-cards-quote-the-notes.md)). '
            'These are the only changes, all of them scan errors, stray footnote numbers or spelling. Generated by `tools/notes_to_sheet.py`.\n\n'
            '| Entry | Notes had | Card has | Why |\n|---|---|---|---|\n')
    for who, old, new, why in FIXES:
        f.write(f"| {who} | `{old.strip()}` | `{new.strip() or '(removed)'}` | {why} |\n")

try:
    import openpyxl
    from openpyxl.styles import Font, Alignment
    wb = openpyxl.Workbook()
    for i, (title, header, data) in enumerate([('Entries', ENTRY_COLS, rows), ('Connections', CONN_COLS, [list(c) for c in CONNECTIONS]),
                                               ('Settings', SETTINGS[0], SETTINGS[1:])]):
        ws = wb.active if i == 0 else wb.create_sheet()
        ws.title = title
        ws.append(header)
        for r in data:
            ws.append([str(v) if v != '' else None for v in r])   # everything as text, so Sheets never turns "1886" into a number in one row and text in another
        for c in ws[1]:
            c.font = Font(bold=True)
        ws.freeze_panes = 'A2'
        for col in ws.columns:
            width = min(60, max(len(str(c.value or '')) for c in col) + 2)
            ws.column_dimensions[col[0].column_letter].width = max(12, width)
            for c in col[1:]:
                c.alignment = Alignment(wrap_text=True, vertical='top')
    wb.save(os.path.join(out, 'south-view-map-content.xlsx'))
except ImportError:
    print('openpyxl not installed: skipped the .xlsx', file=sys.stderr)
print(f'{len(rows)} entries, {len(CONNECTIONS)} connections')
