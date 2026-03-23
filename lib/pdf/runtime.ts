import { isVercelEnvironment } from "@/lib/env";

export async function getPdfRuntimeDependencies() {
  if (isVercelEnvironment()) {
    const chromium = await import("@sparticuz/chromium");
    const puppeteerCore = await import("puppeteer-core");

    return {
      chromium: chromium.default,
      puppeteer: puppeteerCore.default,
    };
  }

  const puppeteer = await import("puppeteer");
  return { puppeteer: puppeteer.default };
}
