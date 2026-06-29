const { METRIC_INGREDIENT_META } = require('../../constants/ingredientReference');
const { toNumber } = require('../../utils/number');

// 추천 도메인에서 공통으로 쓰는 분석 지표/점수 변환 유틸입니다.
function getScoreBand(score) {
    const metricScore = Number(score);

    if (!Number.isFinite(metricScore)) {
        return {
            code: 'default',
            label: '기본 추천',
            description: '분석 점수가 명확하지 않아 기본 관리 성분을 참고합니다.',
        };
    }

    if (metricScore < 60) {
        return {
            code: 'intensive',
            label: '집중 관리',
            description: '점수가 낮아 우선 관리가 필요한 지표입니다.',
        };
    }

    if (metricScore < 80) {
        return {
            code: 'support',
            label: '개선 보조',
            description: '주의 구간의 지표를 보완하기 위한 성분을 참고합니다.',
        };
    }

    return {
        code: 'maintain',
        label: '유지 관리',
        description: '상태 유지를 돕는 순한 관리 성분을 참고합니다.',
    };
}

function formatMetricScoreText(score) {
    const metricScore = Number(score);

    return Number.isFinite(metricScore) ? ` ${Math.round(metricScore)}점` : '';
}

function normalizeText(...values) {
    return values.filter(Boolean).join(' ').toLowerCase();
}

function getMetricMeta(metricCode) {
    return METRIC_INGREDIENT_META[metricCode] || {
        name: metricCode || 'skin metric',
        tags: ['피부관리'],
        keywords: [metricCode || 'skin'],
    };
}

function getConcernMetrics(metrics) {
    // 점수가 낮은 지표일수록 우선 관리 대상으로 보기 위해 추천 기준으로 변환합니다.
    const validMetrics = metrics
        .map((metric) => ({
            code: metric.metric_code || null,
            name: metric.metric_name || null,
            score: toNumber(metric.metric_score),
            grade: metric.grade_name || null,
        }))
        .filter((metric) => metric.code && metric.score !== null);

    return validMetrics.length > 0
        ? validMetrics
        : [
            { code: 'pigmentation', name: '색소침착', score: null, grade: null },
            { code: 'wrinkle', name: '주름', score: null, grade: null },
        ];
}

function normalizeFocusMetric(focus) {
    // 프론트에서 사용자가 색소침착/주름을 직접 선택하면 쿼리값을 내부 지표 코드로 맞춥니다.
    const normalizedFocus = String(focus || '').trim().toLowerCase();

    if (['pigmentation', 'pigment', 'spot', 'tone', 'color', '색소', '색소침착'].includes(normalizedFocus)) {
        return 'pigmentation';
    }

    if (['wrinkle', 'wrinkles', 'elastic', 'firm', '주름', '탄력'].includes(normalizedFocus)) {
        return 'wrinkle';
    }

    return null;
}

function applyFocusMetric(concernMetrics, focusMetricCode) {
    if (!focusMetricCode) {
        return concernMetrics;
    }

    const focusedMetric = concernMetrics.find((metric) => metric.code === focusMetricCode);

    if (!focusedMetric) {
        return concernMetrics;
    }

    return [
        focusedMetric,
        ...concernMetrics.filter((metric) => metric.code !== focusMetricCode),
    ];
}

function uniqueByMetricCode(metrics) {
    const seen = new Set();

    return metrics.filter((metric) => {
        if (!metric?.code || seen.has(metric.code)) {
            return false;
        }

        seen.add(metric.code);
        return true;
    });
}

module.exports = {
    applyFocusMetric,
    formatMetricScoreText,
    getConcernMetrics,
    getMetricMeta,
    getScoreBand,
    normalizeFocusMetric,
    normalizeText,
    uniqueByMetricCode,
};
