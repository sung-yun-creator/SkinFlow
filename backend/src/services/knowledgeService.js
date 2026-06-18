const fs = require("fs");
const path = require("path");

const knowledgeDir = path.join(__dirname, "../../data/skin-knowledge");

const knowledgeMap = [
  {
    file: "pigmentation.md",
    keywords: ["색소침착", "기미", "잡티", "다크스팟", "피부톤", "톤"],
  },
  {
    file: "wrinkle.md",
    keywords: ["주름", "탄력", "노화", "잔주름", "레티놀"],
  },
  {
    file: "pore.md",
    keywords: ["모공", "피지", "블랙헤드"],
  },
  {
    file: "dry_skin.md",
    keywords: ["건성", "건조", "당김", "각질", "보습"],
  },
  {
    file: "oily_skin.md",
    keywords: ["지성", "번들", "유분", "피지"],
  },
  {
    file: "workout_skincare.md",
    keywords: ["운동", "땀", "헬스", "운동 후", "운동후"],
  },
  {
    file: "minimal_routine.md",
    keywords: ["최소", "루틴", "아침", "저녁", "기초"],
  },
  {
    file: "ingredients.md",
    keywords: [
      "성분",
      "나이아신아마이드",
      "비타민",
      "비타민c",
      "세라마이드",
      "히알루론산",
      "레티놀",
      "판테놀",
      "아젤라산",
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