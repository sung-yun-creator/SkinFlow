const crypto = require('crypto');
const llmReportRepository = require('../repositories/llmReportRepository');
const { getRecommendationSnapshotForAnalysis } = require('./recommendationService');
const { toNumber } = require('../utils/number');

const GEMINI_API_VERSION = 'v1beta';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const FALLBACK_GEMINI_MODEL = 'gemini-2.5-flash-lite';

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

function toPromptEnvelope({ fingerprint, compactInput, provider, reusedFromAnalysisId = null }) {
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

function buildSystemPrompt() {
    return [
        '너는 SkinFlow의 피부 분석 리포트 요약 보조자다.',
        '반드시 제공된 JSON 데이터만 근거로 한국어 리포트를 작성한다.',
        '제공되지 않은 성분, 제품, 질환명, 의학적 진단, 치료법은 만들지 않는다.',
        '피부 상태는 진단이 아니라 관리 참고 정보로 표현한다.',
        '성분명, 제품명, 피부 지표명, 점수, 등급은 입력값을 최대한 정확히 유지한다.',
        '출력은 반드시 지정된 JSON 형식만 반환한다.',
    ].join('\n');
}

function buildUserPrompt(compactInput) {
    return [
        '다음 피부 분석 결과와 추천 데이터를 바탕으로 분석 이력에 저장할 짧은 요약 리포트를 작성해줘.',
        '',
        '작성 기준:',
        '- 전체 분량은 500자 이내',
        '- 같은 의미를 반복하지 않기',
        '- 추천 성분/제품/식습관은 입력된 항목만 언급하기',
        '- 점수가 낮거나 주의가 필요한 지표를 우선해서 설명하기',
        '- 제품 추천은 치료 효과처럼 말하지 말고 관리 선택지로 표현하기',
        '- 식습관 가이드는 생활 관리 참고로 표현하기',
        '- 사용자가 바로 이해할 수 있는 자연스러운 한국어로 작성하기',
        '',
        '반환 형식:',
        '{"title":"string","summary":"string","skinStatus":"string","keyPoints":["string","string","string"],"recommendationSummary":"string","careGuide":"string","disclaimer":"string"}',
        '',
        `입력 데이터:\n${JSON.stringify(compactInput)}`,
    ].join('\n');
}

function parseGeminiJson(text) {
    const cleaned = String(text || '')
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();
    const parsed = parseJson(cleaned);

    if (!parsed || typeof parsed !== 'object') {
        const error = new Error('LLM 리포트 응답을 JSON으로 해석하지 못했습니다.');
        error.status = 502;
        error.code = 'LLM_REPORT_INVALID_RESPONSE';
        throw error;
    }

    return {
        title: String(parsed.title || '분석 리포트').slice(0, 80),
        summary: String(parsed.summary || '').slice(0, 700),
        skinStatus: String(parsed.skinStatus || '').slice(0, 300),
        keyPoints: Array.isArray(parsed.keyPoints)
            ? parsed.keyPoints.slice(0, 3).map((item) => String(item).slice(0, 160))
            : [],
        recommendationSummary: String(parsed.recommendationSummary || '').slice(0, 300),
        careGuide: String(parsed.careGuide || '').slice(0, 300),
        disclaimer: String(parsed.disclaimer || '이 내용은 피부 관리 참고용이며 의학적 진단이나 치료 안내가 아닙니다.').slice(0, 180),
    };
}

async function requestGeminiReport(compactInput) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        const error = new Error('Gemini API 키가 설정되어 있지 않습니다.');
        error.status = 503;
        error.code = 'GEMINI_API_KEY_MISSING';
        throw error;
    }

    const models = [
        process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
        FALLBACK_GEMINI_MODEL,
    ].filter((model, index, list) => model && list.indexOf(model) === index);

    let lastError = null;

    for (const model of models) {
        for (let attempt = 1; attempt <= 2; attempt += 1) {
            try {
                return await requestGeminiReportWithModel(compactInput, model, apiKey);
            } catch (error) {
                lastError = error;

                if (!error.retryable) {
                    throw error;
                }
            }
        }
    }

    throw lastError;
}

async function requestGeminiReportWithModel(compactInput, model, apiKey) {
    const url = `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            systemInstruction: {
                parts: [{ text: buildSystemPrompt() }],
            },
            contents: [
                {
                    role: 'user',
                    parts: [{ text: buildUserPrompt(compactInput) }],
                },
            ],
            generationConfig: {
                temperature: 0.2,
                topP: 0.8,
                maxOutputTokens: 700,
                responseMimeType: 'application/json',
                thinkingConfig: {
                    thinkingBudget: 0,
                },
            },
        }),
    });

    if (!response.ok) {
        const detail = await response.text();
        const error = new Error('Gemini 리포트 생성에 실패했습니다.');
        error.status = 502;
        error.code = 'GEMINI_REPORT_FAILED';
        error.retryable = response.status === 429 || response.status >= 500;
        error.result = { model, status: response.status, detail: detail.slice(0, 500) };
        throw error;
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim();

    return {
        model,
        report: parseGeminiJson(text),
    };
}

async function getOrCreateLlmReport(userId, analysisId) {
    const existing = await llmReportRepository.findReportByAnalysisId(userId, analysisId);

    if (existing) {
        return toReportResponse(existing, 'database');
    }

    const snapshot = await getRecommendationSnapshotForAnalysis(userId, analysisId);

    if (!snapshot) {
        return null;
    }

    snapshot.careGuides = await llmReportRepository.findCareGuidesByAnalysisId(userId, analysisId);

    const compactInput = toCompactInput(snapshot);
    const fingerprint = buildFingerprint(compactInput);
    const reusableReport = findReusableReport(
        await llmReportRepository.findRecentReportsByUserId(userId, analysisId),
        fingerprint,
    );

    if (reusableReport) {
        const copied = await llmReportRepository.createReport({
            analysisId,
            promptText: toPromptEnvelope({
                fingerprint,
                compactInput,
                provider: 'copied',
                reusedFromAnalysisId: reusableReport.skin_analysis_id,
            }),
            explanationText: reusableReport.explanation_text,
            languageCode: reusableReport.language_code || 'ko',
        });

        return toReportResponse(copied, 'copied');
    }

    const generated = await requestGeminiReport(compactInput);
    const created = await llmReportRepository.createReport({
        analysisId,
        promptText: toPromptEnvelope({
            fingerprint,
            compactInput,
            provider: generated.model,
        }),
        explanationText: JSON.stringify(generated.report),
        languageCode: 'ko',
    });

    return toReportResponse(created, 'generated');
}

module.exports = {
    getOrCreateLlmReport,
};
