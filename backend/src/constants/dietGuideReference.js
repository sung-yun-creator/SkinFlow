// 분석 이력에 식습관 가이드가 없을 때 기본 추천으로 사용하는 가이드/루틴/체크 항목입니다.
const DIET_GUIDE_REFERENCES = [
    {
        category: '기본 권장',
        title: '수분 섭취',
        content: '피부 컨디션 유지를 위해 하루 동안 물을 나누어 마시는 습관을 참고합니다.',
        reason: '피부 분석 결과에서 건조감이나 피부 컨디션 저하가 우려될 때, 수분 섭취는 피부 장벽 유지와 전반적인 피부 상태 관리에 도움이 될 수 있어 추천합니다.',
        priority: '우선 참고',
    },
    {
        category: '선택 권장',
        title: '항산화 식품',
        content: '채소, 과일 등 항산화 식품을 식단에 균형 있게 포함하는 방향을 살펴봅니다.',
        reason: '색소침착이나 피부톤 관리가 필요한 경우, 항산화 성분이 포함된 식품은 외부 자극으로 인한 피부 컨디션 저하를 줄이는 데 참고할 수 있어 추천합니다.',
        priority: '균형 참고',
    },
    {
        category: '생활 루틴',
        title: '당 섭취 조절',
        content: '단 음료와 고당 간식 빈도를 줄이는 생활 루틴을 피부 관리와 함께 참고합니다.',
        reason: '피부 트러블이나 유분 밸런스 관리가 필요한 경우, 과도한 당 섭취는 피부 컨디션 변동에 영향을 줄 수 있어 섭취 빈도 조절을 추천합니다.',
        priority: '루틴 참고',
    },
];

const DIET_ROUTINE_REFERENCES = [
    {
        time: '아침',
        text: '수분 섭취와 자외선 차단을 먼저 챙겨보세요.',
        category: '기본 권장',
    },
    {
        time: '점심',
        text: '채소와 단백질이 포함된 식사를 선택해보세요.',
        category: '기본 권장',
    },
    {
        time: '저녁',
        text: '야식과 과한 당 섭취를 줄이고 휴식을 준비하세요.',
        category: '기본 권장',
    },
];

const DIET_CHECK_REFERENCES = [
    {
        title: '물 충분히 마시기',
        category: '기본 권장',
        description: '개인 기록이 아닌 기본 피부 관리 참고 항목입니다.',
    },
    {
        title: '채소 또는 과일 챙기기',
        category: '선택 권장',
        description: '개인 기록이 아닌 기본 피부 관리 참고 항목입니다.',
    },
    {
        title: '단 음료 줄이기',
        category: '생활 루틴',
        description: '개인 기록이 아닌 기본 피부 관리 참고 항목입니다.',
    },
    {
        title: '늦은 야식 피하기',
        category: '생활 루틴',
        description: '개인 기록이 아닌 기본 피부 관리 참고 항목입니다.',
    },
];

module.exports = {
    DIET_CHECK_REFERENCES,
    DIET_GUIDE_REFERENCES,
    DIET_ROUTINE_REFERENCES,
};
