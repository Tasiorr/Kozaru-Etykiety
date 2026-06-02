import { SPREADSHEET_ID } from '../config';

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export async function fetchPackages(carrier, token) {
  const range = `${carrier}!A2:L`;
  const url = `${BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (res.status === 400) return []; // zakładka jeszcze nie istnieje w Sheets
  if (!res.ok) throw new Error(`Sheets API ${res.status}`);
  const json = await res.json();
  const rows = json.values || [];
  return rows
    .map((row, i) => ({
      id:             row[8]  || row[11] || `row-${i}`, // trackingNumber → gmailId → fallback
      timestamp:      row[0]  || '',
      shipDate:       row[1]  || '',
      firstName:      row[2]  || '',
      lastName:       row[3]  || '',
      street:         row[4]  || '',
      postcode:       row[5]  || '',
      city:           row[6]  || '',
      country:        row[7]  || '',
      trackingNumber: row[8]  || '',
      labelUrl:       row[9]  || '',
      status:         row[10] || 'Nowa',
      rowIndex: i + 2,
      carrier,
    }))
    .reverse();
}

export async function fetchVintedPackages(token) {
  const range = `Vinted!A2:J`;
  const url = `${BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Sheets API (Vinted) ${res.status}`);
  const json = await res.json();
  const rows = json.values || [];
  return rows
    .map((row, i) => ({
      id:             row[9] || `vinted-${i}`, // J = Gmail ID
      timestamp:      row[0] || '',
      shipDate:       row[1] || '',
      bestellung:     row[2] || '',            // C = Bestellung
      empfaenger:     row[3] || '',            // D = Empfänger
      carrier:        row[4] || '',            // E = Przewoźnik
      trackingNumber: row[5] || '',
      transactionId:  row[6] || '',
      labelUrl:       row[7] || '',
      status:         row[8] || 'Nowa',        // I = Status
      rowIndex: i + 2,
      source: 'vinted',
    }))
    .reverse();
}

async function setStatus(carrier, rowIndex, token, status) {
  const range = `${carrier}!K${rowIndex}`;
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

async function setVintedStatus(rowIndex, token, status) {
  const range = `Vinted!I${rowIndex}`;
  const url = `${BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[status]] }),
  });
  if (!res.ok) throw new Error(`Sheets write (Vinted) ${res.status}`);
}

export const markAsSent       = (carrier, rowIndex, token) => setStatus(carrier, rowIndex, token, 'Wysłana');
export const markAsNew        = (carrier, rowIndex, token) => setStatus(carrier, rowIndex, token, 'Nowa');
export const markVintedAsSent = (rowIndex, token)          => setVintedStatus(rowIndex, token, 'Wysłana');
export const markVintedAsNew  = (rowIndex, token)          => setVintedStatus(rowIndex, token, 'Nowa');
