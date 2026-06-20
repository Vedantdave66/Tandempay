import ast
import json
import logging
import os
import re

logger = logging.getLogger("tandempay.utils.gemini")

GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL: str = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)


def extract_json(text: str) -> tuple[dict, str]:
    """Four-step extraction pipeline. Returns (parsed_dict, step_name).
    Raises ValueError when all steps fail."""
    try:
        return json.loads(text), "A_direct"
    except (json.JSONDecodeError, ValueError):
        logger.debug("JSON step A (direct parse) failed")

    stripped = re.sub(r"```[a-z]*\n?", "", text).strip()
    try:
        return json.loads(stripped), "B_strip_fences"
    except (json.JSONDecodeError, ValueError):
        logger.debug("JSON step B (strip markdown fences) failed")

    match = re.search(r"\{.*\}", stripped, re.DOTALL)
    if match:
        try:
            return json.loads(match.group()), "C_regex_extract"
        except (json.JSONDecodeError, ValueError):
            logger.debug("JSON step C (regex first-block) failed")

    try:
        result = ast.literal_eval(text)
        if isinstance(result, dict):
            return result, "D_ast_literal_eval"
    except (ValueError, SyntaxError):
        logger.debug("JSON step D (ast.literal_eval) failed")

    raise ValueError("All JSON extraction steps failed (A, B, C, D)")


def coerce_amount(raw) -> float:
    """Parse a monetary value from various string formats (e.g. '$1,234.56')."""
    try:
        return float(str(raw).replace("$", "").replace(",", "").strip())
    except (TypeError, ValueError):
        return 0.0
