const fs = require("fs");
const path = require("path");

const knowledgeDir = path.join(__dirname, "../../data/skin-knowledge");

const knowledgeMap = [
  {
    file: "pigmentation.md",
    keywords: ["색소침착", "기미", "잡티", "다크스팟", "피부톤", "톤", "멜라닌"],
  },
  {
    file: "wrinkle.md",
    keywords: ["주름", "탄력", "노화", "잔주름", "광노화"],
  },
  {
    file: "pore.md",
    keywords: ["모공", "피지", "블랙헤드", "화이트헤드"],
  },
  {
    file: "dry_skin.md",
    keywords: ["건성", "건조", "당김", "각질"],
  },
  {
    file: "oily_skin.md",
    keywords: ["지성", "번들", "번들거림", "유분", "피지"],
  },
  {
    file: "workout_skincare.md",
    keywords: ["운동", "땀", "헬스", "운동후", "운동후관리", "운동후세안"],
  },
  {
    file: "minimal_routine.md",
    keywords: ["최소", "루틴", "아침", "저녁", "기초", "스킨케어루틴"],
  },
  {
    file: "ingredients.md",
    keywords: ["성분", "화장품성분", "기능성성분"],
  },

  {
    file: "sunscreen.md",
    keywords: [
      "자외선",
      "자외선차단제",
      "선크림",
      "썬크림",
      "spf",
      "pa",
      "uva",
      "uvb",
      "덧바르",
      "재도포",
      "차단제",
    ],
  },
  {
    file: "cleansing.md",
    keywords: [
      "세안",
      "클렌징",
      "클렌저",
      "씻기",
      "폼클렌징",
      "약산성",
      "운동후세안",
      "운동후씻",
    ],
  },
  {
    file: "moisturizer.md",
    keywords: [
      "보습제",
      "보습",
      "수분크림",
      "크림",
      "로션",
      "건조",
      "당김",
      "수분",
    ],
  },
  {
    file: "skin_barrier.md",
    keywords: [
      "피부장벽",
      "장벽",
      "장벽손상",
      "장벽회복",
      "민감",
      "따가움",
      "자극",
      "홍조",
    ],
  },
  {
    file: "niacinamide.md",
    keywords: [
      "나이아신아마이드",
      "나이아신",
      "niacinamide",
      "비타민b3",
      "피지조절",
      "톤관리",
    ],
  },
  {
    file: "vitamin_c.md",
    keywords: [
      "비타민c",
      "비타민씨",
      "vitaminc",
      "항산화",
      "칙칙",
      "브라이트닝",
      "미백",
    ],
  },
  {
    file: "retinol.md",
    keywords: [
      "레티놀",
      "retinol",
      "레티노이드",
      "비타민a",
      "주름",
      "광노화",
      "각질",
    ],
  },
  {
    file: "ceramide.md",
    keywords: [
      "세라마이드",
      "ceramide",
      "장벽",
      "보습",
      "건조",
      "수분유지",
    ],
  },
];

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s/g, "");
}

function readKnowledgeFile(fileName) {
  const filePath = path.join(knowledgeDir, fileName);

  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf-8");
}

function getRelevantKnowledge(message) {
  const normalizedMessage = normalizeText(message);

  const matchedFiles = knowledgeMap
    .filter(({ keywords }) =>
      keywords.some((keyword) =>
        normalizedMessage.includes(normalizeText(keyword))
      )
    )
    .map(({ file }) => file);

  const uniqueFiles = [...new Set(matchedFiles)];

  if (uniqueFiles.length === 0) {
    return "";
  }

  return uniqueFiles
    .map((file) => {
      const content = readKnowledgeFile(file);

      return `
[문서명: ${file}]

${content}
`;
    })
    .join("\n\n---\n\n");
}

module.exports = {
  getRelevantKnowledge,
};