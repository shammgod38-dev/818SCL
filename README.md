# 818 DSP Sales & SCL Monitor

## 1. Apps Script backend
Replace your current `Code.gs` with the included `Code.gs`. Deploy as a Web App:
- Execute as: Me
- Who has access: Anyone
- Copy the deployed URL ending in `/exec`.

## 2. Connect the GitHub frontend
Open `app.js` and replace:
`PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE`
with your Apps Script `/exec` URL.

## 3. GitHub Pages
Upload `index.html`, `style.css`, and `app.js` to the root of your GitHub repository.
Then go to Settings > Pages > Deploy from a branch > main > / (root).

Your Google Sheet remains the database. `CUSTOMER ALIAS`, `SCL MASTER`, and `SALES DATA BEATROUTE` continue to be used by the backend.
