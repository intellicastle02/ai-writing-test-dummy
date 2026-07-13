import "dotenv/config";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import path from "node:path";

const propertyId = process.env.GA4_PROPERTY_ID;
const keyFilename = path.resolve(process.env.GA4_CREDENTIALS_PATH);
const includeAdmin = process.env.GA4_INCLUDE_ADMIN === "true";

if (!propertyId) {
  throw new Error("GA4_PROPERTY_ID가 .env에 설정되어 있지 않습니다.");
}

const client = new BetaAnalyticsDataClient({ keyFilename });

async function main() {
  const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "sessions" },
        { name: "activeUsers" },
      ],
      orderBys: [
        { metric: { metricName: "screenPageViews" }, desc: true },
      ],
      limit: 25,
    });

  const rows = (response.rows ?? []).filter((row) => {
    if (includeAdmin) return true;
    const pagePath = row.dimensionValues[0].value ?? "";
    return pagePath === "/" || pagePath.startsWith("/posts/");
  });

  if (rows.length === 0) {
    console.log("최근 30일간 수집된 공개 페이지 데이터가 없습니다. (아직 트래픽이 없거나 GA4 처리 지연일 수 있음)");
    return;
  }

  console.log(`페이지별 트래픽 (최근 30일, property ${propertyId})`);
  if (!includeAdmin) {
    console.log("※ /admin 등 관리자 경로는 제외했습니다. 전체 경로를 보려면 GA4_INCLUDE_ADMIN=true 설정.");
  }
  console.log("-".repeat(60));
  for (const row of rows) {
    const pagePath = row.dimensionValues[0].value;
    const [pageViews, sessions, activeUsers] = row.metricValues.map((m) => m.value);
    console.log(
      `${pagePath.padEnd(30)} 조회수 ${pageViews.padStart(4)}  세션 ${sessions.padStart(4)}  사용자 ${activeUsers.padStart(4)}`
    );
  }
}

main()
  .catch((err) => {
    console.error("GA4 리포트 조회 실패:", err.message);
    if (err.code === 7 || /PERMISSION_DENIED/i.test(err.message)) {
      console.error(
        "\n→ 서비스 계정이 GA4 속성 액세스 관리에 등록되어 있는지 확인하세요 (뷰어 권한 필요)."
      );
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.close();
    process.exit(process.exitCode ?? 0);
  });
