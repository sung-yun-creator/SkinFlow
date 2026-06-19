const DEFAULT_AI_SERVER_URL = 'http://localhost:8000';
const GEMINI_API_VERSION = 'v1beta';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const FALLBACK_GEMINI_MODEL = 'gemini-2.5-flash-lite';
const { INGREDIENT_REFERENCES } = require('../constants/ingredientReference');

const MAX_ANSWER_LENGTH = 220;
const MIN_GENERATED_ANSWER_LENGTH = 55;
const AI_SEARCH_TIMEOUT_MS = 5000;
const GEMINI_TIMEOUT_MS = 8000;
const UNRELATED_RESPONSE = 'SkinFlow 챗봇은 색소침착, 주름, 성분, 선크림 등 피부 관리 관련 질문에만 답변할 수 있습니다.';
const SCOPE_GUIDE_RESPONSE = '현재 챗봇은 색소침착, 주름, DB 추천 성분, 선크림 중심으로 짧게 안내합니다.';

const INGREDIENT_KEYWORD_ALIASES = {
    비타민C: ['비타민c', '비타민씨', '비타민 c', 'vitamin c', 'vitaminc', 'vitamin'],
    '비타민C 유도체': ['비타민c유도체', '비타민씨유도체', '비타민 c 유도체'],
    트라넥사믹애씨드: ['트라넥사믹애씨드', '트라넥사민산', '트라넥삼산', 'tranexamic'],
    '알파-비사보롤': ['알파비사보롤', '비사보롤', 'bisabolol'],
    글루타치온: ['글루타치온', 'glutathione'],
    닥나무추출물: ['닥나무', '닥나무추출물'],
    아데노신: ['아데노신', 'adenosine'],
    레티놀: ['레티놀', 'retinol'],
    레티날: ['레티날', 'retinal'],
    바쿠치올: ['바쿠치올', 'bakuchiol'],
    펩타이드: ['펩타이드', 'peptide'],
    콜라겐: ['콜라겐', 'collagen'],
    엘라스틴: ['엘라스틴', 'elastin'],
    토코페롤: ['토코페롤', '비타민e', '비타민 e', 'vitamin e', 'tocopherol'],
    세라마이드: ['세라마이드', 'ceramide'],
    나이아신아마이드: ['나이아신아마이드', 'niacinamide'],
    알부틴: ['알부틴', 'arbutin'],
    감초추출물: ['감초', '감초추출물', 'licorice'],
};

function buildIngredientFallbackAnswer(ingredient) {
    const target = ingredient.type === 'wrinkle' ? '주름' : '색소침착';
    const lastCharCode = ingredient.name.charCodeAt(ingredient.name.length - 1);
    const hasFinalConsonant = lastCharCode >= 0xac00 && lastCharCode <= 0xd7a3
        ? (lastCharCode - 0xac00) % 28 > 0
        : false;
    const topicParticle = hasFinalConsonant ? '은' : '는';

    return `${ingredient.name}${topicParticle} ${target} 관리에서 참고할 수 있는 성분입니다. ${ingredient.description} 새 제품은 소량부터 확인하고, 자극이 있으면 사용 빈도를 줄이는 것이 좋습니다.`;
}

const INGREDIENT_FALLBACK_ANSWERS = INGREDIENT_REFERENCES
    .map((ingredient) => ({
        keywords: [
            ingredient.name,
            ...(INGREDIENT_KEYWORD_ALIASES[ingredient.name] || []),
        ],
        answer: buildIngredientFallbackAnswer(ingredient),
    }))
    .sort((left, right) => {
        const leftLength = Math.max(...left.keywords.map((keyword) => normalizeText(keyword).length));
        const rightLength = Math.max(...right.keywords.map((keyword) => normalizeText(keyword).length));

        return rightLength - leftLength;
    });

const TOPIC_FALLBACK_ANSWERS = [
    ...INGREDIENT_FALLBACK_ANSWERS,
    {
        keywords: ['생활습관', '식습관', '습관', '수면', '운동'],
        requiredKeywords: ['색소', '색소침착', '기미', '잡티', '피부톤', '톤'],
        answer: '색소침착 관리는 자외선 차단을 꾸준히 하고, 피부를 세게 문지르는 습관을 줄이는 것이 중요합니다. 수면과 식습관은 보조 관리로 보고, 자극이 생기는 제품은 사용 빈도를 낮추는 편이 좋습니다.',
    },
    {
        keywords: ['생활습관', '식습관', '습관', '수면', '운동'],
        requiredKeywords: ['주름', '잔주름', '탄력', '노화', '안티에이징'],
        answer: '주름 관리는 자외선 차단과 보습을 기본으로 하고, 수면 부족과 건조한 생활 환경을 줄이는 것이 도움이 됩니다. 레티놀 같은 성분은 낮은 빈도부터 사용해 자극 여부를 확인하는 편이 좋습니다.',
    },
    {
        keywords: ['성분', '화장품성분', '화장품 성분', 'ingredient'],
        answer: '현재 성분 답변은 DB 추천 성분 기준으로 색소침착과 주름 관련 성분을 짧게 안내합니다. 성분명을 함께 질문하면 더 정확히 답변할 수 있습니다.',
    },
    {
        keywords: ['선크림', '썬크림', '자차', 'spf', '자외선', '자외선차단', '자외선차단제', 'sunscreen'],
        answer: '선크림은 색소침착과 주름 관리를 위해 매일 사용하는 것이 좋습니다. 야외 활동이나 땀이 많은 날에는 2~3시간 간격으로 덧바르는 편이 도움이 됩니다.',
    },
    {
        keywords: ['색소', '색소침착', '기미', '잡티', '미백', '피부톤', '톤', '칙칙', '브라이트닝', 'pigmentation'],
        answer: '색소침착 관리는 자외선 차단을 꾸준히 하는 것이 기본입니다. 비타민 C나 나이아신아마이드는 톤 관리에 참고할 수 있고, 자극이 생기면 사용 빈도를 줄이는 것이 좋습니다.',
    },
    {
        keywords: ['주름', '잔주름', '눈가', '팔자', '탄력', '노화', '안티에이징', 'wrinkle'],
        answer: '주름 관리는 자외선 차단과 보습을 기본으로 잡는 것이 좋습니다. 레티놀은 도움이 될 수 있지만 자극이 생길 수 있어 낮은 빈도부터 시작하는 편이 안전합니다.',
    },
];

const FALLBACK_BY_FILE = {
    'pigmentation.md': '색소침착',
    'wrinkle.md': '주름',
    'retinol.md': '레티놀',
    'niacinamide.md': '나이아신아마이드',
    'vitamin_c.md': '비타민c',
    'sunscreen.md': '선크림',
};

const OUT_OF_SCOPE_SKIN_KEYWORDS = [
    '모공',
    '여드름',
    '트러블',
    '건성',
    '지성',
    '복합성',
    '민감성',
    '민감',
    '피부타입',
    '피부 타입',
    '보습',
    '수분',
    '장벽',
    '세안',
    '클렌징',
    '각질',
    '운동',
    '수면',
    '식습관',
    '생활습관',
    '습관',
];

const GENERAL_SKIN_KEYWORDS = [
    '피부',
    '스킨',
    '스킨케어',
    '화장품',
    '관리',
    '루틴',
];

function getAiServerUrl() {
    return (process.env.AI_SERVER_URL || DEFAULT_AI_SERVER_URL).replace(/\/$/, '');
}

function normalizeText(value) {
    return String(value || '').replace(/\s/g, '').toLowerCase();
}

function createTimeoutSignal(timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return {
        signal: controller.signal,
        clear: () => clearTimeout(timeoutId),
    };
}

function toLimitedText(value, maxLength = 2200) {
    return String(value || '').slice(0, maxLength);
}

async function requestKnowledgeSearch(message) {
    const timeout = createTimeoutSignal(AI_SEARCH_TIMEOUT_MS);

    try {
        const response = await fetch(`${getAiServerUrl()}/chatbot/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: timeout.signal,
            body: JSON.stringify({
                query: message,
                top_k: 3,
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
    } finally {
        timeout.clear();
    }
}

function buildKnowledgeText(results) {
    return results
        .slice(0, 3)
        .map((item, index) => {
            const label = `${index + 1}. ${item.file || 'knowledge'}#${item.chunk_id ?? '-'}`;

            return `[${label}]\n${toLimitedText(item.text, 650)}`;
        })
        .join('\n\n---\n\n');
}

function buildAnalysisText(analysisResult) {
    if (!analysisResult || typeof analysisResult !== 'object') {
        return '사용자 피부 분석 결과: 제공되지 않음';
    }

    return `사용자 피부 분석 결과:
- 색소침착: ${analysisResult.pigmentation || analysisResult.pigmentationScore || '정보 없음'}
- 주름: ${analysisResult.wrinkle || analysisResult.wrinkleScore || '정보 없음'}
- 종합 점수: ${analysisResult.totalScore || analysisResult.total_skin_score || '정보 없음'}`;
}

function buildSystemPrompt() {
    return [
        '당신은 SkinFlow의 MVP 범위에 맞춘 피부 관리 정보 챗봇입니다.',
        '색소침착, 주름, DB 추천 성분, 선크림 중심으로 답변합니다.',
        '피부 타입, 모공, 여드름 등 MVP 분석 범위를 벗어난 주제는 SkinFlow가 분석하는 기능처럼 설명하지 않습니다.',
        '질문이 범위 밖이면 가능한 경우 색소침착, 주름, 성분, 선크림 관리와 연결되는 일반 정보만 간단히 안내합니다.',
        '제공된 지식 문서와 사용자 분석 결과가 있으면 그것을 우선 근거로 사용합니다.',
        '의학적 진단, 치료 보장, 질환 확정 표현은 하지 않습니다.',
        `답변은 한국어 2~3문장, ${MAX_ANSWER_LENGTH}자 이내로 작성합니다.`,
        '핵심 관리법 1개와 주의점 1개만 짧게 말합니다.',
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

function findTopicFallbackByText(text) {
    const normalized = normalizeText(text);

    return TOPIC_FALLBACK_ANSWERS
        .map((item) => {
            const matchedLength = item.keywords.reduce((maxLength, keyword) => {
                const normalizedKeyword = normalizeText(keyword);

                return normalized.includes(normalizedKeyword)
                    ? Math.max(maxLength, normalizedKeyword.length)
                    : maxLength;
            }, 0);
            const requiredMatched = !item.requiredKeywords
                || item.requiredKeywords.some((keyword) => normalized.includes(normalizeText(keyword)));

            return {
                item,
                matchedLength: requiredMatched ? matchedLength : 0,
                priority: item.requiredKeywords ? 1 : 0,
            };
        })
        .filter(({ matchedLength }) => matchedLength > 0)
        .sort((left, right) => (
            right.priority - left.priority || right.matchedLength - left.matchedLength
        ))[0]
        ?.item;
}

function includesAnyKeyword(text, keywords) {
    const normalized = normalizeText(text);

    return keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
}

function getQuestionScope(message) {
    if (findTopicFallbackByText(message)) {
        return 'in_scope';
    }

    if (
        includesAnyKeyword(message, OUT_OF_SCOPE_SKIN_KEYWORDS)
        || includesAnyKeyword(message, GENERAL_SKIN_KEYWORDS)
    ) {
        return 'scope_limited';
    }

    return 'unrelated';
}

function getTopicFallbackAnswer(message, searchResults = []) {
    const messageMatched = findTopicFallbackByText(message);

    if (messageMatched?.answer) {
        return messageMatched.answer;
    }

    const fileKeyword = searchResults
        .map((item) => FALLBACK_BY_FILE[item.file])
        .find(Boolean);
    const fileMatched = fileKeyword ? findTopicFallbackByText(fileKeyword) : null;

    return fileMatched?.answer || SCOPE_GUIDE_RESPONSE;
}

function limitAnswerText(text, maxLength = MAX_ANSWER_LENGTH) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();

    if (normalized.length <= maxLength) {
        return normalized;
    }

    const truncated = normalized.slice(0, maxLength);
    const sentenceEnds = [...truncated.matchAll(/[.!?]|요\.|다\./g)];
    const lastSentenceEnd = sentenceEnds.at(-1);

    if (lastSentenceEnd?.index >= 80) {
        return truncated.slice(0, lastSentenceEnd.index + lastSentenceEnd[0].length).trim();
    }

    return `${truncated.replace(/[,.!?;:\s]+$/g, '').trim()}...`;
}

function finalizeAnswerText(text) {
    const limited = limitAnswerText(text);

    if (!limited || /[.!?]$/.test(limited) || /(요|다)\.$/.test(limited)) {
        return limited;
    }

    const suffix = ' 개인차가 있습니다.';
    const base = limited.length + suffix.length <= MAX_ANSWER_LENGTH
        ? `${limited}${suffix}`
        : `${limited.replace(/\.\.\.$/, '').slice(0, MAX_ANSWER_LENGTH - suffix.length).trim()}${suffix}`;

    return limitAnswerText(base);
}

function isUsefulGeneratedAnswer(answer) {
    const normalized = String(answer || '').replace(/\s+/g, ' ').trim();

    if (normalized.length < MIN_GENERATED_ANSWER_LENGTH) {
        return false;
    }

    if (/^네[,.]?\s*.+개인차가 있습니다[.!]?$/.test(normalized)) {
        return false;
    }

    return true;
}

async function requestGeminiAnswer({ message, analysisResult, knowledgeText }) {
    const apiKey = process.env.CHATBOT_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

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
        const timeout = createTimeoutSignal(GEMINI_TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: timeout.signal,
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
                        maxOutputTokens: 180,
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
                    answer: finalizeAnswerText(text),
                };
            }
        } catch (error) {
            lastError = error;
        } finally {
            timeout.clear();
        }
    }

    if (lastError) {
        console.error('Chatbot Gemini request failed:', lastError.message);
    }

    return null;
}

function buildFallbackAnswer(message, searchResults) {
    return finalizeAnswerText(getTopicFallbackAnswer(message, searchResults));
}

async function getChatResponse({ message, analysisResult = null }) {
    const trimmedMessage = String(message || '').trim();
    const questionScope = getQuestionScope(trimmedMessage);

    if (questionScope === 'unrelated') {
        return {
            success: true,
            answer: UNRELATED_RESPONSE,
            sources: [],
            source: 'blocked',
        };
    }

    if (questionScope === 'scope_limited') {
        return {
            success: true,
            answer: SCOPE_GUIDE_RESPONSE,
            sources: [],
            source: 'scope_limited',
        };
    }

    const search = await requestKnowledgeSearch(trimmedMessage);
    const knowledgeText = buildKnowledgeText(search.results);
    const generated = await requestGeminiAnswer({
        message: trimmedMessage,
        analysisResult,
        knowledgeText,
    });
    const useGeneratedAnswer = isUsefulGeneratedAnswer(generated?.answer);

    return {
        success: true,
        answer: useGeneratedAnswer ? generated.answer : buildFallbackAnswer(trimmedMessage, search.results),
        sources: search.results.map((item) => ({
            file: item.file,
            chunkId: item.chunk_id,
            distance: item.distance,
        })),
        source: useGeneratedAnswer ? 'generated' : 'knowledge_fallback',
        provider: useGeneratedAnswer ? generated.provider : null,
        retrievalStatus: search.status,
        retrievalMessage: search.message,
    };
}

module.exports = {
    getChatResponse,
};
