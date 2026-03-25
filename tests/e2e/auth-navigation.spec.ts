import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

type TimingEntry = {
  name: string;
  durationMs: number;
  startedAt: number;
  completedAt: number;
  meta?: Record<string, unknown>;
};

type ReportMetric = {
  metric: string;
  valueMs: number;
  route?: string;
};

const credentials = {
  email: process.env.PLAYWRIGHT_TEST_EMAIL,
  password: process.env.PLAYWRIGHT_TEST_PASSWORD,
};

const maxLoginMs = Number(process.env.PLAYWRIGHT_MAX_LOGIN_MS || 2500);
const maxRouteShellMs = Number(process.env.PLAYWRIGHT_MAX_ROUTE_SHELL_MS || 800);
const maxRouteDataMs = Number(process.env.PLAYWRIGHT_MAX_ROUTE_DATA_MS || 2000);

const requiredEnv = ["PLAYWRIGHT_TEST_EMAIL", "PLAYWRIGHT_TEST_PASSWORD"] as const;
const reportMetrics: ReportMetric[] = [];

function requireEnv() {
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      throw new Error(`${key} is required for Playwright UX tests.`);
    }
  }
}

function recordMetric(metric: string, valueMs: number, route?: string) {
  const rounded = Number(valueMs.toFixed(2));
  reportMetrics.push({ metric, valueMs: rounded, route });

  const label = route ? `${metric} ${route}` : metric;
  console.log(`[ux-timing] ${label}: ${rounded}ms`);
}

async function resetTimings(page: Page) {
  await page.evaluate(() => {
    const win = window as Window & {
      __appTimings?: { active: Record<string, number>; entries: TimingEntry[] };
    };
    win.__appTimings = { active: {}, entries: [] };
  });
}

async function getTimings(page: Page): Promise<TimingEntry[]> {
  return page.evaluate(() => {
    const win = window as Window & {
      __appTimings?: { entries?: TimingEntry[] };
    };
    return win.__appTimings?.entries ?? [];
  });
}

async function findTiming(
  page: Page,
  matcher: (entry: TimingEntry) => boolean,
  timeoutMs = 15000,
): Promise<TimingEntry> {
  await expect
    .poll(async () => {
      const entries = await getTimings(page);
      return entries.find(matcher) ?? null;
    }, {
      timeout: timeoutMs,
      intervals: [100, 250, 500],
    })
    .not.toBeNull();

  const entries = await getTimings(page);
  const entry = entries.find(matcher);
  if (!entry) {
    throw new Error("Timing entry not found after polling.");
  }
  return entry;
}

async function login(page: Page) {
  await page.goto("/auth");
  await page.locator('input[name="email"]').fill(credentials.email!);
  await page.locator('input[name="password"]').fill(credentials.password!);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 30000 });
}

async function navigateAndMeasure(page: Page, href: string) {
  await resetTimings(page);
  await page.locator(`a[href="${href}"]`).first().click();
  await page.waitForURL(`**${href}`, { timeout: 15000 });
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });

  const shellTiming = await findTiming(
    page,
    (entry) => entry.name === `route:${href}:shell` && entry.meta?.phase === "shell",
  );
  const dataTiming = await findTiming(
    page,
    (entry) => entry.name === `route:${href}:data` && entry.meta?.phase === "data",
  );

  recordMetric("route-shell-ms", shellTiming.durationMs, href);
  recordMetric("route-data-ms", dataTiming.durationMs, href);

  expect(shellTiming.durationMs).toBeLessThan(maxRouteShellMs);
  expect(dataTiming.durationMs).toBeLessThan(maxRouteDataMs);

  test.info().annotations.push(
    { type: "route-shell-ms", description: `${href}=${shellTiming.durationMs.toFixed(2)}` },
    { type: "route-data-ms", description: `${href}=${dataTiming.durationMs.toFixed(2)}` },
  );
}

test.describe("UX timings", () => {
  test.afterAll(async () => {
    const reportDir = join(process.cwd(), "test-results");
    const reportPath = join(reportDir, "ux-timings.json");

    await mkdir(reportDir, { recursive: true });
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          thresholds: {
            loginMs: maxLoginMs,
            routeShellMs: maxRouteShellMs,
            routeDataMs: maxRouteDataMs,
          },
          metrics: reportMetrics,
        },
        null,
        2,
      ),
      "utf8",
    );

    console.log(`[ux-timing] report written: ${reportPath}`);
  });

  test.beforeEach(() => {
    requireEnv();
  });

  test("measures login duration", async ({ page }) => {
    await login(page);

    const loginTiming = await findTiming(
      page,
      (entry) => entry.name === "flow:login" && typeof entry.durationMs === "number",
      30000,
    );

    recordMetric("login-ms", loginTiming.durationMs);

    expect(loginTiming.durationMs).toBeLessThan(maxLoginMs);
    test.info().annotations.push({
      type: "login-ms",
      description: loginTiming.durationMs.toFixed(2),
    });
  });

  test("measures route shell and data timings for core pages", async ({ page }) => {
    await login(page);

    await navigateAndMeasure(page, "/osgb/personnel");
    await navigateAndMeasure(page, "/osgb/assignments");
    await navigateAndMeasure(page, "/osgb/documents");
    await navigateAndMeasure(page, "/osgb/company-tracking");
  });
});
