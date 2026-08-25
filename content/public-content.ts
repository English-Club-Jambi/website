export const publicContentLocale = "en" as const;

export type PublicContentKind = "plain-text";

export type PublicContentFieldDefinition = Readonly<{
  contentKey: string;
  label: string;
  kind: PublicContentKind;
  defaultValue: string;
  maxLength: number;
}>;

type PublicContentPageDefinition = Readonly<{
  pageKey: string;
  label: string;
  fields: Readonly<Record<string, PublicContentFieldDefinition>>;
}>;

function text<const Key extends string, const Label extends string>(
  contentKey: Key,
  label: Label,
  defaultValue: string,
  maxLength = 320,
) {
  return {
    contentKey,
    label,
    kind: "plain-text" as const,
    defaultValue,
    maxLength,
  };
}

function page<
  const PageKey extends string,
  const Label extends string,
  const Fields extends Readonly<Record<string, PublicContentFieldDefinition>>,
>(pageKey: PageKey, label: Label, fields: Fields) {
  return { pageKey, label, fields };
}

/**
 * The public copy contract shared by the checked-in site and the admin editor.
 * Layout and interaction stay in code. Convex may only replace these named
 * text values after a matching entry has been published.
 */
export const publicContentManifest = {
  global: page("global", "Header and footer", {
    siteName: text("site-name", "Organization name", "English Club", 60),
    homeLabel: text("home-label", "Home link label", "English Club home", 80),
    skipLink: text("skip-link", "Skip link", "Skip to content", 40),
    primaryNavigationLabel: text(
      "primary-navigation-label",
      "Primary navigation label",
      "Primary navigation",
      60,
    ),
    navAbout: text("nav-about", "About navigation label", "About", 28),
    navActivities: text(
      "nav-activities",
      "Activities navigation label",
      "Activities",
      28,
    ),
    navPrograms: text("nav-programs", "Programs navigation label", "Programs", 28),
    navMembers: text("nav-members", "Members navigation label", "Members", 28),
    navPractice: text("nav-practice", "Practice navigation label", "Practice", 28),
    navJournal: text("nav-journal", "Journal navigation label", "Journal", 28),
    navJoin: text("nav-join", "Join navigation label", "Join", 28),
    menuOpenLabel: text(
      "menu-open-label",
      "Open navigation label",
      "Open navigation",
      60,
    ),
    menuCloseLabel: text(
      "menu-close-label",
      "Close navigation label",
      "Close navigation",
      60,
    ),
    menuTitle: text("menu-title", "Mobile menu title", "Where next?", 60),
    mobileNavigationLabel: text(
      "mobile-navigation-label",
      "Mobile navigation label",
      "Mobile navigation",
      60,
    ),
    menuJoin: text("menu-join", "Mobile join label", "Join the club", 40),
    menuNote: text(
      "menu-note",
      "Mobile menu note",
      "Conversation starts with a route in.",
      100,
    ),
    switchToDarkTheme: text(
      "switch-to-dark-theme",
      "Dark theme toggle label",
      "Switch to dark theme",
      60,
    ),
    switchToLightTheme: text(
      "switch-to-light-theme",
      "Light theme toggle label",
      "Switch to light theme",
      60,
    ),
    footerWordmark: text(
      "footer-wordmark",
      "Footer wordmark",
      "EC / ENGLISH CLUB",
      60,
    ),
    footerStatement: text(
      "footer-statement",
      "Footer statement",
      "The next sentence needs another person.",
      120,
    ),
    footerNavigationLabel: text(
      "footer-navigation-label",
      "Footer navigation label",
      "Footer navigation",
      60,
    ),
    footerContact: text("footer-contact", "Contact link", "Contact", 28),
    footerJoin: text("footer-join", "Join intent link", "I want to join", 40),
    footerPartner: text(
      "footer-partner",
      "Partner intent link",
      "I have an idea",
      40,
    ),
    footerAsk: text("footer-ask", "Question intent link", "I have a question", 40),
  }),

  home: page("home", "Home", {
    metadataTitle: text(
      "metadata-title",
      "Browser and share title",
      "English Club | English grows in company",
      90,
    ),
    metadataDescription: text(
      "metadata-description",
      "Search and share description",
      "Meet an English community built around conversation, cultural exchange, shared work, and the courage to try again.",
      200,
    ),
    heroEyebrow: text(
      "hero-eyebrow",
      "Hero eyebrow",
      "EC / CONVERSATION RELAY",
      60,
    ),
    heroTitleLineOne: text("hero-title-line-one", "Hero title line one", "English grows", 42),
    heroTitleLineTwo: text("hero-title-line-two", "Hero title line two", "in company.", 42),
    heroJoin: text("hero-join", "Hero join action", "Join the club", 36),
    heroAbout: text("hero-about", "Hero about action", "Meet the club", 36),
    sentenceControlsLabel: text(
      "sentence-controls-label",
      "Conversation controls label",
      "Choose how the conversation moves",
      80,
    ),
    sentenceSpeakLabel: text("sentence-speak-label", "Speak control label", "Speak", 24),
    sentenceSpeakEcho: text("sentence-speak-echo", "Speak backdrop word", "SPEAK", 24),
    sentenceSpeakResponse: text(
      "sentence-speak-response",
      "Speak response",
      "Say the sentence you have. The room can work with it.",
      140,
    ),
    sentenceListenLabel: text("sentence-listen-label", "Listen control label", "Listen", 24),
    sentenceListenEcho: text("sentence-listen-echo", "Listen backdrop word", "LISTEN", 24),
    sentenceListenResponse: text(
      "sentence-listen-response",
      "Listen response",
      "A useful answer starts by staying with someone else's words.",
      140,
    ),
    sentenceAskLabel: text("sentence-ask-label", "Ask control label", "Ask", 24),
    sentenceAskEcho: text("sentence-ask-echo", "Ask backdrop word", "ASK", 24),
    sentenceAskResponse: text(
      "sentence-ask-response",
      "Ask response",
      "One honest question can give the whole table somewhere to go.",
      140,
    ),
    sentenceAgainLabel: text("sentence-again-label", "Try again control label", "Try again", 24),
    sentenceAgainEcho: text("sentence-again-echo", "Try again backdrop word", "AGAIN", 24),
    sentenceAgainResponse: text(
      "sentence-again-response",
      "Try again response",
      "A second attempt belongs in the conversation too.",
      140,
    ),
    promptEyebrow: text(
      "prompt-eyebrow",
      "Prompt section eyebrow",
      "Try the room for ten seconds.",
      80,
    ),
    promptTitle: text("prompt-title", "Prompt section title", "Start with a question.", 70),
    promptPrivacy: text(
      "prompt-privacy",
      "Prompt privacy note",
      "No answer is recorded. Read it aloud only if you want to.",
      140,
    ),
    promptNext: text("prompt-next", "New prompt button", "New prompt", 30),
    promptOneLead: text("prompt-one-lead", "Prompt one opening", "Ask someone nearby", 60),
    promptOneTopic: text("prompt-one-topic", "Prompt one topic", "about a place", 60),
    promptOneClose: text("prompt-one-close", "Prompt one ending", "they would revisit.", 60),
    promptTwoLead: text("prompt-two-lead", "Prompt two opening", "Tell the table", 60),
    promptTwoTopic: text("prompt-two-topic", "Prompt two topic", "about one word", 60),
    promptTwoClose: text("prompt-two-close", "Prompt two ending", "you learned recently.", 60),
    promptThreeLead: text("prompt-three-lead", "Prompt three opening", "Ask a partner", 60),
    promptThreeTopic: text("prompt-three-topic", "Prompt three topic", "which everyday sound", 60),
    promptThreeClose: text("prompt-three-close", "Prompt three ending", "they would miss.", 60),
    promptFourLead: text("prompt-four-lead", "Prompt four opening", "Explain to the room", 60),
    promptFourTopic: text("prompt-four-topic", "Prompt four topic", "a small decision", 60),
    promptFourClose: text("prompt-four-close", "Prompt four ending", "you changed your mind about.", 60),
    activitiesEyebrow: text(
      "activities-eyebrow",
      "Activities chapter eyebrow",
      "What happens after hello?",
      80,
    ),
    activitiesTitle: text(
      "activities-title",
      "Activities chapter title",
      "Choose a way into the room.",
      90,
    ),
    activitiesSupport: text(
      "activities-support",
      "Activities chapter support",
      "Four themes drawn from the current archive. They describe ways of working, not a fixed timetable.",
      200,
    ),
    activitiesLink: text(
      "activities-link",
      "Activities chapter link",
      "Open the full activity relay",
      60,
    ),
    programmeQuizTitle: text(
      "programme-quiz-title",
      "Programme quiz title",
      "What happens at English Club?",
      90,
    ),
    programmeQuizIntro: text(
      "programme-quiz-intro",
      "Programme quiz introduction",
      "Check four details from the activity page. This is a guide to the club, not an English test.",
      200,
    ),
    programmeQuizStartBody: text(
      "programme-quiz-start-body",
      "Programme quiz start note",
      "The questions use the same activity descriptions published on this website. Nothing is saved after you leave the page.",
      240,
    ),
    programmeQuizStart: text(
      "programme-quiz-start",
      "Programme quiz start button",
      "Start the club quiz",
      50,
    ),
    programmeQuizSpeakPrompt: text(
      "programme-quiz-speak-prompt",
      "Programme quiz Speak question",
      "Which activity carries the title Speak without a script?",
      140,
    ),
    programmeQuizExchangePrompt: text(
      "programme-quiz-exchange-prompt",
      "Programme quiz Exchange question",
      "Which activity brings questions and points of view from another place?",
      160,
    ),
    programmeQuizMakePrompt: text(
      "programme-quiz-make-prompt",
      "Programme quiz Make question",
      "Which activity gives the conversation a shared task?",
      140,
    ),
    programmeQuizSchedulePrompt: text(
      "programme-quiz-schedule-prompt",
      "Programme quiz schedule question",
      "Do these activity themes promise a fixed weekly timetable?",
      160,
    ),
    programmeQuizScheduleYes: text(
      "programme-quiz-schedule-yes",
      "Programme quiz fixed schedule answer",
      "Yes, every theme runs each week.",
      100,
    ),
    programmeQuizScheduleNo: text(
      "programme-quiz-schedule-no",
      "Programme quiz descriptive themes answer",
      "No. They describe ways of working.",
      100,
    ),
    programmeQuizQuestion: text(
      "programme-quiz-question",
      "Programme quiz question counter label",
      "Question",
      30,
    ),
    programmeQuizOf: text(
      "programme-quiz-of",
      "Programme quiz counter separator",
      "of",
      20,
    ),
    programmeQuizChoiceLabel: text(
      "programme-quiz-choice-label",
      "Programme quiz choice group label",
      "Choose one answer",
      50,
    ),
    programmeQuizCheck: text(
      "programme-quiz-check",
      "Programme quiz check button",
      "Check answer",
      40,
    ),
    programmeQuizCorrect: text(
      "programme-quiz-correct",
      "Programme quiz correct feedback",
      "That matches the activity page.",
      100,
    ),
    programmeQuizIncorrect: text(
      "programme-quiz-incorrect",
      "Programme quiz incorrect feedback",
      "Look at this detail once more.",
      100,
    ),
    programmeQuizBack: text(
      "programme-quiz-back",
      "Programme quiz back button",
      "Back",
      24,
    ),
    programmeQuizNext: text(
      "programme-quiz-next",
      "Programme quiz next button",
      "Next",
      24,
    ),
    programmeQuizFinish: text(
      "programme-quiz-finish",
      "Programme quiz finish button",
      "Finish",
      24,
    ),
    programmeQuizCompletePrefix: text(
      "programme-quiz-complete-prefix",
      "Programme quiz result prefix",
      "You understood",
      50,
    ),
    programmeQuizCompleteSuffix: text(
      "programme-quiz-complete-suffix",
      "Programme quiz result suffix",
      "activity details.",
      50,
    ),
    programmeQuizCompleteBody: text(
      "programme-quiz-complete-body",
      "Programme quiz completion note",
      "The activity page has the full wording and explains what the current archive can support.",
      200,
    ),
    programmeQuizReadActivities: text(
      "programme-quiz-read-activities",
      "Programme quiz activity link",
      "Read the activities",
      50,
    ),
    programmeQuizAgain: text(
      "programme-quiz-again",
      "Programme quiz reset button",
      "Try again",
      30,
    ),
    handoffSequenceLabel: text(
      "handoff-sequence-label",
      "Handoff sequence accessible label",
      "Ask, then listen, then answer.",
      80,
    ),
    handoffAsk: text("handoff-ask", "Handoff first word", "ask", 20),
    handoffListen: text("handoff-listen", "Handoff second word", "listen", 20),
    handoffAnswer: text("handoff-answer", "Handoff third word", "answer", 20),
    handoffTitle: text(
      "handoff-title",
      "Documentary handoff title",
      "A real room gives the words somewhere to land.",
      110,
    ),
    handoffBody: text(
      "handoff-body",
      "Documentary handoff body",
      "The archive shows people around tables, open laptops, bookshelves, and a microphone. It shows a shared setting without claiming a measured result.",
      280,
    ),
    handoffLink: text(
      "handoff-link",
      "Documentary handoff link",
      "How the club reads its record",
      60,
    ),
    journalTitle: text(
      "journal-title",
      "Journal chapter title",
      "Stories that keep the conversation moving.",
      100,
    ),
    journalLink: text("journal-link", "Journal chapter link", "Browse every story", 50),
    journalEmpty: text(
      "journal-empty",
      "Journal empty state",
      "The first journal story is still being prepared.",
      120,
    ),
    closeTitle: text("close-title", "Closing question", "What do you want to say next?", 90),
    closeJoin: text("close-join", "Closing join link", "Join the room", 40),
    closePartner: text("close-partner", "Closing partner link", "Propose something", 40),
    closeAsk: text("close-ask", "Closing question link", "Ask a question", 40),
  }),

  practice: page("practice", "Practice", {
    metadataTitle: text("metadata-title", "Browser title", "Practice", 70),
    metadataDescription: text(
      "metadata-description",
      "Search and share description",
      "Choose a short academic English quiz or prepare for a complete English Club practice assessment.",
      200,
    ),
    identity: text("identity", "Practice hero eyebrow", "English Club practice", 60),
    title: text("title", "Practice hero title", "English Club Assessment Lab", 90),
    lead: text(
      "lead",
      "Practice hero support",
      "A full practice form when you have time. A short section when you do not.",
      180,
    ),
    limit: text(
      "limit",
      "Practice evidence limit",
      "Results come from original English Club questions and a published practice formula. They are not official ETS scores or admission evidence.",
      220,
    ),
    openFull: text("open-full", "Open full practice action", "Open full practice", 50),
    startShort: text("start-short", "Start short quiz action", "Start a short quiz", 50),
    reviewPaths: text(
      "review-paths",
      "Review paths action",
      "Review the practice paths",
      60,
    ),
    pathsTitle: text("paths-title", "Practice paths title", "Choose the length first.", 80),
    pathsSupport: text(
      "paths-support",
      "Practice paths support",
      "Both paths return practice points and reviewed answers. Four-skill forms also show a clearly labelled band and 0–120 estimate.",
      240,
    ),
    unavailable: text(
      "unavailable",
      "Practice connection notice",
      "Practice content could not be checked right now. The overview remains available while the connection recovers.",
      220,
    ),
    fullTitle: text("full-title", "Full practice title", "Full practice assessment", 80),
    fullSummary: text(
      "full-summary",
      "Full practice summary",
      "Work through Reading, Listening, Writing, and Speaking in one session. A reviewed set is drawn from the English Club question bank when you start.",
      220,
    ),
    viewBriefing: text("view-briefing", "Full briefing action", "View the briefing", 40),
    noFull: text(
      "no-full",
      "Unavailable full practice note",
      "The next full practice form is under academic review. Short quizzes remain available when their review is complete.",
      240,
    ),
    quickTitle: text("quick-title", "Quick practice title", "Quick practice", 60),
    quickSummary: text(
      "quick-summary",
      "Quick practice summary",
      "Choose one area for a shorter review.",
      120,
    ),
    quickListeningTitle: text(
      "quick-listening-title",
      "Quick listening title",
      "Listening",
      50,
    ),
    quickListeningSummary: text(
      "quick-listening-summary",
      "Quick listening summary",
      "Listen by choice, then answer from an original English Club recording.",
      180,
    ),
    quickStructureTitle: text(
      "quick-structure-title",
      "Quick structure title",
      "Structure and Written Expression",
      70,
    ),
    quickStructureSummary: text(
      "quick-structure-summary",
      "Quick structure summary",
      "Inspect how a sentence works and choose the clearest standard form.",
      180,
    ),
    quickReadingTitle: text(
      "quick-reading-title",
      "Quick reading title",
      "Reading",
      50,
    ),
    quickReadingSummary: text(
      "quick-reading-summary",
      "Quick reading summary",
      "Read an original passage and check details, purpose, and relationships.",
      180,
    ),
    quickWritingTitle: text(
      "quick-writing-title",
      "Quick writing title",
      "Writing",
      50,
    ),
    quickWritingSummary: text(
      "quick-writing-summary",
      "Quick writing summary",
      "Build precise sentences, then answer an email and a short academic discussion.",
      180,
    ),
    quickSpeakingTitle: text(
      "quick-speaking-title",
      "Quick speaking title",
      "Speaking",
      50,
    ),
    quickSpeakingSummary: text(
      "quick-speaking-summary",
      "Quick speaking summary",
      "Rehearse a spoken response locally, then submit its transcript for a limited practice estimate.",
      220,
    ),
    openBriefing: text("open-briefing", "Quick briefing action", "Open briefing", 40),
    underReview: text("under-review", "Review state label", "Under review", 40),
    noQuick: text(
      "no-quick",
      "Unavailable quick practice note",
      "This quick quiz is still under academic review. Return to the lab to choose another area.",
      200,
    ),
    scopeTitle: text(
      "scope-title",
      "Practice scope title",
      "A score with its limits attached.",
      100,
    ),
    scopeBody: text(
      "scope-body",
      "Practice scope body",
      "Your raw points are exact for the questions delivered in that attempt. The band and 0–120 values are English Club practice estimates, not certificates or admission recommendations.",
      280,
    ),
    labBack: text("lab-back", "Assessment Lab back link", "Assessment Lab", 40),
    briefingTitle: text(
      "briefing-title",
      "Briefing instruction title",
      "Read this before you start.",
      70,
    ),
    factTime: text("fact-time", "Briefing time label", "Time", 24),
    untimed: text("untimed", "Untimed value", "Untimed", 30),
    standardMinutesSuffix: text(
      "standard-minutes-suffix",
      "Standard timing suffix",
      "minutes in standard mode",
      60,
    ),
    factAreas: text("fact-areas", "Briefing areas label", "Areas", 24),
    skillListening: text("skill-listening", "Listening skill label", "Listening", 40),
    skillStructure: text(
      "skill-structure",
      "Structure skill label",
      "Structure and Written Expression",
      70,
    ),
    skillReading: text("skill-reading", "Reading skill label", "Reading", 40),
    skillWriting: text("skill-writing", "Writing skill label", "Writing", 40),
    skillSpeaking: text("skill-speaking", "Speaking skill label", "Speaking", 40),
    factResult: text("fact-result", "Briefing result label", "Result", 24),
    factResultBody: text(
      "fact-result-body",
      "Briefing result description",
      "Practice points, time used, reviewed answers, and a transparent estimate where the form supports one.",
      180,
    ),
    evidenceTitle: text(
      "evidence-title",
      "Evidence limit title",
      "Practice evidence only",
      70,
    ),
    evidenceBody: text(
      "evidence-body",
      "Evidence limit body",
      "The question set is fixed after an attempt begins. Its band and 0–120 values follow a published English Club recipe; they do not reproduce ETS adaptive calibration or official response rating.",
      260,
    ),
    sessionBody: text(
      "session-body",
      "Anonymous session explanation",
      "Starting creates an anonymous same-device session so your answers can be saved and resumed. The Home club quiz does not create one.",
      260,
    ),
    startTitle: text(
      "start-title",
      "Practice settings title",
      "Choose how you want to practise.",
      80,
    ),
    startSupport: text(
      "start-support",
      "Practice settings support",
      "Your choices are fixed when the first scored question begins.",
      160,
    ),
    timingLegend: text("timing-legend", "Timing group label", "Timing", 30),
    standardTitle: text("standard-title", "Standard time title", "Standard time", 40),
    standardBody: text(
      "standard-body",
      "Standard time description",
      "Use the published section limits.",
      120,
    ),
    extendedTitle: text("extended-title", "Extended time title", "Extended time", 40),
    extendedBody: text(
      "extended-body",
      "Extended time description",
      "Choose 50 percent or 100 percent more time.",
      120,
    ),
    extendedAmountLabel: text(
      "extended-amount-label",
      "Extended time amount group label",
      "Extended time amount",
      60,
    ),
    untimedTitle: text("untimed-title", "Untimed mode title", "Untimed learning", 40),
    untimedBody: text(
      "untimed-body",
      "Untimed mode description",
      "Work without a section countdown.",
      120,
    ),
    extendedFifty: text("extended-fifty", "Fifty percent extension", "50 percent more", 40),
    extendedHundred: text(
      "extended-hundred",
      "One hundred percent extension",
      "100 percent more",
      40,
    ),
    listeningLegend: text(
      "listening-legend",
      "Listening access group label",
      "Listening access",
      50,
    ),
    audioTitle: text("audio-title", "Audio first title", "Audio first", 40),
    audioBody: text(
      "audio-body",
      "Audio first description",
      "Start with audio. You can switch to transcript support during Listening.",
      180,
    ),
    transcriptTitle: text(
      "transcript-title",
      "Transcript supported title",
      "Transcript supported",
      50,
    ),
    transcriptBody: text(
      "transcript-body",
      "Transcript supported description",
      "Read the equivalent text while answering.",
      140,
    ),
    acknowledgement: text(
      "acknowledgement",
      "Practice acknowledgement",
      "I understand that my raw result applies to this attempt, while its band and 0–120 values are English Club estimates, not an official ETS score or exact test prediction.",
      220,
    ),
    signingIn: text("signing-in", "Session creation status", "Creating a private session.", 80),
    starting: text("starting", "Attempt opening status", "Opening the first section.", 80),
    startError: text(
      "start-error",
      "Attempt start error",
      "The attempt did not start. Check the connection and try this button again.",
      180,
    ),
    sessionError: text(
      "session-error",
      "Anonymous session error",
      "A private practice session could not be created. Check the connection and try again.",
      200,
    ),
    preparing: text("preparing", "Start button loading label", "Preparing", 30),
    startButton: text("start-button", "Start practice button", "Start practice", 40),
    unavailableCheck: text(
      "unavailable-check",
      "Unavailable connection title",
      "Practice content could not be checked right now.",
      140,
    ),
    unavailableRetry: text(
      "unavailable-retry",
      "Unavailable connection support",
      "Try the route again when the connection returns. No local question set has been substituted.",
      220,
    ),
    unavailableReview: text(
      "unavailable-review",
      "Unpublished assessment support",
      "Only reviewed and published questions appear here.",
      140,
    ),
    availableAction: text(
      "available-action",
      "Available practice action",
      "View available practice",
      60,
    ),
    sessionCheck: text("session-check", "Session loading label", "Checking this practice session.", 90),
    contentCheck: text(
      "content-check",
      "Practice content loading label",
      "Checking reviewed practice content.",
      100,
    ),
    routeErrorTitle: text(
      "route-error-title",
      "Practice route error title",
      "Practice did not open.",
      90,
    ),
    routeErrorBody: text(
      "route-error-body",
      "Practice route error support",
      "No answer was submitted from this error screen.",
      140,
    ),
    tryAgain: text("try-again", "Practice retry button", "Try again", 30),
    sessionUnavailableTitle: text(
      "session-unavailable-title",
      "Unavailable session title",
      "This practice session is not available.",
      120,
    ),
    sessionUnavailableBody: text(
      "session-unavailable-body",
      "Unavailable session support",
      "Open a published briefing and start again from this device.",
      180,
    ),
    sectionPrefix: text("section-prefix", "Section counter prefix", "Section", 30),
    sectionOf: text("section-of", "Section counter separator", "of", 20),
    beginSection: text("begin-section", "Begin section button", "Begin section", 40),
    questionPrefix: text("question-prefix", "Question counter prefix", "Question", 30),
    questionOf: text("question-of", "Question counter separator", "of", 20),
    timeLeft: text("time-left", "Timer label", "Time left", 30),
    untimedLabel: text("untimed-label", "Untimed runner label", "Untimed", 30),
    saved: text("saved", "Saved response status", "Saved", 24),
    saving: text("saving", "Saving response status", "Saving", 24),
    saveError: text(
      "save-error",
      "Response save error",
      "This answer could not be saved. Try again before moving on.",
      160,
    ),
    previous: text("previous", "Previous question button", "Previous", 30),
    next: text("next", "Next question button", "Next", 30),
    reviewSection: text("review-section", "Section review button", "Review section", 40),
    submitPractice: text("submit-practice", "Submit practice button", "Submit practice", 40),
    flag: text("flag", "Flag question button", "Flag for review", 40),
    unflag: text("unflag", "Remove question flag button", "Remove flag", 40),
    openNavigator: text("open-navigator", "Question navigator button", "Question list", 40),
    closeNavigator: text("close-navigator", "Close navigator label", "Close question list", 60),
    unanswered: text("unanswered", "Unanswered state label", "Unanswered", 30),
    answered: text("answered", "Answered state label", "Answered", 30),
    flagged: text("flagged", "Flagged state label", "Flagged", 30),
    current: text("current", "Current question state label", "Current", 30),
    switchTranscript: text(
      "switch-transcript",
      "Enable transcript button",
      "Use transcript support",
      50,
    ),
    transcriptPermanent: text(
      "transcript-permanent",
      "Transcript mode notice",
      "This permanently labels the attempt and result as transcript-supported.",
      180,
    ),
    transcript: text("transcript", "Transcript heading", "Transcript", 30),
    audioUnavailable: text(
      "audio-unavailable",
      "Unavailable audio message",
      "The audio file is not available. Use transcript support to continue.",
      160,
    ),
    playPracticeAudio: text(
      "play-practice-audio",
      "Generated practice audio button",
      "Play practice audio",
      40,
    ),
    stopPracticeAudio: text(
      "stop-practice-audio",
      "Stop generated audio button",
      "Stop audio",
      30,
    ),
    generatedAudioNote: text(
      "generated-audio-note",
      "Generated audio note",
      "Browser speech is used only when the reviewed audio file cannot load.",
      140,
    ),
    finishSectionTitle: text(
      "finish-section-title",
      "Finish section dialog title",
      "Finish this section?",
      70,
    ),
    finishSectionBody: text(
      "finish-section-body",
      "Finish section dialog support",
      "Check unanswered and flagged questions before this section becomes read-only.",
      180,
    ),
    returnQuestions: text(
      "return-questions",
      "Return to questions button",
      "Return to questions",
      50,
    ),
    confirmSection: text(
      "confirm-section",
      "Confirm section button",
      "Finish section",
      40,
    ),
    submitTitle: text("submit-title", "Submit dialog title", "Submit this practice?", 80),
    submitBody: text(
      "submit-body",
      "Submit dialog support",
      "You can review this section before submitting. After submission, answers cannot change.",
      200,
    ),
    keepWorking: text("keep-working", "Cancel submit button", "Keep working", 40),
    confirmSubmit: text("confirm-submit", "Confirm submit button", "Submit and view result", 50),
    resultTitle: text("result-title", "Result page title", "Your practice result", 80),
    rawCount: text("raw-count", "Raw count label", "Correct answers", 40),
    omitted: text("omitted", "Omitted answers label", "Omitted", 30),
    timeUsed: text("time-used", "Time used label", "Time used", 30),
    sectionResults: text("section-results", "Section results title", "By section", 50),
    answerReview: text("answer-review", "Answer review title", "Reviewed answers", 60),
    reviewSectionLabel: text(
      "review-section-label",
      "Review section selector label",
      "Choose a section to review",
      70,
    ),
    yourAnswer: text("your-answer", "Learner answer label", "Your answer", 30),
    correctAnswer: text("correct-answer", "Correct answer label", "Correct answer", 40),
    reviewCorrect: text("review-correct", "Correct review state", "Correct", 24),
    reviewIncorrect: text("review-incorrect", "Incorrect review state", "Check again", 30),
    reviewScored: text(
      "review-scored",
      "Constructed response review state",
      "Rubric scored",
      30,
    ),
    reviewOmitted: text("review-omitted", "Omitted review state", "Not answered", 30),
    explanation: text("explanation", "Answer explanation label", "Why", 24),
    loadMoreReview: text(
      "load-more-review",
      "Load more reviewed answers button",
      "Load more answers",
      50,
    ),
    noResultTitle: text("no-result-title", "Unavailable result title", "The result is not ready.", 100),
    noResultBody: text(
      "no-result-body",
      "Unavailable result support",
      "Return to the attempt to finish any open section.",
      160,
    ),
    returnAttempt: text("return-attempt", "Return to attempt action", "Return to attempt", 40),
    returnLab: text("return-lab", "Return to lab action", "Return to Assessment Lab", 60),
    chooseOne: text("choose-one", "Single choice group label", "Choose one answer", 50),
    chooseRangePrefix: text("choose-range-prefix", "Multiple choice instruction prefix", "Choose", 20),
    chooseRangeJoin: text("choose-range-join", "Multiple choice range separator", "to", 20),
    chooseRangeSuffix: text("choose-range-suffix", "Multiple choice instruction suffix", "answers", 30),
    completeBlanks: text("complete-blanks", "Cloze group label", "Complete each blank", 50),
    blank: text("blank", "Cloze field label", "Blank", 24),
    chooseWord: text("choose-word", "Cloze word placeholder", "Choose", 24),
    choosePhrase: text("choose-phrase", "Cloze blank label", "Choose a phrase", 50),
    currentOrder: text("current-order", "Sentence order label", "Current sentence order", 60),
    sentenceStart: text(
      "sentence-start",
      "Sentence builder empty instruction",
      "Choose a phrase below to begin the sentence.",
      120,
    ),
    availablePhrases: text("available-phrases", "Available phrase label", "Available phrases", 50),
    moveEarlier: text("move-earlier", "Move phrase earlier label", "Move earlier", 40),
    moveLater: text("move-later", "Move phrase later label", "Move later", 40),
    removePhrase: text("remove-phrase", "Remove phrase label", "Remove", 30),
    responseLabel: text(
      "response-label",
      "Constructed response field label",
      "Your response",
      40,
    ),
    writingResponseHint: text(
      "writing-response-hint",
      "Writing response hint",
      "Write in complete sentences and address every part of the task.",
      140,
    ),
    speakingResponseHint: text(
      "speaking-response-hint",
      "Speaking transcript hint",
      "Speak first, then type the words you said. The estimate reads the transcript, not the recording.",
      180,
    ),
    wordCount: text("word-count", "Word count label", "words", 24),
    recommendedWords: text(
      "recommended-words",
      "Recommended word count label",
      "recommended",
      30,
    ),
    startRecording: text(
      "start-recording",
      "Start local recording button",
      "Start local rehearsal",
      50,
    ),
    stopRecording: text(
      "stop-recording",
      "Stop local recording button",
      "Stop recording",
      40,
    ),
    removeRecording: text(
      "remove-recording",
      "Remove local recording button",
      "Discard recording",
      40,
    ),
    recordingLocal: text(
      "recording-local",
      "Local recording privacy note",
      "This rehearsal stays in this browser tab and is not uploaded.",
      140,
    ),
    recordingReady: text(
      "recording-ready",
      "Recording ready status",
      "Rehearsal ready to play back.",
      80,
    ),
    recordingUnavailable: text(
      "recording-unavailable",
      "Recording unavailable status",
      "Microphone rehearsal is unavailable here. You can still type your spoken response.",
      180,
    ),
    estimatedBand: text(
      "estimated-band",
      "Estimated band label",
      "Estimated band",
      40,
    ),
    comparableScore: text(
      "comparable-score",
      "Comparable score label",
      "Comparable estimate",
      50,
    ),
    practicePoints: text(
      "practice-points",
      "Weighted practice points label",
      "Practice points",
      40,
    ),
    estimateConfidence: text(
      "estimate-confidence",
      "Estimate confidence label",
      "Estimate confidence",
      40,
    ),
    confidenceLow: text(
      "confidence-low",
      "Low confidence label",
      "Low",
      20,
    ),
    confidenceModerate: text(
      "confidence-moderate",
      "Moderate confidence label",
      "Moderate",
      24,
    ),
    exampleResponse: text(
      "example-response",
      "Constructed response review label",
      "Example response",
      40,
    ),
    ruleBasedNote: text(
      "rule-based-note",
      "Constructed response scoring note",
      "Writing and speaking transcripts use a limited rule-based rubric; pronunciation and delivery are not measured.",
      200,
    ),
  }),

  about: page("about", "About", {
    metadataTitle: text("metadata-title", "Browser title", "About", 70),
    metadataDescription: text(
      "metadata-description",
      "Search and share description",
      "Meet an English Club shaped by social practice, shared rooms, and an honest record of what members do together.",
      200,
    ),
    heroEyebrow: text("hero-eyebrow", "Hero eyebrow", "About the room", 60),
    heroTitleLineOne: text("hero-title-line-one", "Hero title line one", "Built around the", 50),
    heroTitleLineTwo: text("hero-title-line-two", "Hero title line two", "next sentence.", 50),
    heroSupport: text(
      "hero-support",
      "Hero supporting text",
      "English Club gives learners a room to speak with people, not at a worksheet.",
      160,
    ),
    purposeTitle: text("purpose-title", "Purpose title", "Use the language you already have.", 90),
    purposeBodyOne: text(
      "purpose-body-one",
      "Purpose first paragraph",
      "The archive shows people around tables, near open laptops, listening to a microphone, and meeting in a larger auditorium. English moves between people in each scene.",
      320,
    ),
    purposeBodyTwo: text(
      "purpose-body-two",
      "Purpose second paragraph",
      "The club does not need a polished origin story to make that purpose clear. It needs a useful reason to speak and enough room for a second attempt.",
      300,
    ),
    principlesTitle: text(
      "principles-title",
      "Principles section title",
      "A room can be lively and still leave space.",
      100,
    ),
    principlesSupport: text(
      "principles-support",
      "Principles supporting text",
      "These principles describe the working culture. They are not measured outcomes or membership promises.",
      220,
    ),
    principleOneTitle: text("principle-one-title", "First principle title", "People before promises", 70),
    principleOneBody: text(
      "principle-one-body",
      "First principle body",
      "We show the people, rooms, and working moments that are already in the record. We do not replace them with invented outcomes.",
      260,
    ),
    principleTwoTitle: text("principle-two-title", "Second principle title", "Practice stays social", 70),
    principleTwoBody: text(
      "principle-two-body",
      "Second principle body",
      "English has a purpose when there is someone to listen, answer, disagree, or ask the next question.",
      240,
    ),
    principleThreeTitle: text("principle-three-title", "Third principle title", "Different speeds belong", 70),
    principleThreeBody: text(
      "principle-three-body",
      "Third principle body",
      "A lively room still leaves space for a pause, a quieter voice, or a sentence that needs a second attempt.",
      240,
    ),
    principleFourTitle: text("principle-four-title", "Fourth principle title", "The record stays honest", 70),
    principleFourBody: text(
      "principle-four-body",
      "Fourth principle body",
      "Names, dates, partnerships, and results enter the site only when the club can verify them.",
      220,
    ),
    recordWord: text("record-word", "Record section display word", "Proof / limits", 40),
    recordTitle: text("record-title", "Record section title", "The record has edges.", 80),
    recordBody: text(
      "record-body",
      "Record section body",
      "A photograph can show a group, a discussion, or a title on a screen. It cannot prove a partnership, a result, or a recurring programme by itself.",
      280,
    ),
    recordLink: text("record-link", "Record section link", "Read the sourced stories", 60),
    handoffBody: text(
      "handoff-body",
      "Closing handoff body",
      "See what those principles can sound like in practice.",
      120,
    ),
    handoffLink: text("handoff-link", "Closing handoff link", "Explore the activity relay", 60),
  }),

  activities: page("activities", "Activities", {
    metadataTitle: text("metadata-title", "Browser title", "Activities", 70),
    metadataDescription: text(
      "metadata-description",
      "Search and share description",
      "See how conversation, cultural exchange, shared projects, and club-room time turn English into a social practice.",
      200,
    ),
    heroEyebrow: text("hero-eyebrow", "Hero eyebrow", "Four ways to begin", 60),
    heroTitleLineOne: text("hero-title-line-one", "Hero title line one", "English is", 42),
    heroTitleLineTwo: text("hero-title-line-two", "Hero title line two", "the activity.", 42),
    heroSupport: text(
      "hero-support",
      "Hero supporting text",
      "The format can change. The useful part is having a reason to listen and answer.",
      180,
    ),
    relayTitle: text("relay-title", "Activity relay title", "Pick a verb. Follow the question.", 90),
    relaySupport: text(
      "relay-support",
      "Activity relay supporting text",
      "Each prompt is an example of social practice, not a promised weekly programme.",
      180,
    ),
    relayControlsLabel: text(
      "relay-controls-label",
      "Activity controls label",
      "Choose an activity theme",
      70,
    ),
    speakVerb: text("speak-verb", "Speak activity verb", "Speak", 24),
    speakTitle: text("speak-title", "Speak activity title", "Speak without a script", 70),
    speakPrompt: text(
      "speak-prompt",
      "Speak activity prompt",
      "What is one idea you could explain without preparing it first?",
      180,
    ),
    speakDescription: text(
      "speak-description",
      "Speak activity description",
      "Use English to explain, ask, pause, and try the sentence again with people who stay in the conversation.",
      240,
    ),
    speakEvidence: text(
      "speak-evidence",
      "Speak activity record note",
      "The archive shows a participant using a microphone beside a laptop at the front of the club room.",
      240,
    ),
    exchangeVerb: text("exchange-verb", "Exchange activity verb", "Exchange", 24),
    exchangeTitle: text("exchange-title", "Exchange activity title", "Meet across cultures", 70),
    exchangePrompt: text(
      "exchange-prompt",
      "Exchange activity prompt",
      "Which everyday habit would you want someone from another place to ask about?",
      180,
    ),
    exchangeDescription: text(
      "exchange-description",
      "Exchange activity description",
      "Let a real exchange supply the questions, accents, and points of view that a workbook cannot hold.",
      240,
    ),
    exchangeEvidence: text(
      "exchange-evidence",
      "Exchange activity record note",
      "A photographed panel carries the title Leeds the Way: Bridging England and Indonesia.",
      240,
    ),
    makeVerb: text("make-verb", "Make activity verb", "Make", 24),
    makeTitle: text("make-title", "Make activity title", "Make something together", 70),
    makePrompt: text(
      "make-prompt",
      "Make activity prompt",
      "If the table had ten minutes to make one thing, what should it be?",
      180,
    ),
    makeDescription: text(
      "make-description",
      "Make activity description",
      "Give the conversation a shared task, then use language to compare ideas and decide what happens next.",
      240,
    ),
    makeEvidence: text(
      "make-evidence",
      "Make activity record note",
      "Several room photographs show small groups gathered around tables, notes, and open laptops.",
      240,
    ),
    roomVerb: text("room-verb", "Room activity verb", "Stay", 24),
    roomTitle: text("room-title", "Room activity title", "Stay for the room", 70),
    roomPrompt: text(
      "room-prompt",
      "Room activity prompt",
      "What conversation would you keep going after the activity ends?",
      180,
    ),
    roomDescription: text(
      "room-description",
      "Room activity description",
      "Practice can begin before the formal activity and continue in the small conversations around it.",
      240,
    ),
    roomEvidence: text(
      "room-evidence",
      "Room activity record note",
      "The wider room record shows people talking, playing, working, and sitting together among the bookshelves.",
      240,
    ),
    cautionTitle: text("caution-title", "Programme note title", "A theme is not a timetable.", 90),
    cautionBodyOne: text(
      "caution-body-one",
      "Programme note first paragraph",
      "These pages describe visible ways of working. They do not claim that every theme runs each week or follows a fixed programme.",
      260,
    ),
    cautionBodyTwo: text(
      "caution-body-two",
      "Programme note second paragraph",
      "Ask what the club is doing now, and the answer can stay specific.",
      180,
    ),
    cautionLink: text("caution-link", "Programme note link", "Ask about a session", 50),
  }),

  programs: page("programs", "Programs", {
    metadataTitle: text("metadata-title", "Browser title", "Programs", 70),
    metadataDescription: text(
      "metadata-description",
      "Search and share description",
      "Explore English Club Universitas Jambi programmes, documented exchanges, learning support, competition preparation, and community-facing work.",
      200,
    ),
    heroEyebrow: text("hero-eyebrow", "Hero eyebrow", "Programs / public record", 60),
    heroTitleLineOne: text("hero-title-line-one", "Hero title line one", "English leaves", 48),
    heroTitleLineTwo: text("hero-title-line-two", "Hero title line two", "the club room.", 48),
    heroSupport: text(
      "hero-support",
      "Hero supporting text",
      "Programs turn conversation practice into workshops, exchanges, competition support, and carefully prepared work with the wider community.",
      220,
    ),
    bridgeLabel: text("bridge-label", "Activities bridge label", "Activities explain the method", 60),
    bridgeBody: text(
      "bridge-body",
      "Activities bridge body",
      "Activities shows how a session can feel. Programs records what the club has delivered, keeps running, or is preparing with a partner.",
      220,
    ),
    bridgeLink: text("bridge-link", "Activities bridge link", "Explore the activity relay", 60),
    documentedEyebrow: text("documented-eyebrow", "Documented record eyebrow", "Documented record", 50),
    documentedTitle: text(
      "documented-title",
      "Documented record title",
      "A public record should be specific enough to check.",
      100,
    ),
    documentedSupport: text(
      "documented-support",
      "Documented record supporting text",
      "Completed entries name the date, place, audience, and primary source available to the club. The record grows as more evidence is reviewed.",
      240,
    ),
    linesEyebrow: text("lines-eyebrow", "Programme lines eyebrow", "Programme lines", 50),
    linesTitle: text(
      "lines-title",
      "Programme lines title",
      "Useful work can continue without pretending to be a fixed timetable.",
      110,
    ),
    linesSupport: text(
      "lines-support",
      "Programme lines supporting text",
      "These programme areas come from the club's published mission. Individual sessions enter the documented record when their scope and evidence are ready.",
      250,
    ),
    plannedEyebrow: text("planned-eyebrow", "Open direction eyebrow", "Open direction", 50),
    plannedTitle: text(
      "planned-title",
      "Open direction title",
      "Community work starts by listening to the community.",
      100,
    ),
    plannedBody: text(
      "planned-body",
      "Open direction body",
      "English Club is preparing a community-service programme around the needs of schools, youth groups, and learning partners. A project becomes public as completed only after its partner, scope, safeguarding, date, and evidence are reviewed.",
      360,
    ),
    plannedLink: text(
      "planned-link",
      "Community collaboration link",
      "Propose a community collaboration",
      70,
    ),
    sourcePrefix: text("source-prefix", "Source link prefix", "Open source", 40),
    audiencePrefix: text("audience-prefix", "Audience label", "For", 24),
    placePrefix: text("place-prefix", "Place label", "At", 24),
    benefitPrefix: text("benefit-prefix", "Community value label", "Why it matters", 40),
    recordNote: text(
      "record-note",
      "Public record note",
      "Names, dates, partners, and results are published only when the club can verify them.",
      180,
    ),
  }),

  members: page("members", "Members", {
    metadataTitle: text("metadata-title", "Browser title", "Members", 70),
    metadataDescription: text(
      "metadata-description",
      "Search and share description",
      "Meet English Club members and explore the roles, divisions, and leadership that keep the organization moving.",
      200,
    ),
    heroEyebrow: text("hero-eyebrow", "Hero eyebrow", "English Club members", 60),
    heroTitleLineOne: text("hero-title-line-one", "Hero title line one", "Every voice", 42),
    heroTitleLineTwo: text("hero-title-line-two", "Hero title line two", "changes the room.", 52),
    heroSupport: text(
      "hero-support",
      "Hero supporting text",
      "Meet the people who practise, organise, coordinate, and guide the club.",
      160,
    ),
    rolesTitle: text("roles-title", "Roles section title", "How the club works.", 80),
    rolesSupport: text(
      "roles-support",
      "Roles section supporting text",
      "Five role classifications show how responsibility is shared across participation, coordination, leadership, and guidance.",
      260,
    ),
    roleSelectorLegend: text(
      "role-selector-legend",
      "Role selector label",
      "Choose a member role to inspect",
      80,
    ),
    allRoles: text("all-roles", "All roles label", "All roles", 30),
    worksAcrossClub: text(
      "works-across-club",
      "Role without position label",
      "Works across the club",
      60,
    ),
    clubStructure: text(
      "club-structure",
      "Role companion label",
      "Club structure",
      50,
    ),
    sharedResponsibilityTitle: text(
      "shared-responsibility-title",
      "All roles companion title",
      "Responsibility is shared.",
      80,
    ),
    sharedResponsibilityBody: text(
      "shared-responsibility-body",
      "All roles companion body",
      "Choose a role to see its focus and the members who carry that responsibility.",
      180,
    ),
    roleCodesNote: text(
      "role-codes-note",
      "Role code explanation",
      "Codes 0 through 4 make the structure easy to read. They are classifications, not ranks.",
      200,
    ),
    roleWithoutAssignmentNote: text(
      "role-without-assignment-note",
      "Role without assignment explanation",
      "This role works across the club without a named division or position.",
      180,
    ),
    directoryTitle: text(
      "directory-title",
      "Directory section title",
      "Meet the people behind the club.",
      90,
    ),
    directorySupport: text(
      "directory-support",
      "Directory supporting text",
      "Explore the members who practise, organise, coordinate, and guide English Club across every area of responsibility.",
      240,
    ),
    directoryLabel: text(
      "directory-label",
      "Unavailable directory count label",
      "Member directory",
      50,
    ),
    memberSingular: text("member-singular", "Singular member count", "member", 20),
    memberPlural: text("member-plural", "Plural member count", "members", 20),
    filterButton: text("filter-button", "Filter button", "Filter", 24),
    filterTitle: text("filter-title", "Filter panel title", "Filter members", 60),
    filterSupport: text(
      "filter-support",
      "Filter panel supporting text",
      "Combine a role, responsibility, and joined year.",
      120,
    ),
    roleFilterLabel: text("role-filter-label", "Role filter label", "Role", 30),
    assignmentFilterLabel: text(
      "assignment-filter-label",
      "Position filter label",
      "Position / division",
      40,
    ),
    allResponsibilities: text(
      "all-responsibilities",
      "All responsibilities option",
      "All responsibilities",
      50,
    ),
    yearFilterLabel: text("year-filter-label", "Joined year filter label", "Joined year", 40),
    allYears: text("all-years", "All joined years option", "All years", 30),
    yearNotListed: text(
      "year-not-listed",
      "Unknown joined year option",
      "Year not listed",
      40,
    ),
    clearFilters: text("clear-filters", "Clear filters button", "Clear filters", 40),
    closeFiltersLabel: text(
      "close-filters-label",
      "Close filters button label",
      "Close member filters",
      60,
    ),
    memberActivityFallback: text(
      "member-activity-fallback",
      "Member responsibility fallback",
      "English practice and club life",
      70,
    ),
    pioneerActivityFallback: text(
      "pioneer-activity-fallback",
      "Pioneer responsibility fallback",
      "Club management",
      70,
    ),
    coordinatorActivityFallback: text(
      "coordinator-activity-fallback",
      "Coordinator responsibility fallback",
      "Division coordination",
      70,
    ),
    coreActivityFallback: text(
      "core-activity-fallback",
      "Core Member responsibility fallback",
      "Core operations",
      70,
    ),
    boardActivityFallback: text(
      "board-activity-fallback",
      "Board responsibility fallback",
      "Club guidance",
      70,
    ),
    unavailableTitle: text(
      "unavailable-title",
      "Unavailable directory title",
      "The member directory is temporarily unavailable.",
      120,
    ),
    unavailableBody: text(
      "unavailable-body",
      "Unavailable directory body",
      "Please try again later. The role guide remains available while the directory reconnects.",
      200,
    ),
    noMatchesTitle: text(
      "no-matches-title",
      "No matches title",
      "No members match these filters.",
      100,
    ),
    noMatchesBody: text(
      "no-matches-body",
      "No matches body",
      "Try another responsibility or joined year, or return to the full directory.",
      180,
    ),
    closeTitle: text(
      "close-title",
      "Closing title",
      "Bring another voice into the room.",
      90,
    ),
    closeBody: text(
      "close-body",
      "Closing supporting text",
      "Tell the club what you want to practise or help organise.",
      140,
    ),
    closeLink: text("close-link", "Closing join link", "Join the club", 40),
  }),

  journal: page("journal", "Journal archive", {
    metadataTitle: text("metadata-title", "Browser title", "Journal", 70),
    metadataDescription: text(
      "metadata-description",
      "Search and share description",
      "Read sourced English Club stories about conversation, exchange, shared work, and the rooms where practice happens.",
      200,
    ),
    heroEyebrow: text("hero-eyebrow", "Hero eyebrow", "The club, in writing", 60),
    heroTitleLineOne: text("hero-title-line-one", "Hero title line one", "Stories inside", 50),
    heroTitleLineTwo: text("hero-title-line-two", "Hero title line two", "the room.", 50),
    heroSupport: text(
      "hero-support",
      "Hero supporting text",
      "Notes on speaking, listening, shared work, and the encounters that give English somewhere to go.",
      220,
    ),
    archiveEyebrow: text("archive-eyebrow", "Archive eyebrow", "Published notes", 50),
    archiveTitle: text("archive-title", "Archive title", "Journal archive", 70),
    archiveSupport: text(
      "archive-support",
      "Archive supporting text",
      "Browse up to six stories per page. Every article keeps a permanent address.",
      180,
    ),
    paginationLabel: text(
      "pagination-label",
      "Journal pagination label",
      "Journal pagination",
      60,
    ),
    unavailableTitle: text(
      "unavailable-title",
      "Unavailable page title",
      "This part of the archive is temporarily unavailable.",
      130,
    ),
    unavailableBody: text(
      "unavailable-body",
      "Unavailable page body",
      "Return to the newest stories and continue from the journal index.",
      160,
    ),
    emptyTitle: text(
      "empty-title",
      "Empty archive title",
      "The first story is still being prepared.",
      110,
    ),
    emptyBody: text(
      "empty-body",
      "Empty archive body",
      "The archive will begin here when the next note is published.",
      150,
    ),
    newestStories: text("newest-stories", "Newest stories label", "Newest stories", 40),
    olderStories: text("older-stories", "Older stories label", "Older stories", 40),
    endOfJournal: text("end-of-journal", "End of journal label", "End of the journal", 50),
    storySingular: text("story-singular", "Singular story count", "story", 20),
    storyPlural: text("story-plural", "Plural story count", "stories", 20),
  }),

  contact: page("contact", "Contact", {
    metadataTitle: text("metadata-title", "Browser title", "Contact", 70),
    metadataDescription: text(
      "metadata-description",
      "Search and share description",
      "Join English Club, ask about a session, or propose something to make together.",
      200,
    ),
    heroEyebrow: text("hero-eyebrow", "Hero eyebrow", "One message, kept private", 70),
    heroTitleLineOne: text("hero-title-line-one", "Hero title line one", "Start with what", 50),
    heroTitleLineTwo: text("hero-title-line-two", "Hero title line two", "you want to say.", 50),
    heroSupport: text(
      "hero-support",
      "Hero supporting text",
      "Join the club, ask about a session, or bring an idea for something to make together.",
      190,
    ),
    formTitle: text("form-title", "Contact form section title", "Choose the reason. Add the context.", 100),
    formSupport: text(
      "form-support",
      "Contact form section support",
      "The form keeps one route for three real intents. Your choice changes what the club should look for in the message.",
      240,
    ),
    nextTitle: text("next-title", "Review process title", "What happens next", 60),
    nextBody: text(
      "next-body",
      "Review process description",
      "Your message enters a private review queue. No public profile is created.",
      180,
    ),
    includeTitle: text("include-title", "Message guidance title", "What to include", 60),
    includeBody: text(
      "include-body",
      "Message guidance description",
      "Your question, the kind of activity you want, or the idea you would like to discuss.",
      180,
    ),
    successTitle: text("success-title", "Success title", "Message received.", 70),
    successSentLabel: text("success-sent-label", "Success icon label", "Sent", 24),
    successSupport: text(
      "success-support",
      "Success supporting text",
      "You can keep reading while the club reviews what you sent. This page does not promise a reply time.",
      220,
    ),
    nameLabel: text("name-label", "Name field label", "Name", 30),
    emailLabel: text("email-label", "Email field label", "Email address", 40),
    intentLegend: text("intent-legend", "Intent field legend", "What brings you here?", 60),
    intentJoin: text("intent-join", "Join intent label", "Join the club", 50),
    intentPartner: text(
      "intent-partner",
      "Partner intent label",
      "Propose something together",
      60,
    ),
    intentAsk: text("intent-ask", "Question intent label", "Ask a question", 50),
    messageLabel: text("message-label", "Message field label", "Message", 30),
    messagePlaceholder: text(
      "message-placeholder",
      "Message input hint",
      "Tell us what you want to ask, join, or make together.",
      140,
    ),
    messageHelp: text(
      "message-help",
      "Message length and privacy help",
      "20 to 2,000 characters. Please do not include sensitive personal data.",
      160,
    ),
    websiteLabel: text("website-label", "Spam trap label", "Website", 30),
    consentLabel: text(
      "consent-label",
      "Consent label",
      "I agree that the club may store these details to answer this message.",
      180,
    ),
    consentHelp: text(
      "consent-help",
      "Consent help in Indonesian",
      "Data ini hanya digunakan untuk menanggapi pesan Anda.",
      140,
    ),
    sendingLabel: text("sending-label", "Sending button state", "Sending…", 30),
    submitLabel: text("submit-label", "Submit button label", "Send enquiry", 40),
  }),
} as const satisfies Readonly<Record<string, PublicContentPageDefinition>>;

export type PublicContentPageKey = keyof typeof publicContentManifest;

type FieldsFor<PageKey extends PublicContentPageKey> =
  (typeof publicContentManifest)[PageKey]["fields"];

export type PublicContentFor<PageKey extends PublicContentPageKey> = {
  -readonly [FieldName in keyof FieldsFor<PageKey>]: string;
};

export type PublishedPublicContentEntry = Readonly<{
  contentKey: string;
  kind: string;
  value: string;
  revision: number;
  publishedAt: number;
}>;

export function getPublicContentDefaults<PageKey extends PublicContentPageKey>(
  pageKey: PageKey,
): PublicContentFor<PageKey> {
  const fields = publicContentManifest[pageKey].fields;
  return Object.fromEntries(
    Object.entries(fields).map(([fieldName, definition]) => [
      fieldName,
      definition.defaultValue,
    ]),
  ) as PublicContentFor<PageKey>;
}

function normalizePublishedText(value: string, maxLength: number) {
  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (
    normalized.length === 0 ||
    normalized.length > maxLength ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(normalized) ||
    /<\/?[a-z][^>]*>/iu.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

export function mergePublishedPublicContent<
  PageKey extends PublicContentPageKey,
>(
  pageKey: PageKey,
  publishedEntries: ReadonlyArray<PublishedPublicContentEntry>,
): PublicContentFor<PageKey> {
  const fields = publicContentManifest[pageKey].fields;
  const fieldByContentKey = new Map(
    Object.entries(fields).map(([fieldName, definition]) => [
      definition.contentKey,
      { fieldName, definition },
    ]),
  );
  const accepted = new Map<
    string,
    { fieldName: string; value: string; revision: number }
  >();

  for (const entry of publishedEntries) {
    const match = fieldByContentKey.get(entry.contentKey);
    if (
      match === undefined ||
      entry.kind !== match.definition.kind ||
      !Number.isSafeInteger(entry.revision) ||
      entry.revision < 1 ||
      !Number.isFinite(entry.publishedAt) ||
      entry.publishedAt <= 0
    ) {
      continue;
    }

    const value = normalizePublishedText(
      entry.value,
      match.definition.maxLength,
    );
    const current = accepted.get(entry.contentKey);
    if (value !== null && (current === undefined || entry.revision > current.revision)) {
      accepted.set(entry.contentKey, {
        fieldName: match.fieldName,
        value,
        revision: entry.revision,
      });
    }
  }

  const resolved = getPublicContentDefaults(pageKey) as Record<string, string>;
  for (const entry of accepted.values()) {
    resolved[entry.fieldName] = entry.value;
  }
  return resolved as PublicContentFor<PageKey>;
}

export function getPublicContentManifestPages() {
  return Object.values(publicContentManifest);
}
