import { DocsContent } from './docs.types';

export const docsEn: DocsContent = {
  title: 'Documentation',
  subtitle: 'Everything worth knowing about using NWM.',
  searchPlaceholder: 'Search the docs...',
  searchEmpty: 'No articles match your search.',
  copyLink: 'Copy link to section',
  linkCopied: 'Link copied',
  categories: [
    {
      id: 'getting-started',
      title: 'Getting started',
      icon: 'sparkle',
      articles: [
        {
          id: 'what-is-nwm',
          title: 'What is NWM',
          blocks: [
            {
              type: 'p',
              text: 'NWM is a web app for converting text into speech. You type or paste text, pick a voice and model, tune the generation settings, and get back a recording ready to download.',
            },
            {
              type: 'p',
              text: "It's useful for video voiceovers, ad reads, e-learning narration, podcast intros, or prototype dialogue for games.",
            },
          ],
        },
        {
          id: 'quick-start',
          title: 'Quick start',
          blocks: [
            {
              type: 'p',
              text: 'Generating your first recording takes under a minute:',
            },
            {
              type: 'ul',
              items: [
                'Type your own text in the editor, or pick one of the ready-made prompts under "Start from".',
                'Pick a voice in the panel on the right by opening the "Voice" field — you can preview a sample before choosing.',
                'Adjust the model and the speed, stability, similarity, and style settings to match the recording.',
                'Click "Generate speech" to get your recording.',
              ],
            },
            {
              type: 'note',
              text: 'The character counter under the editor shows how much text you have left — a single generation is capped at 5000 characters.',
            },
          ],
        },
        {
          id: 'shortcuts',
          title: 'Keyboard shortcuts',
          blocks: [
            {
              type: 'kbd',
              keys: 'Ctrl / ⌘ + Enter',
              text: 'Generates speech without clicking the button — works anywhere in the editor text field.',
            },
            {
              type: 'kbd',
              keys: 'Enter',
              text: 'In the Ask panel, sends your message to the assistant. Shift + Enter adds a new line without sending.',
            },
          ],
        },
      ],
    },
    {
      id: 'voices',
      title: 'Voices',
      icon: 'voices',
      articles: [
        {
          id: 'choosing-a-voice',
          title: 'Choosing a voice',
          blocks: [
            {
              type: 'p',
              text: 'The "Voice" field in the settings panel opens a list of available voices with a short description of each one\'s character (e.g. firm, warm, energetic). The selected voice is used for every generation until you change it.',
            },
            {
              type: 'p',
              text: 'The list is searchable — the search box at the top of the dropdown filters voices by name and description in real time.',
            },
          ],
        },
        {
          id: 'previewing-voices',
          title: 'Previewing voices',
          blocks: [
            {
              type: 'p',
              text: "Each voice in the list, and on the Voices page, has a small play button next to it. Click it to play a short sample so you can hear the voice's tone and pace before picking it.",
            },
            {
              type: 'note',
              text: "Until a real TTS backend is connected, previews play through the browser's built-in speech engine with a different pitch and rate per voice — that's an approximation, not the final sound.",
            },
          ],
        },
        {
          id: 'browsing-all-voices',
          title: 'Browsing all voices',
          blocks: [
            {
              type: 'p',
              text: 'The "See all voices" button at the bottom of the dropdown, and the "Voices" entry in the sidebar, lead to a dedicated page with a full, searchable voice grid.',
            },
            {
              type: 'p',
              text: 'Each voice has its own card there with a preview and a "Select" button — clicking it takes you straight back to the editor with that voice applied.',
            },
          ],
        },
      ],
    },
    {
      id: 'generation-settings',
      title: 'Generation settings',
      icon: 'sound-effects',
      articles: [
        {
          id: 'models',
          title: 'Model',
          blocks: [
            {
              type: 'p',
              text: 'The model controls the trade-off between quality and generation speed. Four options are available:',
            },
            {
              type: 'ul',
              items: [
                'Expressive — the richest emotion and intonation, good for ads and narrative content.',
                'Standard — natural sound that works well across most languages and use cases.',
                'Fast — the lowest latency while keeping good quality, good for quick iteration.',
                'Draft — the fastest preview at lower quality — for a quick check before the final generation.',
              ],
            },
          ],
        },
        {
          id: 'speed-stability-similarity',
          title: 'Speed, stability, and similarity',
          blocks: [
            {
              type: 'p',
              text: 'Speed controls how fast the voice talks — from slower to faster than the default.',
            },
            {
              type: 'p',
              text: 'Stability controls how much the intonation can vary between sentences. Lower values sound more varied and expressive, higher values sound more even and predictable.',
            },
            {
              type: 'p',
              text: "Similarity controls how closely the generated speech should match the selected voice's distinctive character — a higher value means closer fidelity to the original tone.",
            },
          ],
        },
        {
          id: 'style-exaggeration',
          title: 'Style exaggeration',
          blocks: [
            {
              type: 'p',
              text: "This slider amplifies the voice's characteristic style — the higher the value, the more expressive and \"acted\" the intonation becomes. Use high values carefully, since they can affect pronunciation stability.",
            },
          ],
        },
        {
          id: 'output-format',
          title: 'Output format',
          blocks: [
            {
              type: 'p',
              text: 'Four output file formats are available: MP3 128kbps and 192kbps (smaller file size), WAV (lossless, for further audio processing), and OGG.',
            },
          ],
        },
      ],
    },
    {
      id: 'personalization',
      title: 'Personalization',
      icon: 'monitor',
      articles: [
        {
          id: 'theme',
          title: 'Theme',
          blocks: [
            {
              type: 'p',
              text: "The theme icon in the top-right corner switches between light, dark, and system mode. System mode follows your operating system's setting and updates automatically when you change it.",
            },
            {
              type: 'note',
              text: "Your chosen theme is remembered in the browser, so you won't need to set it again next visit.",
            },
          ],
        },
        {
          id: 'language',
          title: 'Interface language',
          blocks: [
            {
              type: 'p',
              text: 'The globe icon next to the theme switch changes the interface language between Polish and English. The change covers the whole interface, including voice names, model descriptions, and starter-prompt content.',
            },
          ],
        },
      ],
    },
    {
      id: 'ai-assistant',
      title: 'AI Assistant',
      icon: 'send',
      articles: [
        {
          id: 'ask-panel',
          title: 'The Ask panel',
          blocks: [
            {
              type: 'p',
              text: 'The "Ask" button in the header opens a chat panel. On desktop the panel takes up space on the right and narrows the rest of the view; on mobile it opens as a full-screen panel.',
            },
            {
              type: 'p',
              text: 'The assistant helps with writing scripts, ad copy, picking a strong opening hook, and trimming text down to the essentials. The suggested prompts at the start of a conversation show typical use cases.',
            },
          ],
        },
        {
          id: 'demo-mode',
          title: 'Demo mode',
          blocks: [
            {
              type: 'note',
              text: 'The Ask panel isn\'t connected to a real Gemini model yet — replies marked with a "DEMO" badge come from local, keyword-matched templates.',
            },
            {
              type: 'p',
              text: 'Once a backend is connected at /api/chat/gemini, the panel will automatically start using real model responses — with no changes needed on the interface side.',
            },
          ],
        },
      ],
    },
    {
      id: 'faq',
      title: 'Frequently asked questions',
      icon: 'help',
      articles: [
        {
          id: 'faq-real-voices',
          title: 'Does the voice preview sound like the final recording?',
          blocks: [
            {
              type: 'p',
              text: 'Not yet — both the "Generate speech" button and the voice preview buttons use the browser\'s built-in speech engine until a real TTS backend is connected. The interface is fully ready for that integration.',
            },
          ],
        },
        {
          id: 'faq-data',
          title: 'Is my text stored anywhere?',
          blocks: [
            {
              type: 'p',
              text: "Text in the editor only exists in the browser's memory and isn't sent anywhere unless you connect your own backend for speech generation or the assistant chat.",
            },
          ],
        },
        {
          id: 'faq-limits',
          title: "What's the text length limit?",
          blocks: [
            {
              type: 'p',
              text: 'A single generation supports up to 5000 characters. The counter under the text field shows your current usage.',
            },
          ],
        },
        {
          id: 'faq-languages',
          title: 'What languages does the interface support?',
          blocks: [
            {
              type: 'p',
              text: 'Two interface languages are currently available: Polish and English. The switch is in the header, next to the theme icon.',
            },
          ],
        },
      ],
    },
  ],
};
