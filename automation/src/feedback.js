import { getPageTraffic } from "./traffic-source.js";

const LOW_VIEW_THRESHOLD = 10;
const HIGH_VIEW_THRESHOLD = 30;

function buildInsight(pageViews) {
  if (pageViews >= HIGH_VIEW_THRESHOLD) {
    return "성과 좋음 — 유사 주제로 후속 글감 추가 제안";
  }
  if (pageViews < LOW_VIEW_THRESHOLD) {
    return "조회수 저조 — 제목을 더 구체적인 검색어 중심으로 바꾸거나 다른 각도로 재작성 고려";
  }
  return "보통 수준 — 특이사항 없음";
}

const traffic = await getPageTraffic();

const feedback = traffic.map((row) => ({
  ...row,
  insight: buildInsight(row.pageViews),
}));

console.log(JSON.stringify(feedback, null, 2));
process.exit(0);
