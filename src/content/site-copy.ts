import type { PublicContentFor } from "@content/public-content";

import type { MediaKey } from "./media";

export type ActivityTheme = {
  id: "speak" | "exchange" | "make" | "room";
  verb: string;
  title: string;
  prompt: string;
  description: string;
  evidence: string;
  image: MediaKey;
};

export function getActivityThemes(
  copy: PublicContentFor<"activities">,
): ActivityTheme[] {
  return [
    {
      id: "speak",
      verb: copy.speakVerb,
      title: copy.speakTitle,
      prompt: copy.speakPrompt,
      description: copy.speakDescription,
      evidence: copy.speakEvidence,
      image: "activity-speak-relay-v2",
    },
    {
      id: "exchange",
      verb: copy.exchangeVerb,
      title: copy.exchangeTitle,
      prompt: copy.exchangePrompt,
      description: copy.exchangeDescription,
      evidence: copy.exchangeEvidence,
      image: "activity-exchange-relay-v2",
    },
    {
      id: "make",
      verb: copy.makeVerb,
      title: copy.makeTitle,
      prompt: copy.makePrompt,
      description: copy.makeDescription,
      evidence: copy.makeEvidence,
      image: "activity-make-relay-v2",
    },
    {
      id: "room",
      verb: copy.roomVerb,
      title: copy.roomTitle,
      prompt: copy.roomPrompt,
      description: copy.roomDescription,
      evidence: copy.roomEvidence,
      image: "activity-room-relay-v2",
    },
  ];
}

export function getConversationPrompts(copy: PublicContentFor<"home">) {
  return [
    {
      lead: copy.promptOneLead,
      topic: copy.promptOneTopic,
      close: copy.promptOneClose,
    },
    {
      lead: copy.promptTwoLead,
      topic: copy.promptTwoTopic,
      close: copy.promptTwoClose,
    },
    {
      lead: copy.promptThreeLead,
      topic: copy.promptThreeTopic,
      close: copy.promptThreeClose,
    },
    {
      lead: copy.promptFourLead,
      topic: copy.promptFourTopic,
      close: copy.promptFourClose,
    },
  ];
}

export function getPrinciples(copy: PublicContentFor<"about">) {
  return [
    { title: copy.principleOneTitle, body: copy.principleOneBody },
    { title: copy.principleTwoTitle, body: copy.principleTwoBody },
    { title: copy.principleThreeTitle, body: copy.principleThreeBody },
    { title: copy.principleFourTitle, body: copy.principleFourBody },
  ];
}
