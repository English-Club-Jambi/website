export const LISTENING_DEPENDENCY_SEED_BATCH =
  "ec-listening-dependency-groups-v1" as const;

export type ListeningDependencyQuestion = {
  key: string;
  role: "anchor" | "follow-up";
  prompt: string;
  options: ReadonlyArray<{ key: "a" | "b" | "c" | "d"; label: string }>;
  correctChoiceKey: "a" | "b" | "c" | "d";
  explanation: string;
  difficulty: "foundational" | "developing" | "advanced";
};

export type ListeningDependencyGroup = {
  key: string;
  title: string;
  taskFamily: "listen-academic-talk" | "listen-conversation";
  audioDescription: string;
  transcript: string;
  provenance: {
    sourceType: "english-club-original";
    structuralReference: string;
    factualReferences: ReadonlyArray<string>;
    copiedText: false;
    copiedMedia: false;
    rightsNote: string;
  };
  questions: ReadonlyArray<ListeningDependencyQuestion>;
};

const structuralReference =
  "https://www.marianas.edu/media/TestingServices/TOEFL/TOEFL_Practice_Questions.pdf";

export const listeningDependencyGroups: ReadonlyArray<ListeningDependencyGroup> = [
  {
    key: "hearing-the-room",
    title: "Hearing the room",
    taskFamily: "listen-academic-talk",
    audioDescription:
      "An original English Club mini-lecture about reverberation and room design.",
    transcript: `Lecturer: Before we compare microphones for the new language room, we need to talk about the room itself. A microphone records not only a speaker's voice but also what the room does to that voice.

When a sound stops, the sound energy does not disappear at once. Some of it reaches a listener directly, and some reflects from walls, the ceiling, the floor, and furniture. The time required for the remaining sound to fall by sixty decibels is called reverberation time. A long reverberation time can make one word overlap with the next. That may suit some music, but it can make speech harder to understand.

Three things matter here: the volume of the room, the area of its surfaces, and how much sound those surfaces absorb. Hard painted blocks reflect more sound than thick carpet or acoustic ceiling tile. Soft material is useful, but covering one small wall is not a complete solution. The number of people, the room's size, and the distance between the speaker and reflective surfaces still matter.

This explains a result that can seem surprising. Moving a discussion into a larger room may improve clarity even when the larger room is not silent. There is more space for sound energy to spread, and listeners can be placed farther from strongly reflective surfaces. On the other hand, a large bare room may still produce a distracting echo.

So our first step should not be to buy a more expensive microphone. We should make a short test recording in each candidate room, keep the speaker and microphone positions the same, and listen for blurred consonants at the ends of sentences. Then we can add temporary absorbent panels and repeat the test. That comparison will tell us whether the room treatment changes the recording enough to justify a permanent installation.`,
    provenance: {
      sourceType: "english-club-original",
      structuralReference,
      factualReferences: [
        "https://www.cdc.gov/niosh/hhe/reports/pdfs/2011-0129-3160.pdf",
      ],
      copiedText: false,
      copiedMedia: false,
      rightsNote:
        "English Club-authored script and questions. The CDC/NIOSH report supports the factual discussion of reverberation; the linked practice PDF informed only the parent/follow-up delivery pattern.",
    },
    questions: [
      {
        key: "purpose",
        role: "anchor",
        prompt: "What is the main purpose of the lecture?",
        options: [
          { key: "a", label: "To compare several brands of microphone" },
          { key: "b", label: "To explain how a room can affect recorded speech" },
          { key: "c", label: "To teach students how to measure hearing loss" },
          { key: "d", label: "To recommend moving every discussion outdoors" },
        ],
        correctChoiceKey: "b",
        explanation:
          "The lecturer explains reverberation, room surfaces, and a test for how room treatment changes recorded speech.",
        difficulty: "foundational",
      },
      {
        key: "definition",
        role: "follow-up",
        prompt: "How does the lecturer define reverberation time?",
        options: [
          { key: "a", label: "The delay before a microphone begins recording" },
          { key: "b", label: "The time a speaker needs to finish a sentence" },
          { key: "c", label: "The time for remaining sound to fall by sixty decibels" },
          { key: "d", label: "The time needed to move sound panels into a room" },
        ],
        correctChoiceKey: "c",
        explanation:
          "The talk defines the term as the time required for remaining sound to fall by sixty decibels after the source stops.",
        difficulty: "foundational",
      },
      {
        key: "materials",
        role: "follow-up",
        prompt: "Why does the lecturer compare painted blocks with thick carpet?",
        options: [
          { key: "a", label: "To show that surfaces absorb different amounts of sound" },
          { key: "b", label: "To show that carpet always makes a room silent" },
          { key: "c", label: "To explain why painted rooms are easier to clean" },
          { key: "d", label: "To identify the cheapest materials for a new building" },
        ],
        correctChoiceKey: "a",
        explanation:
          "The comparison illustrates that hard and soft materials differ in how much sound energy they reflect or absorb.",
        difficulty: "developing",
      },
      {
        key: "larger-room",
        role: "follow-up",
        prompt: "What point does the lecturer make about a larger room?",
        options: [
          { key: "a", label: "It is always quieter than a small room" },
          { key: "b", label: "It removes the need for any absorbent material" },
          { key: "c", label: "It can improve clarity by giving sound more space to spread" },
          { key: "d", label: "It requires the speaker to stand next to a hard wall" },
        ],
        correctChoiceKey: "c",
        explanation:
          "The lecturer says that a larger room can improve clarity because sound can spread and listeners can be farther from reflective surfaces.",
        difficulty: "developing",
      },
      {
        key: "organization",
        role: "follow-up",
        prompt: "How is the lecture mainly organized?",
        options: [
          { key: "a", label: "A historical account followed by a biography" },
          { key: "b", label: "A definition and causes followed by a practical test" },
          { key: "c", label: "A debate between two microphone manufacturers" },
          { key: "d", label: "A list of room rules followed by a safety warning" },
        ],
        correctChoiceKey: "b",
        explanation:
          "The talk defines reverberation, explains what affects it, and ends with a proposed comparison test.",
        difficulty: "advanced",
      },
      {
        key: "next-step",
        role: "follow-up",
        prompt: "What will the group most likely do first?",
        options: [
          { key: "a", label: "Purchase the most expensive microphone" },
          { key: "b", label: "Install permanent panels without testing them" },
          { key: "c", label: "Make comparable recordings in the candidate rooms" },
          { key: "d", label: "Measure every student's hearing level" },
        ],
        correctChoiceKey: "c",
        explanation:
          "The lecturer proposes making controlled test recordings before buying equipment or installing permanent treatment.",
        difficulty: "advanced",
      },
    ],
  },
  {
    key: "preserving-a-campus-voice",
    title: "Preserving a campus voice",
    taskFamily: "listen-conversation",
    audioDescription:
      "An original English Club campus conversation about preparing an oral-history recording.",
    transcript: `Student: Hi, I booked the media room for Friday because our class is recording an oral-history interview. I thought I only needed to bring the questions, but the booking message says I should meet someone here first.

Coordinator: That's right. The room is ready, but we check the recording plan before the interview. Who will you be speaking with?

Student: A retired librarian. She helped set up a mobile reading service years ago. I have her permission to record, although the form only mentions audio.

Coordinator: Then keep the session audio-only unless she signs a new permission form. Also, send her the broad topics in advance, not a script she has to memorize. People usually give fuller answers when they know the direction of the interview but can choose their own words.

Student: I have twelve questions. Is that too many for forty minutes?

Coordinator: Probably. Mark four questions as essential. Put the background questions first, then the questions about decisions and challenges. If time remains, use the others as follow-ups. Remember that a good follow-up often comes from something the guest just said.

Student: That makes sense. I was also planning to record beside the window because the light is better.

Coordinator: Light will not matter for an audio interview, and the window faces the bus stop. Use the inner wall, switch off notification sounds, and record thirty seconds of the empty room before your guest arrives. That short sample helps an editor identify the room noise later.

Student: So I should shorten the question list, confirm audio-only permission, and move the chairs away from the window.

Coordinator: Exactly. Email me the revised plan by Thursday afternoon. I will check it and leave the microphone kit at the service desk for you.

Student: Great. I will send it tomorrow morning.`,
    provenance: {
      sourceType: "english-club-original",
      structuralReference,
      factualReferences: [],
      copiedText: false,
      copiedMedia: false,
      rightsNote:
        "English Club-authored fictional conversation and questions. It names no real person, event, office, or institutional policy; the linked practice PDF informed only the parent/follow-up delivery pattern.",
    },
    questions: [
      {
        key: "purpose",
        role: "anchor",
        prompt: "Why does the student speak with the coordinator?",
        options: [
          { key: "a", label: "To cancel a media-room booking" },
          { key: "b", label: "To prepare for an oral-history recording" },
          { key: "c", label: "To borrow a camera for a photography class" },
          { key: "d", label: "To apply for a job at the library" },
        ],
        correctChoiceKey: "b",
        explanation:
          "The student is preparing an oral-history interview and needs the coordinator to review the recording plan.",
        difficulty: "foundational",
      },
      {
        key: "permission",
        role: "follow-up",
        prompt: "Why should the student keep the interview audio-only?",
        options: [
          { key: "a", label: "The media room has no lights" },
          { key: "b", label: "The guest has permitted only an audio recording" },
          { key: "c", label: "The interview is too long for video" },
          { key: "d", label: "The microphone kit cannot record video sound" },
        ],
        correctChoiceKey: "b",
        explanation:
          "The retired librarian's permission covers audio, so another form would be needed before recording video.",
        difficulty: "foundational",
      },
      {
        key: "questions",
        role: "follow-up",
        prompt: "What does the coordinator advise the student to do with the question list?",
        options: [
          { key: "a", label: "Ask all twelve questions in the written order" },
          { key: "b", label: "Give the guest a complete script to memorize" },
          { key: "c", label: "Choose four essential questions and keep others as follow-ups" },
          { key: "d", label: "Remove every question about challenges" },
        ],
        correctChoiceKey: "c",
        explanation:
          "The coordinator recommends four essential questions and using the remaining questions only if time or the conversation supports them.",
        difficulty: "developing",
      },
      {
        key: "window",
        role: "follow-up",
        prompt: "Why does the coordinator tell the student not to record beside the window?",
        options: [
          { key: "a", label: "The window faces a noisy bus stop" },
          { key: "b", label: "The window cannot be opened" },
          { key: "c", label: "The guest dislikes natural light" },
          { key: "d", label: "The chairs will not fit there" },
        ],
        correctChoiceKey: "a",
        explanation:
          "Because the interview is audio-only, the better light is irrelevant, while bus-stop noise could affect the recording.",
        difficulty: "developing",
      },
      {
        key: "next-action",
        role: "follow-up",
        prompt: "What will the student most likely do next?",
        options: [
          { key: "a", label: "Collect the microphone kit immediately" },
          { key: "b", label: "Send a revised recording plan" },
          { key: "c", label: "Move the interview to the bus stop" },
          { key: "d", label: "Ask the guest to write all the answers" },
        ],
        correctChoiceKey: "b",
        explanation:
          "The student says the revised plan will be sent the next morning, before the Thursday-afternoon deadline.",
        difficulty: "advanced",
      },
    ],
  },
];

export function assertListeningDependencyGroupContent() {
  if (
    listeningDependencyGroups.length !== 2 ||
    listeningDependencyGroups.some(
      (group) =>
        group.questions.length < 2 ||
        group.questions.filter((question) => question.role === "anchor")
          .length !== 1 ||
        group.questions[0]?.role !== "anchor" ||
        new Set(group.questions.map((question) => question.key)).size !==
          group.questions.length ||
        group.questions.some(
          (question) =>
            question.options.length !== 4 ||
            !question.options.some(
              (option) => option.key === question.correctChoiceKey,
            ),
        ),
    )
  ) {
    throw new Error("Invalid original Listening dependency-group content");
  }
  return listeningDependencyGroups;
}
