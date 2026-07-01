# Connecting the GitHub Pages form to a Google Sheet

This guide connects the existing consultant feedback page (hosted on GitHub
Pages) to a Google Sheet, using Google Apps Script **only as a small
receiver/API** — not as a frontend.

## Architecture

```
Consultant's browser
        │
        ▼
GitHub Pages HTML form  (index.html — the only URL consultants ever use)
        │  submits a payload (hidden form POST)
        ▼
Google Apps Script web app  (google-sheets-backend/Code.gs — doPost receiver)
        │  appends a row
        ▼
Google Sheet  ("Essay Tools Feedback" tab)
```

Key points:

- **Consultants only ever open the GitHub Pages URL.** They never see or visit
  the Apps Script URL, and they are never asked to sign in to Google.
- **Apps Script is used only as a receiver/API.** It stores no HTML and renders
  no interface. The polished page stays exactly as it is.

---

## One-time setup

### 1. Create (or open) the Google Sheet

1. Go to <https://sheets.google.com> and create a new blank spreadsheet.
2. Name it something like **Ilumin Essay Tools Feedback**.
3. You do not need to add any tabs or headers — the script creates the
   `Essay Tools Feedback` tab and its column headers automatically on the first
   submission.

### 2. Open the Apps Script editor from the Sheet

1. In the Sheet, click **Extensions → Apps Script**.
2. This opens a script that is *bound* to this Sheet (important — it lets the
   script write to this exact spreadsheet with no extra configuration).

### 3. Paste the receiver script

1. In the Apps Script editor, delete any starter contents of `Code.gs`.
2. Open `google-sheets-backend/Code.gs` from this repo and copy its entire
   contents.
3. Paste it into the editor's `Code.gs`.
4. Click the **Save** icon (💾).

### 4. Deploy as a Web app

1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description:** `Essay feedback receiver` (any label is fine)
   - **Execute as:** **Me** (your Google account)
   - **Who has access:** **Anyone**
     - This makes the endpoint reachable by the public GitHub Pages form. It
       does **not** make the Sheet public — only this receiver endpoint.
4. Click **Deploy**.
5. The first time, Google will ask you to **authorize**. Approve it. If you see
   an "unverified app" warning, click **Advanced → Go to (project name)** and
   continue — this is expected for your own script.

### 5. Copy the `/exec` URL

1. After deploying, copy the **Web app URL**. It ends in **`/exec`**, e.g.
   `https://script.google.com/macros/s/AKfyc.../exec`.
2. Use the `/exec` URL — not the `/dev` URL and not the editor URL.

**Quick check:** paste the `/exec` URL into a browser. You should see a small
JSON health-check response like:

```json
{"status":"ok","service":"Ilumin Essay Tools Feedback receiver","sheet":"Essay Tools Feedback","time":"..."}
```

### 6. Paste the URL into the HTML form

1. In this repo, open `index.html`.
2. Near the top of the `<script>` block, find:

   ```js
   const SUBMISSION_ENDPOINT = 'PASTE_GOOGLE_SCRIPT_EXEC_URL_HERE';
   ```

3. Replace the placeholder with your `/exec` URL:

   ```js
   const SUBMISSION_ENDPOINT = 'https://script.google.com/macros/s/AKfyc.../exec';
   ```

4. Leave the line just below it (`ENDPOINT_PLACEHOLDER`) unchanged — it is what
   the page uses to detect an unconfigured form.

### 7. Commit and push to GitHub Pages

```bash
git add index.html
git commit -m "Connect feedback form to Google Sheet receiver"
git push
```

GitHub Pages redeploys automatically (usually within a minute).

---

## Testing

### Test locally first (optional, recommended)

You can run the page locally with no build step:

```bash
cd /path/to/ilumin-essay-feedback
python -m http.server 8000
```

Then open <http://localhost:8000> and submit a test response. Because the
form posts to the deployed `/exec` URL, submissions from localhost land in the
same Google Sheet.

### Test the live GitHub Pages form

1. Open your GitHub Pages URL (e.g. `https://<user>.github.io/ilumin-essay-feedback/`).
2. Fill in at least the required **Name** field and submit.
3. You should see **"Thank you. Your feedback has been recorded."**

### Confirm the row appeared

1. Open the Google Sheet.
2. Look at the **Essay Tools Feedback** tab.
3. You should see a header row plus a new row containing your test submission,
   with a `timestamp` in the first column and a `raw_payload` JSON backup in the
   last column.

---

## Common failure modes and fixes

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Page says "This form is not connected yet." | `SUBMISSION_ENDPOINT` still holds the placeholder, or the URL does not contain `/exec`. | Paste the real `/exec` URL into `index.html`, commit, and push. |
| "Thank you" shows, but no row in the Sheet. | Deployment wasn't updated after editing the script, or a different Sheet is bound. | In Apps Script: **Deploy → Manage deployments → Edit → Version: New version → Deploy**. Confirm the script was opened from *this* Sheet. |
| Health-check URL shows an authorization/login screen. | "Who has access" is not set to **Anyone**. | Re-deploy the Web app with **Who has access: Anyone**. |
| Nothing happens / silent failure. | Wrong URL type pasted (`/dev` or editor URL). | Use the **`/exec`** Web app URL. |
| Changes to the script don't take effect. | Saving alone doesn't update the live endpoint. | Create a **new version** of the deployment (see row 2). |
| Old test rows clutter the Sheet. | Expected during testing. | Delete the test rows manually; keep the header row. |

---

## Notes

- Editing the script requires a **new deployment version** to go live — saving
  is not enough.
- Editing the HTML requires a **commit + push** to update GitHub Pages.
- The page collects consultant feedback only. Do not collect student names or
  student application content.
