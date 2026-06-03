"""
Interac e-Transfer confirmation email parser.

Supports RBC, TD, Scotia, BMO, CIBC, NBC, and a generic credit-union
fallback. Returns a ParsedInteracEmail dataclass or None if no pattern
matches.

Usage:
    subject, body = parse_email_body(raw_mime_string)
    result = parse_interac_email(subject, body)
"""

import re
import email
import email.policy
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Optional


# ── Output type ───────────────────────────────────────────────────────────────

@dataclass
class ParsedInteracEmail:
    bank: str
    direction: str          # "sent" | "received"
    amount: Decimal
    counterparty_name: str
    confidence: str         # "high" | "medium" | "low"


# ── Shared helpers ────────────────────────────────────────────────────────────

_AMOUNT_RE = re.compile(r'\$([0-9,]+\.[0-9]{2})', re.IGNORECASE)


def _parse_amount(text: str) -> Optional[Decimal]:
    """Return the first valid CAD amount found in text, or None."""
    m = _AMOUNT_RE.search(text)
    if not m:
        return None
    try:
        value = Decimal(m.group(1).replace(',', ''))
    except InvalidOperation:
        return None
    if value <= 0 or value >= 10000:
        return None
    return value


def _clean_name(raw: str) -> str:
    """Strip leading/trailing whitespace and punctuation from an extracted name."""
    return re.sub(r'[\s.,;:!?]+$', '', raw.strip())


# ── MIME extraction ───────────────────────────────────────────────────────────

def parse_email_body(raw_mime: str) -> tuple[str, str]:
    """Extract (subject, plain_text_body) from a raw MIME string."""
    msg = email.message_from_string(raw_mime, policy=email.policy.default)
    subject = msg.get('Subject', '') or ''

    body_parts: list[str] = []
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == 'text/plain':
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or 'utf-8'
                    body_parts.append(payload.decode(charset, errors='replace'))
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or 'utf-8'
            body_parts.append(payload.decode(charset, errors='replace'))

    return subject, '\n'.join(body_parts)


# ── Per-bank parsers ──────────────────────────────────────────────────────────

def _try_rbc(subject: str, body: str) -> Optional[ParsedInteracEmail]:
    subj_sent     = re.search(r'you sent an interac e-transfer', subject, re.IGNORECASE)
    subj_received = re.search(r'you have received an interac e-transfer deposit', subject, re.IGNORECASE)

    if not subj_sent and not subj_received:
        return None

    amount = _parse_amount(body) or _parse_amount(subject)
    if not amount:
        return None

    if subj_sent:
        m = re.search(r'you sent .+? to ([A-Za-z\s]+)', body, re.IGNORECASE)
        name = _clean_name(m.group(1)) if m else ''
        direction = 'sent'
    else:
        m = re.search(r'([A-Za-z\s]+?) sent you', body, re.IGNORECASE)
        name = _clean_name(m.group(1)) if m else ''
        direction = 'received'

    return ParsedInteracEmail(
        bank='RBC', direction=direction, amount=amount,
        counterparty_name=name, confidence='high',
    )


def _try_td(subject: str, body: str) -> Optional[ParsedInteracEmail]:
    subj_match = re.search(r'interac e-transfer', subject, re.IGNORECASE)
    if not subj_match:
        return None

    is_sent     = re.search(r'you have sent', body, re.IGNORECASE)
    is_received = re.search(r'has been deposited', body, re.IGNORECASE)

    if not is_sent and not is_received:
        return None

    amount = _parse_amount(body) or _parse_amount(subject)
    if not amount:
        return None

    if is_sent:
        m = re.search(r'you have sent \$[0-9,.]+ to ([A-Za-z\s]+)', body, re.IGNORECASE)
        name = _clean_name(m.group(1)) if m else ''
        direction = 'sent'
    else:
        m = re.search(r'([A-Za-z\s]+?) has sent you', body, re.IGNORECASE)
        name = _clean_name(m.group(1)) if m else ''
        direction = 'received'

    return ParsedInteracEmail(
        bank='TD', direction=direction, amount=amount,
        counterparty_name=name, confidence='high',
    )


def _try_scotia(subject: str, body: str) -> Optional[ParsedInteracEmail]:
    subj_sent = re.search(
        r'(you sent an interac e-transfer|interac e-transfer sent)',
        subject, re.IGNORECASE,
    )
    subj_received = re.search(r'you received an interac e-transfer', subject, re.IGNORECASE)

    if not subj_sent and not subj_received:
        return None

    amount = _parse_amount(body) or _parse_amount(subject)
    if not amount:
        return None

    if subj_sent:
        m = re.search(r'you sent .+? to ([A-Za-z\s]+)', body, re.IGNORECASE)
        name = _clean_name(m.group(1)) if m else ''
        direction = 'sent'
    else:
        m = re.search(r'([A-Za-z\s]+?) sent you', body, re.IGNORECASE)
        name = _clean_name(m.group(1)) if m else ''
        direction = 'received'

    return ParsedInteracEmail(
        bank='Scotia', direction=direction, amount=amount,
        counterparty_name=name, confidence='high',
    )


def _try_bmo(subject: str, body: str) -> Optional[ParsedInteracEmail]:
    subj_sent     = re.search(r'you sent an interac e-transfer', subject, re.IGNORECASE)
    subj_received = re.search(r'interac e-transfer', subject, re.IGNORECASE)

    if not subj_sent and not subj_received:
        return None

    # BMO received emails have a generic subject — disambiguate on body
    if subj_received and not subj_sent:
        if not re.search(r'sent you an interac', body, re.IGNORECASE):
            return None

    amount = _parse_amount(body) or _parse_amount(subject)
    if not amount:
        return None

    if subj_sent:
        m = re.search(r'you sent .+? to ([A-Za-z\s]+)', body, re.IGNORECASE)
        name = _clean_name(m.group(1)) if m else ''
        direction = 'sent'
    else:
        m = re.search(r'([A-Za-z\s]+?) sent you an interac', body, re.IGNORECASE)
        name = _clean_name(m.group(1)) if m else ''
        direction = 'received'

    return ParsedInteracEmail(
        bank='BMO', direction=direction, amount=amount,
        counterparty_name=name, confidence='high',
    )


def _try_cibc(subject: str, body: str) -> Optional[ParsedInteracEmail]:
    subj_sent     = re.search(r'you sent an e-transfer', subject, re.IGNORECASE)
    subj_received = re.search(r'you received an e-transfer', subject, re.IGNORECASE)

    if not subj_sent and not subj_received:
        return None

    amount = _parse_amount(body) or _parse_amount(subject)
    if not amount:
        return None

    # CIBC uses "sent to <name>" or "sent from <name>" / "from <name>" / "to <name>"
    m = re.search(r'(?:sent to|sent from|from|to)\s+([A-Za-z\s]+)', body, re.IGNORECASE)
    name = _clean_name(m.group(1)) if m else ''
    direction = 'sent' if subj_sent else 'received'

    return ParsedInteracEmail(
        bank='CIBC', direction=direction, amount=amount,
        counterparty_name=name, confidence='high',
    )


def _try_nbc(subject: str, body: str) -> Optional[ParsedInteracEmail]:
    subj_match = re.search(r'(virement interac|interac transfer)', subject, re.IGNORECASE)
    if not subj_match:
        return None

    amount = _parse_amount(body) or _parse_amount(subject)
    if not amount:
        return None

    # French patterns first, then English fallback
    is_sent = re.search(
        r'(vous avez envoy[eé]|you (have )?sent)',
        body, re.IGNORECASE,
    )
    is_received = re.search(
        r'(vous avez re[cç]u|you (have )?received|a [eé]t[eé] d[eé]pos[eé])',
        body, re.IGNORECASE,
    )

    if not is_sent and not is_received:
        return None

    if is_sent:
        # FR: "envoyé ... à <name>" | EN: "sent to <name>"
        m = (
            re.search(r'(?:envoy[eé].+?[àa])\s+([A-Za-z\s]+)', body, re.IGNORECASE) or
            re.search(r'sent (?:to\s+)?([A-Za-z\s]+)', body, re.IGNORECASE)
        )
        direction = 'sent'
    else:
        # FR: "de <name>" | EN: "from <name>"
        m = (
            re.search(r'\bde\s+([A-Za-z\s]+)', body, re.IGNORECASE) or
            re.search(r'\bfrom\s+([A-Za-z\s]+)', body, re.IGNORECASE)
        )
        direction = 'received'

    name = _clean_name(m.group(1)) if m else ''

    return ParsedInteracEmail(
        bank='NBC', direction=direction, amount=amount,
        counterparty_name=name, confidence='medium',  # bilingual parsing is best-effort
    )


def _try_generic(subject: str, body: str) -> Optional[ParsedInteracEmail]:
    """Credit union / unknown sender fallback — low confidence."""
    if not re.search(r'interac', subject, re.IGNORECASE):
        return None

    amount = _parse_amount(body) or _parse_amount(subject)
    if not amount:
        return None

    is_sent     = re.search(r'\b(sent|send|transfer(red)?)\b', body, re.IGNORECASE)
    is_received = re.search(r'\b(received|deposited|deposit)\b', body, re.IGNORECASE)

    if is_received:
        direction = 'received'
    elif is_sent:
        direction = 'sent'
    else:
        direction = 'unknown'

    # Best-effort name: look for "to/from <name>" anywhere in body
    m = re.search(r'(?:to|from)\s+([A-Za-z][A-Za-z\s]{1,50})', body, re.IGNORECASE)
    name = _clean_name(m.group(1)) if m else ''

    return ParsedInteracEmail(
        bank='other', direction=direction, amount=amount,
        counterparty_name=name, confidence='low',
    )


# ── Public entry point ────────────────────────────────────────────────────────

_PARSERS = [_try_rbc, _try_td, _try_scotia, _try_bmo, _try_cibc, _try_nbc, _try_generic]


def parse_interac_email(subject: str, body_text: str) -> Optional[ParsedInteracEmail]:
    """Parse a raw Interac confirmation email into structured data.

    Tries each bank parser in order of specificity (banks first, generic
    fallback last). Returns None if no pattern matches at all.
    """
    for parser in _PARSERS:
        result = parser(subject, body_text)
        if result is not None:
            return result
    return None
