/**
 * Ilumin Essay Tools Feedback — Google Sheet receiver (backend API only).
 *
 * This script is a lightweight receiver that accepts submissions from the
 * GitHub Pages HTML form and appends them as rows in a Google Sheet.
 *
 * It is NOT a frontend:
 *   - It renders no HTML and does not use HtmlService.
 *   - Consultants never see or visit this script's URL.
 *   - You never need to run doPost manually.
 *
 * Paste this whole file into the Apps Script editor opened from your Sheet
 * (Extensions > Apps Script), then deploy it as a Web app. Full steps:
 *   docs/development/GOOGLE_SHEETS_CONNECTION_SETUP.md
 */

// Tab (sheet) that stores responses. Created automatically if missing.
var SHEET_NAME = 'Essay Tools Feedback';

// Tool keys must match the TOOLS[].key values in index.html.
var TOOL_KEYS = [
  'topic_distribution',
  'topic_recommender',
  'essay_scorer',
  'essay_ranker',
  'school_recommender'
];

// Top-level (non-tool) fields, in the order they should appear as columns.
var TOP_LEVEL_FIELDS = [
  'consultant_name',
  'role_or_team',
  'email',
  'years_experience',
  'primary_student_segments',
  'highest_value_tool',
  'missing_tools_or_features',
  'workflow_fit',
  'concerns_or_red_lines',
  'other_comments',
  'user_agent'
];

/**
 * Simple health check. Open the /exec URL in a browser to confirm the
 * deployment is live; you should see this JSON.
 */
function doGet(e) {
  return jsonResponse_({
    status: 'ok',
    service: 'Ilumin Essay Tools Feedback receiver',
    sheet: SHEET_NAME,
    time: new Date().toISOString()
  });
}

/**
 * Receives one feedback submission and appends it as a row.
 * Uses a script lock so concurrent submissions cannot collide.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    var payload = parsePayload_(e);
    var sheet = getSheet_();
    var headers = buildHeaders_();
    ensureHeaders_(sheet, headers);
    appendRow_(sheet, headers, payload);

    return jsonResponse_({ status: 'ok', message: 'Feedback recorded.' });
  } catch (err) {
    return jsonResponse_({ status: 'error', message: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

/**
 * Extract the submission object from the incoming request.
 * Handles, in order of preference:
 *   1. A hidden form field named "payload" holding a JSON string
 *      (this is what index.html sends via its hidden-form POST).
 *   2. A raw JSON request body.
 *   3. Flat form parameters, as a last resort.
 */
function parsePayload_(e) {
  if (e && e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (ignore) {
      // fall through to flat parameters
    }
  }
  if (e && e.parameter) {
    return e.parameter;
  }
  return {};
}

/** Get the responses sheet, creating it if it does not exist. */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      'No bound spreadsheet found. Open this script from a Google Sheet ' +
      'via Extensions > Apps Script, then re-deploy.'
    );
  }
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  return sheet;
}

/** Build the full, stable header row (kept in sync with the form fields). */
function buildHeaders_() {
  var headers = ['timestamp'];
  // top-level fields except user_agent (placed near the end for readability)
  TOP_LEVEL_FIELDS.forEach(function (field) {
    if (field !== 'user_agent') {
      headers.push(field);
    }
  });
  TOOL_KEYS.forEach(function (key) {
    headers.push(key + '_usefulness');
    headers.push(key + '_priority');
    headers.push(key + '_comments');
  });
  headers.push('user_agent');
  headers.push('raw_payload'); // full JSON backup of the submission
  return headers;
}

/** Write the header row once, if the sheet has no headers yet. */
function ensureHeaders_(sheet, headers) {
  var needsHeaders =
    sheet.getLastRow() === 0 ||
    !sheet.getRange(1, 1).getValue();

  if (needsHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

/** Flatten the nested payload into a single {header: value} lookup. */
function flattenPayload_(payload) {
  var flat = {};
  TOP_LEVEL_FIELDS.forEach(function (field) {
    flat[field] = valueOrBlank_(payload[field]);
  });

  var tools = payload.tools || {};
  TOOL_KEYS.forEach(function (key) {
    var tool = tools[key] || {};
    flat[key + '_usefulness'] = valueOrBlank_(tool.usefulness);
    flat[key + '_priority'] = valueOrBlank_(tool.priority);
    flat[key + '_comments'] = valueOrBlank_(tool.comments);
  });
  return flat;
}

/** Append one submission as a row, in header order. */
function appendRow_(sheet, headers, payload) {
  var flat = flattenPayload_(payload);
  var row = headers.map(function (header) {
    if (header === 'timestamp') {
      return new Date();
    }
    if (header === 'raw_payload') {
      return JSON.stringify(payload);
    }
    return valueOrBlank_(flat[header]);
  });
  sheet.appendRow(row);
}

function valueOrBlank_(value) {
  return (value === undefined || value === null) ? '' : value;
}

/** Return a JSON HTTP response (read by tools/curl; the form does not read it). */
function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
