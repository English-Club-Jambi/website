import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { getPublicContentDefaults } from "@content/public-content";
import { ProgrammeQuiz } from "@/components/practice/programme-quiz";
import { buildProgrammeQuiz } from "@/content/assessment";
import { getActivityThemes } from "@/content/site-copy";

afterEach(cleanup);

describe("Home programme quiz", () => {
  it("uses published activity facts, keeps progress explicit, and stores nothing remotely", async () => {
    const user = userEvent.setup();
    const home = getPublicContentDefaults("home");
    const activities = getPublicContentDefaults("activities");
    const questions = buildProgrammeQuiz(
      getActivityThemes(activities),
      {
        body: activities.cautionBodyOne,
        linkLabel: activities.cautionLink,
      },
      {
        speak: home.programmeQuizSpeakPrompt,
        exchange: home.programmeQuizExchangePrompt,
        make: home.programmeQuizMakePrompt,
        schedule: home.programmeQuizSchedulePrompt,
        scheduleYes: home.programmeQuizScheduleYes,
        scheduleNo: home.programmeQuizScheduleNo,
      },
    );

    render(<ProgrammeQuiz questions={questions} copy={home} />);

    expect(screen.getByRole("heading", { name: home.programmeQuizTitle })).toBeVisible();
    await user.click(screen.getByRole("button", { name: home.programmeQuizStart }));

    expect(
      screen.getByRole("heading", { name: home.programmeQuizSpeakPrompt }),
    ).toBeVisible();
    expect(screen.getByText(`${home.programmeQuizQuestion} 1 ${home.programmeQuizOf} 4`)).toBeVisible();
    const next = screen.getByRole("button", { name: home.programmeQuizNext });
    expect(next).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: activities.speakVerb }));
    await user.click(screen.getByRole("button", { name: home.programmeQuizCheck }));

    expect(screen.getByRole("status")).toHaveTextContent(home.programmeQuizCorrect);
    expect(screen.getByRole("status")).toHaveTextContent(activities.speakDescription);
    expect(next).toBeEnabled();
  });
});
