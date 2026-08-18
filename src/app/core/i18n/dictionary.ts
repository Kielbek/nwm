import { IconName } from '../../shared/components/icon/icon.component';

export interface StarterCopy {
  label: string;
  text: string;
}

export interface VoiceCopy {
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

export interface StatCopy {
  value: string;
  label: string;
}

export interface FeatureCopy {
  icon: IconName;
  title: string;
  description: string;
}

export interface StepCopy {
  title: string;
  description: string;
}

export interface FaqCopy {
  question: string;
  answer: string;
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
    history: string;
    settings: string;
    closeMenu: string;
    historyToday: string;
    historyYesterday: string;
  };
  editor: {
    placeholder: string;
    startFrom: string;
    generate: string;
    generating: string;
    regenerate: string;
    errorNoSpeechEngine: string;
    importFile: string;
    fileImportError: string;
    fileTruncated: string;
    charactersRemaining: string;
  };
  player: {
    thumbUp: string;
    thumbDown: string;
    share: string;
    shareCopied: string;
    download: string;
    skipBack: string;
    skipForward: string;
    play: string;
    pause: string;
    generating: string;
    connecting: string;
    close: string;
    collapse: string;
    expand: string;
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
    genderLabel: string;
    genderAll: string;
    genderMale: string;
    genderFemale: string;
    toneLabel: string;
    toneAll: string;
    toneConfident: string;
    toneCalm: string;
    toneEnergetic: string;
    toneWarm: string;
    toneNeutral: string;
  };
  tip: {
    title: string;
    description: string;
  };
  settings: {
    voice: string;
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
    copy: string;
    copied: string;
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
    usagePercentLabel: string;
    usedLabel: string;
    limitLabel: string;
    bonusLabel: string;
    renewsIn: string;
    memberSince: string;
    verifiedEmail: string;
    verifyEmailPrompt: string;
    verificationSent: string;
    planTitle: string;
    manageBilling: string;
    previousPlans: string;
    nextPlans: string;
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
  settingsPage: {
    title: string;
    subtitle: string;
    appearanceTitle: string;
    appearanceSubtitle: string;
    themeLabel: string;
    themeLight: string;
    themeDark: string;
    themeSystem: string;
    languageLabel: string;
    notificationsTitle: string;
    notificationsSubtitle: string;
    notifyUpdatesLabel: string;
    notifyUpdatesDesc: string;
    notifyUsageLabel: string;
    notifyUsageDesc: string;
    notifyMarketingLabel: string;
    notifyMarketingDesc: string;
    privacyTitle: string;
    privacySubtitle: string;
    cookiePrefsLabel: string;
    cookiePrefsDesc: string;
    manageCookies: string;
    exportLabel: string;
    exportDesc: string;
    exportButton: string;
    exportDone: string;
    dangerTitle: string;
    dangerSubtitle: string;
    resetLabel: string;
    resetDesc: string;
    resetButton: string;
    resetConfirmTitle: string;
    resetConfirmBody: string;
    resetConfirmAction: string;
    resetCancelAction: string;
    resetDone: string;
    saved: string;
    securityTitle: string;
    securitySubtitle: string;
    securityDemoNote: string;
    currentPasswordLabel: string;
    newPasswordLabel: string;
    confirmPasswordLabel: string;
    changePasswordButton: string;
    passwordMismatch: string;
    passwordTooShort: string;
    passwordChanged: string;
    twoFactorLabel: string;
    twoFactorDesc: string;
    twoFactorOn: string;
    twoFactorOff: string;
  };
  cookieBanner: {
    title: string;
    message: string;
    acceptAll: string;
    rejectAll: string;
    customize: string;
    backToSimple: string;
    save: string;
    essentialTitle: string;
    essentialDesc: string;
    essentialAlwaysOn: string;
    analyticsTitle: string;
    analyticsDesc: string;
    marketingTitle: string;
    marketingDesc: string;
    policyLink: string;
  };
  notifications: {
    title: string;
    markAllRead: string;
    empty: string;
    justNow: string;
    usageTitle: string;
    usageBody: string;
    renewalTitle: string;
    renewalBody: string;
    welcomeTitle: string;
    welcomeBody: string;
    welcomeTime: string;
    newVoiceTitle: string;
    newVoiceBody: string;
    newVoiceTime: string;
    tipTitle: string;
    tipBody: string;
    tipTime: string;
  };
  notFoundPage: {
    title: string;
    message: string;
    backHome: string;
  };
  commandPalette: {
    placeholder: string;
    pagesGroup: string;
    voicesGroup: string;
    docsGroup: string;
    noResults: string;
    hintNavigate: string;
    hintSelect: string;
    hintClose: string;
  };
  historyPage: {
    title: string;
    subtitle: string;
    empty: string;
    emptyHint: string;
    replay: string;
    reuse: string;
    delete: string;
    clearAll: string;
    confirmClearTitle: string;
    confirmClearBody: string;
    confirmClearAction: string;
    confirmCancelAction: string;
    confirmDeleteBody: string;
    confirmDeleteAction: string;
    genericError: string;
    loadMore: string;
    loading: string;
    voiceLabel: string;
    modelLabel: string;
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    characters: string;
  };
  referral: {
    title: string;
    subtitle: string;
    rewardBadge: string;
    howItWorksTitle: string;
    step1: string;
    step2: string;
    step3: string;
    linkLabel: string;
    copyButton: string;
    copiedLabel: string;
    close: string;
  };
  upgradeModal: {
    title: string;
    subtitle: string;
    close: string;
    alreadyTopTier: string;
    seeAllPlans: string;
  };
  landing: {
    navFeatures: string;
    navHowItWorks: string;
    navVoices: string;
    navPricing: string;
    navReviews: string;
    navOpenApp: string;
    navTryFree: string;
    heroBadge: string;
    heroTitleLine1: string;
    heroTitleLine2: string;
    heroSubtitle: string;
    heroCtaPrimary: string;
    heroCtaSecondary: string;
    heroTrust: string;
    statsTitle: string;
    featuresTitle: string;
    featuresSubtitle: string;
    howItWorksTitle: string;
    howItWorksSubtitle: string;
    voicesTitle: string;
    voicesSubtitle: string;
    voicesCta: string;
    testimonialsTitle: string;
    testimonialsSubtitle: string;
    pricingTitle: string;
    pricingSubtitle: string;
    pricingCta: string;
    pricingMostPopular: string;
    finalCtaTitle: string;
    finalCtaSubtitle: string;
    finalCtaButton: string;
    footerTagline: string;
    footerProductTitle: string;
    footerCompanyTitle: string;
    footerLegalTitle: string;
    footerCopyright: string;
  };
  landingStats: StatCopy[];
  landingFeatures: FeatureCopy[];
  landingSteps: StepCopy[];
  pricingPage: {
    title: string;
    subtitle: string;
    faqTitle: string;
    faqSubtitle: string;
  };
  pricingFaq: FaqCopy[];
  authLayout: {
    tagline: string;
    taglineLogin: string;
    taglineRegister: string;
    point1: string;
    point2: string;
    point3: string;
    backHome: string;
  };
  loginPage: {
    title: string;
    subtitle: string;
    googleButton: string;
    divider: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    togglePassword: string;
    forgotPassword: string;
    submit: string;
    submitting: string;
    errorRequired: string;
    errorInvalidCredentials: string;
    errorLocked: string;
    errorRateLimited: string;
    errorUnknown: string;
    noAccount: string;
    registerLink: string;
  };
  registerPage: {
    title: string;
    subtitle: string;
    googleButton: string;
    divider: string;
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    submit: string;
    submitting: string;
    errorRequired: string;
    errorPasswordTooShort: string;
    errorPasswordMismatch: string;
    errorAccountExists: string;
    errorValidation: string;
    errorRateLimited: string;
    errorUnknown: string;
    haveAccount: string;
    loginLink: string;
  };
  forgotPasswordPage: {
    title: string;
    subtitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    submit: string;
    submitting: string;
    errorRequired: string;
    errorUnknown: string;
    sentTitle: string;
    sentBody: string;
    backToLogin: string;
  };
  resetPasswordPage: {
    title: string;
    subtitle: string;
    newPasswordLabel: string;
    confirmPasswordLabel: string;
    submit: string;
    submitting: string;
    errorPasswordTooShort: string;
    errorPasswordMismatch: string;
    errorInvalidToken: string;
    errorUnknown: string;
    doneTitle: string;
    doneBody: string;
    goToLogin: string;
    missingTokenTitle: string;
    missingTokenBody: string;
    requestNewLink: string;
  };
  verifyEmailPage: {
    title: string;
    checkingTitle: string;
    successTitle: string;
    successBody: string;
    errorTitle: string;
    errorBody: string;
    missingTokenBody: string;
    goToApp: string;
  };
  authCallbackPage: {
    title: string;
    workingTitle: string;
    errorTitle: string;
    errorBody: string;
    backToLogin: string;
  };
  checkoutPage: {
    title: string;
    subtitle: string;
    backToPricing: string;
    orderSummaryTitle: string;
    planLabel: string;
    billingLabel: string;
    itemLabel: string;
    totalLabel: string;
    demoNote: string;
    cardholderLabel: string;
    cardholderPlaceholder: string;
    cardNumberLabel: string;
    expiryLabel: string;
    cvcLabel: string;
    payButton: string;
    processingButton: string;
    errorRequired: string;
    errorCardNumber: string;
    errorExpiry: string;
    errorCvc: string;
    errorCheckout: string;
    successTitle: string;
    successPlanBody: string;
    successTopUpBody: string;
    successGenericTitle: string;
    successGenericBody: string;
    goToProfile: string;
    notFoundTitle: string;
    notFoundBody: string;
    notFoundBack: string;
    secureNote: string;
  };
  starters: StarterCopy[];
  voices: VoiceCopy[];
  formats: string[];
  testimonials: TestimonialCopy[];
  plans: PlanCopy[];
  topUps: TopUpCopy[];
  seo: {
    ogLocale: string;
    landingTitle: string;
    landingDescription: string;
    pricingTitle: string;
    pricingDescription: string;
    notFoundTitle: string;
    notFoundDescription: string;
    generatorTitle: string;
    voicesTitle: string;
    historyTitle: string;
    feedbackTitle: string;
    docsTitle: string;
    profileTitle: string;
    settingsTitle: string;
    checkoutTitle: string;
  };
}
