// AI 응답의 의료적 단정 표현을 피부 관리 참고 문구로 완화합니다.
export function safeCareText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/(?:의학적|의료적)\s*판단/g, "피부 관리 참고 정보")
    .replace(/진단/g, "분석")
    .replace(/치료/g, "관리")
    .replace(/질환/g, "피부 상태")
    .replace(/확정/g, "확인");
}
