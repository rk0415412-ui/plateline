const { toQR } = require('toqr');
const fs = require('fs');

const url = 'exp://10.214.166.192:8081';
const modules = toQR(url);
const size = Math.round(Math.sqrt(modules.length));
const border = 4;
const totalSize = size + border * 2;

let rects = '';
for (let r = 0; r < size; r++) {
  for (let c = 0; c < size; c++) {
    if (modules[r * size + c]) {
      rects += `<rect x="${c + border}" y="${r + border}" width="1" height="1" fill="#0F172A" />\n`;
    }
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges" width="300" height="300">
  <rect width="${totalSize}" height="${totalSize}" fill="#FFFFFF" rx="2" />
  ${rects}
</svg>`;

fs.writeFileSync('qr.svg', svg);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PlateLine — Development Server QR Code</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0F172A;
      color: #F8FAFC;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
    }
    .card {
      background: #1E293B;
      padding: 36px 32px;
      border-radius: 20px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
      border: 1px solid #334155;
      max-width: 420px;
      width: 100%;
      text-align: center;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 26px;
      font-weight: 700;
      color: #14B8A6;
    }
    .subtitle {
      margin: 0 0 24px;
      font-size: 16px;
      color: #94A3B8;
      line-height: 1.5;
    }
    .qr-frame {
      background: #FFFFFF;
      padding: 20px;
      border-radius: 16px;
      display: inline-block;
      margin-bottom: 24px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    }
    .url-box {
      background: #0F172A;
      border: 1px solid #334155;
      padding: 12px 16px;
      border-radius: 10px;
      font-family: monospace;
      font-size: 16px;
      color: #38BDF8;
      margin-bottom: 20px;
      word-break: break-all;
    }
    .instructions {
      font-size: 15px;
      color: #CBD5E1;
      text-align: left;
      background: rgba(20, 184, 166, 0.08);
      border: 1px solid rgba(20, 184, 166, 0.2);
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    .instructions ol {
      margin: 0;
      padding-left: 20px;
    }
    .instructions li {
      margin-bottom: 6px;
    }
    .instructions li:last-child {
      margin-bottom: 0;
    }
    .footer {
      font-size: 14px;
      color: #64748B;
      margin-top: 12px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>PlateLine</h1>
    <div class="subtitle">Expo Development Server (Milestone 1)</div>
    <div class="qr-frame">
      ${svg}
    </div>
    <div class="url-box">${url}</div>
    <div class="instructions">
      <ol>
        <li>Open <b>Expo Go</b> on your Android phone.</li>
        <li>Ensure your phone is on the same Wi-Fi network.</li>
        <li>Scan the QR code above (or enter the URL manually).</li>
      </ol>
    </div>
    <div class="footer">PlateLine is a journaling tool, not a medical device.</div>
  </div>
</body>
</html>
`;

fs.writeFileSync('qr.html', html);
console.log('Successfully written qr.html and qr.svg');
