export type PaperBankSkill = "listening" | "structure" | "reading";

export const PAPER_PRACTICE_RESEARCH_SOURCES = [
  {
    id: "ets-itp-level-1-content",
    title: "TOEFL ITP Level 1 Test Content",
    url: "https://www.ets.org/toefl/itp/test-content.html",
    use: "Section order, public question counts, timing, and score ranges only; no ETS questions or answer keys are reproduced.",
  },
  {
    id: "ets-itp-handbook",
    title: "TOEFL ITP Test Taker Handbook",
    url: "https://www.ets.org/pdfs/toefl-itp-test-taker-handbook.pdf",
    use: "No-penalty scoring rule, form-equating boundary, and the published three-section total-score formula.",
  },
  {
    id: "epa-urban-tree-cooling",
    title: "Benefits of Trees and Vegetation",
    url: "https://www.epa.gov/heatislands/benefits-trees-and-vegetation",
    use: "Factual reference for shade, evapotranspiration, placement, and urban heat exposure in the original tree-cooling passage.",
  },
  {
    id: "nih-sleep-memory",
    title: "Sleep smart: optimizing sleep for declarative learning and memory",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4428077/",
    use: "Research reference for replay, consolidation, and transformation of memory; the practice passage and questions are newly written.",
  },
  {
    id: "noaa-reef-soundscape",
    title: "Soundscape",
    url: "https://floridakeys.noaa.gov/science/research-highlights/soundscape.html",
    use: "Factual reference for reef sound sources and hydrophone monitoring in the original reef passage.",
  },
  {
    id: "smithsonian-pottery",
    title: "Archaeological ceramics and compositional analysis record",
    url: "https://www.si.edu/object/thin-section-petrography-geochemistry-and-scanning-electron-microscopy-archaeological-ceramics%3Asiris_sil_1158129",
    use: "CC0 metadata and research reference for mineralogical analysis and ceramic provenance; no book text is reproduced.",
  },
  {
    id: "usda-pollinator-habitat",
    title: "Habitat Assessment Guide for Pollinators in Yards, Gardens, and Parks",
    url: "https://www.nrcs.usda.gov/sites/default/files/2024-04/19-038_02_HAG_Yard-Park-Garden.pdf",
    use: "Factual reference for seasonal forage, nesting, and small urban habitat sites in the original pollinator passage.",
  },
  {
    id: "usfs-seed-germination",
    title: "Seed Germination and Sowing Options",
    url: "https://research.fs.usda.gov/treesearch/download/46349.pdf",
    use: "Factual reference for dormancy, cold-moist treatment, fire, and smoke cues in the original listening talk.",
  },
  {
    id: "usgs-paleoclimate",
    title: "Paleoclimate Reconstruction from Marine and Lake Sediments",
    url: "https://www.usgs.gov/centers/spcmsc/science/paleoclimate-reconstruction-marine-and-lake-sediments",
    use: "Public-domain factual reference for sediment cores, microfossils, salinity, and multi-proxy reconstruction in the original coastline talk.",
  },
] as const;

export type PaperPracticeResearchSourceId =
  (typeof PAPER_PRACTICE_RESEARCH_SOURCES)[number]["id"];

export type PaperBankOption = Readonly<{ key: string; label: string }>;

type ChoiceAnswer = Readonly<{
  kind: "choice";
  correctChoiceKeys: readonly string[];
  points: number;
}>;

type ClozeAnswer = Readonly<{
  kind: "cloze";
  correctGapAnswers: readonly Readonly<{ gapKey: string; choiceKey: string }>[];
  points: number;
}>;

type TokenAnswer = Readonly<{
  kind: "token-order";
  acceptedTokenOrders: readonly (readonly string[])[];
  points: number;
}>;

type TextAnswer = Readonly<{
  kind: "text-rubric";
  rubricMode: "writing" | "speaking-repeat" | "speaking-interview";
  maxPoints: number;
  minimumWords: number;
  targetTerms: readonly string[];
  sampleResponse: string;
}>;

type ItemBase = Readonly<{
  key: string;
  prompt: string;
  explanation: string;
  stimulusKey?: string;
}>;

export type PaperBankItem =
  | (ItemBase & Readonly<{
      type: "single-choice";
      options: readonly PaperBankOption[];
      answer: ChoiceAnswer;
    }>)
  | (ItemBase & Readonly<{
      type: "cloze-select";
      stemParts: readonly string[];
      gaps: readonly Readonly<{
        key: string;
        options: readonly PaperBankOption[];
      }>[];
      answer: ClozeAnswer;
    }>)
  | (ItemBase & Readonly<{
      type: "sentence-build";
      tokens: readonly PaperBankOption[];
      answer: TokenAnswer;
    }>)
  | (ItemBase & Readonly<{
      type: "constructed-response";
      responseMode: "writing" | "speaking-repeat" | "speaking-interview";
      minimumWords: number;
      recommendedWords: number;
      maximumCharacters: number;
      preparationSeconds?: number;
      responseSeconds?: number;
      answer: TextAnswer;
    }>);

export type PaperBankStimulus = Readonly<{
  key: string;
  kind: "reading" | "audio";
  title: string;
  body?: string;
  transcript?: string;
  alt?: string;
}>;

export type PaperBankSection = Readonly<{
  key: string;
  skill: PaperBankSkill;
  title: string;
  instructions: string;
  timeLimitSeconds: number;
  stimuli: readonly PaperBankStimulus[];
  items: readonly PaperBankItem[];
}>;

export type PaperBankDefinition = Readonly<{
  slug: string;
  kind: "full-practice" | "skill-quiz";
  adminTitle: string;
  title: string;
  summary: string;
  instructions: string;
  maxAttemptsPerDay: number;
  sections: readonly PaperBankSection[];
}>;

export const PAPER_PRACTICE_BANK_CHECKSUM =
  "ec-paper-level1-v1-2026-08-26-r1";

const researchSourceByStimulusKey: Readonly<Record<string, PaperPracticeResearchSourceId>> = {
  "reading-academic-heat": "epa-urban-tree-cooling",
  "reading-academic-memory": "nih-sleep-memory",
  "reading-academic-reef": "noaa-reef-soundscape",
  "reading-academic-clay": "smithsonian-pottery",
  "reading-academic-insects": "usda-pollinator-habitat",
  "listening-talk-1": "usfs-seed-germination",
  "listening-talk-2": "usgs-paleoclimate",
};

export function researchSourceIdsForBankItem(
  item: PaperBankItem,
): readonly PaperPracticeResearchSourceId[] {
  const source =
    item.stimulusKey === undefined
      ? undefined
      : researchSourceByStimulusKey[item.stimulusKey];
  return source === undefined
    ? ["ets-itp-level-1-content", "ets-itp-handbook"]
    : ["ets-itp-level-1-content", "ets-itp-handbook", source];
}

const optionKeys = ["a", "b", "c", "d", "e", "f"] as const;

function options(labels: readonly string[]): PaperBankOption[] {
  return labels.map((label, index) => ({ key: optionKeys[index], label }));
}
function choice(args: {
  key: string;
  prompt: string;
  choices: readonly string[];
  correct: number;
  explanation: string;
  points: number;
  stimulusKey?: string;
}): PaperBankItem {
  return {
    key: args.key,
    type: "single-choice",
    prompt: args.prompt,
    options: options(args.choices),
    explanation: args.explanation,
    ...(args.stimulusKey === undefined ? {} : { stimulusKey: args.stimulusKey }),
    answer: {
      kind: "choice",
      correctChoiceKeys: [optionKeys[args.correct]],
      points: args.points,
    },
  };
}

function cloze(args: {
  key: string;
  before: string;
  after: string;
  choices: readonly string[];
  correct: number;
  explanation: string;
  points: number;
}): PaperBankItem {
  const gapKey = "gap-1";
  return {
    key: args.key,
    type: "cloze-select",
    prompt: "Complete the missing word so the sentence is clear and grammatical.",
    stemParts: [args.before, args.after],
    gaps: [{ key: gapKey, options: options(args.choices) }],
    explanation: args.explanation,
    answer: {
      kind: "cloze",
      correctGapAnswers: [{ gapKey, choiceKey: optionKeys[args.correct] }],
      points: args.points,
    },
  };
}

function readingStimulus(key: string, title: string, body: string): PaperBankStimulus {
  return { key, kind: "reading", title, body };
}

function audioStimulus(key: string, title: string, transcript: string): PaperBankStimulus {
  return {
    key,
    kind: "audio",
    title,
    transcript,
    alt: `Original English Club practice audio: ${title}`,
  };
}

const readingPoint = 1;
const listeningPoint = 1;

const wordCompletionItems: PaperBankItem[] = [
  ["migr", " birds return to the wetland each spring.", ["atory", "ation", "ated"], 0, "Migratory describes birds that move seasonally."],
  ["The library installed adjust", " lamps beside every study desk.", ["able", "ment", "ing"], 0, "Adjustable means the lamps can be repositioned."],
  ["The committee reached a unan", " decision after reviewing the evidence.", ["imous", "imity", "imate"], 0, "Unanimous means everyone agreed."],
  ["Researchers recorded a grad", " decline in water temperature.", ["ual", "uate", "ually"], 0, "Gradual is the adjective needed before decline."],
  ["The archive keeps frag", " papers inside climate-controlled cases.", ["ile", "ment", "ility"], 0, "Fragile describes material that can be damaged easily."],
  ["Students are encour", " to compare more than one source.", ["aged", "aging", "agement"], 0, "Encouraged completes the passive construction."],
  ["The seedlings require cons", " moisture during their first week.", ["istent", "istency", "ist"], 0, "Consistent modifies moisture."],
  ["The map provides an approx", " route rather than exact coordinates.", ["imate", "imation", "imately"], 0, "Approximate is the adjective modifying route."],
  ["A brief power inter", " delayed the evening lecture.", ["ruption", "rupted", "rupting"], 0, "Interruption is the noun required after power."],
  ["The two surveys produced compar", " results despite different sample sizes.", ["able", "ison", "ably"], 0, "Comparable means suitable for comparison."],
].map(([before, after, choices, correct, explanation], index) =>
  cloze({
    key: `reading-word-${String(index + 1).padStart(2, "0")}`,
    before: before as string,
    after: after as string,
    choices: choices as string[],
    correct: correct as number,
    explanation: explanation as string,
    points: readingPoint,
  }),
);

const dailyReadingStimuli = [
  readingStimulus(
    "reading-daily-workshop",
    "Repair workshop notice",
    "BICYCLE REPAIR WORKSHOP — Thursday, 16:00–17:30, Engineering Courtyard. Bring a bicycle with one small problem and a reusable water bottle. Tools are provided. Registration closes Wednesday at noon because each mentor can work with only four participants. If rain is expected, the workshop moves to Room E14; registered participants will receive an email by 13:00 Thursday.",
  ),
  readingStimulus(
    "reading-daily-library",
    "Library message",
    "Your requested book, Coastal Cities and Changing Tides, is ready at the main circulation desk. It will be held until 18:00 on Monday. The library is closed Sunday for electrical maintenance, but the return slot outside the east entrance remains open. Reply to this message only if another person will collect the book for you.",
  ),
  readingStimulus(
    "reading-daily-train",
    "Service update",
    "The 07:40 northbound train will begin its journey at River Street instead of Central Station from 3–7 September. Passengers from Central Station may use bus 6A to River Street at no extra cost by showing a valid rail ticket. Southbound services are not affected.",
  ),
  readingStimulus(
    "reading-daily-studio",
    "Shared studio guidelines",
    "Clean brushes in the marked sink, label wet work with your name and date, and return easels to the wall before leaving. Work may dry on the centre racks for up to forty-eight hours. Items left longer will be moved to the collection shelf near the office. Food is not allowed, but covered drinks may be kept on the window ledge.",
  ),
  readingStimulus(
    "reading-daily-fieldtrip",
    "Field visit itinerary",
    "08:15 Meet at the west gate. 08:30 Depart by minibus. 09:20 Safety briefing at Mangrove Research Station. 09:45 Shore survey in assigned teams. 12:00 Lunch under the visitor shelter. 13:00 Data check and specimen sketches. 14:30 Return journey. Closed shoes are required; lunch is provided, but participants should bring sun protection and a pencil.",
  ),
];

const dailyReadingItems: PaperBankItem[] = [
  choice({ key: "reading-daily-01", stimulusKey: "reading-daily-workshop", prompt: "Why does registration close before the workshop day?", choices: ["The number of mentor places is limited.", "Participants must buy their own tools.", "The courtyard closes on Wednesday.", "Rain is certain on Thursday."], correct: 0, explanation: "The notice links the deadline to the number of people each mentor can assist.", points: readingPoint }),
  choice({ key: "reading-daily-02", stimulusKey: "reading-daily-workshop", prompt: "How will registered participants learn about a rain relocation?", choices: ["A sign at the courtyard", "An email on Thursday", "A call from a mentor", "A notice in Room E14"], correct: 1, explanation: "The notice promises an email by 13:00 Thursday.", points: readingPoint }),
  choice({ key: "reading-daily-03", stimulusKey: "reading-daily-library", prompt: "What should the reader do if a friend will collect the book?", choices: ["Use the outdoor return slot", "Wait until Sunday", "Reply to the library message", "Go to the east entrance"], correct: 2, explanation: "A reply is requested only when another person will collect the book.", points: readingPoint }),
  choice({ key: "reading-daily-04", stimulusKey: "reading-daily-library", prompt: "When can the book not be collected?", choices: ["Sunday", "Monday afternoon", "Before 18:00 Monday", "Saturday"], correct: 0, explanation: "The library is closed on Sunday for maintenance.", points: readingPoint }),
  choice({ key: "reading-daily-05", stimulusKey: "reading-daily-train", prompt: "Who may ride bus 6A without an additional fare?", choices: ["Anyone travelling south", "Rail passengers with a valid ticket", "Only station employees", "Passengers travelling after 7 September"], correct: 1, explanation: "The update states that showing a valid rail ticket covers the bus journey.", points: readingPoint }),
  choice({ key: "reading-daily-06", stimulusKey: "reading-daily-train", prompt: "Which service keeps its usual arrangement?", choices: ["The 07:40 northbound train", "Buses from Central Station", "Southbound trains", "All trains from River Street"], correct: 2, explanation: "Southbound services are explicitly described as unaffected.", points: readingPoint }),
  choice({ key: "reading-daily-07", stimulusKey: "reading-daily-studio", prompt: "Where should a painting remain while it is still wet?", choices: ["On the centre racks", "Beside the office door", "On the window ledge", "Against the easel wall"], correct: 0, explanation: "The centre racks are reserved for drying work for up to forty-eight hours.", points: readingPoint }),
  choice({ key: "reading-daily-08", stimulusKey: "reading-daily-studio", prompt: "What may be placed on the window ledge?", choices: ["Unlabelled paintings", "Covered drinks", "Food containers", "Used brushes"], correct: 1, explanation: "Covered drinks are the only permitted item in that location.", points: readingPoint }),
  choice({ key: "reading-daily-09", stimulusKey: "reading-daily-fieldtrip", prompt: "What happens immediately before the shore survey?", choices: ["Lunch", "The return journey", "A safety briefing", "Data checking"], correct: 2, explanation: "The itinerary lists the safety briefing at 09:20 and the survey at 09:45.", points: readingPoint }),
  choice({ key: "reading-daily-10", stimulusKey: "reading-daily-fieldtrip", prompt: "Which item must participants supply for themselves?", choices: ["Lunch", "A minibus ticket", "A pencil", "A specimen box"], correct: 2, explanation: "Lunch is provided, while participants are told to bring a pencil.", points: readingPoint }),
];

const academicReadingStimuli = [
  readingStimulus(
    "reading-academic-heat",
    "How city trees cool streets",
    "City trees alter local temperatures in two main ways. Their canopies intercept sunlight before it reaches roofs and pavement, while water released from leaves removes heat from the surrounding air. The strength of either effect depends on context. A wide canopy may provide substantial shade at noon but little benefit to a west-facing wall late in the day. A species that releases abundant water may cool effectively in a moist region yet struggle during drought. Researchers therefore caution against judging an urban planting programme by tree count alone. Placement, species, soil volume, and long-term maintenance determine whether the trees survive and whether their cooling reaches the people most exposed to heat. Recent mapping studies add another concern: neighbourhoods with the hottest summer surfaces often have the least canopy. Cooling plans can reduce that imbalance when residents help identify walking routes, bus stops, and courtyards where shade is needed most.",
  ),
  readingStimulus(
    "reading-academic-memory",
    "Sleep and memory sorting",
    "Learning continues after a study session ends. During sleep, patterns of neural activity associated with recent experience can reappear, a process often called replay. Replay does not create a perfect recording. Instead, it appears to strengthen some connections, weaken others, and link new material to older knowledge. Experiments in which participants learn paired words or spatial routes show that sleep usually benefits later recall, but the size of that benefit varies. Emotion, prior knowledge, and the timing of sleep all matter. Researchers also distinguish between remembering a detail and extracting a general rule. A learner may forget the exact examples used in a lesson while becoming better at applying the underlying pattern. This helps explain why a lower score on a detail test does not always mean that sleep failed to support learning. It may have changed the form of what was retained.",
  ),
  readingStimulus(
    "reading-academic-reef",
    "Sound around coral reefs",
    "A healthy coral reef is not quiet. Snapping shrimp produce a continuous crackle, fish make pulses and grunts, and waves create low-frequency noise. Young fish returning from the open ocean can use this soundscape as one cue when locating reef habitat. Damaged reefs often sound different because they support fewer sound-producing animals. In field experiments, researchers have placed underwater speakers near degraded reef patches and played recordings from healthy reefs. More juvenile fish arrived at some treated patches than at silent control sites. The result suggests that sound can help restoration, but speakers alone cannot rebuild habitat. If shelter and food remain scarce, arriving fish may leave or fail to survive. Acoustic enrichment is therefore best understood as a way to assist recolonisation after physical and ecological conditions have also improved.",
  ),
  readingStimulus(
    "reading-academic-clay",
    "What pottery reveals",
    "Fragments of pottery are common at archaeological sites because fired clay survives conditions that destroy wood, cloth, and food. Their value extends beyond decoration. The mineral composition of a vessel can indicate where its clay originated, while soot or absorbed fats may suggest how it was used. Patterns of breakage can also matter. A cluster of similar cooking vessels in one area may point to food preparation, whereas carefully placed complete vessels may be associated with ritual deposition. Interpretation remains difficult because objects move. A jar made near a river could be traded far inland, reused for a different purpose, and discarded centuries after its production. Archaeologists therefore compare pottery evidence with building remains, plant traces, written records, and the layers in which each fragment was found. The strongest account usually comes from several lines of evidence that agree.",
  ),
  readingStimulus(
    "reading-academic-insects",
    "Small pollinators in cities",
    "Urban areas can support a surprising range of pollinating insects. Gardens, railway edges, vacant lots, and green roofs may provide flowers across seasons, sometimes for longer periods than intensively managed farmland. Yet abundance in one garden does not prove that the whole city is suitable. Many insects require nesting material as well as nectar, and small populations can become isolated when roads and buildings interrupt movement. Studies that track marked insects show that connected patches are used more consistently than equally sized patches separated by long flowerless routes. This has shifted some planning attention from creating a few large gardens to maintaining a network of modest sites. Even strips of flowering plants beside footpaths can act as links. The aim is not to remove every urban disturbance; it is to make movement and nesting possible within a landscape that people also use.",
  ),
];

const academicQuestionSets: ReadonlyArray<readonly [string, readonly Omit<Parameters<typeof choice>[0], "key" | "stimulusKey" | "points">[]]> = [
  ["reading-academic-heat", [
    { prompt: "What is the passage mainly about?", choices: ["Why urban tree cooling depends on more than the number planted", "Why every city should plant the same tree species", "How roofs produce water during drought", "How mapping replaces neighbourhood consultation"], correct: 0, explanation: "The passage explains multiple conditions that determine whether planting produces useful cooling." },
    { prompt: "The word “intercept” is closest in meaning to", choices: ["measure", "block", "reflect completely", "store underground"], correct: 1, explanation: "The canopy blocks some sunlight before it reaches hard surfaces." },
    { prompt: "Why does the author mention a west-facing wall?", choices: ["To show that shade changes with position and time", "To argue that walls are cooler than streets", "To identify the best soil for trees", "To describe a mapping error"], correct: 0, explanation: "The example shows that canopy benefit depends on geometry and time of day." },
    { prompt: "Which factor may limit a water-releasing species?", choices: ["A moist climate", "A wide canopy", "Drought", "Resident participation"], correct: 2, explanation: "The passage states that such a species may struggle during drought." },
    { prompt: "What imbalance do mapping studies reveal?", choices: ["Hotter neighbourhoods often have less canopy", "Bus stops receive too much shade", "Cool areas have smaller trees", "Residents prefer paved courtyards"], correct: 0, explanation: "The hottest surfaces frequently coincide with the least tree canopy." },
    { prompt: "What can be inferred about resident involvement?", choices: ["It can help direct shade to places people actually use", "It removes the need for maintenance", "It guarantees every tree survives", "It replaces species selection"], correct: 0, explanation: "Residents can identify routes and waiting areas where shade has practical value." },
  ]],
  ["reading-academic-memory", [
    { prompt: "What is the central claim of the passage?", choices: ["Sleep can reorganise learning rather than preserve an exact copy", "Sleep always improves every kind of memory equally", "Neural replay happens only during word learning", "Detail tests are the only valid measure of learning"], correct: 0, explanation: "The passage presents sleep as selective strengthening and integration." },
    { prompt: "What does “replay” refer to?", choices: ["Repeating a lesson aloud", "Reappearance of activity patterns linked to recent experience", "A second detail test", "Forgetting emotional material"], correct: 1, explanation: "Replay is defined as the reappearance of neural patterns associated with experience." },
    { prompt: "Which factor is NOT named as affecting the sleep benefit?", choices: ["Emotion", "Prior knowledge", "Timing of sleep", "Room temperature"], correct: 3, explanation: "Room temperature is not discussed." },
    { prompt: "Why might a learner forget examples but improve at applying a pattern?", choices: ["Sleep may support generalisation rather than exact detail", "The examples were never studied", "Pattern learning requires no memory", "The detail test changes the lesson"], correct: 0, explanation: "The passage distinguishes extracting a rule from preserving examples." },
    { prompt: "The word “retained” is closest in meaning to", choices: ["measured", "remembered", "replayed aloud", "rejected"], correct: 1, explanation: "Retained refers to what remains in memory." },
    { prompt: "What warning does the final sentence provide?", choices: ["A single detail score may not capture every learning change", "Sleep research should avoid general rules", "Older knowledge prevents new learning", "All forgotten details return later"], correct: 0, explanation: "The final sentence cautions against treating detail recall as the whole outcome." },
  ]],
  ["reading-academic-reef", [
    { prompt: "What is the passage mainly concerned with?", choices: ["The possible supporting role of sound in reef restoration", "The danger of all underwater noise", "How juvenile fish produce wave noise", "Why shrimp leave healthy reefs"], correct: 0, explanation: "The passage weighs evidence for acoustic enrichment and its limits." },
    { prompt: "How can young fish use a reef soundscape?", choices: ["As a cue for locating habitat", "As their only source of food", "To rebuild coral directly", "To avoid every other fish"], correct: 0, explanation: "Sound is described as one cue for returning fish." },
    { prompt: "Why do damaged reefs often sound different?", choices: ["They have fewer sound-producing animals", "Their waves stop moving", "Speakers absorb low frequencies", "Juvenile fish become silent"], correct: 0, explanation: "Reduced animal abundance changes the soundscape." },
    { prompt: "What happened in some speaker experiments?", choices: ["More juvenile fish reached treated patches", "Coral rebuilt before fish arrived", "All fish avoided the recordings", "Silent controls became louder"], correct: 0, explanation: "Some treated patches attracted more juveniles than silent controls." },
    { prompt: "The phrase “control sites” refers to patches that", choices: ["did not receive the healthy-reef playback", "contained the largest speakers", "were already fully restored", "prevented researchers from observing fish"], correct: 0, explanation: "The silent sites provide a comparison with acoustic treatment." },
    { prompt: "What limitation of acoustic enrichment does the author stress?", choices: ["Fish still need suitable shelter and food", "Recordings cannot travel through water", "Healthy reefs have no shrimp", "Juvenile fish cannot hear low frequencies"], correct: 0, explanation: "Sound cannot replace the habitat resources needed for survival." },
  ]],
  ["reading-academic-clay", [
    { prompt: "Why is pottery common in archaeological evidence?", choices: ["Fired clay often survives when other materials decay", "Every household kept written records on jars", "Pottery never moved between regions", "Clay was used only in rituals"], correct: 0, explanation: "Durability makes pottery more likely to remain." },
    { prompt: "What might mineral composition indicate?", choices: ["Where the clay originated", "Who broke the vessel", "The exact date of disposal", "The colour of lost cloth"], correct: 0, explanation: "Mineral evidence can connect clay to a source area." },
    { prompt: "Why can breakage patterns matter?", choices: ["They may help identify activities in an area", "They prevent chemical analysis", "They prove an object was never reused", "They show that all vessels were traded"], correct: 0, explanation: "Clusters and placement can suggest cooking or ritual activity." },
    { prompt: "What difficulty is illustrated by the river jar?", choices: ["An object's location and use can change over time", "Clay dissolves during trade", "River settlements produced no pottery", "Discarded objects cannot be dated"], correct: 0, explanation: "Trade, reuse, and delayed disposal complicate interpretation." },
    { prompt: "The word “deposition” is closest in context to", choices: ["deliberate placement", "mineral testing", "commercial exchange", "accidental painting"], correct: 0, explanation: "Ritual deposition means placing an object in a context." },
    { prompt: "What method does the author recommend?", choices: ["Compare pottery with several independent kinds of evidence", "Interpret decoration without site context", "Use complete vessels only", "Assume every jar stayed near its clay source"], correct: 0, explanation: "The final sentences favour agreement across multiple evidence lines." },
  ]],
  ["reading-academic-insects", [
    { prompt: "What is the main idea of the passage?", choices: ["Connected urban habitats can support pollinators better than isolated patches", "Only large rural farms can support pollinators", "Roads always increase insect movement", "Every city garden contains the same insects"], correct: 0, explanation: "The passage moves from urban potential to the importance of connected resources." },
    { prompt: "Why may urban flowers last across a long season?", choices: ["Different urban sites can flower at different times", "All city plants are artificial", "Railway edges receive no sunlight", "Pollinators delay winter"], correct: 0, explanation: "Several kinds of urban site can collectively extend floral availability." },
    { prompt: "Why is abundance in one garden insufficient evidence?", choices: ["Other needs and movement across the city may still be limited", "A garden can never contain nesting material", "Marked insects avoid flowers", "Large gardens are always isolated"], correct: 0, explanation: "Nesting and connectivity must also be considered." },
    { prompt: "What did tracking studies find?", choices: ["Connected patches were used more consistently", "Insects remained only on green roofs", "Patch size never mattered", "Flowerless routes increased movement"], correct: 0, explanation: "Marked insects used connected patches more regularly." },
    { prompt: "What planning shift is described?", choices: ["From a few large gardens toward a network of sites", "From flowers toward paved routes", "From railway edges toward indoor gardens", "From public footpaths toward fenced farms"], correct: 0, explanation: "The passage contrasts isolated large gardens with connected modest sites." },
    { prompt: "How can footpath planting help?", choices: ["It can link otherwise separated habitat patches", "It removes all urban disturbance", "It prevents insects from nesting", "It replaces every large garden"], correct: 0, explanation: "Flowering strips can function as movement links." },
  ]],
];

const academicReadingItems = academicQuestionSets.flatMap(
  ([stimulusKey, questions], passageIndex) =>
    questions.map((question, questionIndex) =>
      choice({
        ...question,
        key: `reading-academic-${passageIndex + 1}-${questionIndex + 1}`,
        stimulusKey,
        points: readingPoint,
      }),
    ),
);

const responsePrompts = [
  ["Could you send me the revised agenda before lunch?", ["Sure, I’ll email it after class.", "The cafeteria closes at six.", "No, the projector is new."], 0],
  ["I left my umbrella in the seminar room.", ["The weather report was interesting.", "Let’s check whether the door is still open.", "The seminar begins next month."], 1],
  ["Would you mind moving your bag from this seat?", ["Not at all—I’ll put it under the table.", "The seat was made of wood.", "I moved here last year."], 0],
  ["Why was the outdoor lecture moved inside?", ["The lecture notes are online.", "Because heavy rain is expected.", "Inside the blue folder."], 1],
  ["I’m not sure which data file is the latest one.", ["Check the time stamp in the shared folder.", "The data came from three cities.", "I like the latest exhibition."], 0],
  ["Do you want me to reserve a practice room?", ["Yes, one near the library would be helpful.", "The library book was reserved.", "I practised for two hours."], 0],
  ["The bus has not arrived yet.", ["It may be delayed by the roadworks.", "I arrived at the answer yesterday.", "The road is three kilometres long."], 0],
  ["How did your presentation rehearsal go?", ["In the media laboratory.", "It went better after we shortened the opening.", "For about twelve slides."], 1],
  ["Could I borrow your charger for ten minutes?", ["Mine uses a different connector.", "The charge was included.", "Ten minutes is a long corridor."], 0],
  ["I thought the deadline was Friday.", ["It was changed to Thursday this morning.", "Friday is named after a day.", "The deadline document is yellow."], 0],
  ["Where should I return this field recorder?", ["It recorded several birds.", "Take it to the equipment desk on level two.", "The field is behind the station."], 1],
  ["The printer keeps producing blank pages.", ["Try checking whether the toner is seated correctly.", "The pages are in the second chapter.", "I printed the poster yesterday."], 0],
  ["Are you attending the language exchange tonight?", ["Yes, but I may arrive after the first activity.", "The exchange rate changed.", "Tonight follows this afternoon."], 0],
  ["I cannot hear the recording clearly.", ["Let me lower the room fan.", "The recording is four minutes long.", "I heard about the room yesterday."], 0],
  ["Who is taking notes during the interview?", ["Dina offered to write the main points.", "The interview is about water use.", "The notes are on recycled paper."], 0],
  ["Should we include the pilot results in the report?", ["Yes, but label them as preliminary.", "The pilot flew the morning route.", "The report has a green cover."], 0],
  ["I missed the first part of the safety briefing.", ["Ask the supervisor to repeat the entry procedure.", "The first part is always brief.", "Safety equipment is usually orange."], 0],
  ["This table is too wide for the poster.", ["We could show only the three most relevant columns.", "The table is beside the poster.", "The poster session was crowded."], 0],
  ["When can we collect the edited photographs?", ["The editor said they would be ready after three.", "The photographs show the old harbour.", "We collected survey responses."], 0],
  ["I forgot to bring a reusable cup.", ["You can borrow one from the event desk.", "The cup holds four hundred millilitres.", "I remember the previous event."], 0],
] as const;

const responseStimuli = responsePrompts.map(([transcript], index) =>
  audioStimulus(
    `listening-response-${String(index + 1).padStart(2, "0")}`,
    `Short exchange ${index + 1}`,
    transcript,
  ),
);

const responseItems = responsePrompts.map(([, labels, correct], index) =>
  choice({
    key: `listening-response-item-${String(index + 1).padStart(2, "0")}`,
    stimulusKey: `listening-response-${String(index + 1).padStart(2, "0")}`,
    prompt: "Which response best fits what you heard?",
    choices: labels,
    correct,
    explanation: "The best response addresses the speaker’s immediate meaning and situation.",
    points: listeningPoint,
  }),
);

const conversationStimuli = [
  audioStimulus("listening-conversation-1", "Borrowing a field kit", "Student: Hi, I reserved a water-testing kit for the ecology trip, but the booking page says collection is tomorrow. We leave at seven tomorrow morning. Technician: The page shows the normal collection time. Since your trip departs early, I can release the kit this afternoon after I finish the battery check. Student: That would help. Do I need to bring the whole group? Technician: No. Bring your student card and the signed equipment form. Please return the kit dry; moisture inside the case can damage the sensors."),
  audioStimulus("listening-conversation-2", "Changing a tutorial", "Student: I need to change my statistics tutorial because it now overlaps with laboratory work. Adviser: Section C still has two places, but it covers the same material in a different order. This week they have already discussed sampling error. Student: I can read the notes before I attend. Does changing sections affect my project group? Adviser: No, project groups are separate. Submit the online change before five today, then email the Section C tutor so she knows you are joining midweek."),
  audioStimulus("listening-conversation-3", "Poster layout advice", "Student: My research poster feels crowded, even after I shortened the methods section. Designer: The text is not the only issue. Your four charts all use different scales, so readers must stop and decode each one. Student: Should I remove a chart? Designer: Keep the three that answer your research question. Give them a shared scale and move the background paragraph into a small box at the bottom. Student: That would leave more space around the conclusion. Designer: Exactly. Empty space can guide attention; it is not wasted space."),
  audioStimulus("listening-conversation-4", "Finding a quiet interview room", "Student: I’m recording an oral-history interview on Friday. The media rooms are booked, and the café is too noisy. Librarian: Room 2B is usually a group room, but it has acoustic panels. There is a free hour at ten. Student: The interview may last ninety minutes. Librarian: Then reserve 2B from ten and the adjacent editing booth from eleven. The booth is smaller, but both rooms use the same recorder connection. Put a note on your booking that the guest uses a walking frame so staff can keep the corridor clear."),
];

const conversationQuestions = [
  ["listening-conversation-1", [
    ["Why does the student need the kit today?", ["The trip leaves early tomorrow.", "The booking was cancelled.", "The sensors must be replaced.", "The whole group must sign."], 0, "The departure is before the normal collection time."],
    ["What will the technician do first?", ["Check the batteries.", "Dry the student’s form.", "Call the ecology group.", "Repair the case."], 0, "The technician will release the kit after completing the battery check."],
    ["What must the student bring?", ["A student card and signed form", "A replacement sensor", "Every group member", "A waterproof bag"], 0, "Those two documents are required for collection."],
  ]],
  ["listening-conversation-2", [
    ["Why does the student want another tutorial?", ["It conflicts with laboratory work.", "The project group changed.", "Section C was cancelled.", "The adviser changed the syllabus."], 0, "The new laboratory schedule creates the overlap."],
    ["What has Section C already covered?", ["Sampling error", "Project design", "Laboratory safety", "Online registration"], 0, "The adviser names sampling error."],
    ["What should the student do after submitting the change?", ["Email the new tutor.", "Choose a new project group.", "Attend a laboratory at five.", "Call the statistics office."], 0, "The adviser asks for an email to the Section C tutor."],
  ]],
  ["listening-conversation-3", [
    ["What problem does the designer identify?", ["The charts use inconsistent scales.", "The conclusion is too short.", "The methods section is missing.", "The poster has no background information."], 0, "Different scales make the charts harder to compare."],
    ["Which material should be moved?", ["The background paragraph", "The research question", "All four charts", "The conclusion"], 0, "The designer suggests a small background box at the bottom."],
    ["What point does the designer make about empty space?", ["It can direct a reader’s attention.", "It should contain more methods text.", "It makes every chart larger.", "It is unsuitable for conclusions."], 0, "Empty space is described as a way to guide attention."],
  ]],
  ["listening-conversation-4", [
    ["Why is the café unsuitable?", ["It is too noisy for a recording.", "It closes before ten.", "It has no accessible corridor.", "It requires a group booking."], 0, "The student needs clean audio for an interview."],
    ["Why does the librarian suggest two rooms?", ["No single suitable room is free for the full ninety minutes.", "The guest needs separate interviews.", "The recorder must charge between rooms.", "Room 2B has no acoustic treatment."], 0, "The available hour in 2B does not cover the whole interview."],
    ["What accessibility information should be added to the booking?", ["The guest uses a walking frame.", "The student needs a larger recorder.", "The interview will be edited.", "The café is noisy."], 0, "The note allows staff to keep the corridor clear."],
  ]],
] as const;

const conversationItems = conversationQuestions.flatMap(
  ([stimulusKey, questions], groupIndex) =>
    questions.map(([prompt, labels, correct, explanation], questionIndex) =>
      choice({
        key: `listening-conversation-${groupIndex + 1}-${questionIndex + 1}`,
        stimulusKey,
        prompt,
        choices: labels,
        correct,
        explanation,
        points: listeningPoint,
      }),
    ),
);

const announcementData = [
  ["listening-announcement-1", "Museum entrance change", "Today only, visitors to the city museum should enter through the garden gate on Lark Street. The main steps are being repaired. Ticket collection, lockers, and the information desk have moved to the garden lobby. The final guided tour still begins at two, but participants should meet beside the indoor fountain rather than the main entrance.", "Where should guided-tour participants meet?", ["Beside the indoor fountain", "At the main steps", "Outside the ticket office", "On Lark Street"], 0, "The meeting point moved to the indoor fountain."],
  ["listening-announcement-2", "Evening shuttle", "The evening campus shuttle will follow a shortened route from Monday through Wednesday while Oak Bridge is inspected. It will serve the residence halls, science complex, and south gate, but not the sports centre. A temporary minibus leaves the south gate for the sports centre every thirty minutes until ten.", "How can passengers reach the sports centre?", ["Take the temporary minibus from the south gate", "Remain on the regular shuttle", "Walk from the science complex only", "Use Oak Bridge before ten"], 0, "The temporary minibus replaces that part of the route."],
  ["listening-announcement-3", "Laboratory ventilation test", "A ventilation test will take place in the chemistry building at eight tomorrow morning. No experiments may begin before the all-clear message at nine. Researchers may enter offices during the test, but laboratory doors must remain closed. Samples requiring refrigeration should stay in the backup cold room overnight.", "What must wait for the all-clear message?", ["Starting experiments", "Entering offices", "Refrigerating samples", "Closing laboratory doors"], 0, "Experiments cannot begin before the message."],
  ["listening-announcement-4", "Community garden water schedule", "Because the west pump is being replaced, plots one through eighteen may use the east tap from six to eight in the morning this weekend. Please fill containers rather than attaching private hoses, which would reduce pressure for other gardeners. Normal access is expected to resume Monday.", "Why are private hoses prohibited?", ["They would reduce water pressure for others.", "They cannot reach the east tap.", "They damage the replacement pump.", "They are allowed only on Monday."], 0, "The announcement directly links hoses to reduced pressure."],
  ["listening-announcement-5", "Film screening discussion", "After tonight’s documentary, marine biologist Dr. Lena Ward will answer questions in the small theatre. The discussion begins ten minutes after the closing credits, not immediately, so staff can move two front rows for wheelchair access. Audience members who need to leave early may submit written questions at the foyer desk before the film.", "Why is there a ten-minute delay?", ["Staff need to adjust accessible seating.", "The speaker arrives after the film.", "Written questions must be translated.", "The theatre needs a new screen."], 0, "Staff will move rows to provide wheelchair access."],
  ["listening-announcement-6", "Archive orientation", "Students joining tomorrow’s archive orientation should meet in Seminar Room Four at nine fifteen. Please bring a pencil, because pens are not permitted near the documents. Lockers are available for bags, and the archive will provide cotton supports for bound volumes. The reading room tour begins promptly at nine thirty.", "What should students bring to the orientation?", ["A pencil", "Cotton supports", "A bound volume", "A locker key"], 0, "The announcement asks students to bring a pencil; the archive supplies the supports."],
  ["listening-announcement-7", "Riverside path survey", "Saturday’s riverside path survey will begin at the north footbridge at seven thirty, half an hour earlier than first advertised. Volunteers should wear closed shoes and download the observation sheet before arriving. If heavy rain is forecast, the coordinator will send a cancellation message by six that morning.", "What changed about the survey?", ["It will start thirty minutes earlier.", "It will use a different observation sheet.", "It will begin at the south footbridge.", "It will continue during heavy rain."], 0, "The start time moved thirty minutes earlier."],
  ["listening-announcement-8", "Language exchange room", "This evening’s language exchange has moved from Room B12 to the library project room because the air conditioner in B12 is being repaired. The session still starts at six, and the topic remains food traditions. Enter the library through the west door after five thirty because the main entrance will be closed.", "Why has the language exchange moved?", ["Room B12 is being repaired.", "The topic has changed.", "The library closes at six.", "The west door is unavailable."], 0, "The room change is caused by repair work on the air conditioner in B12."],
] as const;

const announcementStimuli = announcementData.map(([key, title, transcript]) =>
  audioStimulus(key, title, transcript),
);

const announcementItems = announcementData.map(
  ([key, , , prompt, labels, correct, explanation], index) =>
    choice({
      key: `listening-announcement-item-${index + 1}`,
      stimulusKey: key,
      prompt,
      choices: labels,
      correct,
      explanation,
      points: listeningPoint,
    }),
);

const talkStimuli = [
  audioStimulus("listening-talk-1", "Why some seeds wait", "Professor: A seed contains a young plant, stored food, and a protective coat, yet a mature seed may remain inactive even when it receives water. This state is called dormancy. Dormancy prevents germination during a brief spell of favourable weather that is followed by conditions the seedling could not survive. Different species use different release signals. Some desert seeds contain chemicals that must be washed away by sustained rain. Certain forest seeds need a long cold period, which makes spring rather than autumn germination more likely. Fire-adapted plants may respond to heat or compounds in smoke. These mechanisms are not perfect predictions of the future; they are filters shaped by past conditions. Climate change can disturb that relationship. If winters become shorter, a seed that requires many weeks of cold may not receive its release signal, even when later spring conditions would support growth."),
  audioStimulus("listening-talk-2", "Reading ancient coastlines", "Lecturer: Coastlines move when sea level changes, sediment accumulates, or land rises and falls. To reconstruct an older shoreline, researchers rarely rely on a single marker. A band of rounded stones can indicate wave action, but a storm may carry similar stones inland. Microfossils provide another clue because some species live only within narrow ranges of salinity and water depth. Researchers also examine peat layers, which form in wet environments, and date organic material trapped inside them. When several indicators occur at similar elevations and dates, confidence in a reconstruction increases. Human activity complicates the record. Harbours are dredged, rivers are redirected, and buildings compress soft sediment. For that reason, a neat line on a map should be understood as a reasoned estimate with an uncertainty range, not the exact edge of water on a particular day."),
];

const talkQuestions = [
  ["listening-talk-1", [
    ["What is dormancy?", ["A period when a mature seed remains inactive", "The rapid growth of a seedling", "A chemical produced only by fire", "Damage caused by cold weather"], 0, "Dormancy is the inactive state of a mature seed."],
    ["What risk can dormancy reduce?", ["Germination during a short favourable period", "The storage of food inside a seed", "The movement of smoke through a forest", "The arrival of sustained rain"], 0, "It can prevent a seed from responding too early."],
    ["How can sustained rain affect some desert seeds?", ["It washes away germination-inhibiting chemicals.", "It creates a long cold period.", "It increases smoke compounds.", "It removes the seed coat entirely."], 0, "The professor describes chemical inhibitors being washed away."],
    ["Why do some forest seeds require cold?", ["It makes spring germination more likely.", "It predicts a forest fire.", "It permanently prevents germination.", "It reduces later rainfall."], 0, "A long cold period links release to the approach of spring."],
    ["What concern is raised about climate change?", ["Older release signals may no longer match suitable conditions.", "All seeds will germinate immediately.", "Smoke will disappear from forests.", "Desert seeds will require snow."], 0, "Changed seasons can break the historical relationship between cue and survival."],
  ]],
  ["listening-talk-2", [
    ["Why is a band of rounded stones not conclusive by itself?", ["Storms can move similar stones inland.", "Rounded stones cannot be dated.", "All stones form in peat.", "Harbours remove every stone."], 0, "Storm transport creates an alternative explanation."],
    ["What makes some microfossils useful?", ["Their species occupy limited salinity and depth ranges.", "They are visible from maps.", "They prevent sediment compression.", "They live only in modern harbours."], 0, "Narrow habitat tolerances make them environmental indicators."],
    ["Why do researchers date material in peat?", ["To connect wet conditions with a time period", "To measure modern dredging", "To identify every storm", "To locate buildings"], 0, "Dates help place the wet environment in time."],
    ["How does agreement among indicators affect a reconstruction?", ["It raises confidence.", "It removes all uncertainty.", "It proves the coastline never moved.", "It makes elevation irrelevant."], 0, "Several matching evidence lines strengthen the inference."],
    ["How should an ancient shoreline line on a map be interpreted?", ["As an estimate with uncertainty", "As the exact daily water edge", "As a modern harbour boundary", "As a record based only on buildings"], 0, "The lecturer explicitly frames it as a reasoned estimate."],
  ]],
] as const;

const talkItems = talkQuestions.flatMap(([stimulusKey, questions], talkIndex) =>
  questions.map(([prompt, labels, correct, explanation], questionIndex) =>
    choice({
      key: `listening-talk-${talkIndex + 1}-${questionIndex + 1}`,
      stimulusKey,
      prompt,
      choices: labels,
      correct,
      explanation,
      points: listeningPoint,
    }),
  ),
);

const structureCompletionData = [
  ["The campus garden ___ by student volunteers every Saturday.", ["maintains", "is maintained", "maintaining", "has maintain"], 1, "The passive form is required because volunteers maintain the garden."],
  ["Only after the final sample arrived ___ the researchers begin the comparison.", ["did", "they did", "they", "were"], 0, "A restrictive opening phrase triggers subject–auxiliary inversion."],
  ["The new reading room is quieter ___ the temporary room near the entrance.", ["from", "than", "that", "as"], 1, "The comparative adjective quieter takes than."],
  ["Neither the tutor nor the students ___ aware of the schedule change.", ["was", "has been", "were", "be"], 2, "With neither…nor, the verb agrees with the nearer plural subject students."],
  ["The report recommends that each laboratory ___ its emergency plan twice a year.", ["reviews", "review", "reviewed", "reviewing"], 1, "The mandative clause uses the base form review."],
  ["By the time the lecture began, the technicians ___ the sound system.", ["test", "have tested", "had tested", "are testing"], 2, "The testing was completed before another past event, so past perfect is appropriate."],
  ["The wetlands, ___ provide habitat for several bird species, are now protected.", ["that they", "which", "where they", "what"], 1, "Which introduces the nonrestrictive relative clause."],
  ["A student may borrow the recorder provided that it ___ before Friday.", ["returns", "is returned", "returning", "has return"], 1, "The recorder receives the action, so a passive verb is needed."],
  ["The committee postponed the vote ___ more residents could review the proposal.", ["so that", "despite", "unless", "whereas"], 0, "So that introduces the intended purpose of the postponement."],
  ["___ the heavy rain, the field team completed the survey on schedule.", ["Although", "Despite", "Because", "Since"], 1, "Despite is followed by the noun phrase the heavy rain."],
  ["There are fewer reference books on this shelf ___ there were last semester.", ["as", "that", "than", "then"], 2, "Fewer forms a comparison with than."],
  ["The professor asked whether the results ___ if the smallest sample was removed.", ["change", "would change", "will have changed", "are changing"], 1, "Would change reports a hypothetical outcome from a past reporting point."],
  ["Every application must include two references, ___ must be submitted online.", ["both of which", "both of them", "which both they", "that both"], 0, "Both of which correctly links the nonrestrictive relative clause."],
  ["Not until the lights went out ___ that the building was empty.", ["we realized", "did we realize", "we did realize", "realized we"], 1, "Not until at the start of the sentence requires inversion."],
  ["The more carefully the samples are labelled, the ___ they are to compare.", ["easy", "easiest", "more easily", "easier"], 3, "The correlative comparative pattern is the more…, the easier…."],
  ["Dr. Rahman is one of the researchers who ___ the coastal data each month.", ["checks", "check", "is checking", "has checked"], 1, "Who refers to the plural noun researchers."],
  ["Had the bus arrived five minutes later, we ___ the opening presentation.", ["missed", "would miss", "would have missed", "had missed"], 2, "The inverted third conditional requires would have missed."],
  ["The equipment is too delicate ___ without a protective case.", ["transporting", "to transport", "that transport", "for transporting it"], 1, "Too + adjective is followed by an infinitive."],
  ["No sooner had the meeting ended ___ the revised minutes were circulated.", ["when", "than", "then", "that"], 1, "The fixed construction is no sooner…than…."],
  ["Because the evidence was incomplete, the conclusion remained ___.", ["question", "questioned", "questionable", "questioning"], 2, "The adjective questionable complements remained."],
] as const;

const structureCompletionItems: PaperBankItem[] = structureCompletionData.map(
  ([sentence, labels, correct, explanation], index) =>
    choice({
      key: `structure-completion-${String(index + 1).padStart(2, "0")}`,
      prompt: `Choose the option that best completes the sentence: ${sentence}`,
      choices: labels,
      correct,
      explanation,
      points: 1,
    }),
);

const structureExpressionData = [
  ["The collection of field notes were stored in a locked cabinet.", ["The collection", "of field notes", "were stored", "in a locked cabinet"], 2, "The singular head noun collection requires was stored."],
  ["Each of the participants have received a copy of the safety guide.", ["Each", "of the participants", "have received", "a copy"], 2, "Each is singular and requires has received."],
  ["The lecturer explained the process clear enough for the visitors to follow.", ["explained", "the process", "clear enough", "to follow"], 2, "The verb explained must be modified by the adverb clearly."],
  ["The new policy applies to all students, regardless of where do they live.", ["applies to", "all students", "regardless of", "where do they live"], 3, "An embedded question uses statement order: where they live."],
  ["Researchers were surprised that the small change had such a strong affect on growth.", ["were surprised", "the small change", "such a strong affect", "on growth"], 2, "The noun needed here is effect, not the verb affect."],
  ["The archive has fewer space for maps than it had before the renovation.", ["has", "fewer space", "for maps", "than it had"], 1, "Space is uncountable, so less space is required."],
  ["Having completed the survey, the equipment was returned to the laboratory.", ["Having completed", "the survey", "the equipment", "was returned"], 2, "The opening modifier must describe the people who completed the survey, not the equipment."],
  ["The committee discussed about the proposal for nearly two hours.", ["The committee", "discussed about", "the proposal", "for nearly"], 1, "Discuss is transitive and does not take about before its object."],
  ["The number of visitors have increased steadily since the new gallery opened.", ["The number", "of visitors", "have increased", "since"], 2, "The subject the number is singular, so has increased is required."],
  ["Neither the original map or the revised diagram shows the service entrance.", ["Neither", "the original map", "or", "shows"], 2, "The correlative pair is neither…nor…."],
  ["The tutor suggested to review the first chapter before attempting the exercise.", ["The tutor", "suggested to review", "the first chapter", "before attempting"], 1, "Suggest is followed by a gerund or a that-clause: suggested reviewing."],
  ["Many of the pottery fragments was found beside the eastern wall.", ["Many", "of the pottery fragments", "was found", "beside"], 2, "The plural subject fragments requires were found."],
  ["The workshop is designed for students which need more practice with citations.", ["is designed", "for students", "which need", "with citations"], 2, "Who, not which, refers to people."],
  ["The river is not only wider than it was last year but also flows more rapid.", ["not only", "wider than", "but also", "more rapid"], 3, "The verb flows needs the adverb more rapidly."],
  ["If the samples had been labelled correctly, the error would be detected earlier.", ["had been labelled", "correctly", "would be detected", "earlier"], 2, "A past unreal result requires would have been detected."],
  ["The report contains an useful summary of the interviews conducted last month.", ["contains", "an useful summary", "of the interviews", "conducted"], 1, "Useful begins with a consonant sound and takes a, not an."],
  ["There is several reasons why the smaller room is better for recording.", ["There is", "several reasons", "why", "is better"], 0, "The plural noun reasons requires there are."],
  ["The students were asked submitting their consent forms before entering the studio.", ["were asked", "submitting", "their consent forms", "before entering"], 1, "Ask in the passive is followed by an infinitive: were asked to submit."],
  ["Only after reading both reports the committee understood the source of the difference.", ["Only after", "reading both reports", "the committee understood", "the source"], 2, "The restrictive opening phrase requires inversion: did the committee understand."],
  ["The machine can measure temperature more accurate than the older device.", ["can measure", "temperature", "more accurate", "than the older device"], 2, "Measure must be modified by the adverb more accurately."],
] as const;

const structureExpressionItems: PaperBankItem[] = structureExpressionData.map(
  ([sentence, labels, correct, explanation], index) =>
    choice({
      key: `structure-expression-${String(index + 1).padStart(2, "0")}`,
      prompt: `Which marked part should be changed to make the sentence correct? ${sentence}`,
      choices: labels,
      correct,
      explanation,
      points: 1,
    }),
);

const structureItems: PaperBankItem[] = [
  ...structureCompletionItems,
  ...structureExpressionItems,
];

const fullReadingSection: PaperBankSection = {
  key: "reading",
  skill: "reading",
  title: "Reading",
  instructions: "Complete words in context, read practical texts, and answer questions about original academic passages. You may move between questions until the section ends.",
  timeLimitSeconds: 3_300,
  stimuli: [...dailyReadingStimuli, ...academicReadingStimuli],
  items: [...wordCompletionItems, ...dailyReadingItems, ...academicReadingItems],
};

const fullListeningSection: PaperBankSection = {
  key: "listening",
  skill: "listening",
  title: "Listening",
  instructions: "Listen to each original prompt, conversation, announcement, or talk and choose the best answer. Transcript support remains available and is recorded on the result.",
  timeLimitSeconds: 2_100,
  stimuli: [
    ...responseStimuli,
    ...conversationStimuli,
    ...announcementStimuli,
    ...talkStimuli,
  ],
  items: [...responseItems, ...conversationItems, ...announcementItems, ...talkItems],
};

const fullStructureSection: PaperBankSection = {
  key: "structure",
  skill: "structure",
  title: "Structure and Written Expression",
  instructions: "Choose the best completion or identify the part that must change. Every item has one correct answer, and unanswered items receive no credit.",
  timeLimitSeconds: 1_500,
  stimuli: [],
  items: structureItems,
};

const fullPractice: PaperBankDefinition = {
  slug: "paper-practice-form-1",
  kind: "full-practice",
  adminTitle: "Paper-based practice form 1",
  title: "English Club Paper-Based Practice Form 1",
  summary: "A 115-minute paper-based session with 50 Listening, 40 Structure and Written Expression, and 50 Reading questions drawn from the reviewed bank.",
  instructions: "Work independently in section order. Your raw correct counts are exact for this attempt. The 310–677 result is a fixed English Club estimate, not an official or ETS-equated score.",
  maxAttemptsPerDay: 2,
  sections: [fullListeningSection, fullStructureSection, fullReadingSection],
};

function quickSection(
  source: PaperBankSection,
  itemIndexes: readonly number[],
  timeLimitSeconds: number,
): PaperBankSection {
  const items = itemIndexes.map((index) => source.items[index]);
  const stimulusKeys = new Set(items.flatMap((item) => item.stimulusKey ?? []));
  return {
    ...source,
    timeLimitSeconds,
    stimuli: source.stimuli.filter((stimulus) => stimulusKeys.has(stimulus.key)),
    items,
  };
}

const quickDefinitions: PaperBankDefinition[] = [
  {
    slug: "paper-quick-listening-objective",
    kind: "skill-quiz",
    adminTitle: "Quick Listening: Campus Voices",
    title: "Listening Sprint: Campus Voices",
    summary: "Eight original listening questions across short exchanges, a conversation, and an announcement.",
    instructions: "Listen first, then choose the response or detail that best matches what you heard.",
    maxAttemptsPerDay: 6,
    sections: [quickSection(fullListeningSection, [0, 1, 2, 3, 20, 21, 22, 32], 480)],
  },
  {
    slug: "paper-quick-structure-objective",
    kind: "skill-quiz",
    adminTitle: "Quick Structure: Form and Meaning",
    title: "Structure Sprint: Form and Meaning",
    summary: "Eight original questions covering sentence completion and written-expression recognition.",
    instructions: "Choose the form that completes each sentence or identify the part that must change.",
    maxAttemptsPerDay: 6,
    sections: [quickSection(fullStructureSection, [0, 2, 5, 9, 20, 24, 31, 38], 480)],
  },
  {
    slug: "paper-quick-reading-objective",
    kind: "skill-quiz",
    adminTitle: "Quick Reading: Text in Context",
    title: "Reading Sprint: Text in Context",
    summary: "Eight original questions across word completion, practical information, and academic reading.",
    instructions: "Use surrounding language and passage evidence rather than outside knowledge.",
    maxAttemptsPerDay: 6,
    sections: [quickSection(fullReadingSection, [0, 1, 10, 11, 20, 21, 22, 23], 480)],
  },
];

export const paperPracticeBank: readonly PaperBankDefinition[] = [
  fullPractice,
  ...quickDefinitions,
];

export function inspectPaperPracticeBank() {
  const errors: string[] = [];
  const slugs = new Set<string>();
  for (const definition of paperPracticeBank) {
    if (slugs.has(definition.slug)) errors.push(`duplicate-slug:${definition.slug}`);
    slugs.add(definition.slug);
    const sectionKeys = new Set<string>();
    const itemKeys = new Set<string>();
    const stimulusKeys = new Set<string>();
    for (const section of definition.sections) {
      if (sectionKeys.has(section.key)) errors.push(`duplicate-section:${definition.slug}:${section.key}`);
      sectionKeys.add(section.key);
      for (const stimulus of section.stimuli) {
        if (stimulusKeys.has(stimulus.key)) errors.push(`duplicate-stimulus:${definition.slug}:${stimulus.key}`);
        stimulusKeys.add(stimulus.key);
        if (stimulus.kind === "audio" && !stimulus.transcript) {
          errors.push(`audio-transcript:${definition.slug}:${stimulus.key}`);
        }
      }
      for (const item of section.items) {
        if (itemKeys.has(item.key)) errors.push(`duplicate-item:${definition.slug}:${item.key}`);
        itemKeys.add(item.key);
        if (item.stimulusKey !== undefined && !section.stimuli.some((stimulus) => stimulus.key === item.stimulusKey)) {
          errors.push(`missing-stimulus:${definition.slug}:${item.key}`);
        }
      }
    }
  }
  const full = paperPracticeBank.find((definition) => definition.kind === "full-practice");
  const counts = Object.fromEntries(
    (full?.sections ?? []).map((section) => [section.skill, section.items.length]),
  );
  const points = Object.fromEntries(
    (full?.sections ?? []).map((section) => [
      section.skill,
      section.items.reduce(
        (total, item) => total +
          (item.answer.kind === "text-rubric"
            ? item.answer.maxPoints
            : item.answer.points),
        0,
      ),
    ]),
  );
  return { errors, counts, points, definitions: paperPracticeBank.length };
}
