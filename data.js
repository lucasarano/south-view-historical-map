// Prototype content. SAMPLE ONLY: every claim must be confirmed in the team's
// source log and approved by South-View before anything is published.
//
// type:   person | event | place
// year:   where the node sits in depth (time). `when` is the label shown.
// x, y:   position across the web (themes cluster together)
// rests:  connection to South-View's grounds: true = documented, 'verify' = still to confirm
// status: 'documented' | 'verify'

export const START_YEAR = 1880;
export const END_YEAR = 2030;

export const nodes = [
  // The founding: sits on the South-View spine
  { id: 'charter', type: 'event', name: 'South-View founded', year: 1886, when: 'April 21, 1886', x: 0, y: 0,
    text: 'Nine Black businessmen chartered South-View, creating a dignified burial ground on their own terms.',
    source: 'South-View, “Our History”', more: 'Black Atlantans were made to enter segregated cemeteries through back gates. Told to start their own cemetery if they didn’t like it, nine businessmen did exactly that, and South-View became the oldest African American–controlled burial ground in Atlanta.',
    status: 'documented', famous: true },
  { id: 'mckinley', type: 'person', name: 'Jacob McKinley', year: 1886, when: 'Co-founder, 1886', x: -24, y: 12,
    text: 'One of the founders who petitioned for South-View’s charter.', source: 'South-View, “Our History”', status: 'documented', rests: 'verify', famous: true },
  { id: 'graham', type: 'person', name: 'George W. Graham', year: 1887, when: 'Co-founder, 1886', x: -6, y: 24,
    text: 'One of the founders who petitioned for South-View’s charter.', source: 'South-View, “Our History”', status: 'documented', rests: 'verify' },
  { id: 'watts', type: 'person', name: 'Albert Watts', year: 1888, when: 'Co-founder, 1886', x: 16, y: 20,
    text: 'Co-founder. His family has helped lead South-View across generations.', source: 'South-View, “Our History”', status: 'documented', rests: 'verify' },
  { id: 'holmes', type: 'person', name: 'Nicodemus Holmes', year: 1889, when: 'First president', x: 26, y: 2,
    text: 'Shoe merchant and the first president of the South-View Cemetery Association.', source: 'Royster & Mehta, Building Memories', status: 'documented', rests: 'verify' },

  { id: 'panic', type: 'event', name: 'Panic of 1893', year: 1893, when: '1893', x: 32, y: 24,
    text: 'A national financial crash. Draft chapter: how South-View’s leadership weathered it.', source: 'Henderson, p. 27 (to check)', status: 'verify' },
  { id: 'grady', type: 'place', name: 'Grady Hospital', year: 1892, when: 'Opened 1892', x: 40, y: -20,
    text: 'Atlanta’s public hospital, segregated for much of its history.', source: 'Source log: pending', status: 'verify' },
  { id: 'pitt', type: 'event', name: '1902 violence in Pittsburgh', year: 1902, when: '1902', x: -42, y: -14,
    text: 'Violence in Atlanta’s Pittsburgh community. Its South-View connection is still being checked.', source: 'Henderson, p. 115 (to check)', status: 'verify', rests: 'verify' },
  { id: 'atlantalife', type: 'place', name: 'Atlanta Life Insurance', year: 1905, when: 'Founded 1905', x: 50, y: 42,
    text: 'Black-owned insurance company founded by Alonzo Herndon.', source: 'Source log: pending', status: 'verify' },
  { id: 'herndon', type: 'person', name: 'Alonzo Herndon', year: 1912, when: '1858 – 1927', x: 4, y: 42,
    text: 'Born enslaved; founded Atlanta Life Insurance and became one of Atlanta’s first Black millionaires.', source: 'Georgia Historical Society marker', more: 'Born enslaved in Walton County, Georgia, he built a chain of barbershops in Atlanta before founding the insurance company that became Atlanta Life, one of the largest Black-owned businesses in the country.',
    status: 'documented', rests: true, famous: true },
  { id: 'massacre', type: 'event', name: '1906 Atlanta Race Massacre', year: 1906, when: 'September 1906', x: -30, y: 14,
    text: 'White mobs killed at least 25 Black Atlantans. Victims are laid to rest at South-View.', source: 'Georgia Encyclopedia; South-View burial records', more: 'Over several days in September 1906, white mobs attacked Black Atlantans, their homes and their businesses. The violence reshaped where Black Atlantans lived and organized for decades.',
    status: 'documented', rests: true, famous: true },

  { id: 'ebenezer', type: 'place', name: 'Ebenezer Baptist Church', year: 1931, when: 'King Sr. pastor from 1931', x: -46, y: 22,
    text: 'The church Rev. Martin Luther King Sr. led for more than four decades.', source: 'Source log: pending', status: 'verify' },
  { id: 'mlksr', type: 'person', name: 'Rev. Martin Luther King Sr.', year: 1940, when: '1899 – 1984', x: -26, y: 2,
    text: 'Pastor of Ebenezer Baptist Church and civil rights leader.', source: 'Georgia Historical Society marker', more: 'He led Ebenezer Baptist Church from 1931 to 1975 and pressed for equal pay for Black teachers and voter registration in Atlanta. His family is closely tied to South-View.',
    status: 'documented', rests: true, famous: true },
  { id: 'urbanleague', type: 'place', name: 'Atlanta Urban League', year: 1943, when: 'Led by Hamilton, 1943 – 1961', x: 22, y: 26,
    text: 'Civic organization working on housing, jobs and health for Black Atlantans.', source: 'Source log: pending', status: 'verify' },
  { id: 'hamilton', type: 'person', name: 'Grace Towns Hamilton', year: 1955, when: '1907 – 1992', x: 4, y: 6,
    text: 'Civic leader and legislator who fought for health care and housing for Black Atlantans.', source: 'Partner-named figure; source log pending', more: 'She led the Atlanta Urban League from 1943 to 1961, documenting housing and health conditions in Black neighborhoods. In 1965 she became the first Black woman elected to the Georgia General Assembly, where she served for two decades.',
    status: 'verify', rests: 'verify', famous: true },
  { id: 'hughes', type: 'place', name: 'Hughes Spalding Hospital', year: 1952, when: 'Opened 1952', x: 34, y: -12,
    text: 'Hospital where Black physicians could practice and Black patients could receive care.', source: 'Partner-named; source log pending', status: 'verify' },
  { id: 'mcclendon', type: 'person', name: 'Dr. Frederick E. McClendon', year: 1958, when: 'Dates to verify', x: 50, y: 8,
    text: 'Physician who founded the McClendon Clinic.', source: 'Partner-named figure; source log pending', status: 'verify', rests: 'verify', famous: true },
  { id: 'clinic', type: 'place', name: 'McClendon Clinic', year: 1960, when: 'Dates to verify', x: 62, y: -14,
    text: 'Clinic founded by Dr. McClendon. History still being researched.', source: 'Source log: pending', status: 'verify' },
  { id: 'legislature', type: 'event', name: 'Hamilton elected to Georgia House', year: 1965, when: '1965', x: -14, y: 28,
    text: 'Grace Towns Hamilton becomes the first Black woman elected to the Georgia General Assembly.', source: 'Source log: pending', status: 'verify' },
  { id: 'king1968', type: 'event', name: 'Dr. King first laid to rest here', year: 1968, when: 'April 1968', x: -36, y: -10,
    text: 'Dr. Martin Luther King Jr. was first buried at South-View before being moved to the King Center.', source: 'South-View, “Our History”', more: 'After his assassination in April 1968, Dr. Martin Luther King Jr. was first buried at South-View, near his grandparents, before his remains were moved to the King Center.',
    status: 'documented', rests: true, famous: true },
  { id: 'yancey', type: 'person', name: 'Dr. Asa G. Yancey Sr.', year: 1972, when: '1916 – 2013', x: 26, y: -30,
    text: 'Surgeon and Grady Hospital’s first Black chief of staff.', source: 'Partner-named figure; source log pending', status: 'verify', rests: 'verify', famous: true },
  { id: 'wattsjr', type: 'person', name: 'Albert H. Watts', year: 1977, when: 'President-Treasurer, 1977 – 2001', x: -8, y: -26,
    text: 'Grandson of co-founder Albert Watts. Began by digging graves; served South-View for sixty years.', source: 'South-View, “Our History”', more: 'He began at South-View digging graves and rose to lead it, carrying the founders’ work across a lifetime of service.',
    status: 'documented' },
  { id: 'children', type: 'event', name: 'Missing and Murdered Children of Atlanta', year: 1980, when: '1979 – 1981', x: -50, y: 8,
    text: 'At least 28 Black children and young adults were murdered. Several rest at South-View. Names appear only with family consent.', source: 'Partner-named; South-View burial records', more: 'Between 1979 and 1981, Black children and young adults across Atlanta went missing and were found murdered. Families organized to demand answers, and many questions remain open. The map follows families’ wishes on how their children are remembered.',
    status: 'documented', rests: true, famous: true },

  // Today: end of the spine
  { id: 'today', type: 'event', name: 'Descendants lead South-View today', year: 2026, when: 'Today', x: 0, y: 0,
    text: 'Descendants of the founders still lead South-View, which keeps growing and welcoming families.', source: 'South-View, “Our History”', status: 'documented', famous: true },
];

// Each link points from source (a) to target (b): "a  rel  b".
// Documented connections are solid, unconfirmed ones are dashed.
export const links = [
  { a: 'mckinley', b: 'charter', rel: 'co-founded' },
  { a: 'graham', b: 'charter', rel: 'co-founded' },
  { a: 'watts', b: 'charter', rel: 'co-founded' },
  { a: 'holmes', b: 'charter', rel: 'first president of' },
  { a: 'holmes', b: 'panic', rel: 'led South-View through', verify: true },
  { a: 'watts', b: 'wattsjr', rel: 'grandfather of' },
  { a: 'wattsjr', b: 'today', rel: 'carried the family’s leadership into' },
  { a: 'herndon', b: 'atlantalife', rel: 'founded' },
  { a: 'mlksr', b: 'ebenezer', rel: 'pastor of' },
  { a: 'mlksr', b: 'king1968', rel: 'father of Dr. King, first laid to rest' },
  { a: 'hamilton', b: 'urbanleague', rel: 'led' },
  { a: 'hamilton', b: 'legislature', rel: 'was elected in' },
  { a: 'hamilton', b: 'hughes', rel: 'championed' },
  { a: 'hughes', b: 'grady', rel: 'affiliated with', verify: true },
  { a: 'yancey', b: 'grady', rel: 'first Black chief of staff at' },
  { a: 'yancey', b: 'hughes', rel: 'practiced at', verify: true },
  { a: 'mcclendon', b: 'clinic', rel: 'founded' },
];
