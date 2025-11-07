// CSV utilities
// Build and trigger CSV download from array data or DOM table rows

export function downloadCsvFromRows(rows, filename) {
  let csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function sanitizeCsvField(value) {
  if (value == null) return '';
  const str = String(value).replaceAll('\n', ' ').replaceAll('\r', ' ');
  const needsQuotes = /[",]/.test(str);
  return needsQuotes ? '"' + str.replaceAll('"', '""') + '"' : str;
}


