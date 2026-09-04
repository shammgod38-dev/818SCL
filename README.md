# 818 DSP Sales & SCL Monitor — GitHub Version

This frontend is designed for GitHub Pages and uses Google Apps Script as the JSONP API for the Google Sheet backend.

## Included features
- DSP 1–4 SCL performance dashboard
- Overview and all-exceptions review
- Customer aliases / temporary sales mapping
- Actual Frequency based on real monthly order activity, normalized to the observed Monday–Saturday work period
- Assigned Frequency vs Actual Frequency review
- Weekly order activity in customer details
- Downloadable DSP Manager PDF report
- Downloadable CSV report
- Mobile-friendly interface

## Setup
1. Paste `Code.gs` into the Apps Script project attached to the Google Sheet.
2. Deploy Apps Script as a Web App: Execute as **Me**, access **Anyone**.
3. Copy the deployed `/exec` URL.
4. Paste it into `API_URL` at the top of `app.js`.
5. Upload `index.html`, `style.css`, `app.js`, and `app-icon.png` to the GitHub repository.
6. Enable GitHub Pages from the `main` branch, root folder.

PDF export uses jsPDF and jsPDF-AutoTable loaded from jsDelivr.
