# The map's content lives in a Google Sheet

Every entry and connection lives in one Google Sheet, the content sheet. The site reads it each time the page loads, so anyone with edit access can change the map without touching code or redeploying. While we're testing, anyone the sheet is shared with can edit, and there's no approval step.

## Considered options

- **Airtable:** a nicer editor, but it's another account to look after and has free-plan limits.
- **Keep the content in `data.js`:** only someone who can edit code and redeploy could change anything, and South-View can't.
