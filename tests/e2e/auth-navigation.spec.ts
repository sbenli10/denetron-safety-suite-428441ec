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

type RouteTarget = {
  href: string;
  expectDataTiming?: boolean;
};

type ThresholdViolation = {
  route: string;
  metric: string;
  valueMs: number;
  thresholdMs: number;
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
const thresholdViolations: ThresholdViolation[] = [];
const routeTargets: RouteTarget[] = [
  { href: "/", expectDataTiming: true },
  { href: "/profile" },
  { href: "/email-history" },
  { href: "/inspections", expectDataTiming: true },
  { href: "/board-meetings" },
  { href: "/assignment-letters" },
  { href: "/incidents", expectDataTiming: true },
  { href: "/periodic-controls" },
  { href: "/companies" },
  { href: "/employees", expectDataTiming: true },
  { href: "/ppe-management" },
  { href: "/health-surveillance" },
  { href: "/osgb/dashboard", expectDataTiming: true },
  { href: "/osgb/personnel", expectDataTiming: true },
  { href: "/osgb/assignments", expectDataTiming: true },
  { href: "/osgb/company-tracking", expectDataTiming: true },
  { href: "/osgb/capacity" },
  { href: "/osgb/alerts" },
  { href: "/osgb/finance", expectDataTiming: true },
  { href: "/osgb/documents", expectDataTiming: true },
  { href: "/osgb/tasks" },
  { href: "/osgb/notes" },
  { href: "/osgb/analytics" },
  { href: "/dashboard/certificates" },
  { href: "/dashboard/certificates/history" },
  { href: "/safety-library" },
  { href: "/risk-wizard" },
  { href: "/risk-editor" },
  { href: "/capa" },
  { href: "/bulk-capa" },
  { href: "/adep-wizard" },
  { href: "/adep-plans" },
  { href: "/blueprint-analyzer" },
  { href: "/evacuation-editor" },
  { href: "/evacuation-editor/history" },
  { href: "/reports" },
  { href: "/isg-bot" },
  { href: "/annual-plans" },
  { href: "/nace-query" },
  { href: "/nace-query/sectors" },
  { href: "/settings" },
];

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

function recordViolation(route: string, metric: string, valueMs: number, thresholdMs: number) {
  const rounded = Number(valueMs.toFixed(2));
  thresholdViolations.push({
    route,
    metric,
    valueMs: rounded,
    thresholdMs,
  });
  console.log(`[ux-timing] threshold-exceeded ${metric} ${route}: ${rounded}ms > ${thresholdMs}ms`);
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

async function measureRoute(page: Page, route: RouteTarget) {
  await page.goto(route.href, { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toBeVisible({ timeout: 15000 });

  const shellTiming = await findTiming(
    page,
    (entry) => entry.name === `route:${route.href}:shell` && entry.meta?.phase === "shell",
    30000,
  );

  recordMetric("route-shell-ms", shellTiming.durationMs, route.href);
  if (shellTiming.durationMs >= maxRouteShellMs) {
    recordViolation(route.href, "route-shell-ms", shellTiming.durationMs, maxRouteShellMs);
  }

  if (!route.expectDataTiming) {
    return;
  }

  const dataTiming = await findTiming(
    page,
    (entry) => entry.name === `route:${route.href}:data` && entry.meta?.phase === "data",
    30000,
  );

  recordMetric("route-data-ms", dataTiming.durationMs, route.href);
  if (dataTiming.durationMs >= maxRouteDataMs) {
    recordViolation(route.href, "route-data-ms", dataTiming.durationMs, maxRouteDataMs);
  }

  test.info().annotations.push(
    { type: "route-shell-ms", description: `${route.href}=${shellTiming.durationMs.toFixed(2)}` },
    { type: "route-data-ms", description: `${route.href}=${dataTiming.durationMs.toFixed(2)}` },
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
          violations: thresholdViolations,
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

    if (loginTiming.durationMs >= maxLoginMs) {
      recordViolation("login", "login-ms", loginTiming.durationMs, maxLoginMs);
    }
    test.info().annotations.push({
      type: "login-ms",
      description: loginTiming.durationMs.toFixed(2),
    });
  });

  test("measures route timings for main application pages", async ({ page }) => {
    await login(page);

    for (const route of routeTargets) {
      await measureRoute(page, route);
    }

    if (thresholdViolations.length > 0) {
      const summary = thresholdViolations
        .map(
          (violation) =>
            `${violation.metric} ${violation.route}: ${violation.valueMs}ms > ${violation.thresholdMs}ms`,
        )
        .join("\n");

      throw new Error(`UX timing thresholds exceeded:\n${summary}`);
    }
  });
});
