import https from "https";

const BCV_URL = "https://www.bcv.org.ve/";
const TIMEOUT_MS = 15_000;

interface BCVRate {
  rate: number;
  source: "bcv_official";
}

interface BCVRates {
  usd: BCVRate | null;
  eur: BCVRate | null;
}

/**
 * Scrapes the official BCV website for current USD and EUR rates.
 * BCV publishes daily around 6:00 PM VET (22:00 UTC).
 *
 * Returns null for each currency if scraping fails or rate cannot be parsed.
 */
export async function fetchBCVRates(): Promise<BCVRates> {
  return new Promise((resolve) => {
    const req = https.get(
      BCV_URL,
      {
        rejectUnauthorized: false,
        timeout: TIMEOUT_MS,
      },
      (res) => {
        if (res.statusCode !== 200) {
          resolve({ usd: null, eur: null });
          return;
        }

        let body = "";
        res.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });
        res.on("end", () => {
          const usdRate = parseRateFromHTML(body, "dolar");
          const eurRate = parseRateFromHTML(body, "euro");
          resolve({
            usd: usdRate !== null ? { rate: usdRate, source: "bcv_official" } : null,
            eur: eurRate !== null ? { rate: eurRate, source: "bcv_official" } : null,
          });
        });
      },
    );

    req.on("error", () => resolve({ usd: null, eur: null }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ usd: null, eur: null });
    });
  });
}

/**
 * Backward-compatible: fetch only USD rate.
 */
export async function fetchBCVRate(): Promise<BCVRate | null> {
  const rates = await fetchBCVRates();
  return rates.usd;
}

/**
 * Extracts a rate from BCV's HTML for a given currency section.
 * Looks for the <div id="currencyId"> section and the <strong> tag with the rate.
 */
function parseRateFromHTML(html: string, currencyId: string): number | null {
  const match = html.match(
    new RegExp(`id="${currencyId}"[\\s\\S]*?<strong>\\s*([\\d.,]+)\\s*<\\/strong>`, "i"),
  );
  if (!match) return null;

  // Parse "123,45" → 123.45 (Venezuelan decimal separator is comma)
  const cleaned = match[1].replace(/\./g, "").replace(",", ".");
  const rate = parseFloat(cleaned);
  return isNaN(rate) || rate <= 0 ? null : rate;
}
