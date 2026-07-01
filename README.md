# Ilumin Essay Tools Feedback — GitHub Pages + Google Sheet Receiver

This package uses the deployment pattern Peter requested:

- The consultant-facing HTML page is hosted on GitHub Pages.
- Google Apps Script is used only as a small spreadsheet receiver.
- The HTML is not served from Apps Script.
- The response database is a Google Sheet.

## Package contents

```text
github-pages/
  index.html
  assets/
    Ilumin_Essay_Tools_Briefing.pdf

google-sheets-backend/
  Code.gs
```

## Setup overview

1. Put the contents of `github-pages/` in a GitHub Pages repo/folder.
2. Create a Google Sheet for responses.
3. Open `Extensions > Apps Script` from that Sheet.
4. Paste `google-sheets-backend/Code.gs` into the script editor.
5. Deploy the script as a Web app.
6. Copy the deployed `/exec` URL.
7. Paste that URL into `SUBMISSION_ENDPOINT` in `github-pages/index.html`.
8. Commit and push the HTML/PDF to GitHub Pages.
9. Open the GitHub Pages URL and submit one test response.
10. Confirm the row appears in the Google Sheet.

## Important

When editing the Apps Script backend later, create a new deployment version or update the existing deployment. Saving the script alone may not update the deployed `/exec` endpoint.

When editing the GitHub-hosted HTML, commit and push the changes to the GitHub Pages repo.

## Data safety

The page collects consultant feedback about proposed essay tools. It should not collect student names or student application content.
