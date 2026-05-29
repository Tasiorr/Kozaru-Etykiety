OAuth kozaru.shop@gmail.com
317294841098-eb6suh0368i35aprnj5hi5jfoi5dk3gd.apps.googleusercontent.com


Wejdź na console.cloud.google.com → APIs & Services → Credentials → Twój OAuth 2.0 Client ID i dodaj:

  Authorized JavaScript origins:
  https://tasiorr.github.io
  http://localhost:5173

  Authorized redirect URIs: (zostaw puste — GIS używa popup, nie redirect)

  ---
  2. Dodaj repozytorium GitHub i wdróż

  cd /home/michal/Projekty/Kozaru-Etykiety
  git init
  git remote add origin https://github.com/Tasiorr/Kozaru-Etykiety.git
  cd wysylki-pwa
  npm run deploy

  Po wdrożeniu aplikacja będzie pod adresem: https://tasiorr.github.io/Kozaru-Etykiety/

  ---
  Możesz już przetestować lokalnie — npm run dev w folderze wysylki-pwa.



  ● W main.gs masz już gotową funkcję createTrigger(). Uruchom ją raz ręcznie w edytorze Apps Script:

  1. Otwórz projekt w Apps Script
  2. Z listy funkcji (dropdown na górze) wybierz createTrigger
  3. Kliknij Uruchom
  4. Zatwierdź uprawnienia jeśli wyskoczy okno

  Od tej chwili processNewEmails() będzie się uruchamiać automatycznie co minutę — bez żadnej Twojej interwencji. Trigger działa nawet gdy masz
  zamknięty komputer i przeglądarkę, bo wykonuje się po stronie Google.

  ---
  Żeby sprawdzić że trigger działa:

  Apps Script → Triggery (ikona zegara po lewej) — powinien być widoczny wpis:

  processNewEmails  |  Czasowy  |  Co minutę

  Żeby zatrzymać: uruchom deleteTriggers() tak samo jak createTrigger().


  ● 1. Otwórz Safari (tylko Safari — Chrome na iOS nie pozwala instalować PWA)
  2. Wejdź na adres aplikacji: https://tasiorr.github.io/Kozaru-Etykiety/
  3. Kliknij ikonę Udostępnij (kwadrat ze strzałką w górę) na dole ekranu
  4. Przewiń listę i wybierz Dodaj do ekranu głównego
  5. Potwierdź nazwę i kliknij Dodaj