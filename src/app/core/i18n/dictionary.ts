export interface StarterCopy {
  label: string;
  text: string;
}

export interface VoiceCopy {
  name: string;
  description: string;
}

export interface ModelCopy {
  name: string;
  description: string;
}

export interface Dictionary {
  header: {
    pageTitle: string;
    searchPlaceholder: string;
    feedback: string;
    docs: string;
    ask: string;
    toggleSidebar: string;
    theme: string;
    themeLight: string;
    themeDark: string;
    themeSystem: string;
    language: string;
  };
  sidebar: {
    nav: string;
    closeMenu: string;
  };
  editor: {
    placeholder: string;
    startFrom: string;
    generate: string;
    generating: string;
    errorNoSpeechEngine: string;
  };
  tip: {
    title: string;
    description: string;
  };
  settings: {
    voice: string;
    model: string;
    speed: string;
    speedSlower: string;
    speedFaster: string;
    stability: string;
    stabilityVariable: string;
    stabilityStable: string;
    similarity: string;
    similarityLow: string;
    similarityHigh: string;
    style: string;
    styleNone: string;
    styleExaggerated: string;
    languageOverride: string;
    outputFormat: string;
  };
  starters: StarterCopy[];
  voices: VoiceCopy[];
  models: ModelCopy[];
  formats: string[];
}
