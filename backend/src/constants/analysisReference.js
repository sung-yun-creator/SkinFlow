// 피부 분석 등급과 지표 타입의 기본 기준표입니다. DB seed와 API 정규화 기준으로 함께 사용합니다.
const ANALYSIS_GRADES = [
    {
        code: 'good',
        name: '양호',
        description: '피부 지표가 안정적인 상태입니다.',
        minScore: 80,
    },
    {
        code: 'caution',
        name: '주의',
        description: '일부 지표에 관리가 필요한 상태입니다.',
        minScore: 60,
    },
    {
        code: 'risk',
        name: '관리 필요',
        description: '집중적인 관리가 필요한 상태입니다.',
        minScore: 0,
    },
];

const ANALYSIS_METRIC_TYPES = [
    {
        code: 'pigmentation',
        name: '색소침착',
        unit: '점',
        description: '얼굴 이미지 기반 색소침착 분석 점수입니다.',
    },
    {
        code: 'wrinkle',
        name: '주름',
        unit: '점',
        description: '얼굴 이미지 기반 주름 분석 점수입니다.',
    },
];

const SCORE_GRADES = [
    {
        code: 'A',
        label: 'A등급',
        description: '매우 좋은 상태입니다.',
        minScore: 85,
    },
    {
        code: 'B',
        label: 'B등급',
        description: '좋은 상태입니다.',
        minScore: 70,
    },
    {
        code: 'C',
        label: 'C등급',
        description: '보통 수준으로 일부 관리가 필요합니다.',
        minScore: 55,
    },
    {
        code: 'D',
        label: 'D등급',
        description: '주의가 필요한 상태입니다.',
        minScore: 40,
    },
    {
        code: 'E',
        label: 'E등급',
        description: '집중 관리가 필요한 상태입니다.',
        minScore: 0,
    },
];

function findGradeByScore(score) {
    // 점수를 등급 기준표에 맞춰 good/caution/risk 중 하나로 변환합니다.
    const numericScore = Number(score);

    if (!Number.isFinite(numericScore)) {
        return ANALYSIS_GRADES[1];
    }

    return ANALYSIS_GRADES.find((grade) => numericScore >= grade.minScore) || ANALYSIS_GRADES[1];
}

function findScoreGradeByScore(score) {
    // 화면에서 점수 해석을 쉽게 보여주기 위한 A~E 표시용 등급입니다. DB 저장용 good/caution/risk와는 분리합니다.
    const numericScore = Number(score);

    if (!Number.isFinite(numericScore)) {
        return SCORE_GRADES[2];
    }

    return SCORE_GRADES.find((grade) => numericScore >= grade.minScore) || SCORE_GRADES[2];
}

module.exports = {
    ANALYSIS_GRADES,
    ANALYSIS_METRIC_TYPES,
    SCORE_GRADES,
    findGradeByScore,
    findScoreGradeByScore,
};
