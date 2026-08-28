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
    PRACTICE_FORMAT_CREATION_MODE: v.optional(v.string()),
    BREVO_API_KEY: v.optional(v.string()),
    BREVO_SENDER_EMAIL: v.optional(v.string()),
    BREVO_SENDER_NAME: v.optional(v.string()),
    BREVO_REPLY_TO_EMAIL: v.optional(v.string()),
    RESULT_DELIVERY_PUBLIC_ORIGIN: v.optional(v.string()),
    RESULT_DELIVERY_RECIPIENT_HASH_KEY: v.optional(v.string()),
    RESULT_DELIVERY_TURNSTILE_ENABLED: v.optional(v.string()),
    TURNSTILE_SECRET_KEY: v.optional(v.string()),
  },
});
