# Kozaru Etykiety

System zarządzania wysyłkami dla sklepu Kozaru Japanese Crafts.

- **Apps Script** — co minutę sprawdza Gmail, wyciąga dane z maili przewoźników, zapisuje etykiety na Google Drive i wiersze do Google Sheets
- **PWA** — aplikacja na iPhone, czyta dane z Google Sheets, pozwala otworzyć etykietę QR i oznaczyć paczkę jako wysłaną

---

## Uruchomienie lokalne (PWA)

```bash
cd wysylki-pwa
npm install
npm run dev
```

Aplikacja działa pod `http://localhost:5173`.

Utwórz plik `wysylki-pwa/.env.local` z sekretem OAuth:

```
VITE_CLIENT_SECRET=twój_client_secret
```

---

## Deploy na GitHub Pages

Każdy `git push` na branch `master` automatycznie builduje i deployuje przez GitHub Actions.

### Pierwsze podłączenie repozytorium

```bash
git init
git remote add origin https://github.com/Tasiorr/Kozaru-Etykiety.git
git branch -M master
git push -u origin master
```

### Codzienne użycie

```bash
git add .
git commit -m "opis zmian"
git push
```

Postęp deployu widać w zakładce **Actions** na GitHubie. Aplikacja dostępna pod:
`https://tasiorr.github.io/Kozaru-Etykiety/`

### Wymagany sekret w GitHub

Wejdź na `https://github.com/Tasiorr/Kozaru-Etykiety/settings/secrets/actions` i dodaj:

| Name | Value |
|------|-------|
| `VITE_CLIENT_SECRET` | Google OAuth Client Secret |

---

## Konfiguracja Google Cloud (OAuth)

1. Wejdź na [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. Otwórz swój **OAuth 2.0 Client ID**
3. Dodaj w **Authorized JavaScript origins**:
   ```
   https://tasiorr.github.io
   http://localhost:5173
   ```
4. Dodaj w **Authorized redirect URIs**:
   ```
   https://tasiorr.github.io/Kozaru-Etykiety/
   http://localhost:5173/
   ```
5. Zapisz

**Client ID** i **Client Secret** znajdziesz na tej samej stronie — potrzebujesz ich do `.env.local` oraz sekretu GitHub.

### Dodanie użytkownika testowego

Dopóki aplikacja OAuth jest w trybie **Testing** (nie przeszła weryfikacji Google), tylko dodani użytkownicy mogą się zalogować:

1. **APIs & Services → OAuth consent screen**
2. Przewiń do sekcji **Test users**
3. Kliknij **Add users**
4. Wpisz adres Gmail który ma mieć dostęp (np. `XYZ@gmail.com`)
5. Kliknij **Save**

---

## Konfiguracja Apps Script

### Pierwsze uruchomienie

1. Wejdź na [script.google.com](https://script.google.com)
2. Utwórz nowy projekt i wgraj wszystkie pliki z folderu `apps-script/`
3. Uzupełnij `config.gs` — wpisz swoje ID arkusza i folderów Drive:

```javascript
var CONFIG = {
  SPREADSHEET_ID: 'ID_twojego_arkusza',   // z URL Sheets
  DHL_FOLDER_ID:    'ID_folderu_DHL',     // Drive → /Wysyłki/DHL/ → ID z URL
  HERMES_FOLDER_ID: 'ID_folderu_Hermes',
  GLS_FOLDER_ID:    'ID_folderu_GLS',
  DPD_FOLDER_ID:    'ID_folderu_DPD',
  TIMEZONE: 'Europe/Warsaw',
  SEARCH_DAYS_BACK: 60,
};
```

4. Włącz **Drive API**: lewy panel → **Usługi** → **Drive API** → Dodaj (wymagane do OCR etykiet Vinted)

### Instalacja triggera

Uruchom raz ręcznie funkcję `createTrigger()`:

1. Z listy funkcji (dropdown na górze edytora) wybierz `createTrigger`
2. Kliknij **Uruchom**
3. Zatwierdź uprawnienia jeśli wyskoczy okno

Od tej chwili `processNewEmails()` uruchamia się automatycznie co minutę — nawet przy zamkniętym komputerze.

Żeby sprawdzić: **Triggery** (ikona zegara po lewej) → powinien być wpis `processNewEmails | Czasowy | Co minutę`

Żeby zatrzymać: uruchom `deleteTriggers()` tak samo jak `createTrigger()`.

### Zmiana częstotliwości triggera

Skrypt domyślnie odpala się co 5 minut i działa tylko w godzinach 7:00–19:00 czasu polskiego (poza tymi godzinami kończy działanie natychmiast). Żeby zmienić interwał:

1. Uruchom `deleteTriggers()` — usuwa aktualny trigger
2. W `main.gs` zmień `.everyMinutes(5)` na inną wartość (dozwolone: `1`, `5`, `10`, `15`, `30`)
3. Uruchom `createTrigger()` — instaluje nowy trigger

Godziny aktywności (domyślnie 7–19) zmieniasz w `main.gs` w warunku:
```javascript
if (warsawHour < 7 || warsawHour >= 19) return;
```

### Debugowanie

Każdy parser ma funkcję debugującą do ręcznego testowania:

| Funkcja | Co robi |
|---------|---------|
| `debugVinted()` | Parsuje ostatni mail Vinted bez zapisu |
| `debugVintedPDF()` | Testuje OCR z załącznika PDF |
| `resetVintedProcessed()` | Czyści flagi — pozwala przeprocesować maile ponownie |

---

## Instalacja na iPhone

1. Otwórz **Safari** (tylko Safari — Chrome na iOS nie obsługuje PWA)
2. Wejdź na `https://tasiorr.github.io/Kozaru-Etykiety/`
3. Kliknij ikonę **Udostępnij** (kwadrat ze strzałką w górę) na dole
4. Wybierz **Dodaj do ekranu głównego**
5. Potwierdź nazwę → **Dodaj**

Uruchamiaj zawsze z ikonki na home screenie — działa wtedy pełnoekranowo.

### Aktualizacja po deploymencie

Safari cache'uje PWA agresywnie. Po nowym deploymencie jeśli telefon pokazuje starą wersję:
1. Usuń aplikację z home screena
2. Otwórz Safari, wejdź na adres aplikacji
3. Dodaj do ekranu głównego ponownie

---

## Struktura projektu

```
apps-script/
  main.gs       — trigger co 1 min + dispatcher
  dhl.gs        — parser maili DHL
  hermes.gs     — parser maili Hermes
  gls.gs        — parser maili GLS
  vinted.gs     — parser maili Vinted (wszystkie przewoźniki)
  sheets.gs     — zapis do Google Sheets
  drive.gs      — zapis etykiet na Google Drive
  utils.gs      — deduplikacja, formatowanie dat
  config.gs     — konfiguracja (ID arkusza, folderów, strefa czasowa)

wysylki-pwa/
  src/
    api/
      sheets.js   — odczyt/zapis Google Sheets API
    components/
      PackageCard.jsx
      PackageList.jsx
      TabBar.jsx
      LoginScreen.jsx
    hooks/
      useAuth.js    — OAuth 2.0 z PKCE + silent refresh
      usePackages.js — pobieranie danych + auto-refresh co 60s
    config.js     — CLIENT_ID, SPREADSHEET_ID, CARRIERS, MAX_SENT_VISIBLE
```
