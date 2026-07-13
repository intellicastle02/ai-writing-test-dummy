import "dotenv/config";
import path from "node:path";

const USE_MOCK = process.env.GA4_MOCK === "true";
const INCLUDE_ADMIN = process.env.GA4_INCLUDE_ADMIN === "true";

export async function getPageTraffic() {
  const traffic = USE_MOCK ? getMockTraffic() : await getRealTraffic();
  return filterTraffic(traffic);
}

function filterTraffic(rows) {
  if (INCLUDE_ADMIN) return rows;
  return rows.filter((row) => row.pagePath === "/" || row.pagePath.startsWith("/posts/"));
}

function getMockTraffic() {
  return [
    { pagePath: "/posts/why-dummy-testing-matters", pageViews: 42, sessions: 30, activeUsers: 25 },
    { pagePath: "/posts/seo", pageViews: 5, sessions: 4, activeUsers: 4 },
  ];
}

async function getRealTraffic() {
  const { BetaAnalyticsDataClient } = await import("@google-analytics/data");
  const propertyId = process.env.GA4_PROPERTY_ID;
  const keyFilename = path.resolve(process.env.GA4_CREDENTIALS_PATH);
  const client = new BetaAnalyticsDataClient({ keyFilename });

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "sessions" },
        { name: "activeUsers" },
      ],
    });

    return (response.rows ?? []).map((row) => ({
      pagePath: row.dimensionValues[0].value,
      pageViews: Number(row.metricValues[0].value),
      sessions: Number(row.metricValues[1].value),
      activeUsers: Number(row.metricValues[2].value),
    }));
  } finally {
    await client.close();
  }
}
