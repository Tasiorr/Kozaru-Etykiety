import { SPREADSHEET_ID } from '../config';

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export async function fetchPackages(carrier, token) {
  const range = `${carrier}!A2:K`;
  const url = `${BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Sheets API ${res.status}`);
  const json = await res.json();
  const rows = json.values || [];
  return rows
    .map((row, i) => ({
      id: row[10] || `row-${i}`,
      timestamp: row[0] || '',
      shipDate: row[1] || '',
      firstName: row[2] || '',
      lastName: row[3] || '',
      street: row[4] || '',
      postcode: row[5] || '',
      city: row[6] || '',
      trackingNumber: row[7] || '',
      labelUrl: row[8] || '',
      status: row[9] || 'Nowa',
      rowIndex: i + 2,
      carrier,
    }))
    .reverse();
}

async function setStatus(carrier, rowIndex, token, status) {
  const range = `${carrier}!J${rowIndex}`;
  const url = `${BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[status]] }),
  });
  if (!res.ok) throw new Error(`Sheets write ${res.status}`);
}

export const markAsSent = (carrier, rowIndex, token) => setStatus(carrier, rowIndex, token, 'Wysłana');
export const markAsNew  = (carrier, rowIndex, token) => setStatus(carrier, rowIndex, token, 'Nowa');
