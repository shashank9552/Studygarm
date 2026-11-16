/**
 * Global Polyfill Guards
 *
 * Ensures modern standard WHATWG URL static methods (like URL.parse) are
 * preserved across Node.js SSR, Web, and Hermes runtimes without being clobbered
 * by older third-party polyfills.
 */

if (typeof URL !== "undefined" && typeof (URL as any).parse !== "function") {
  (URL as any).parse = function (url: string, base?: string) {
    try {
      return new URL(url, base);
    } catch {
      return null;
    }
  };
}
