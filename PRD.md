# PRD — System Zarządzania Wysyłkami

**Wersja:** 1.0  
**Data:** 2026-05-26  
**Status:** Gotowy do implementacji (Faza 1 — DHL)

---

## 1. Cel projektu

Zautomatyzowany system, który:
1. Wykrywa nowe maile od przewoźników w Gmailu
2. Ekstrahuje dane paczki i zapisuje je w Google Sheets
3. Przechowuje etykiety (QR/PDF) w Google Drive
4. Udostępnia dane przez prostą aplikację mobilną PWA na iPhone

Właściciel projektu prowadzi mały sklep online i wysyła 1–20 paczek dziennie przez DHL, Hermes i GLS (docelowo więcej przewoźników).

---

## 2. Architektura systemu

```
Gmail (DHL / Hermes / GLS / ...)
           │
           ▼
  Google Apps Script
  (trigger czasowy co 1 min)
           │
     ┌─────┴──────┐
     ▼            ▼
Google Drive   Google Sheets
(etykiety QR)  (dane paczek)
                   │
                   ▼
         PWA — GitHub Pages
         (React + Vite)
                   │
                   ▼
              iPhone 13
```

Wszystkie komponenty działają w ekosystemie Google — bez zewnętrznych serwerów, bez hostingu płatnego.

---

## 3. Część 1 — Google Apps Script (backend)

### 3.1 Trigger

- Typ: **Time-based trigger** — co 1 minutę
- Skrypt sprawdza Gmail pod kątem nieprzetworzonych maili od przewoźników
- Przetworzone maile oznaczane przez zapisanie `Gmail Message ID` w Apps Script **Properties Service** (trwałe między wywołaniami) — zapobiega duplikatom
- Skrypt jest **modularny**: każdy przewoźnik ma osobną funkcję parsującą

### 3.2 Limity Apps Script (plan darmowy)

| Zasób | Limit dzienny |
|---|---|
| Czas wykonania triggerów | 6 minut |
| Wywołania zewnętrznych URL | 20 000 |
| Operacje na Sheets | 40 000 odczytów / 40 000 zapisów |

Przy wolumenie 20 paczek/dzień limity nie stanowią problemu. Należy monitorować zużycie w panelu Apps Script gdy wolumen wzrośnie.

### 3.3 Struktura Google Sheets

Jeden arkusz, zakładki per przewoźnik. Każda zakładka ma identyczną strukturę kolumn:

| Kolumna | Opis |
|---|---|
| `Timestamp` | Data i godzina dodania wiersza |
| `Data nadania` | Data z maila (np. 22.05.2026) |
| `Imię` | Imię odbiorcy |
| `Nazwisko` | Nazwisko odbiorcy |
| `Adres` | Ulica i numer |
| `Kod pocztowy` | Kod pocztowy |
| `Miasto` | Miasto |
| `Numer przesyłki` | Sendungsnummer / tracking number |
| `Link etykiety` | URL do pliku w Google Drive |
| `Status` | `Nowa` / `Wysłana` (domyślnie: `Nowa`) |
| `Gmail ID` | ID wiadomości (do deduplikacji, ukryta kolumna) |

Dodatkowa zakładka `_processed_ids` lub użycie Properties Service do przechowywania przetworzonych ID.

### 3.4 Struktura Google Drive

```
/Wysyłki/
  /DHL/
  /Hermes/
  /GLS/
```

Pliki nazywane: `[YYYY-MM-DD]_[Nazwisko]_[NumerPrzesylki].[rozszerzenie]`

### 3.5 Architektura kodu Apps Script

```javascript
// Główne pliki:
// main.gs       — trigger + dispatcher
// dhl.gs        — parser DHL
// hermes.gs     — parser Hermes (do implementacji)
// gls.gs        — parser GLS (do implementacji)
// sheets.gs     — operacje na Google Sheets
// drive.gs      — operacje na Google Drive
// utils.gs      — helpers (deduplikacja, formatowanie dat itp.)
```

---

## 4. Specyfikacja parsera — DHL (Faza 1)

### 4.1 Dane identyfikacyjne maila

| Pole | Wartość |
|---|---|
| Adres nadawcy | `noreply@dhl.com` |
| Temat maila | `Auftragsbestätigung Ihrer Online Frankierung [KOD]` |
| Język | Niemiecki |

### 4.2 Dane do wyekstrahowania z treści HTML

| Dane | Lokalizacja w mailu | Uwagi |
|---|---|---|
| Data | `Datum: DD.MM.YYYY` | W sekcji nagłówka maila |
| Imię i nazwisko | `Empfänger: [Imię Nazwisko]` | Jedno pole — parser musi rozdzielić |
| Numer przesyłki | `Sendungsnummer: [kod]` | Np. `CY734662492DE` |
| PAK-ID | `PAK-ID: PAK [kod]` | Np. `PAK LC4 6PM YL9` — identyfikator QR |

### 4.3 Kod QR i etykieta

**Ważne odkrycie:** DHL nie wysyła PDF jako załącznik. Kod QR jest **obrazkiem osadzonym bezpośrednio w HTML maila** (sekcja "Versandmarke ohne Drucker").

**Strategia zapisu etykiety — dwie opcje do weryfikacji podczas implementacji:**

**Opcja A (preferowana):** Pobrać link do obrazka QR z HTML maila (`<img src="...">` w sekcji Versandmarke) i zapisać plik `.png` do Google Drive.

**Opcja B (fallback):** Kliknięcie przycisku "Versandmarke herunterladen" prowadzi do zewnętrznego URL z PDFem — Apps Script może wykonać `UrlFetchApp.fetch(url)` żeby pobrać PDF programatycznie, jeśli URL jest dostępny bez logowania.

> **Do weryfikacji podczas implementacji:** Sprawdzić w źródle HTML maila DHL czy obrazek QR ma bezpośredni URL dostępny bez autoryzacji, czy jest to base64 osadzone inline.

### 4.4 Logika parsera DHL

```
1. Znajdź maile od noreply@dhl.com z nieprzetworzonym ID
2. Pobierz treść HTML maila
3. Wyekstrahuj: datę, imię+nazwisko, numer przesyłki, PAK-ID
4. Rozdziel imię i nazwisko (split po pierwszej spacji)
5. Wyekstrahuj URL lub dane obrazka QR
6. Zapisz etykietę do Google Drive (/Wysyłki/DHL/)
7. Dodaj wiersz do zakładki "DHL" w Google Sheets
8. Oznacz Gmail Message ID jako przetworzony
```

---

## 5. Specyfikacja parserów — Hermes i GLS (Faza 2)

Parsery zostaną zaimplementowane po zebraniu przykładowych maili. Wymagane dane przed implementacją:

- Adres nadawcy e-mail
- Temat maila (wzorzec)
- Czy dane adresowe są w HTML maila czy tylko w PDF
- Format i lokalizacja kodu QR / etykiety

Architektura jest modularna — dodanie nowego przewoźnika = dodanie jednego pliku `.gs` z funkcją parsującą.

---

## 6. Część 2 — PWA na iPhone

### 6.1 Stack techniczny

| Komponent | Technologia |
|---|---|
| Framework | React + Vite |
| Hosting | GitHub Pages (darmowy) |
| Dane | Google Sheets API v4 |
| Autoryzacja | Google OAuth 2.0 |
| Styl | Tailwind CSS |
| Instalacja na iPhone | PWA — "Dodaj do ekranu głównego" w Safari |

### 6.2 Autoryzacja — Google OAuth 2.0

Aplikacja wymaga OAuth, ponieważ arkusz zawiera dane adresowe klientów i nie powinien być publiczny.

**Flow:**
1. Użytkownik otwiera PWA → przekierowanie do ekranu logowania Google
2. Po zalogowaniu → token OAuth zapisany w pamięci sesji
3. Wszystkie wywołania Sheets API i Drive API używają tego tokenu
4. Token odświeżany automatycznie

**Wymagane zakresy OAuth:**
- `https://www.googleapis.com/auth/spreadsheets` — odczyt i zapis (status "Wysłana")
- `https://www.googleapis.com/auth/drive.readonly` — otwieranie plików etykiet

**Konfiguracja:** Google Cloud Console → nowy projekt → OAuth 2.0 Client ID → typ "Web application" → autoryzowany origin: `https://[login].github.io`

### 6.3 Funkcjonalności PWA

**Widok główny — lista paczek:**
- Zakładki per przewoźnik (DHL / Hermes / GLS)
- Domyślnie pokazuje tylko paczki ze statusem `Nowa`
- Toggle "Pokaż wysłane" żeby zobaczyć archiwum
- Pull-to-refresh
- Auto-odświeżanie co 60 sekund

**Widok paczki (po tapnięciu):**
- Imię, Nazwisko
- Pełny adres
- Numer przesyłki
- Data nadania
- Przycisk **"Otwórz etykietę QR"** → otwiera plik z Google Drive w przeglądarce
- Przycisk **"Oznacz jako wysłana"** → zmienia status w Sheets na `Wysłana`

**UI/UX:**
- Zoptymalizowany pod iPhone (duże przyciski min. 44px, czytelna typografia)
- Paczki `Nowe` wyróżnione kolorem
- Sortowanie: najnowsze na górze

### 6.4 Manifest PWA

```json
{
  "name": "Wysyłki",
  "short_name": "Wysyłki",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a73e8",
  "icons": [...]
}
```

### 6.5 Struktura projektu PWA

```
wysylki-pwa/
├── public/
│   ├── manifest.json
│   └── icon.png
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── api/
│   │   ├── sheets.js      # Google Sheets API
│   │   └── drive.js       # Google Drive API
│   ├── components/
│   │   ├── PackageList.jsx
│   │   ├── PackageCard.jsx
│   │   ├── TabBar.jsx
│   │   └── LoginScreen.jsx
│   └── hooks/
│       ├── usePackages.js  # fetch + auto-refresh
│       └── useAuth.js      # OAuth flow
├── vite.config.js
└── package.json
```

---

## 7. Plan realizacji

### Faza 0 — Przygotowanie ✅ (częściowo)

- [x] Zebrać mail od DHL — **DONE** (zrzuty ekranu dostarczone)
- [ ] Sprawdzić źródło HTML maila DHL — zidentyfikować URL obrazka QR
- [ ] Zebrać przykładowe maile od Hermes i GLS
- [ ] Założyć strukturę Google Sheets (zakładki + kolumny)
- [ ] Założyć foldery w Google Drive (`/Wysyłki/DHL/` itd.)
- [ ] Założyć projekt w Google Cloud Console (OAuth)

### Faza 1 — Apps Script: DHL

- [ ] Podstawowy trigger czasowy (co 1 min)
- [ ] Funkcja skanowania Gmaila po nadawcy `noreply@dhl.com`
- [ ] Parser HTML maila DHL (ekstrakcja danych odbiorcy)
- [ ] Pobieranie i zapis etykiety QR do Google Drive
- [ ] Zapis wiersza do zakładki "DHL" w Google Sheets
- [ ] Deduplikacja przez Properties Service
- [ ] Testy na realnych mailach DHL

### Faza 2 — Apps Script: Hermes i GLS

- [ ] Zebrać i przeanalizować maile Hermes
- [ ] Parser Hermes + testy
- [ ] Zebrać i przeanalizować maile GLS
- [ ] Parser GLS + testy

### Faza 3 — PWA

- [ ] Setup projektu: `npm create vite@latest wysylki-pwa -- --template react`
- [ ] Konfiguracja GitHub Pages w `vite.config.js`
- [ ] Google OAuth 2.0 — konfiguracja w Google Cloud Console
- [ ] Integracja Google Sheets API (odczyt danych)
- [ ] Integracja Google Drive API (otwieranie etykiet)
- [ ] Widok listy paczek z zakładkami
- [ ] Widok szczegółów paczki + otwieranie etykiety QR
- [ ] Przycisk "Oznacz jako wysłana" (zapis do Sheets)
- [ ] Pull-to-refresh + auto-odświeżanie
- [ ] Konfiguracja manifest.json (PWA)
- [ ] Deployment na GitHub Pages (`gh-pages` branch)
- [ ] Instalacja PWA na iPhone (Safari → "Dodaj do ekranu głównego")

### Faza 4 — Testy end-to-end

- [ ] Test pełnego flow: mail DHL → Sheets → Drive → iPhone
- [ ] Test deduplikacji (ten sam mail przetworzony dwa razy)
- [ ] Test przy 20 paczkach jednocześnie
- [ ] Test odświeżania w PWA w czasie rzeczywistym
- [ ] Test otwierania etykiety QR na iPhonie

---

## 8. Otwarte kwestie techniczne

| # | Kwestia | Priorytet | Dotyczy |
|---|---|---|---|
| 1 | Czy obrazek QR w mailu DHL ma bezpośredni URL, czy jest base64? | **Krytyczny** | Faza 1 |
| 2 | Czy przycisk "Versandmarke herunterladen" daje URL bez autoryzacji? | Wysoki | Faza 1 |
| 3 | Struktura maili Hermes i GLS | Wysoki | Faza 2 |
| 4 | Czy `split(" ")` wystarczy do rozdzielenia imię/nazwisko, czy zdarzają się podwójne imiona? | Niski | Faza 1 |

---

## 9. Technologie i konta — lista wymagań

Przed rozpoczęciem implementacji należy upewnić się, że poniższe zasoby są dostępne:

| Zasób | Cel | Koszt |
|---|---|---|
| Konto Google | Gmail + Sheets + Drive + Apps Script | Darmowe |
| Google Cloud Console | OAuth 2.0 Client ID | Darmowe |
| Konto GitHub | Repozytorium + GitHub Pages | Darmowe |
| Node.js (lokalnie) | Build PWA | Darmowe |

---

## 10. Wskazówki dla Claude Code

Implementuj w tej kolejności i podawaj kontekst do każdego kroku:

**Krok 1 — Apps Script:**
```
Zaimplementuj Google Apps Script do przetwarzania maili DHL.
Nadawca: noreply@dhl.com
Temat: "Auftragsbestätigung Ihrer Online Frankierung"
Dane w HTML: Empfänger (imię nazwisko), Sendungsnummer, Datum, PAK-ID
QR: obrazek w sekcji "Versandmarke ohne Drucker"
Zapisz do Google Sheets (zakładka "DHL") i Google Drive (/Wysyłki/DHL/)
Użyj Properties Service do deduplikacji po Gmail Message ID.
```

**Krok 2 — PWA setup:**
```
Stwórz projekt React + Vite jako PWA.
Skonfiguruj GitHub Pages deployment.
Zintegruj Google OAuth 2.0 (zakresy: spreadsheets, drive.readonly).
```

**Krok 3 — PWA widoki:**
```
Stwórz widok listy paczek z zakładkami per przewoźnik.
Dane z Google Sheets API v4, ID arkusza: [WSTAW_ID].
Każda paczka: imię, nazwisko, adres, numer, przycisk "Otwórz QR" i "Oznacz jako wysłana".
Auto-refresh co 60 sekund.
```