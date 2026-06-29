const crypto = require('crypto');
const { toNumber } = require('../../utils/number');

// LLM 리포트 저장/재사용에 필요한 입력 압축, 지문 생성, 응답 변환을 담당합니다.
function parseJson(value, fallback = null) {
    if (!value) {
        return fallback;
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        return fallback;
    }
}

function pickItems(items, mapper, limit = 3) {
    return (items || []).slice(0, limit).map(mapper);
}

function toCompactInput(snapshot) {
    return {
        analysis: {
            analysisId: snapshot.analysis.skin_analysis_id,
            grade: snapshot.analysis.grade_name || snapshot.analysis.analysis_status || null,
            totalScore: toNumber(snapshot.analysis.total_skin_score),
            summary: snapshot.analysis.summary_text || null,
            analyzedAt: snapshot.analysis.analyzed_at || snapshot.analysis.created_at || null,
            metrics: pickItems(snapshot.metrics, (metric) => ({
                code: metric.metric_code || null,
                name: metric.metric_name || null,
                score: toNumber(metric.metric_score),
                grade: metric.grade_name || null,
            }), 5),
        },
        ingredients: pickItems(snapshot.ingredients, (ingredient) => ({
            name: ingredient.name,
            type: ingredient.type || ingredient.metricCode || null,
            match: toNumber(ingredient.match),
            metricName: ingredient.metricName || null,
        })),
        products: pickItems(snapshot.products, (product) => ({
            brand: product.brandName || null,
            name: product.productName,
            match: toNumber(product.match),
            matchedIngredients: pickItems(product.matchedIngredients, (ingredient) => ingredient.name, 2),
        })),
        dietGuides: pickItems(snapshot.dietGuides, (guide) => ({
            title: guide.title,
            category: guide.category,
            reason: guide.reason || null,
        })),
        careGuides: pickItems(snapshot.careGuides, (guide) => ({
            title: guide.guide_title,
            content: guide.guide_content,
        })),
    };
}

function buildFingerprint(compactInput) {
    const fingerprintTarget = {
        grade: compactInput.analysis.grade,
        totalScore: compactInput.analysis.totalScore,
        metrics: compactInput.analysis.metrics,
        ingredients: compactInput.ingredients.map((item) => item.name),
        products: compactInput.products.map((item) => item.name),
        dietGuides: compactInput.dietGuides.map((item) => item.title),
        careGuides: compactInput.careGuides.map((item) => item.title),
    };

    return crypto
        .createHash('sha256')
        .update(JSON.stringify(fingerprintTarget))
        .digest('hex');
}

function toPromptEnvelope({
    fingerprint,
    compactInput,
    provider,
    reusedFromAnalysisId = null,
}) {
    return JSON.stringify({
        type: 'skinflow_llm_report',
        version: 1,
        provider,
        fingerprint,
        reusedFromAnalysisId,
        input: compactInput,
    });
}

function toReportResponse(row, source) {
    const report = parseJson(row.explanation_text, {
        title: '분석 리포트',
        summary: row.explanation_text,
        skinStatus: null,
        keyPoints: [],
        recommendationSummary: null,
        careGuide: null,
        disclaimer: null,
    });
    const prompt = parseJson(row.prompt_text, {});
    const analysis = prompt.input?.analysis || {};

    return {
        id: row.llm_explanation_id,
        analysisId: row.skin_analysis_id,
        analysisDate: analysis.analyzedAt || null,
        analysis: {
            analyzedAt: analysis.analyzedAt || null,
            grade: analysis.grade || null,
            totalScore: analysis.totalScore ?? null,
        },
        source,
        provider: prompt.provider || null,
        fingerprint: prompt.fingerprint || null,
        reusedFromAnalysisId: prompt.reusedFromAnalysisId || null,
        languageCode: row.language_code || 'ko',
        createdAt: row.created_at,
        report,
    };
}

function findReusableReport(reports, fingerprint) {
    return reports.find((report) => {
        const prompt = parseJson(report.prompt_text, {});

        return prompt.fingerprint === fingerprint;
    }) || null;
}

module.exports = {
    buildFingerprint,
    findReusableReport,
    parseJson,
    toCompactInput,
    toPromptEnvelope,
    toReportResponse,
};
