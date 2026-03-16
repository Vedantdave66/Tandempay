import smtplib
from email.mime.text import MIMEText
import sys
import os

# Configuration (from .env or hardcoded for test)
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USERNAME = "splitease.ca@gmail.com"
SMTP_PASSWORD = "ajvg sock jolz mqlo"

def test_smtp():
    print(f"Testing SMTP connection to {SMTP_SERVER}:{SMTP_PORT}...")
    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
        server.set_debuglevel(1)
        server.starttls()
        print("Connecting and logging in...")
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        
        msg = MIMEText("This is a test email from SplitEase backend diagnostics.")
        msg['Subject'] = "SplitEase SMTP Test"
        msg['From'] = f"SplitEase Test <{SMTP_USERNAME}>"
        msg['To'] = SMTP_USERNAME
        
        print(f"Sending test email to {SMTP_USERNAME}...")
        server.send_message(msg)
        server.quit()
        print("\nSUCCESS: SMTP connection and email delivery verified.")
    except Exception as e:
        print(f"\nFAILURE: {str(e)}")
        if "Authentication failed" in str(e) or "application-specific password" in str(e).lower():
            print("\nSUGGESTION: The credentials might be invalid or require a Gmail App Password.")
        sys.exit(1)

if __name__ == "__main__":
    test_smtp()
