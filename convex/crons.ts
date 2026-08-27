import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "purge expired contact messages",
  { hours: 24 },
  internal.submissions.purgeExpired,
  {},
);

export default crons;
