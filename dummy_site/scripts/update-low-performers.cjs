const Database = require("better-sqlite3");
const path = require("path");
const db = new Database(path.join(__dirname, "..", "data", "blog.db"));

const eggAddition = `

## 삶는 시간별 상태 한눈에 보기

가장 많이 궁금해하시는 부분이라 표로 정리해봤습니다. 물이 끓기 시작한 시점부터 계산한 시간 기준이며, 달걀 크기와 화력에 따라 30초~1분 정도 차이가 날 수 있습니다.

- **6분**: 노른자가 완전히 흐르는 반숙 (온천란에 가까운 질감)
- **8분**: 노른자 중심부만 촉촉하게 흐르는 반숙
- **10분**: 노른자 가장자리는 익고 중심부는 살짝 촉촉한 상태
- **12분 이상**: 노른자까지 완전히 단단해진 완숙

저는 반숙을 좋아해서 보통 7~8분을 기준으로 삼고, 그날 달걀 크기를 보고 10~20초 정도 가감하는 편입니다.`;

const salmonAddition = `

## 굽기 시간과 온도 가이드

연어는 두께에 따라 조리 시간을 조절하는 것이 실패를 줄이는 핵심입니다. 대략 2cm 두께 기준으로 정리하면 다음과 같습니다.

- **팬 굽기**: 중강불에서 껍질 쪽 3~4분, 뒤집어서 2~3분 (겉은 바삭하게, 속은 촉촉하게)
- **오븐 굽기**: 200도로 예열 후 12~15분 (두꺼운 스테이크컷이라면 15~18분)
- **에어프라이어**: 190도에서 10~12분

속까지 완전히 익었는지 확인하고 싶다면 가장 두꺼운 부분을 젓가락으로 살짝 갈라 보아 살이 결대로 부드럽게 갈라지는지 확인하는 것이 좋습니다. 너무 오래 익히면 퍽퍽해지기 쉬우니, 시간을 지키는 것이 촉촉한 식감을 살리는 가장 확실한 방법이라고 생각합니다.`;

function insertAfterIntro(content, addition) {
  const idx = content.indexOf("## ");
  return content.slice(0, idx) + addition.trim() + "\n\n" + content.slice(idx);
}

const egg = db.prepare("SELECT id, content FROM posts WHERE slug = 'egg-cooking-science-guide'").get();
const salmon = db.prepare("SELECT id, content FROM posts WHERE slug = 'salmon-cooking-guide'").get();

db.prepare("UPDATE posts SET content = ?, updated_at = datetime('now') WHERE id = ?").run(
  insertAfterIntro(egg.content, eggAddition),
  egg.id
);
db.prepare("UPDATE posts SET content = ?, updated_at = datetime('now') WHERE id = ?").run(
  insertAfterIntro(salmon.content, salmonAddition),
  salmon.id
);

console.log("updated egg id", egg.id);
console.log("updated salmon id", salmon.id);
db.close();
