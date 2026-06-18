const fs = require("fs");
const path = require("path");

const chunks = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      "../../data/vector-db/knowledge_chunks.json"
    ),
    "utf-8"
  )
);

const embeddings = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      "../../data/vector-db/knowledge_embeddings.json"
    ),
    "utf-8"
  )
);

console.log("청크 수:", chunks.length);
console.log("임베딩 수:", embeddings.length);

module.exports = {};