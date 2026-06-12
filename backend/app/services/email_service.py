import logging
import httpx
from app.config import get_settings

logger = logging.getLogger("tandempay.email")

_APP_URL = "https://tandempay.ca"


async def send_notification_email(to_email: str, subject: str, body_html: str) -> None:
    """Fire-and-forget Resend email. Never raises — failures are logged and swallowed."""
    settings = get_settings()
    if not settings.RESEND_API_KEY:
        logger.debug("RESEND_API_KEY not configured — skipping email to %s", to_email)
        return
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                json={
                    "from": settings.RESEND_FROM_EMAIL,
                    "to": [to_email],
                    "subject": subject,
                    "html": body_html,
                },
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            )
            if resp.status_code not in (200, 201):
                logger.warning("resend: HTTP %d — %s", resp.status_code, resp.text[:200])
    except Exception as exc:
        logger.warning("resend email failed (%s): %s", type(exc).__name__, exc)


async def email_for_notification(
    recipient_email: str,
    notif_type: str,
    title: str,
    message: str,
) -> None:
    """Derive email subject + HTML body from a Notification and send via Resend. Never raises."""
    subject = f"TandemPay: {title}"
    body_html = (
        f"<p>{message}</p>"
        f'<p><a href="{_APP_URL}">Open TandemPay</a></p>'
    )
    await send_notification_email(recipient_email, subject, body_html)
