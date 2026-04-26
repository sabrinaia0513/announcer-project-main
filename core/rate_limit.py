from collections import defaultdict, deque
from math import ceil
from threading import Lock
from time import monotonic
from typing import Callable

from fastapi import HTTPException, Request


class InMemoryRateLimiter:
    def __init__(self):
        self._requests: defaultdict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    @staticmethod
    def _get_client_ip(request: Request) -> str:
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",", 1)[0].strip()
        if request.client and request.client.host:
            return request.client.host
        return "unknown"

    def limit(
        self,
        scope: str,
        max_requests: int,
        window_seconds: int,
        detail: str,
    ) -> Callable[[Request], None]:
        async def dependency(request: Request) -> None:
            client_ip = self._get_client_ip(request)
            key = f"{scope}:{client_ip}"
            now = monotonic()
            window_start = now - window_seconds

            with self._lock:
                request_times = self._requests[key]
                while request_times and request_times[0] <= window_start:
                    request_times.popleft()

                if len(request_times) >= max_requests:
                    retry_after = max(1, ceil(window_seconds - (now - request_times[0])))
                    raise HTTPException(
                        status_code=429,
                        detail=detail,
                        headers={"Retry-After": str(retry_after)},
                    )

                request_times.append(now)

        return dependency


rate_limiter = InMemoryRateLimiter()
