function toNumber(value) {
    // DB decimal/null 값을 API 응답에서 다루기 쉬운 number/null 형태로 맞춥니다.
    if (value === null || value === undefined) {
        return null;
    }

    return Number(value);
}

module.exports = {
    toNumber,
};
