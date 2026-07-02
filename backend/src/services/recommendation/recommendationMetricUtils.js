const { METRIC_INGREDIENT_META } = require('../../constants/ingredientReference');
const { toNumber } = require('../../utils/number');

// 프론트가 직접 고를 수 있는 추천 기준입니다. code는 API 쿼리와 내부 지표 코드로 함께 사용합니다.
const SUPPORTED_FOCUS_METRICS = [
    {
        code: 'pigmentation',
        label: '색소침착',
        aliases: ['pigmentation', 'pigment', 'spot', 'spots', 'tone', 'color', 'darkspot', 'dark_spot', '색소', '색소침착'],
    },
    {
        code: 'wrinkle',
        label: '주름',
        aliases: ['wrinkle', 'wrinkles', 'elastic', 'elasticity', 'firm', 'firmness', 'aging', '주름', '탄력'],
    },
];

// 점수 구간을 추천 문구와 우선순위 계산에서 함께 쓰는 관리 강도 라벨로 바꿉니다.
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
        description: '현재 상태를 유지하는 데 도움이 되는 성분을 참고합니다.',
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

// 분석 metric row와 이미 정규화된 metric 객체를 같은 형태로 맞춰 추천 로직이 공통으로 쓰게 합니다.
function getConcernMetrics(metrics) {
    const validMetrics = metrics
        .map((metric) => ({
            code: metric.metric_code || metric.code || null,
            name: metric.metric_name || metric.name || null,
            score: toNumber(metric.metric_score ?? metric.score),
            grade: metric.grade_name || metric.grade || null,
        }))
        .filter((metric) => metric.code && metric.score !== null);

    return validMetrics.length > 0
        ? validMetrics
        : [
            { code: 'pigmentation', name: '색소침착', score: null, grade: null },
            { code: 'wrinkle', name: '주름', score: null, grade: null },
        ];
}

// 한글/영문 별칭을 API 내부 지표 코드로 통일합니다.
function normalizeFocusMetric(focus) {
    const normalizedFocus = String(focus || '').trim().toLowerCase();

    if (!normalizedFocus) {
        return null;
    }

    const focusMetric = SUPPORTED_FOCUS_METRICS.find((metric) => metric.aliases.includes(normalizedFocus));

    return focusMetric?.code || null;
}

// focus 쿼리가 들어온 경우에는 잘못된 값을 조용히 무시하지 않고 프론트가 알 수 있게 400으로 막습니다.
function validateFocusMetric(focus) {
    if (focus === undefined || focus === null || String(focus).trim() === '') {
        return null;
    }

    const focusMetricCode = normalizeFocusMetric(focus);

    if (!focusMetricCode) {
        const error = new Error('지원하지 않는 추천 선택값입니다. pigmentation 또는 wrinkle 중 하나를 선택해주세요.');
        error.status = 400;
        error.code = 'INVALID_RECOMMENDATION_FOCUS';
        error.result = {
            allowedFocus: SUPPORTED_FOCUS_METRICS.map((metric) => metric.code),
        };
        throw error;
    }

    return focusMetricCode;
}

// 수동 선택값이 있으면 해당 지표를 맨 앞으로 보내 성분/제품/식습관 추천 기준을 맞춥니다.
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

// focus-options API와 추천 summary에서 사용할 선택지 목록을 분석 점수와 함께 만듭니다.
function getFocusMetricOptions(analysisContext = null, selectedFocus = null) {
    const concernMetrics = getConcernMetrics(analysisContext?.metrics || []);
    const selectedMetricCode = selectedFocus || concernMetrics[0]?.code || null;

    return SUPPORTED_FOCUS_METRICS.map((focusMetric) => {
        const metric = concernMetrics.find((item) => item.code === focusMetric.code) || null;
        const scoreBand = getScoreBand(metric?.score);
        const meta = getMetricMeta(focusMetric.code);

        return {
            code: focusMetric.code,
            label: focusMetric.label,
            name: metric?.name || meta.name || focusMetric.label,
            selected: focusMetric.code === selectedMetricCode,
            available: Boolean(metric),
            score: metric?.score ?? null,
            grade: metric?.grade || null,
            scoreBand: scoreBand.label,
            scoreBandCode: scoreBand.code,
            description: scoreBand.description,
        };
    });
}

module.exports = {
    applyFocusMetric,
    formatMetricScoreText,
    getConcernMetrics,
    getFocusMetricOptions,
    getMetricMeta,
    getScoreBand,
    normalizeFocusMetric,
    normalizeText,
    SUPPORTED_FOCUS_METRICS,
    uniqueByMetricCode,
    validateFocusMetric,
};
