import logging
from typing import Any

import httpx

logger = logging.getLogger("tandempay.push")

EXPO_PUSH_URL = "https://exp.host/--/expo-push/v2/push/send"


async def send_expo_push(
    push_token: str,
    title: str,
    body: str,
    data: dict | None = None,
) -> None:
    """Send an Expo push notification. Never raises — failures are logged and swallowed."""
    try:
        payload: dict = {"to": push_token, "title": title, "body": body}
        if data:
            payload["data"] = data
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(EXPO_PUSH_URL, json=payload)
            if resp.status_code != 200:
                logger.warning("expo push: HTTP %d — %s", resp.status_code, resp.text[:200])
    except Exception as exc:
        logger.warning("expo push failed (%s): %s", type(exc).__name__, exc)


async def push_for_user(user: Any, title: str, body: str, notification_id: str) -> None:
    """Push to a user if they have a registered push_token. Never raises."""
    token: str | None = getattr(user, "push_token", None)
    if token:
        await send_expo_push(token, title, body, {"notificationId": notification_id})
