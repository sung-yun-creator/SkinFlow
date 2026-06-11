function asyncHandler(handler) {
    // async controller에서 발생한 에러를 Express 공통 에러 핸들러로 넘깁니다.
    return async (req, res, next) => {
        try {
            await handler(req, res, next);
        } catch (error) {
            next(error);
        }
    };
}

module.exports = asyncHandler;
