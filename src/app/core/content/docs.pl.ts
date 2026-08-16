import { DocsContent } from './docs.types';

export const docsPl: DocsContent = {
  title: 'Dokumentacja',
  subtitle: 'Wszystko, co warto wiedzieć o korzystaniu z NWM.',
  searchPlaceholder: 'Szukaj w dokumentacji...',
  searchEmpty: 'Brak artykułów pasujących do wyszukiwania.',
  copyLink: 'Kopiuj link do sekcji',
  linkCopied: 'Link skopiowany',
  categories: [
    {
      id: 'getting-started',
      title: 'Pierwsze kroki',
      icon: 'sparkle',
      articles: [
        {
          id: 'what-is-nwm',
          title: 'Czym jest NWM',
          blocks: [
            {
              type: 'p',
              text: 'NWM to aplikacja webowa do zamiany tekstu na mowę. Wpisujesz lub wklejasz tekst, wybierasz głos i model, dostosowujesz parametry generowania, a następnie otrzymujesz nagranie gotowe do pobrania.',
            },
            {
              type: 'p',
              text: 'Aplikacja przydaje się przy tworzeniu lektorów do filmów, zapowiedzi reklamowych, treningowych materiałów e-learningowych, wstępów do podcastów czy prototypowych dialogów w grach.',
            },
          ],
        },
        {
          id: 'quick-start',
          title: 'Szybki start',
          blocks: [
            {
              type: 'p',
              text: 'Wygenerowanie pierwszego nagrania zajmuje mniej niż minutę:',
            },
            {
              type: 'ul',
              items: [
                'Wpisz własny tekst w polu edytora lub wybierz jeden z gotowych szablonów w sekcji "Zacznij od".',
                'W panelu po prawej wybierz głos, klikając pole "Głos" — możesz też odsłuchać próbkę przed wyborem.',
                'Dobierz model oraz ustawienia prędkości, stabilności, podobieństwa i stylu do charakteru nagrania.',
                'Kliknij "Generuj mowę", aby otrzymać nagranie.',
              ],
            },
            {
              type: 'note',
              text: 'Licznik znaków pod edytorem pokazuje, ile tekstu jeszcze możesz wpisać — pojedyncze generowanie jest ograniczone do 5000 znaków.',
            },
          ],
        },
        {
          id: 'shortcuts',
          title: 'Skróty klawiszowe',
          blocks: [
            {
              type: 'kbd',
              keys: 'Ctrl / ⌘ + Enter',
              text: 'Generuje mowę bez konieczności klikania przycisku — działa w dowolnym miejscu pola tekstowego edytora.',
            },
            {
              type: 'kbd',
              keys: 'Enter',
              text: 'W panelu "Zapytaj" wysyła wiadomość do asystenta. Shift + Enter dodaje nową linię bez wysyłania.',
            },
          ],
        },
      ],
    },
    {
      id: 'voices',
      title: 'Głosy',
      icon: 'voices',
      articles: [
        {
          id: 'choosing-a-voice',
          title: 'Wybór głosu',
          blocks: [
            {
              type: 'p',
              text: 'Pole "Głos" w panelu ustawień otwiera listę dostępnych głosów wraz z krótkim opisem charakteru każdego z nich (np. stanowczy, ciepły, energiczny). Wybrany głos jest używany przy każdym kolejnym generowaniu, dopóki go nie zmienisz.',
            },
            {
              type: 'p',
              text: 'Listę można przeszukiwać — pole wyszukiwania na górze rozwijanej listy filtruje głosy po imieniu i opisie w czasie rzeczywistym.',
            },
          ],
        },
        {
          id: 'previewing-voices',
          title: 'Odsłuch próbek',
          blocks: [
            {
              type: 'p',
              text: 'Obok każdego głosu na liście oraz na stronie "Głosy" znajduje się mały przycisk odtwarzania. Kliknięcie odtwarza krótką próbkę, dzięki której usłyszysz barwę i tempo głosu jeszcze przed wyborem.',
            },
            {
              type: 'note',
              text: 'Do czasu podłączenia właściwego backendu TTS próbki odtwarzane są przez wbudowany w przeglądarkę silnik mowy z inną wysokością i tempem dla każdego głosu — to przybliżenie, nie docelowe brzmienie.',
            },
          ],
        },
        {
          id: 'browsing-all-voices',
          title: 'Przeglądanie wszystkich głosów',
          blocks: [
            {
              type: 'p',
              text: 'Przycisk "Zobacz wszystkie głosy" na dole listy rozwijanej oraz pozycja "Głosy" w menu bocznym prowadzą do dedykowanej strony z pełną, przeszukiwalną siatką głosów.',
            },
            {
              type: 'p',
              text: 'Na tej stronie każdy głos ma własną kartę z odsłuchem i przyciskiem "Wybierz" — po kliknięciu wracasz od razu do edytora z nowo wybranym głosem.',
            },
          ],
        },
      ],
    },
    {
      id: 'generation-settings',
      title: 'Ustawienia generowania',
      icon: 'sound-effects',
      articles: [
        {
          id: 'models',
          title: 'Model',
          blocks: [
            {
              type: 'p',
              text: 'Model określa kompromis między jakością a szybkością generowania. Do wyboru są cztery warianty:',
            },
            {
              type: 'ul',
              items: [
                'Ekspresyjny — najbogatsza emocjonalność i intonacja, dobry do treści reklamowych i narracyjnych.',
                'Standard — naturalne brzmienie sprawdzające się w większości języków i zastosowań.',
                'Szybki — najniższe opóźnienia przy zachowaniu dobrej jakości, dobry do szybkich iteracji.',
                'Draft — najszybszy podgląd, niższa jakość — do szybkiego sprawdzenia treści przed finalnym generowaniem.',
              ],
            },
          ],
        },
        {
          id: 'speed-stability-similarity',
          title: 'Prędkość, stabilność i podobieństwo',
          blocks: [
            {
              type: 'p',
              text: 'Prędkość kontroluje tempo mówienia — od wolniejszego po szybsze niż domyślne.',
            },
            {
              type: 'p',
              text: 'Stabilność decyduje o tym, jak bardzo intonacja może się zmieniać między zdaniami. Niższe wartości brzmią bardziej zmiennie i ekspresyjnie, wyższe — bardziej równo i przewidywalnie.',
            },
            {
              type: 'p',
              text: 'Podobieństwo określa, jak wiernie generowana mowa ma odzwierciedlać charakterystyczne cechy wybranego głosu — wyższa wartość oznacza większą wierność oryginalnej barwie.',
            },
          ],
        },
        {
          id: 'style-exaggeration',
          title: 'Przesada w stylu',
          blocks: [
            {
              type: 'p',
              text: 'Ten suwak wzmacnia charakterystyczny styl głosu — im wyższa wartość, tym bardziej wyrazista i "aktorska" staje się intonacja. Wysokie wartości warto stosować ostrożnie, ponieważ mogą wpłynąć na stabilność wymowy.',
            },
          ],
        },
        {
          id: 'output-format',
          title: 'Format wyjściowy',
          blocks: [
            {
              type: 'p',
              text: 'Dostępne są cztery formaty pliku wyjściowego: MP3 128 kbps i 192 kbps (mniejszy rozmiar pliku), WAV (bezstratny, do dalszej obróbki dźwięku) oraz OGG.',
            },
          ],
        },
      ],
    },
    {
      id: 'personalization',
      title: 'Personalizacja',
      icon: 'monitor',
      articles: [
        {
          id: 'theme',
          title: 'Motyw',
          blocks: [
            {
              type: 'p',
              text: 'Ikona motywu w prawym górnym rogu pozwala przełączać się między trybem jasnym, ciemnym i systemowym. Tryb systemowy podąża za ustawieniem Twojego systemu operacyjnego i aktualizuje się automatycznie, gdy je zmienisz.',
            },
            {
              type: 'note',
              text: 'Wybrany motyw jest zapamiętywany w przeglądarce, więc nie trzeba go ustawiać ponownie przy kolejnej wizycie.',
            },
          ],
        },
        {
          id: 'language',
          title: 'Język interfejsu',
          blocks: [
            {
              type: 'p',
              text: 'Ikona globusa obok przełącznika motywu pozwala zmienić język interfejsu między polskim a angielskim. Zmiana obejmuje cały interfejs, w tym nazwy głosów, opisy modeli i treści startowych promptów.',
            },
          ],
        },
      ],
    },
    {
      id: 'ai-assistant',
      title: 'Asystent AI',
      icon: 'send',
      articles: [
        {
          id: 'ask-panel',
          title: 'Panel Zapytaj',
          blocks: [
            {
              type: 'p',
              text: 'Przycisk "Zapytaj" w nagłówku otwiera panel czatu. Na desktopie panel zajmuje miejsce z prawej strony i zwęża resztę widoku, na telefonie otwiera się jako pełnoekranowy panel.',
            },
            {
              type: 'p',
              text: 'Asystent pomaga przy pisaniu scenariuszy, tekstów reklamowych, doborze mocnego wstępu (hooka) oraz skracaniu tekstu do sedna. Sugerowane pytania na starcie rozmowy pokazują typowe zastosowania.',
            },
          ],
        },
        {
          id: 'demo-mode',
          title: 'Tryb demo',
          blocks: [
            {
              type: 'note',
              text: 'Panel Zapytaj nie ma jeszcze podłączonego prawdziwego modelu Gemini — odpowiedzi oznaczone plakietką "DEMO" pochodzą z lokalnych, gotowych szablonów dopasowanych do słów kluczowych w pytaniu.',
            },
            {
              type: 'p',
              text: 'Po podłączeniu backendu pod adres /api/chat/gemini panel automatycznie zacznie korzystać z prawdziwych odpowiedzi modelu — bez żadnych zmian po stronie interfejsu.',
            },
          ],
        },
      ],
    },
    {
      id: 'faq',
      title: 'Najczęstsze pytania',
      icon: 'help',
      articles: [
        {
          id: 'faq-real-voices',
          title: 'Czy odsłuch głosu brzmi tak samo jak finalne nagranie?',
          blocks: [
            {
              type: 'p',
              text: 'Obecnie nie — zarówno przycisk "Generuj mowę", jak i przyciski odsłuchu próbek korzystają z wbudowanego w przeglądarkę silnika mowy, dopóki nie zostanie podłączony właściwy backend TTS. Interfejs jest w pełni gotowy na taką integrację.',
            },
          ],
        },
        {
          id: 'faq-data',
          title: 'Czy mój tekst jest gdzieś zapisywany?',
          blocks: [
            {
              type: 'p',
              text: 'Tekst w edytorze istnieje tylko w pamięci przeglądarki i nie jest nigdzie przesyłany, dopóki nie podłączysz własnego backendu do generowania mowy lub czatu z asystentem.',
            },
          ],
        },
        {
          id: 'faq-limits',
          title: 'Jaki jest limit długości tekstu?',
          blocks: [
            {
              type: 'p',
              text: 'Pojedyncze generowanie obsługuje do 5000 znaków. Licznik pod polem tekstowym pokazuje bieżące wykorzystanie limitu.',
            },
          ],
        },
        {
          id: 'faq-languages',
          title: 'Jakie języki obsługuje interfejs?',
          blocks: [
            {
              type: 'p',
              text: 'Obecnie dostępne są dwa języki interfejsu: polski i angielski. Przełącznik znajduje się w nagłówku, obok ikony motywu.',
            },
          ],
        },
      ],
    },
  ],
};
