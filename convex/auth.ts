import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

const emailPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Anonymous(),
    Password({
      profile(params) {
        const email =
          typeof params.email === "string"
            ? params.email.trim().toLowerCase()
            : "";
        const name =
          typeof params.name === "string"
            ? params.name.trim().replace(/\s+/g, " ")
            : undefined;

        if (
          email.length < 6 ||
          email.length > 254 ||
          !emailPattern.test(email)
        ) {
          throw new Error("Enter a valid email address.");
        }

        if (name !== undefined && (name.length < 2 || name.length > 100)) {
          throw new Error("Name must be between 2 and 100 characters.");
        }

        return { email, ...(name === undefined ? {} : { name }) };
      },
      validatePasswordRequirements(password) {
        if (
          password.length < 12 ||
          password.length > 128 ||
          !/[a-z]/.test(password) ||
          !/[A-Z]/.test(password) ||
          !/[0-9]/.test(password)
        ) {
          throw new Error(
            "Password must be 12–128 characters and include upper-case, lower-case, and numeric characters.",
          );
        }
      },
    }),
  ],
});
