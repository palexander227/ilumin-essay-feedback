# Essay feedback form — connection fix

Short technical note on why the form was not reaching the Google Sheet and what
changed to fix it.

## 1. Root cause

The submission mechanism in `index.html` was already sound (a hidden-form POST
to a hidden iframe — a robust, CORS-safe pattern for Apps Script). The failure
was in the **"not connected" guard**, not the transport.

The original code set the endpoint and then guarded against submission like
this:

```js
const SUBMISSION_ENDPOINT = 'https://script.google.com/.../exec';
...
if (!endpoint || endpoint.includes('https://script.google.com/.../exec')) {
  status.textContent = 'This form is not connected yet...';
  return; // <-- always runs
}
```

The guard used `endpoint.includes(<the exact same URL>)`. Since the endpoint
*is* that URL, the condition was **always true**, so `handleSubmit` always
returned early with "This form is not connected yet" and never submitted.

The guard was clearly meant to detect an *unconfigured placeholder*, but it was
written to match the live URL instead.

## 2. What changed in `index.html`

Minimal, surgical changes — the design, markup, styling, and submission
transport were left untouched:

- Moved the endpoint constant to a clearly marked config block at the top of the
  `<script>` and set it to a real placeholder:
  ```js
  const SUBMISSION_ENDPOINT = 'PASTE_GOOGLE_SCRIPT_EXEC_URL_HERE';
  const ENDPOINT_PLACEHOLDER  = 'PASTE_GOOGLE_SCRIPT_EXEC_URL_HERE';
  ```
- Rewrote the guard so it can no longer drift from the endpoint value. It now
  treats the form as configured only when the endpoint is non-empty, is not the
  placeholder, and looks like a deployed web app (`/exec`):
  ```js
  const isConfigured =
    endpoint &&
    endpoint !== ENDPOINT_PLACEHOLDER &&
    endpoint.indexOf('/exec') !== -1;
  if (!isConfigured) { /* show polite "not connected yet" notice */ }
  ```

> Note: the previous hard-coded `/exec` URL was replaced with a placeholder per
> the work order (do not hard-code the personal deployment URL). If that URL was
> your live, working deployment, simply paste it back into `SUBMISSION_ENDPOINT`.
> Otherwise deploy `google-sheets-backend/Code.gs` and paste its new `/exec` URL.

The success and failure messages (polished thank-you / polite error) and the
`submitViaHiddenForm` transport were preserved as-is.

## 3. Backend script added

New file: `google-sheets-backend/Code.gs` — a receiver-only Apps Script (no
`HtmlService`, no frontend). It provides:

- `doGet(e)` — JSON health check.
- `doPost(e)` — receives a submission, appends one row, wrapped in
  `LockService` so concurrent writes can't collide.
- Helpers: `parsePayload_`, `getSheet_`, `buildHeaders_`, `ensureHeaders_`,
  `flattenPayload_`, `appendRow_`, `jsonResponse_`.

It uses the active (bound) spreadsheet, targets a tab named
`Essay Tools Feedback`, and returns JSON success/error responses (even though
the frontend does not read them).

## 4. Payload shape

The form posts a single hidden field named `payload` containing a JSON string.
Parsed, the object looks like:

```json
{
  "consultant_name": "...",
  "role_or_team": "...",
  "email": "...",
  "years_experience": "...",
  "primary_student_segments": "...",
  "highest_value_tool": "...",
  "workflow_fit": "...",
  "concerns_or_red_lines": "...",
  "missing_tools_or_features": "...",
  "other_comments": "...",
  "user_agent": "...",
  "tools": {
    "topic_distribution": { "usefulness": "...", "priority": "...", "comments": "..." },
    "topic_recommender":  { "usefulness": "...", "priority": "...", "comments": "..." },
    "essay_scorer":       { "usefulness": "...", "priority": "...", "comments": "..." },
    "essay_ranker":       { "usefulness": "...", "priority": "...", "comments": "..." },
    "school_recommender": { "usefulness": "...", "priority": "...", "comments": "..." }
  }
}
```

`doPost` reads it from `e.parameter.payload` (with fallbacks to a raw JSON body
or flat form params), so it is compatible with the hidden-form POST.

## 5. How the Sheet columns are created

`buildHeaders_()` generates a stable header row from the same field list and
`TOOL_KEYS` the form uses, so headers stay in sync with the payload:

```
timestamp,
consultant_name, role_or_team, email, years_experience, primary_student_segments,
highest_value_tool, missing_tools_or_features, workflow_fit, concerns_or_red_lines, other_comments,
topic_distribution_usefulness, topic_distribution_priority, topic_distribution_comments,
topic_recommender_usefulness,  topic_recommender_priority,  topic_recommender_comments,
essay_scorer_usefulness,       essay_scorer_priority,       essay_scorer_comments,
essay_ranker_usefulness,       essay_ranker_priority,       essay_ranker_comments,
school_recommender_usefulness, school_recommender_priority, school_recommender_comments,
user_agent, raw_payload
```

`ensureHeaders_()` writes this row only if the sheet has no headers yet, then
each submission appends one row via `appendRow_()`. The final `raw_payload`
column stores the full JSON as a backup.

## 6. How to test

1. Deploy `google-sheets-backend/Code.gs` as a Web app and paste its `/exec`
   URL into `SUBMISSION_ENDPOINT` (see
   `GOOGLE_SHEETS_CONNECTION_SETUP.md`).
2. Locally: `python -m http.server 8000`, open <http://localhost:8000>, submit a
   test response.
3. Live: open the GitHub Pages URL, submit a test response.
4. Confirm a row appears in the `Essay Tools Feedback` tab.

## 7. What a successful submission looks like

- The page shows **"Thank you. Your feedback has been recorded."**, resets the
  form, and scrolls to the top.
- A new row appears in the Google Sheet with a `timestamp` in column A and the
  full submission across the columns (JSON backup in `raw_payload`).

## 8. Remaining manual step

One manual step remains and cannot be automated from the repo (it requires
Peter's Google account): deploy the Apps Script Web app and paste the resulting
`/exec` URL into `SUBMISSION_ENDPOINT`, then commit and push. Full steps are in
`GOOGLE_SHEETS_CONNECTION_SETUP.md`.
