// DB 성분 데이터가 없거나 보강이 필요할 때 사용하는 색소침착/주름 성분 기준표입니다.
const INGREDIENT_REFERENCES = [
    {
        name: '나이아신아마이드',
        type: 'pigmentation',
        description: '색소침착과 칙칙한 피부톤 개선에 도움을 줄 수 있는 대표적인 미백 기능성 성분입니다.',
        tags: ['색소침착', '피부톤'],
    },
    {
        name: '알부틴',
        type: 'pigmentation',
        description: '잡티와 색소침착 완화에 도움을 줄 수 있는 성분으로, 톤 케어 제품에 자주 사용됩니다.',
        tags: ['색소침착', '잡티'],
    },
    {
        name: '비타민C',
        type: 'pigmentation',
        description: '항산화와 피부톤 개선에 도움을 줄 수 있으나, 민감한 피부는 저농도 제품부터 사용하는 것이 좋습니다.',
        tags: ['브라이트닝', '항산화'],
    },
    {
        name: '비타민C 유도체',
        type: 'pigmentation',
        description: '순수 비타민C보다 자극 부담이 적은 편이라 민감한 피부의 톤 케어에 활용하기 좋습니다.',
        tags: ['브라이트닝', '저자극'],
    },
    {
        name: '트라넥사믹애씨드',
        type: 'pigmentation',
        description: '색소침착 부위와 칙칙한 피부톤 관리에 도움을 줄 수 있는 성분입니다.',
        tags: ['색소침착', '피부톤'],
    },
    {
        name: '감초추출물',
        type: 'pigmentation',
        description: '피부 진정과 톤 케어를 함께 고려할 때 활용하기 좋은 보조 성분입니다.',
        tags: ['진정', '피부톤'],
    },
    {
        name: '알파-비사보롤',
        type: 'pigmentation',
        description: '민감한 피부의 색소침착 케어에 함께 고려하기 좋은 진정·미백 보조 성분입니다.',
        tags: ['진정', '미백'],
    },
    {
        name: '글루타치온',
        type: 'pigmentation',
        description: '피부톤 관리와 항산화 케어를 목적으로 하는 제품에 사용됩니다.',
        tags: ['피부톤', '항산화'],
    },
    {
        name: '닥나무추출물',
        type: 'pigmentation',
        description: '피부톤 개선을 목표로 하는 미백 기능성 제품에 활용될 수 있습니다.',
        tags: ['미백', '피부톤'],
    },
    {
        name: '아데노신',
        type: 'wrinkle',
        description: '주름개선 기능성 성분으로, 탄력 저하와 잔주름 케어에 도움을 줄 수 있습니다.',
        tags: ['주름', '탄력'],
    },
    {
        name: '레티놀',
        type: 'wrinkle',
        description: '주름과 피부결 관리에 효과적인 성분이나 자극 가능성이 있어 낮은 농도부터 사용하는 것이 좋습니다.',
        tags: ['주름', '피부결'],
    },
    {
        name: '레티날',
        type: 'wrinkle',
        description: '레티놀과 유사하게 주름 케어에 사용되며, 민감한 피부는 사용 빈도 조절이 필요합니다.',
        tags: ['주름', '탄력'],
    },
    {
        name: '바쿠치올',
        type: 'wrinkle',
        description: '레티놀 사용이 부담스러운 피부에서 대체 성분으로 고려할 수 있습니다.',
        tags: ['주름', '저자극'],
    },
    {
        name: '펩타이드',
        type: 'wrinkle',
        description: '탄력 저하와 피부 컨디션 개선을 보조하는 성분으로 활용됩니다.',
        tags: ['탄력', '피부컨디션'],
    },
    {
        name: '콜라겐',
        type: 'wrinkle',
        description: '피부에 보습감과 탄력감을 부여하는 보조 성분입니다.',
        tags: ['보습', '탄력'],
    },
    {
        name: '엘라스틴',
        type: 'wrinkle',
        description: '탄력감과 보습감을 보완하는 성분으로 사용할 수 있습니다.',
        tags: ['탄력', '보습'],
    },
    {
        name: '토코페롤',
        type: 'wrinkle',
        description: '산화 스트레스로 인한 피부 노화 관리에 도움을 줄 수 있는 항산화 성분입니다.',
        tags: ['항산화', '노화케어'],
    },
    {
        name: '세라마이드',
        type: 'wrinkle',
        description: '피부 장벽이 약하거나 건조로 인해 잔주름이 부각되는 피부에 적합합니다.',
        tags: ['장벽', '보습'],
    },
];

const METRIC_INGREDIENT_META = {
    pigmentation: {
        name: '색소침착',
        tags: ['색소침착', '피부톤'],
        keywords: ['pigment', 'spot', 'tone', 'bright', 'whiten', 'melanin', '색소', '미백', '브라이트'],
    },
    wrinkle: {
        name: '주름',
        tags: ['주름', '탄력'],
        keywords: ['wrinkle', 'elastic', 'firm', 'aging', 'adenosine', 'retinol', '주름', '탄력'],
    },
};

module.exports = {
    INGREDIENT_REFERENCES,
    METRIC_INGREDIENT_META,
};
