import { Dictionary } from './dictionary';

export const pl: Dictionary = {
  header: {
    pageTitle: 'Tekst na mowę',
    searchPlaceholder: 'Przeszukaj wszystko...',
    feedback: 'Opinie',
    docs: 'Dokumentacja',
    ask: 'Zapytaj',
    toggleSidebar: 'Przełącz menu boczne',
    theme: 'Motyw',
    themeLight: 'Jasny',
    themeDark: 'Ciemny',
    themeSystem: 'Systemowy',
    language: 'Język',
  },
  sidebar: {
    nav: 'Tekst na mowę',
    voices: 'Głosy',
    closeMenu: 'Zamknij menu',
  },
  editor: {
    placeholder:
      'Zacznij pisać tutaj lub wklej dowolny tekst, który chcesz zamienić na realistyczną mowę...',
    startFrom: 'Zacznij od',
    generate: 'Generuj mowę',
    generating: 'Generowanie…',
    errorNoSpeechEngine: 'Silnik mowy jest niedostępny w tej przeglądarce.',
  },
  voiceDropdown: {
    searchPlaceholder: 'Szukaj głosu...',
    seeAll: 'Zobacz wszystkie głosy',
    noResults: 'Brak głosów pasujących do wyszukiwania.',
    preview: 'Odsłuchaj próbkę głosu',
    stopPreview: 'Zatrzymaj odsłuch',
  },
  voicesPage: {
    title: 'Głosy',
    subtitle: 'Przeglądaj i wybierz głos, który będzie czytał Twój tekst.',
    searchPlaceholder: 'Szukaj po imieniu lub charakterze głosu...',
    select: 'Wybierz',
    current: 'Aktualny',
    empty: 'Nie znaleziono głosów pasujących do wyszukiwania.',
    backToEditor: 'Wróć do edytora',
  },
  tip: {
    title: 'Skrót klawiszowy',
    description:
      'Naciśnij Ctrl (⌘) + Enter w polu tekstu, aby wygenerować mowę bez klikania przycisku.',
  },
  settings: {
    voice: 'Głos',
    model: 'Model',
    speed: 'Prędkość',
    speedSlower: 'Wolniej',
    speedFaster: 'Szybciej',
    stability: 'Stabilność',
    stabilityVariable: 'Bardziej zmienne',
    stabilityStable: 'Bardziej stabilne',
    similarity: 'Podobieństwo',
    similarityLow: 'Niskie',
    similarityHigh: 'Wysokie',
    style: 'Przesada w stylu',
    styleNone: 'Brak',
    styleExaggerated: 'Przesadzone',
    languageOverride: 'Nadpisanie języka',
    outputFormat: 'Format wyjściowy',
  },
  starters: [
    {
      label: 'Opowiedz historię',
      text: 'Dawno, dawno temu, w małej wiosce otoczonej górami, żyła dziewczyna, która marzyła o locie...',
    },
    {
      label: 'Opowiedz głupi żart',
      text: 'Dlaczego programista pomylił Halloween z Bożym Narodzeniem? Ponieważ Oct 31 == Dec 25.',
    },
    {
      label: 'Nagraj reklamę',
      text: 'Odkryj nowy smak lata — orzeźwiający, naturalny, dostępny już dziś w Twoim sklepie!',
    },
    {
      label: 'Mów w różnych językach',
      text: 'Hello! Cześć! Hola! Bonjour! Ciao! Witamy w naszej aplikacji.',
    },
    {
      label: 'Wyreżyseruj dramatyczną scenę filmową',
      text: 'Drzwi skrzypnęły. Cisza. A potem, z mroku, dobiegł szept...',
    },
    {
      label: 'Usłysz postać z gry wideo',
      text: 'Witaj, podróżniku. Twoja przygoda dopiero się zaczyna.',
    },
    {
      label: 'Przedstaw swój podcast',
      text: 'Witajcie w kolejnym odcinku! Dziś porozmawiamy o czymś, co zmieni sposób, w jaki myślicie o technologii.',
    },
    {
      label: 'Poprowadź zajęcia medytacyjne',
      text: 'Usiądź wygodnie, zamknij oczy i weź głęboki oddech...',
    },
  ],
  voices: [
    { name: 'Marek', description: 'Stanowczy, pewny siebie' },
    { name: 'Ania', description: 'Spokojna, narracyjna' },
    { name: 'Kuba', description: 'Energiczny, pewny siebie' },
    { name: 'Zosia', description: 'Ciepła, przyjazna' },
    { name: 'Tomasz', description: 'Neutralny, uniwersalny' },
  ],
  models: [
    { name: 'Ekspresyjny', description: 'Bogata emocjonalność i intonacja' },
    { name: 'Standard', description: 'Naturalne brzmienie, wiele języków' },
    { name: 'Szybki', description: 'Najniższe opóźnienia, dobra jakość' },
    { name: 'Draft', description: 'Najszybszy podgląd, niższa jakość' },
  ],
  formats: [
    'MP3 44,1 kHz (128kbps)',
    'MP3 44,1 kHz (192kbps)',
    'WAV 44,1 kHz (bezstratny)',
    'OGG 44,1 kHz',
  ],
};
