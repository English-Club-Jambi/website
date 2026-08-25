import { defineApp } from "convex/server";
import { v } from "convex/values";

export default defineApp({
  env: {
    R2_ACCOUNT_ID: v.optional(v.string()),
    R2_ACCESS_KEY_ID: v.optional(v.string()),
    R2_SECRET_ACCESS_KEY: v.optional(v.string()),
    R2_BUCKET_NAME: v.optional(v.string()),
    R2_API: v.optional(v.string()),
    R2_ASSESSMENT_BUCKET_NAME: v.optional(v.string()),
    R2_ASSESSMENT_ACCESS_KEY_ID: v.optional(v.string()),
    R2_ASSESSMENT_SECRET_ACCESS_KEY: v.optional(v.string()),
  },
});
