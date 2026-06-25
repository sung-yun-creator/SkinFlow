// 비동기 controller마다 try/catch를 반복하지 않도록 에러 전달 방식을 공통화합니다.
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
