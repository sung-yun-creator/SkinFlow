const DEFAULT_AI_SERVER_URL = 'http://localhost:8000';
const GEMINI_API_VERSION = 'v1beta';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const FALLBACK_GEMINI_MODEL = 'gemini-2.5-flash-lite';

const BLOCKED_RESPONSE = 'SkinFlow 챗봇은 피부 관리, 화장품 성분, 스킨케어 루틴, 생활 습관 관련 질문에만 답변할 수 있습니다.';

const SKIN_KEYWORDS = [
    '피부',
    '스킨',
    '스킨케어',
    '화장품',
    '성분',
    '루틴',
    '세안',
    '클렌징',
    '보습',
    '장벽',
    '자외선',
    '선크림',
    '민감',
    '건성',
    '지성',
    '복합성',
    '모공',
    '주름',
    '색소',
    '색소침착',
    '기미',
    '잡티',
    '여드름',
    '레티놀',
    '비타민',
    '나이아신아마이드',
    '세라마이드',
    '히알루론산',
    '판테놀',
    '아젤라산',
    '운동',
    '수면',
    '생활습관',
];

function getAiServerUrl() {
    return (process.env.AI_SERVER_URL || DEFAULT_AI_SERVER_URL).replace(/\/$/, '');
}

function normalizeText(value) {
    return String(value || '').replace(/\s/g, '').toLowerCase();
}

function isSkinRelatedQuestion(message) {
    const normalized = normalizeText(message);

    return SKIN_KEYWORDS.some((keyword) => normalized.includes(normalizeText(keyword)));
}

function toLimitedText(value, maxLength = 2200) {
    return String(value || '').slice(0, maxLength);
}

async function requestKnowledgeSearch(message) {
    try {
        const response = await fetch(`${getAiServerUrl()}/chatbot/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: message,
                top_k: 5,
            }),
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
            return {
                status: 'unavailable',
                message: payload?.detail || payload?.message || 'AI 서버 지식 검색을 사용할 수 없습니다.',
                results: [],
            };
        }

        return {
            status: 'ok',
            message: null,
            results: Array.isArray(payload?.results) ? payload.results : [],
        };
    } catch (error) {
        return {
            status: 'unavailable',
            message: error.message,
            results: [],
        };
    }
}

function buildKnowledgeText(results) {
    return results
        .slice(0, 5)
        .map((item, index) => {
            const label = `${index + 1}. ${item.file || 'knowledge'}#${item.chunk_id ?? '-'}`;

            return `[${label}]\n${toLimitedText(item.text, 1200)}`;
        })
        .join('\n\n---\n\n');
}

function buildAnalysisText(analysisResult) {
    if (!analysisResult || typeof analysisResult !== 'object') {
        return '사용자 피부 분석 결과: 제공되지 않음';
    }

    return `사용자 피부 분석 결과:
- 피부 타입: ${analysisResult.skinType || analysisResult.skin_type || '정보 없음'}
- 색소침착: ${analysisResult.pigmentation || analysisResult.pigmentationScore || '정보 없음'}
- 모공: ${analysisResult.pore || analysisResult.poreScore || '정보 없음'}
- 주름: ${analysisResult.wrinkle || analysisResult.wrinkleScore || '정보 없음'}
- 종합 점수: ${analysisResult.totalScore || analysisResult.total_skin_score || '정보 없음'}`;
}

function buildSystemPrompt() {
    return [
        '당신은 SkinFlow의 피부 관리 챗봇입니다.',
        '피부 관리, 화장품 성분, 스킨케어 루틴, 생활 습관 질문에만 답변합니다.',
        '제공된 지식 문서와 사용자 분석 결과가 있으면 그것을 우선 근거로 사용합니다.',
        '의학적 진단, 치료 보장, 질환 확정 표현은 하지 않습니다.',
        '"도움이 될 수 있습니다", "참고할 수 있습니다", "개인차가 있습니다"처럼 안전한 표현을 사용합니다.',
        '답변은 한국어 3~5문장으로 간결하게 작성합니다.',
        '목록과 마크다운은 사용하지 않습니다.',
    ].join('\n');
}

function buildUserPrompt({ message, analysisResult, knowledgeText }) {
    return [
        buildAnalysisText(analysisResult),
        '',
        '참고 지식:',
        knowledgeText || '관련 지식 문서 없음',
        '',
        `사용자 질문: ${message}`,
    ].join('\n');
}

function parseGeminiText(payload) {
    return payload?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim();
}

async function requestGeminiAnswer({ message, analysisResult, knowledgeText }) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return null;
    }

    const models = [
        process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
        FALLBACK_GEMINI_MODEL,
    ].filter((model, index, list) => model && list.indexOf(model) === index);

    let lastError = null;

    for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${model}:generateContent?key=${apiKey}`;

        try {
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
                            parts: [{ text: buildUserPrompt({ message, analysisResult, knowledgeText }) }],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.2,
                        topP: 0.8,
                        maxOutputTokens: 500,
                    },
                }),
            });

            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                lastError = new Error(payload?.error?.message || 'Gemini request failed.');
                continue;
            }

            const text = parseGeminiText(payload);

            if (text) {
                return {
                    provider: model,
                    answer: text,
                };
            }
        } catch (error) {
            lastError = error;
        }
    }

    if (lastError) {
        console.error('Chatbot Gemini request failed:', lastError.message);
    }

    return null;
}

function buildFallbackAnswer(message, searchResults) {
    const firstResult = searchResults[0];

    if (!firstResult?.text) {
        return '관련 지식 문서를 찾지 못했습니다. 피부 타입, 성분명, 고민 부위를 조금 더 구체적으로 적어 주시면 더 정확히 안내할 수 있습니다.';
    }

    const summary = firstResult.text
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 260);

    return `${summary} 질문하신 내용은 개인 피부 상태에 따라 반응이 달라질 수 있으니, 새 성분이나 루틴은 낮은 빈도부터 확인하는 방식이 좋습니다.`;
}

async function getChatResponse({ message, analysisResult = null }) {
    const trimmedMessage = String(message || '').trim();

    if (!isSkinRelatedQuestion(trimmedMessage)) {
        return {
            success: true,
            answer: BLOCKED_RESPONSE,
            sources: [],
            source: 'blocked',
        };
    }

    const search = await requestKnowledgeSearch(trimmedMessage);
    const knowledgeText = buildKnowledgeText(search.results);
    const generated = await requestGeminiAnswer({
        message: trimmedMessage,
        analysisResult,
        knowledgeText,
    });

    return {
        success: true,
        answer: generated?.answer || buildFallbackAnswer(trimmedMessage, search.results),
        sources: search.results.map((item) => ({
            file: item.file,
            chunkId: item.chunk_id,
            distance: item.distance,
        })),
        source: generated ? 'generated' : 'knowledge_fallback',
        provider: generated?.provider || null,
        retrievalStatus: search.status,
        retrievalMessage: search.message,
    };
}

module.exports = {
    getChatResponse,
};
