import {
  createAccount,
  invalidateSessions,
  modifyAccountCredentials,
  retrieveAccount,
} from "@convex-dev/auth/server";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { env, internalAction } from "./_generated/server";
import {
  assertPasswordRequirements,
  normalizePasswordDisplayName,
  normalizePasswordEmail,
} from "./lib/passwordPolicy";
import { adminRoleValidator } from "./validators";

const provisionedAdminValidator = v.object({
  adminUserId: v.id("adminUsers"),
  authUserId: v.id("users"),
  email: v.string(),
  role: adminRoleValidator,
});

export const provisionPasswordAdmin = internalAction({
  args: {
    displayName: v.string(),
    email: v.string(),
    password: v.string(),
    role: adminRoleValidator,
    replaceSoleLegacyTokenIdentifier: v.optional(v.string()),
    recoverExistingAccount: v.optional(v.boolean()),
  },
  returns: provisionedAdminValidator,
  handler: async (ctx, args) => {
    const displayName = normalizePasswordDisplayName(args.displayName);
    const email = normalizePasswordEmail(args.email);
    assertPasswordRequirements(args.password);

    const user = args.recoverExistingAccount
      ? (
          await retrieveAccount(ctx, {
            provider: "password",
            account: { id: email },
          })
        ).user
      : (
          await createAccount(ctx, {
            provider: "password",
            account: { id: email, secret: args.password },
            profile: { name: displayName, email },
            shouldLinkViaEmail: false,
            shouldLinkViaPhone: false,
          })
        ).user;

    const adminUserId: Id<"adminUsers"> = await ctx.runMutation(
      internal.adminUsers.bindProvisionedPasswordAccount,
      {
        authUserId: user._id,
        authIssuer: env.CONVEX_SITE_URL,
        displayName,
        email,
        role: args.role,
        ...(args.replaceSoleLegacyTokenIdentifier === undefined
          ? {}
          : {
              replaceSoleLegacyTokenIdentifier:
                args.replaceSoleLegacyTokenIdentifier,
            }),
      },
    );

    if (args.recoverExistingAccount) {
      await modifyAccountCredentials(ctx, {
        provider: "password",
        account: { id: email, secret: args.password },
      });
      await invalidateSessions(ctx, { userId: user._id });
    }

    return {
      adminUserId,
      authUserId: user._id,
      email,
      role: args.role,
    };
  },
});
