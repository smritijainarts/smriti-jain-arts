# Smriti Jain Arts — Google Sheet Managed Website

The website is now coded to load its catalogue from the Google Sheet named **Smriti Jain Arts Products**.

Spreadsheet ID already configured:
`1Nk2EYh-vV5psAIMAXXmqzhGmGDD3RHwVCUb5yg_muaw`

Sheet tab expected by the website: `Products`

## ONE-TIME Google Sheets step
Google requires you, the sheet owner, to give the product data public read-only access before a public website can load it.

1. Open the Smriti Jain Arts Products spreadsheet.
2. Click **Share**.
3. Under **General access**, choose **Anyone with the link**.
4. Keep the role set to **Viewer** and click **Done**.
5. Refresh the website.

After this one-time step, ordinary product edits in the sheet are picked up by the website when it reloads.

If the sheet is not published or is temporarily unavailable, the website now
falls back to the nine local products in `script.js`. The collection, filters,
images and WhatsApp order buttons therefore continue to work instead of showing
an error. Sheet data automatically takes over again when the endpoint responds.

## Adding a new product
Add a new row under the existing rows:
- ID: e.g. 010
- Product Name
- Category
- Price: enter a number such as 750
- Description
- Image 1 URL (main catalogue image)
- Image 2 URL through Image 5 URL (optional product-gallery images)
- Additional Image URLs is also supported if added later; separate multiple URLs
  in that cell with `|`, a semicolon, or a new line
- Available: Yes or No
- Featured: Yes or No

`Available = No` hides the product from the public catalogue.

## Images
Product photos use matching descriptive folder and file names (`images/owl-set/owl-set-1.jpeg`, etc.), so they remain easy to manage in this website package.

For NEW products, the Image URL must be a direct, publicly readable image URL. A normal private Google Drive share page is not suitable as an `<img>` source. Until an image URL is supplied, the website displays the Smriti Jain Arts logo as a fallback.

Clicking a product opens its detailed product view. `Image 1 URL` is used as the
main photo; `Image 2 URL` through `Image 5 URL` appear as selectable thumbnails.

### Product image preparation

Whenever new product photos are added, run `tools/generate_watermarked_images.py`
before committing them. This single batch step now:

1. Resizes oversized source photos to a maximum edge of 1800 pixels while
   preserving their existing filenames.
2. Creates the watermarked WebP images used in the product detail and zoom view.
3. Creates a 600-pixel `thumbnail.webp` from the image ending in `-1`.

Photos already at or below 1800 pixels are not recompressed, so rerunning the
tool does not progressively reduce their quality. Keep full-resolution camera
originals outside this website repository if archival copies are required.

## Publishing the website
This ZIP still needs to be deployed to a web host. Once deployed, you normally do NOT re-upload the website when changing names, prices, descriptions, categories, availability, or adding rows. Those changes come from Google Sheets.

