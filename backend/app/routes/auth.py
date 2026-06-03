import hashlib
import random
import secrets
import uuid
import bcrypt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from jose import jwt, JWTError, ExpiredSignatureError
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.database import get_db
from app.config import get_settings
from app.models import User, PasswordResetToken, RevokedToken
from app.audit_log import AuditLog
from app.schemas import UserRegister, UserLogin, Token, UserOut, UserUpdate, PasswordResetRequest, PasswordResetConfirm
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
import logging

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer()
settings = get_settings()
logger = logging.getLogger("tandempay.auth")

from app.limiter import limiter

AVATAR_COLORS = ["#3ECF8E", "#6366F1", "#F59E0B", "#EF4444", "#EC4899", "#8B5CF6", "#14B8A6", "#F97316"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception as e:
        logger.warning(f"verify_password: bcrypt raised an unexpected exception: {type(e).__name__}")
        return False


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "jti": str(uuid.uuid4())})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        jti: str = payload.get("jti")
        if jti is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    revoked = await db.execute(select(RevokedToken).where(RevokedToken.jti == jti))
    if revoked.scalars().first():
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


@router.post("/register", response_model=Token)
@limiter.limit("5/hour", error_message="Too many registration attempts. Please try again later.")
async def register(request: Request, data: UserRegister, db: AsyncSession = Depends(get_db)):
    email_lower = data.email.lower()
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == email_lower))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=data.name,
        email=email_lower,
        hashed_password=hash_password(data.password),
        avatar_color=random.choice(AVATAR_COLORS),
        interac_email=data.interac_email.lower() if data.interac_email else None,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token = create_access_token({"sub": user.id})
    return Token(access_token=token)


@router.post("/login", response_model=Token)
@limiter.limit("10/minute", error_message="Too many login attempts. Please try again later.")
async def login(request: Request, data: UserLogin, db: AsyncSession = Depends(get_db)):
    email_lower = data.email.lower()
    result = await db.execute(select(User).where(User.email == email_lower))
    user = result.scalar_one_or_none()
    
    if not user:
        logger.warning("login: failed — email not found")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check the hash format to detect corruption
    hash_str = user.hashed_password
    is_valid_bcrypt = hash_str and hash_str.startswith("$2") and len(hash_str) >= 59
    if not is_valid_bcrypt:
        logger.warning("login: failed — corrupted bcrypt hash detected (no hash content logged)")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(data.password, hash_str):
        logger.warning("login: failed — password mismatch")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user.id})
    logger.info("login: success")
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # TODO: scheduled job should DELETE FROM revoked_tokens WHERE expires_at < NOW()
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        jti: str = payload.get("jti")
        exp = payload.get("exp")
        if jti and exp:
            expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
            db.add(RevokedToken(jti=jti, user_id=current_user.id, expires_at=expires_at))
            await db.commit()
    except JWTError:
        pass  # token already invalid — logout is still successful
    return {"message": "Logged out successfully"}


@router.patch("/me", response_model=UserOut)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Partial update of the current user's profile.

    Only the following fields may be patched:
      - has_completed_payment  (bool)   — set after first Stripe payment to suppress trust screen
      - interac_email          (str)    — Interac e-Transfer email address
      - name                   (str)    — display name
      - character_shape        (str)    — avatar shape; one of rect, tall, semi, round
      - character_color        (str)    — avatar fill colour in #RRGGBB format
      - character_nickname     (str)    — short nickname shown on avatar; empty string clears it

    Explicitly forbidden: email, hashed_password, wallet_balance,
    stripe_account_id, avatar_color, id, created_at.
    """
    _VALID_SHAPES = {'rect', 'tall', 'semi', 'round'}
    _HEX_COLOR_RE = __import__('re').compile(r'^#[0-9A-Fa-f]{6}$')

    if data.has_completed_payment is not None:
        current_user.has_completed_payment = data.has_completed_payment
    if data.interac_email is not None:
        current_user.interac_email = data.interac_email.strip() or None
    if data.name is not None:
        stripped = data.name.strip()
        if not stripped:
            raise HTTPException(status_code=422, detail="name cannot be blank")
        current_user.name = stripped
    if data.character_shape is not None:
        if data.character_shape not in _VALID_SHAPES:
            raise HTTPException(status_code=422, detail=f"character_shape must be one of {sorted(_VALID_SHAPES)}")
        current_user.character_shape = data.character_shape
    if data.character_color is not None:
        if not _HEX_COLOR_RE.match(data.character_color):
            raise HTTPException(status_code=422, detail="character_color must be a 6-digit hex colour, e.g. #34D399")
        current_user.character_color = data.character_color
    if data.character_nickname is not None:
        current_user.character_nickname = data.character_nickname.strip() or None

    await db.flush()
    await db.commit()
    await db.refresh(current_user)
    return current_user


import resend

resend.api_key = settings.RESEND_API_KEY

def send_reset_email_sync(to_email: str, reset_link: str) -> dict:
    """
    Sends a password reset email via Resend and returns the full API response.
    Returns a dict with {'success': bool, 'response': any, 'error': str}
    """
    if not settings.RESEND_API_KEY:
        logger.warning("send_reset_email_sync: RESEND_API_KEY not configured — email not sent")
        return {"success": False, "error": "API Key not configured", "response": None}

    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 40px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h1 style="color: #18181b; font-size: 24px; margin-bottom: 10px;">Reset Your Password</h1>
            <p style="color: #71717a; font-size: 16px; margin-bottom: 30px; line-height: 1.5;">
                We received a request to reset the password for your Tandem account. Click the button below to choose a new password.
            </p>
            <a href="{reset_link}" style="display: inline-block; background-color: #3ECF8E; color: white; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 16px;">
                Reset Password
            </a>
            <p style="color: #a1a1aa; font-size: 14px; margin-top: 30px;">
                If you didn't request a password reset, you can safely ignore this email. This link will expire in 15 minutes.
            </p>
        </div>
      </body>
    </html>
    """

    import os
    FROM_NAME = "TandemPay"
    FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "noreply@send.tandempay.ca")
    
    try:
        logger.info(f"send_reset_email_sync: dispatching to={to_email} from={FROM_EMAIL}")
        params = {
            "from": f"{FROM_NAME} <{FROM_EMAIL}>",
            "to": [to_email],
            "subject": "Reset your Tandem Password",
            "html": html,
        }
        response = resend.Emails.send(params)
        
        if "id" in response:
            logger.info(f"send_reset_email_sync: success — message_id={response['id']}")
            return {"success": True, "response": response, "error": None}
        else:
            logger.warning(f"send_reset_email_sync: API returned no message ID — response keys: {list(response.keys())}")
            return {"success": False, "response": response, "error": "No ID in response"}
            
    except Exception as e:
        error_msg = str(e)
        logger.error(f"send_reset_email_sync: exception during send: {type(e).__name__}: {error_msg}")
        
        if "403" in error_msg:
            logger.warning(
                f"send_reset_email_sync: Resend returned 403 Forbidden. "
                f"Verify that '{FROM_EMAIL}' belongs to a domain verified in the Resend dashboard."
            )

        return {"success": False, "response": None, "error": error_msg}




@router.post("/forgot-password")
@limiter.limit("3/hour", error_message="Too many reset requests. Please try again later.")
async def forgot_password(request: Request, data: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    email_lower = data.email.lower()

    result = await db.execute(select(User).where(User.email == email_lower))
    user = result.scalar_one_or_none()

    if user:
        now = datetime.now(timezone.utc)

        # Invalidate any unused tokens for this user before issuing a new one
        await db.execute(
            update(PasswordResetToken)
            .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
            .values(used_at=now)
        )

        # Raw token goes in the URL; only the SHA-256 hash is persisted
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        db_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now + timedelta(minutes=15),
        )
        db.add(db_token)
        await db.flush()

        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
        logger.info(f"forgot_password: reset link generated for user_id={user.id}")

        await db.commit()

        email_result = await asyncio.to_thread(send_reset_email_sync, user.email, reset_link)

        if not email_result["success"]:
            logger.error(f"forgot_password: token committed but email dispatch failed — {email_result['error']}")
            raise HTTPException(
                status_code=503,
                detail="Email service temporarily unavailable. Please try again later."
            )
    else:
        logger.info("forgot_password: reset requested for unregistered email (not disclosed to caller)")

    return {"message": "If an account with that email exists, a reset link has been sent."}


@router.post("/reset-password")
@limiter.limit("10/minute", error_message="Too many reset attempts. Please try again later.")
async def reset_password(request: Request, data: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    bad_token = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired reset token"
    )

    token_hash = hashlib.sha256(data.token.encode()).hexdigest()
    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
    )
    db_token = result.scalar_one_or_none()

    if db_token is None:
        logger.warning("reset_password: token hash not found in DB")
        raise bad_token

    if db_token.used_at is not None:
        logger.warning(f"reset_password: token already consumed — user_id={db_token.user_id}")
        raise bad_token

    now = datetime.now(timezone.utc)
    expires = db_token.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < now:
        logger.info(f"reset_password: token expired — user_id={db_token.user_id}")
        raise bad_token

    result = await db.execute(select(User).where(User.id == db_token.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        logger.warning("reset_password: user not found for valid token")
        raise bad_token

    db_token.used_at = now
    user.hashed_password = hash_password(data.new_password)
    await db.commit()

    logger.info(f"reset_password: success — user_id={user.id}")
    return {"message": "Password successfully reset"}


# ─── Admin: Mass Password Reset ─────────────────────────────────────────────────

# SECURITY: IP-restrict via Vercel Firewall before production traffic.
@router.post("/admin/reset-all-passwords")
@limiter.limit("3/hour", error_message="Too many admin requests.")
async def admin_reset_all_passwords(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_admin_secret: str = Header(..., alias="X-Admin-Secret"),
):
    """
    Admin-only endpoint: sends a password reset email to every user in the database.
    Protected by the X-Admin-Secret header.

    Usage:
        curl -X POST https://api.tandempay.ca/api/auth/admin/reset-all-passwords \
             -H "X-Admin-Secret: <your-admin-secret>"
    """
    if x_admin_secret != settings.ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")

    db.add(AuditLog(
        actor_id="admin",
        action="admin.mass_password_reset",
        entity_type="system",
        entity_id="all_users",
        action_metadata={"triggered_by": "admin_endpoint"},
    ))
    await db.flush()

    # Fetch all users
    result = await db.execute(select(User))
    users = result.scalars().all()
    
    if not users:
        return {"message": "No users found", "total": 0, "sent": 0, "failed": 0}
    
    sent = 0
    failed = 0
    failures = []

    for user in users:
        try:
            now = datetime.now(timezone.utc)

            # Invalidate any unused tokens for this user before issuing a new one
            await db.execute(
                update(PasswordResetToken)
                .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
                .values(used_at=now)
            )

            # Raw token goes in the URL; only the SHA-256 hash is persisted
            raw_token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
            db_token = PasswordResetToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=now + timedelta(hours=24),
            )
            db.add(db_token)
            await db.flush()

            reset_link = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
            logger.info(f"[MASS RESET] dispatching to user_id={user.id}")

            email_result = await asyncio.to_thread(send_reset_email_sync, user.email, reset_link)

            if email_result["success"]:
                await db.commit()
                sent += 1
                logger.info(f"[MASS RESET] sent ok — user_id={user.id}")
            else:
                await db.rollback()
                failed += 1
                failures.append({"email": user.email, "error": email_result["error"]})
                logger.warning(f"[MASS RESET] failed for user_id={user.id}: {email_result['error']}")

            # Rate limit: small delay between sends to avoid hitting Resend limits
            await asyncio.sleep(0.5)

        except Exception as e:
            await db.rollback()
            failed += 1
            failures.append({"email": user.email, "error": str(e)})
            logger.error(f"[MASS RESET] exception for user_id={user.id}: {type(e).__name__}")
    
    return {
        "message": f"Mass password reset complete",
        "total": len(users),
        "sent": sent,
        "failed": failed,
        "failures": failures,
    }


# SECURITY: IP-restrict via Vercel Firewall before production traffic.
@router.post("/admin/diagnose-hashes")
@limiter.limit("3/hour", error_message="Too many admin requests.")
async def admin_diagnose_hashes(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_admin_secret: str = Header(..., alias="X-Admin-Secret"),
):
    """
    Admin-only endpoint: checks the integrity of all password hashes in the database.
    Returns a diagnostic report without exposing any sensitive data.
    """
    if x_admin_secret != settings.ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")

    db.add(AuditLog(
        actor_id="admin",
        action="admin.diagnose_hashes",
        entity_type="system",
        entity_id="all_users",
        action_metadata={},
    ))
    await db.commit()

    result = await db.execute(select(User))
    users = result.scalars().all()
    
    report = []
    for user in users:
        h = user.hashed_password
        entry = {
            "user_id": user.id,
            "hash_length": len(h) if h else 0,
            "starts_with_$2": h.startswith("$2") if h else False,
            "looks_valid": bool(h and h.startswith("$2") and len(h) >= 59),
        }
        if h:
            # Show just the algorithm prefix (e.g. $2b$12$) without the actual hash
            entry["hash_prefix"] = h[:7] if len(h) >= 7 else h
        report.append(entry)
    
    valid_count = sum(1 for r in report if r["looks_valid"])
    
    return {
        "total_users": len(users),
        "valid_hashes": valid_count,
        "corrupted_hashes": len(users) - valid_count,
        "details": report,
    }
