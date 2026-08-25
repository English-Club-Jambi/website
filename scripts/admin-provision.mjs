import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmod, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { createInterface } from "node:readline/promises";

const supportedRoles = new Set(["editor", "publisher", "owner"]);

function parseArgs(values) {
  const parsed = new Map();
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      throw new Error(`Unexpected argument: ${value}`);
    }
    const key = value.slice(2);
    if (key === "generate-password" || key === "recover-existing") {
      parsed.set(key, true);
      continue;
    }
    const next = values[index + 1];
    if (next === undefined || next.startsWith("--")) {
      throw new Error(`Missing value for --${key}.`);
    }
    parsed.set(key, next);
    index += 1;
  }
  return parsed;
}

async function promptHidden(question) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      "A TTY is required for password entry. Use --generate-password in automation.",
    );
  }

  process.stdout.write(question);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  return await new Promise((resolve, reject) => {
    let secret = "";

    const finish = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };

    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          finish();
          reject(new Error("Provisioning cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          resolve(secret);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          secret = secret.slice(0, -1);
          continue;
        }
        if (character >= " ") secret += character;
      }
    };

    process.stdin.on("data", onData);
  });
}

function createPassword() {
  return `${randomBytes(24).toString("base64url")}Aa7!`;
}

function runConvex(args, password) {
  const convexBinary = fileURLToPath(
    new URL("../node_modules/.bin/convex", import.meta.url),
  );
  const result = spawnSync(
    convexBinary,
    ["run", "adminProvisioning:provisionPasswordAdmin", JSON.stringify(args)],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
    },
  );

  if (result.status !== 0) {
    const safeError = (result.stderr || result.stdout || "Provisioning failed.")
      .replaceAll(password, "[redacted]")
      .trim();
    throw new Error(safeError || "Provisioning failed.");
  }

  return result.stdout.trim();
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const interactive =
    !flags.has("name") || !flags.has("email") || !flags.has("role");
  let name = flags.get("name");
  let email = flags.get("email");
  let role = flags.get("role");

  if (interactive) {
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    name ??= await prompt.question("Display name: ");
    email ??= await prompt.question("Email: ");
    role ??= (await prompt.question("Role [owner]: ")) || "owner";
    prompt.close();
  }

  if (!supportedRoles.has(role)) {
    throw new Error("Role must be editor, publisher, or owner.");
  }

  const generatedPassword = flags.has("generate-password");
  const password = generatedPassword
    ? createPassword()
    : await promptHidden("Password: ");

  runConvex(
    {
      displayName: name,
      email,
      password,
      role,
      ...(flags.has("recover-existing") ? { recoverExistingAccount: true } : {}),
      ...(flags.has("repair-placeholder")
        ? {
            replaceSoleLegacyTokenIdentifier: flags.get("repair-placeholder"),
          }
        : {}),
    },
    password,
  );

  const credentials = `${JSON.stringify(
    { email: String(email).trim().toLowerCase(), password, role },
    null,
    2,
  )}\n`;
  const credentialsFile = flags.get("credentials-file");

  if (credentialsFile !== undefined) {
    await writeFile(credentialsFile, credentials, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await chmod(credentialsFile, 0o600);
    console.log(`Admin provisioned. Credentials written to ${credentialsFile}.`);
    return;
  }

  console.log("Admin provisioned.");
  if (generatedPassword) {
    console.log(`Generated password: ${password}`);
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Provisioning failed.");
  process.exitCode = 1;
}
