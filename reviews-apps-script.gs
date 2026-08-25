const REVIEWS_SHEET_NAME = "Reviews";
const REVIEW_COLUMNS = 8;
const MAX_PUBLIC_REVIEWS = 40;

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function getReviewsSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REVIEWS_SHEET_NAME);
  if (!sheet) throw new Error(`The ${REVIEWS_SHEET_NAME} tab was not found.`);
  return sheet;
}

function doGet() {
  try {
    const sheet = getReviewsSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonResponse({ ok: true, reviews: [] });

    const rows = sheet.getRange(2, 1, lastRow - 1, REVIEW_COLUMNS).getValues();
    const reviews = rows
      .filter(row => String(row[5]).trim().toLowerCase() === "approved" && row[4] && row[7] !== "setup-example")
      .map(row => ({
        name: cleanText(row[1], 60),
        product: cleanText(row[2], 100),
        rating: Math.max(1, Math.min(5, Number(row[3]) || 5)),
        review: cleanText(row[4], 500),
        date: row[6] || row[0] || ""
      }))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, MAX_PUBLIC_REVIEWS);

    return jsonResponse({ ok: true, reviews });
  } catch (error) {
    return jsonResponse({ ok: false, reviews: [], message: "Reviews are temporarily unavailable." });
  }
}

function doPost(event) {
  try {
    const data = JSON.parse(event && event.postData && event.postData.contents || "{}");
    if (cleanText(data.website, 100)) return jsonResponse({ ok: true });

    const name = cleanText(data.name, 60);
    const product = cleanText(data.product, 100);
    const rating = Number(data.rating);
    const review = cleanText(data.review, 500);

    if (name.length < 2) return jsonResponse({ ok: false, message: "Please enter your name." });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return jsonResponse({ ok: false, message: "Please choose a rating." });
    if (review.length < 10) return jsonResponse({ ok: false, message: "Please write at least 10 characters." });

    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, `${name}|${review}`)
      .slice(0, 12)
      .map(byte => (byte + 256).toString(16).slice(-2))
      .join("");
    const cache = CacheService.getScriptCache();
    if (cache.get(digest)) return jsonResponse({ ok: false, message: "This review was already submitted recently." });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getReviewsSheet();
      const row = sheet.getLastRow() + 1;
      sheet.getRange(row, 1, 1, REVIEW_COLUMNS).setValues([[
        new Date(), name, product, rating, review, "Pending", "", Utilities.getUuid()
      ]]);

      if (row > 2) {
        sheet.getRange(2, 1, 1, REVIEW_COLUMNS)
          .copyTo(sheet.getRange(row, 1, 1, REVIEW_COLUMNS), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
        sheet.getRange(2, 6)
          .copyTo(sheet.getRange(row, 6), SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
      }
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }

    cache.put(digest, "1", 300);
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, message: "We could not save the review. Please try again." });
  }
}

function onEdit(event) {
  if (!event || !event.range) return;
  const range = event.range;
  const sheet = range.getSheet();
  if (sheet.getName() !== REVIEWS_SHEET_NAME || range.getRow() < 2 || range.getColumn() !== 6) return;

  const approvedAt = sheet.getRange(range.getRow(), 7);
  if (String(event.value || "").trim().toLowerCase() === "approved") {
    if (!approvedAt.getValue()) approvedAt.setValue(new Date());
  } else {
    approvedAt.clearContent();
  }
}
