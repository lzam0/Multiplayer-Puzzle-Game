from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from datetime import date

class DailyCapMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, daily_limit: int = 10_000):
        super().__init__(app)
        self.daily_limit = daily_limit
        self._count = 0
        self._date = date.today()

    async def dispatch(self, request: Request, call_next):
        # only count topic generation requests
        if request.url.path == "/topics/words" and request.method == "POST":
            today = date.today()
            if today != self._date:
                self._count = 0
                self._date = today

            if self._count >= self.daily_limit:
                return JSONResponse(
                    status_code=503,
                    content={"detail": "Daily generation limit reached. Service will resume tomorrow."},
                )
            self._count += 1

        return await call_next(request)
