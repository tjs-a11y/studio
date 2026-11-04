import { normalizeOnDevicePayload, calculateSpreadMath } from './infrastructure-matrix.mjs';

const byId = (id) => document.getElementById(id);
const csvInput = byId('csvInput');
const csvFile = byId('csvFile');
const csvStatus = byId('csvStatus');
const csvResult = byId('csvResult');
const downloadBtn = byId('downloadBtn');
let latestMatrix = null;

const csvCell = (value) => {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
};

function matrixToCSV(result) {
  const headers = Object.keys(result.matrix[0]?.record_data || {});
  return [headers, ...result.matrix.map((row) => headers.map((header) => row.record_data[header]))]
    .map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function showMatrix(result) {
  latestMatrix = result;
  const headers = Object.keys(result.matrix[0]?.record_data || {});
  if (!result.matrix.length) {
    csvResult.hidden = false;
    csvResult.textContent = 'No data rows found. Add a header row and at least one data row.';
    downloadBtn.hidden = true;
    return;
  }
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headers.forEach((header) => { const th = document.createElement('th'); th.textContent = header; headRow.append(th); });
  thead.append(headRow);
  const tbody = document.createElement('tbody');
  result.matrix.forEach(({ record_data }) => {
    const tr = document.createElement('tr');
    headers.forEach((header) => { const td = document.createElement('td'); td.textContent = record_data[header] ?? ''; tr.append(td); });
    tbody.append(tr);
  });
  table.append(thead, tbody);
  csvResult.replaceChildren(table);
  csvResult.hidden = false;
  csvStatus.textContent = `Normalized ${result.total_records_processed} data row(s). Your CSV content stayed in this browser.`;
  downloadBtn.hidden = false;
}

byId('normalizeBtn').addEventListener('click', () => {
  try {
    const result = normalizeOnDevicePayload(csvInput.value);
    showMatrix(result);
  } catch (error) {
    latestMatrix = null;
    csvResult.hidden = false;
    csvResult.textContent = error.message;
    csvStatus.textContent = 'Could not normalize this input.';
    downloadBtn.hidden = true;
  }
});

byId('sampleBtn').addEventListener('click', () => {
  csvInput.value = 'Recipient,Group,Budget\nUser 01,Staff,100.00\nUser 02,Volunteer,50.00';
  byId('normalizeBtn').click();
});

csvFile.addEventListener('change', async () => {
  const file = csvFile.files?.[0];
  if (!file) return;
  try {
    csvInput.value = await file.text();
    csvStatus.textContent = 'File read locally. Select “Normalize locally” to preview it.';
  } catch {
    csvStatus.textContent = 'The selected file could not be read.';
  }
});

downloadBtn.addEventListener('click', () => {
  if (!latestMatrix?.matrix?.length) return;
  const blob = new Blob([matrixToCSV(latestMatrix)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'quickwell-normalized-matrix.csv';
  anchor.click();
  URL.revokeObjectURL(url);
});

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

byId('calculateBtn').addEventListener('click', () => {
  const premiumText = byId('premium').value.trim();
  const opts = {
    contracts: byId('contracts').value,
    optionType: byId('optionType').value,
    ...(premiumText === '' ? {} : { netPremiumPerShare: premiumText }),
  };
  const result = calculateSpreadMath(byId('shortStrike').value, byId('longStrike').value, opts);
  const output = byId('spreadResult');
  if (result.status !== 'SUCCESS') {
    output.textContent = result.message;
    return;
  }
  const lines = [
    `Spread width: ${money(result.spread_width)} per share`,
    `Spread width across contracts: ${money(result.spread_width_dollars)}`,
  ];
  if (result.position) {
    lines.push(`Position math: ${result.position}`);
    lines.push(`Maximum profit: ${money(result.max_profit)}`);
    lines.push(`Maximum loss: ${money(result.max_loss)}`);
    lines.push(result.breakeven == null ? result.breakeven_note : `Breakeven: ${money(result.breakeven)}`);
  } else {
    lines.push(result.note);
  }
  lines.push(result.informational_disclaimer);
  output.replaceChildren(...lines.map((line) => { const p = document.createElement('p'); p.textContent = line; return p; }));
});

byId('normalizeBtn').click();
byId('calculateBtn').click();
