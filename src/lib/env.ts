/**
 * Application Environment Variables Configuration & Validation
 *
 * Client variables must be prefixed with `EXPO_PUBLIC_` to be bundled into the client build.
 * Server-side variables (e.g., secrets) must NEVER use `EXPO_PUBLIC_`.
 */

export const CLIENT_ENV = {
  CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  STREAM_API_KEY: process.env.EXPO_PUBLIC_STREAM_API_KEY,
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
};

/**
 * Validates required client-side environment variables at startup.
 * Logs actionable warnings if required keys are missing.
 */
export function validateClientEnv(): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!CLIENT_ENV.CLERK_PUBLISHABLE_KEY) {
    missing.push("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }

  if (!CLIENT_ENV.STREAM_API_KEY) {
    missing.push("EXPO_PUBLIC_STREAM_API_KEY");
  }

  if (missing.length > 0) {
    const message =
      `[ENV VALIDATION WARNING] Missing required client environment variables:\n` +
      missing.map((key) => `  - ${key}`).join("\n") +
      `\nPlease check your .env file. See .env.example for required configuration.`;

    console.warn(message);
    return { isValid: false, missing };
  }

  return { isValid: true, missing: [] };
}

/**
 * Validates and retrieves server-side environment variables for API routes.
 * Throws a detailed error if secrets are missing.
 */
export function getServerStreamConfig(): { apiKey: string; secretKey: string } {
  const apiKey =
    process.env.STREAM_API_KEY || process.env.EXPO_PUBLIC_STREAM_API_KEY;
  const secretKey =
    process.env.STREAM_SECRET_KEY || process.env.STREAM_API_SECRET;

  if (!apiKey || !secretKey) {
    const missing: string[] = [];
    if (!apiKey) missing.push("STREAM_API_KEY (or EXPO_PUBLIC_STREAM_API_KEY)");
    if (!secretKey) missing.push("STREAM_SECRET_KEY (or STREAM_API_SECRET)");

    throw new Error(
      `[SERVER ENV ERROR] Missing required Stream server environment variables:\n` +
        missing.map((key) => `  - ${key}`).join("\n") +
        `\nEnsure server secrets are properly set in .env without EXPO_PUBLIC_ prefix.`
    );
  }

  return { apiKey, secretKey };
}
