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

export interface TestimonialCopy {
  name: string;
  role: string;
  quote: string;
  date: string;
}

export interface PlanCopy {
  name: string;
  tagline: string;
  features: string[];
}

export interface TopUpCopy {
  label: string;
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
    profile: string;
    signOut: string;
  };
  sidebar: {
    nav: string;
    voices: string;
    closeMenu: string;
  };
  editor: {
    placeholder: string;
    startFrom: string;
    generate: string;
    generating: string;
    errorNoSpeechEngine: string;
  };
  voiceDropdown: {
    searchPlaceholder: string;
    seeAll: string;
    noResults: string;
    preview: string;
    stopPreview: string;
  };
  voicesPage: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    select: string;
    current: string;
    empty: string;
    backToEditor: string;
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
  ask: {
    title: string;
    subtitle: string;
    demoBadge: string;
    placeholder: string;
    emptyHint: string;
    send: string;
    close: string;
    clear: string;
    suggestions: string[];
  };
  feedbackPage: {
    title: string;
    subtitle: string;
    reviewsSuffix: string;
    filterClear: string;
    empty: string;
    writeTitle: string;
    namePlaceholder: string;
    ratingLabel: string;
    commentPlaceholder: string;
    submit: string;
    submitting: string;
    submitted: string;
    verifiedBadge: string;
    newRole: string;
    justNow: string;
  };
  profilePage: {
    title: string;
    subtitle: string;
    editProfile: string;
    save: string;
    cancel: string;
    nameLabel: string;
    emailLabel: string;
    usageTitle: string;
    usageCharacters: string;
    renewsIn: string;
    planTitle: string;
    billingMonthly: string;
    billingYearly: string;
    yearlySavings: string;
    currentPlanBadge: string;
    choosePlan: string;
    upgradeTo: string;
    downgradeTo: string;
    perMonth: string;
    perYear: string;
    free: string;
    topUpTitle: string;
    topUpSubtitle: string;
    buyPack: string;
    characters: string;
    purchaseHistory: string;
    noPurchases: string;
    purchased: string;
    accountTitle: string;
    signOut: string;
  };
  starters: StarterCopy[];
  voices: VoiceCopy[];
  models: ModelCopy[];
  formats: string[];
  testimonials: TestimonialCopy[];
  plans: PlanCopy[];
  topUps: TopUpCopy[];
}
