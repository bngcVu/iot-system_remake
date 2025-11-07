// Time helpers shared across pages

export function formatDdMmYyyyHHmmss(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '';
  const pad = (n)=> (n<10?`0${n}`:`${n}`);
  return `${pad(d.getDate())}-${pad(d.getMonth()+1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}


