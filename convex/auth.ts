import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

import {
  assertPasswordRequirements,
  normalizePasswordEmail,
} from "./lib/passwordPolicy";
import {
  hashPasswordSecret,
  verifyPasswordSecret,
} from "./lib/passwordCrypto";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Anonymous(),
    Password({
      profile(params) {
        if (params.flow === "signUp") {
          throw new Error(
            "Administrator accounts are provisioned internally.",
          );
        }

        return { email: normalizePasswordEmail(params.email) };
      },
      validatePasswordRequirements(password) {
        assertPasswordRequirements(password);
      },
      crypto: {
        hashSecret: hashPasswordSecret,
        verifySecret: verifyPasswordSecret,
      },
    }),
  ],
});
