import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:4173";

const ROUTES = [
  "/auth",
  "/",
  "/employees",
  "/ppe-management",
  "/periodic-controls",
  "/health-surveillance",
  "/incidents",
  "/inspections",
  "/reports",
  "/osgb/dashboard",
  "/dashboard/certificates",
];

export const options = {
  scenarios: {
    shell_routes: {
      executor: "ramping-arrival-rate",
      startRate: 1,
      timeUnit: "1s",
      preAllocatedVUs: 20,
      maxVUs: 100,
      stages: [
        { target: 5, duration: "30s" },
        { target: 20, duration: "1m" },
        { target: 40, duration: "1m" },
        { target: 0, duration: "30s" },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1200", "p(99)<2500"],
  },
};

export default function () {
  const route = ROUTES[Math.floor(Math.random() * ROUTES.length)];
  const res = http.get(`${BASE_URL}${route}`, {
    tags: { route_type: "spa-shell", route },
  });

  check(res, {
    "shell route status is acceptable": (r) => r.status >= 200 && r.status < 400,
    "shell route returned html": (r) =>
      String(r.headers["Content-Type"] || "").toLowerCase().includes("text/html"),
  });

  sleep(1);
}
