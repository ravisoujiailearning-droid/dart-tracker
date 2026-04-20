// ═══════════════════════════════════════════════════════════════
//  DART – Google Apps Script Backend
//  Paste this entire file into your Google Apps Script editor
// ═══════════════════════════════════════════════════════════════

const SHEET_NAME = "DARTData";

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  // Allow CORS for any origin (needed for GitHub Pages)
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    let params;

    // Handle both GET and POST
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else {
      params = e.parameter;
    }

    const action = params.action;
    const sheetId = params.sheet;

    if (!action || !sheetId) {
      output.setContent(JSON.stringify({ error: "Missing action or sheet" }));
      return output;
    }

    const ss = SpreadsheetApp.openById(sheetId);
    let sheet = ss.getSheetByName(SHEET_NAME);

    // Create the data sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.getRange(1, 1).setValue("key");
      sheet.getRange(1, 2).setValue("data");
    }

    if (action === "get") {
      // Read all data and return as a flat object { "4-21": {...}, "4-22": {...} }
      const lastRow = sheet.getLastRow();
      const result = {};

      if (lastRow > 1) {
        const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
        values.forEach(row => {
          if (row[0] && row[1]) {
            try {
              result[row[0]] = JSON.parse(row[1]);
            } catch(err) {
              // skip bad rows
            }
          }
        });
      }

      output.setContent(JSON.stringify({ data: result }));

    } else if (action === "set") {
      // Write or update a single day's data
      const key  = params.key;
      const data = typeof params.data === 'string' ? JSON.parse(params.data) : params.data;

      if (!key || !data) {
        output.setContent(JSON.stringify({ error: "Missing key or data" }));
        return output;
      }

      // Find if key already exists
      const lastRow = sheet.getLastRow();
      let found = false;

      if (lastRow > 1) {
        const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (let i = 0; i < keys.length; i++) {
          if (keys[i][0] === key) {
            sheet.getRange(i + 2, 2).setValue(JSON.stringify(data));
            found = true;
            break;
          }
        }
      }

      if (!found) {
        sheet.appendRow([key, JSON.stringify(data)]);
      }

      output.setContent(JSON.stringify({ ok: true }));

    } else {
      output.setContent(JSON.stringify({ error: "Unknown action: " + action }));
    }

  } catch (err) {
    output.setContent(JSON.stringify({ error: err.toString() }));
  }

  return output;
}
