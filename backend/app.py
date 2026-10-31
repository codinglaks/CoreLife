"""
CoreLife Collaboration Form — backend
======================================
Receives the collaboration form's data and emails it to the inbox
configured in GMAIL_USER / RECEIVER_EMAIL.

Local testing:
    python app.py

Then open:
    http://127.0.0.1:5000/

Production:
    Vercel imports the `app` object automatically.
"""

import os
import re
import html
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from flask import Flask, request, jsonify, send_from_directory


# ---------------------------------------------------------------------
# Load local .env
# ---------------------------------------------------------------------

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


app = Flask(__name__)


# ---------------------------------------------------------------------
# Local frontend directory
# ---------------------------------------------------------------------
# Project structure:
#
# D:\CoreLife\
# ├── form\
# │   ├── form.html
# │   ├── form_style.css
# │   └── form_function.js
# │
# └── backend\
#     └── app.py
#
# This allows Flask to serve the form during local testing.
# ---------------------------------------------------------------------

FORM_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "form")
)


# ---------------------------------------------------------------------
# Local frontend routes
# ---------------------------------------------------------------------

@app.route("/", methods=["GET"])
def home():
    return send_from_directory(FORM_DIR, "form.html")


@app.route("/form_style.css", methods=["GET"])
def form_style():
    return send_from_directory(FORM_DIR, "form_style.css")


@app.route("/form_function.js", methods=["GET"])
def form_function():
    return send_from_directory(FORM_DIR, "form_function.js")


# ---------------------------------------------------------------------
# Local frontend directory - Support page
# ---------------------------------------------------------------------
# Same idea as FORM_DIR above, just for the Support page:
#
# D:\CoreLife\
# âââ support\
# â   âââ support.html
# â   âââ support_style.css
# â   âââ support_function.js
# ---------------------------------------------------------------------

SUPPORT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "support")
)


@app.route("/support", methods=["GET"])
@app.route("/support/", methods=["GET"])
@app.route("/support/support.html", methods=["GET"])
def support_page():
    return send_from_directory(SUPPORT_DIR, "support.html")


@app.route("/support_style.css", methods=["GET"])
@app.route("/support/support_style.css", methods=["GET"])
def support_style():
    return send_from_directory(SUPPORT_DIR, "support_style.css")


@app.route("/support_function.js", methods=["GET"])
@app.route("/support/support_function.js", methods=["GET"])
def support_function():
    return send_from_directory(SUPPORT_DIR, "support_function.js")


# Serve files from the project-level media folder (including the Support QR image).
MEDIA_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "media")
)


@app.route("/media/<path:filename>", methods=["GET"])
def media_file(filename):
    return send_from_directory(MEDIA_DIR, filename)


# ---------------------------------------------------------------------
# Gmail credentials
# ---------------------------------------------------------------------

GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")

RECEIVER_EMAIL = os.environ.get(
    "RECEIVER_EMAIL",
    "crzysupptant@gmail.com"
)


# SMTP connection settings. The timeout keeps a slow Gmail connection from
# hanging a request, and the certifi bundle makes the TLS check independent
# of the server's own certificate store (needed on Cloudflare).
import ssl  # noqa: E402

try:
    import certifi
    SMTP_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except Exception:  # noqa: BLE001 - fall back to Python's default
    SMTP_SSL_CONTEXT = ssl.create_default_context()

SMTP_TIMEOUT = 20


# ---------------------------------------------------------------------
# Validation patterns
# ---------------------------------------------------------------------

EMAIL_PATTERN = re.compile(
    r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"
)

PHONE_PATTERN = re.compile(
    r"^\+?[0-9\s\-]{7,17}$"
)

HEADER_INJECTION_PATTERN = re.compile(
    r"[\r\n]"
)


# ---------------------------------------------------------------------
# Month names
# ---------------------------------------------------------------------

MONTH_NAMES = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]


# ---------------------------------------------------------------------
# Form fields
# ---------------------------------------------------------------------

FORM_SECTIONS = [
    (
        "Your Details",
        [
            ("fullName", "Your Full Name", True),
            ("brandName", "Brand Name", False),
        ],
    ),

    (
        "Collaboration Setup",
        [
            ("channel", "Select Channel", True),
            ("platform", "Select Platform", True),
            ("videoFormat", "Select Video Format", True),
            ("collabType", "Collaboration Type", True),
            ("collabScope", "Collaboration Scope", True),
            ("_date", "Select Date", True),
        ],
    ),

    (
        "Tell Me More",
        [
            ("collabTopic", "Collaboration Topic", True),
            ("describeCollab", "Describe Collaboration", True),
            ("note", "Note", False),
            ("notes", "Notes", True),
        ],
    ),

    (
        "Social Links",
        [
            ("socialYoutube", "YouTube", False),
            ("socialFacebook", "Facebook", False),
            ("socialInstagram", "Instagram", False),
            ("socialLinkedin", "LinkedIn", False),
            ("socialX", "X (Twitter)", False),
        ],
    ),

    (
        "Contact Details",
        [
            ("businessNumber", "Business Number", True),
            ("whatsappNumber", "WhatsApp Number", True),
            ("email", "Email", True),
            ("website", "Website", True),
        ],
    ),
]


# ---------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------

def clean(value):
    """Trim a value and make sure it is a plain string."""
    if value is None:
        return ""

    return str(value).strip()


def format_date(data):
    day = clean(data.get("selectDay"))
    month = clean(data.get("selectMonth"))
    year = clean(data.get("selectYear"))

    if not (day and month and year):
        return ""

    try:
        month_name = MONTH_NAMES[int(month)]
    except (ValueError, IndexError):
        month_name = month

    return f"{day} {month_name} {year}"


def get_display_value(field_key, data):
    if field_key == "_date":
        return format_date(data)

    return clean(data.get(field_key))


def validate(data):
    """
    Re-check every required field server-side.
    Returns a list of human-readable problems.
    Empty list means valid submission.
    """

    problems = []

    for _section_name, fields in FORM_SECTIONS:

        for field_key, label, required in fields:

            if not required:
                continue

            value = get_display_value(field_key, data)

            if not value:
                problems.append(
                    f"{label} is missing."
                )

    email_value = clean(data.get("email"))

    if email_value and not EMAIL_PATTERN.match(email_value):
        problems.append(
            "Email address doesn't look valid."
        )

    for phone_field, label in [
        ("businessNumber", "Business Number"),
        ("whatsappNumber", "WhatsApp Number"),
    ]:

        value = clean(data.get(phone_field))

        if value and not PHONE_PATTERN.match(value):
            problems.append(
                f"{label} doesn't look like a valid phone number."
            )

    return problems


def safe_header_value(value, fallback):
    """
    Prevent email-header injection.
    """

    value = clean(value)

    value = HEADER_INJECTION_PATTERN.sub(
        " ",
        value
    )

    return value if value else fallback


def build_email_bodies(data):
    """
    Build plain-text and HTML versions of the email.
    """

    text_lines = []
    html_blocks = []

    for section_name, fields in FORM_SECTIONS:

        section_rows_text = []
        section_rows_html = []

        for field_key, label, required in fields:

            value = get_display_value(
                field_key,
                data
            )

            if not value:

                if required:
                    value = "(not provided)"

                else:
                    continue

            section_rows_text.append(
                f"  {label}: {value}"
            )

            section_rows_html.append(
                f'<tr>'
                f'<td style="padding:4px 12px 4px 0;'
                f'color:#5B5470;'
                f'font-weight:600;'
                f'white-space:nowrap;">'
                f'{html.escape(label)}'
                f'</td>'
                f'<td style="padding:4px 0;'
                f'color:#1B1526;">'
                f'{html.escape(value)}'
                f'</td>'
                f'</tr>'
            )

        if not section_rows_text:
            continue

        text_lines.append(
            section_name.upper()
        )

        text_lines.extend(
            section_rows_text
        )

        text_lines.append("")

        html_blocks.append(
            f'<h3 style="margin:22px 0 8px;'
            f'font-size:15px;'
            f'color:#7C4DFF;'
            f'border-bottom:1px solid #eee;'
            f'padding-bottom:6px;">'
            f'{html.escape(section_name)}'
            f'</h3>'
            f'<table style="width:100%;'
            f'border-collapse:collapse;'
            f'font-size:14px;">'
            + "".join(section_rows_html)
            + "</table>"
        )

    text_body = (
        "New collaboration request from "
        "CoreLife's Collab Form\n\n"
        + "\n".join(text_lines)
    )

    html_body = (
        '<div style="font-family:Arial,sans-serif;'
        'max-width:600px;margin:0 auto;">'
        '<h2 style="color:#1B1526;">'
        'New Collaboration Request'
        '</h2>'
        '<p style="color:#5B5470;">'
        'Submitted through the CoreLife Collab Form.'
        '</p>'
        + "".join(html_blocks)
        + '</div>'
    )

    return text_body, html_body


# ---------------------------------------------------------------------
# Collaboration API
# ---------------------------------------------------------------------

@app.route(
    "/api/submit-collab",
    methods=["POST"]
)
def submit_collab():

    # Check Gmail configuration
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:

        print(
            "ERROR: Missing GMAIL_USER or "
            "GMAIL_APP_PASSWORD environment variables."
        )

        return jsonify({
            "success": False,
            "message": "Server isn't configured yet."
        }), 500


    # Read JSON
    data = request.get_json(
        silent=True
    )

    if not isinstance(data, dict):

        return jsonify({
            "success": False,
            "message": "Invalid submission."
        }), 400


    # Validate
    problems = validate(data)

    if problems:

        return jsonify({
            "success": False,
            "message": "Please fix the following:",
            "errors": problems
        }), 400


    # Basic information
    full_name = clean(
        data.get("fullName")
    )

    channel = clean(
        data.get("channel")
    )

    submitter_email = clean(
        data.get("email")
    )


    # Build email
    text_body, html_body = build_email_bodies(
        data
    )


    msg = MIMEMultipart(
        "alternative"
    )


    # Subject
    msg["Subject"] = safe_header_value(
        f"New Collaboration Request — "
        f"{full_name} ({channel})",
        "New Collaboration Request"
    )


    # Sender
    msg["From"] = GMAIL_USER


    # Receiver
    msg["To"] = RECEIVER_EMAIL


    # Reply-To
    if (
        submitter_email
        and EMAIL_PATTERN.match(submitter_email)
    ):

        msg["Reply-To"] = safe_header_value(
            submitter_email,
            GMAIL_USER
        )


    # Attach email content
    msg.attach(
        MIMEText(
            text_body,
            "plain"
        )
    )

    msg.attach(
        MIMEText(
            html_body,
            "html"
        )
    )


    # Send using Gmail SMTP
    try:

        print(
            "Connecting to Gmail SMTP..."
        )

        with smtplib.SMTP_SSL(
            "smtp.gmail.com",
            465,
            timeout=SMTP_TIMEOUT,
            context=SMTP_SSL_CONTEXT
        ) as server:

            server.login(
                GMAIL_USER,
                GMAIL_APP_PASSWORD
            )

            print(
                "Gmail authentication successful."
            )

            server.send_message(
                msg
            )

            print(
                "Collaboration email sent successfully."
            )

    except smtplib.SMTPAuthenticationError as exc:

        print(
            "ERROR: Gmail rejected the login for "
            f"{GMAIL_USER!r}. This almost always means "
            "GMAIL_USER / GMAIL_APP_PASSWORD in your .env "
            "are wrong, still placeholders, or you're using "
            "your normal Gmail password instead of a 16-char "
            f"App Password. Details: {exc}"
        )

        return jsonify({
            "success": False,
            "message": (
                "Email server rejected the login. "
                "Check GMAIL_USER / GMAIL_APP_PASSWORD in .env."
            )
        }), 502

    except (smtplib.SMTPException, OSError) as exc:

        print(
            f"ERROR: Could not reach Gmail's SMTP server: {exc}"
        )

        return jsonify({
            "success": False,
            "message": (
                "Couldn't reach the email server. "
                "Please try again."
            )
        }), 502

    except Exception as exc:

        print(
            f"ERROR: Failed to send collaboration email: {exc}"
        )

        return jsonify({
            "success": False,
            "message": (
                "Couldn't send the request. "
                "Please try again."
            )
        }), 502


    # Success
    return jsonify({
        "success": True,
        "message": "Collaboration request sent."
    })


# =======================================================================
# SUPPORT PAGE — PayPal donations
# =======================================================================
# Everything below is new and additive - it does not change anything
# above this line, so the collaboration form keeps working exactly as
# it already does.
#
# There is no amount picker on the frontend any more - every payment is
# for one fixed amount, set once here (or via the PAYPAL_SUPPORT_AMOUNT
# env var) and shown to the frontend through /api/paypal/config. The
# browser never gets to choose or send an amount, and this endpoint
# ignores one if it ever did - since there's no picker for anyone to
# tamper with in the first place, this removes the need for a
# min/max/validate step entirely.
#
# How this works, in short:
#   1. The Support page asks GET /api/paypal/config for the Client ID
#      (safe to show publicly) and the fixed amount, and uses the
#      Client ID to load PayPal's own JS SDK.
#   2. When someone clicks Pay, the page calls POST /api/paypal/create-order
#      (no body needed). This server logs into PayPal (using the Secret,
#      which never leaves this file) and asks PayPal to create an order
#      for the fixed amount.
#   3. PayPal's JS SDK handles the actual popup/payment on their own
#      site. Once approved, the page calls
#      POST /api/paypal/capture-order to actually collect the money.
# =======================================================================

import requests  # noqa: E402 - kept near where it's used, doesn't affect anything above

PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID", "")
PAYPAL_SECRET = os.environ.get("PAYPAL_SECRET", "")
# "sandbox" for testing (fake money), "live" once you're ready for real payments.
PAYPAL_MODE = os.environ.get("PAYPAL_MODE", "sandbox")

PAYPAL_API_BASE = (
    "https://api-m.sandbox.paypal.com"
    if PAYPAL_MODE != "live"
    else "https://api-m.paypal.com"
)

PAYPAL_CURRENCY = os.environ.get("PAYPAL_CURRENCY", "USD")

# The one fixed amount every supporter pays - change this (or set
# PAYPAL_SUPPORT_AMOUNT in .env / Vercel) any time, no code edits needed.
try:
    PAYPAL_SUPPORT_AMOUNT = round(float(os.environ.get("PAYPAL_SUPPORT_AMOUNT", "5.00")), 2)
except ValueError:
    PAYPAL_SUPPORT_AMOUNT = 5.00


def get_paypal_access_token():
    """Exchanges the Client ID + Secret for a short-lived access token.
    This is the OAuth2 'client credentials' flow PayPal's REST API uses -
    the Secret is only ever used here, server-side, never sent to the
    browser."""
    response = requests.post(
        f"{PAYPAL_API_BASE}/v1/oauth2/token",
        auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET),
        data={"grant_type": "client_credentials"},
        timeout=15,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def send_support_notification(amount, currency, payer_name, payer_email):
    """Best-effort 'someone just supported you' email, reusing the same
    Gmail SMTP setup as the collaboration form. If this fails for any
    reason, it must NOT break the actual payment - the money already
    moved, so this only logs a warning and moves on."""
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        return
    try:
        msg = MIMEText(
            f"New support payment received!\n\n"
            f"Amount: {amount} {currency}\n"
            f"From: {safe_header_value(payer_name, 'Anonymous')} "
            f"({safe_header_value(payer_email, 'no email provided')})\n"
        )
        msg["Subject"] = safe_header_value(
            f"New Support Payment — {amount} {currency}",
            "New Support Payment"
        )
        msg["From"] = GMAIL_USER
        msg["To"] = RECEIVER_EMAIL
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=SMTP_TIMEOUT, context=SMTP_SSL_CONTEXT) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.send_message(msg)
    except Exception as exc:  # noqa: BLE001 - notification only, never fatal
        print(f"WARNING: support notification email failed (payment was still fine): {exc}")


@app.route("/api/paypal/config", methods=["GET"])
def paypal_config():
    """Gives the frontend the Client ID and the fixed amount to display.
    The Client ID is designed by PayPal to be public - only the Secret
    (never sent here) is actually sensitive."""
    if not PAYPAL_CLIENT_ID:
        return jsonify({"success": False, "message": "Payments aren't configured yet."}), 500
    return jsonify({
        "success": True,
        "clientId": PAYPAL_CLIENT_ID,
        "currency": PAYPAL_CURRENCY,
        "amount": f"{PAYPAL_SUPPORT_AMOUNT:.2f}",
    })


@app.route("/api/paypal/create-order", methods=["POST"])
def paypal_create_order():
    if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
        print("ERROR: Missing PAYPAL_CLIENT_ID or PAYPAL_SECRET environment variables.")
        return jsonify({"success": False, "message": "Payments aren't configured yet."}), 500

    try:
        access_token = get_paypal_access_token()
        order_response = requests.post(
            f"{PAYPAL_API_BASE}/v2/checkout/orders",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={
                "intent": "CAPTURE",
                "purchase_units": [{
                    "amount": {
                        "currency_code": PAYPAL_CURRENCY,
                        "value": f"{PAYPAL_SUPPORT_AMOUNT:.2f}",
                    },
                    "description": "Support on CoreLife",
                }],
            },
            timeout=15,
        )
        order_response.raise_for_status()
        order = order_response.json()
        return jsonify({"success": True, "id": order["id"]})

    except requests.exceptions.RequestException as exc:
        print(f"ERROR: PayPal create-order failed: {exc}")
        return jsonify({"success": False, "message": "Couldn't start the payment. Please try again."}), 502


@app.route("/api/paypal/capture-order", methods=["POST"])
def paypal_capture_order():
    if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
        return jsonify({"success": False, "message": "Payments aren't configured yet."}), 500

    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not clean(data.get("orderID")):
        return jsonify({"success": False, "message": "Invalid request."}), 400

    order_id = clean(data.get("orderID"))

    try:
        access_token = get_paypal_access_token()
        capture_response = requests.post(
            f"{PAYPAL_API_BASE}/v2/checkout/orders/{order_id}/capture",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            timeout=15,
        )
        capture_response.raise_for_status()
        result = capture_response.json()

        if result.get("status") != "COMPLETED":
            return jsonify({"success": False, "message": "Payment wasn't completed."}), 402

        try:
            purchase_unit = result["purchase_units"][0]
            capture = purchase_unit["payments"]["captures"][0]
            amount = capture["amount"]["value"]
            currency = capture["amount"]["currency_code"]
            payer = result.get("payer", {})
            payer_name = " ".join(filter(None, [
                payer.get("name", {}).get("given_name", ""),
                payer.get("name", {}).get("surname", ""),
            ])).strip()
            payer_email = payer.get("email_address", "")
        except (KeyError, IndexError):
            amount, currency, payer_name, payer_email = f"{PAYPAL_SUPPORT_AMOUNT:.2f}", PAYPAL_CURRENCY, "", ""

        send_support_notification(amount, currency, payer_name, payer_email)

        return jsonify({"success": True, "message": "Payment captured successfully."})

    except requests.exceptions.RequestException as exc:
        print(f"ERROR: PayPal capture-order failed: {exc}")
        return jsonify({"success": False, "message": "Couldn't complete the payment. Please try again."}), 502


# ---------------------------------------------------------------------
# Cloudflare settings
# ---------------------------------------------------------------------
# On your PC the settings above come from .env when the app starts. On
# Cloudflare there is no .env and the secrets only exist while a request
# is being handled, so they are copied into the same variables at the
# start of every request. Nothing else in this file had to change.
# ---------------------------------------------------------------------

def _cloudflare_env():
    """Return Cloudflare's env object (variables + secrets), or None when
    running locally."""
    env = request.environ.get("workers.env")
    if env is not None:
        return env
    try:
        from workers import env as global_env  # documented fallback
        return global_env
    except Exception:  # noqa: BLE001 - not on Cloudflare
        return None


def _read_setting(env, name, default=""):
    """Read one setting. Tries Cloudflare's env first, then os.environ.
    Also cleans up values that were pasted with quotes or with a
    'NAME=' prefix by mistake."""
    value = None
    try:
        value = getattr(env, name, None)
    except Exception:  # noqa: BLE001
        value = None
    if value is None:
        try:
            value = env[name]
        except Exception:  # noqa: BLE001
            value = None
    if value is None:
        value = os.environ.get(name)

    value = str(value).strip() if value is not None else ""
    if value.startswith(name + "="):
        value = value[len(name) + 1:].strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        value = value[1:-1].strip()
    return value or default


@app.before_request
def load_cloudflare_settings():

    env = _cloudflare_env()

    if env is None:
        return  # running locally: .env was already loaded

    global GMAIL_USER, GMAIL_APP_PASSWORD, RECEIVER_EMAIL
    global PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_MODE
    global PAYPAL_API_BASE, PAYPAL_CURRENCY, PAYPAL_SUPPORT_AMOUNT

    def setting(name, default=""):
        return _read_setting(env, name, default)

    GMAIL_USER = setting("GMAIL_USER")
    GMAIL_APP_PASSWORD = setting("GMAIL_APP_PASSWORD")
    RECEIVER_EMAIL = setting("RECEIVER_EMAIL", "crzysupptant@gmail.com")

    PAYPAL_CLIENT_ID = setting("PAYPAL_CLIENT_ID")
    PAYPAL_SECRET = setting("PAYPAL_SECRET")
    PAYPAL_MODE = setting("PAYPAL_MODE", "sandbox")
    PAYPAL_API_BASE = (
        "https://api-m.sandbox.paypal.com"
        if PAYPAL_MODE != "live"
        else "https://api-m.paypal.com"
    )
    PAYPAL_CURRENCY = setting("PAYPAL_CURRENCY", "USD")

    try:
        PAYPAL_SUPPORT_AMOUNT = round(float(setting("PAYPAL_SUPPORT_AMOUNT", "5.00")), 2)
    except ValueError:
        PAYPAL_SUPPORT_AMOUNT = 5.00


# ---------------------------------------------------------------------
# TEMPORARY diagnostic route - DELETE this whole block after testing.
# Shows only true/false for each setting, never the actual values.
# ---------------------------------------------------------------------

@app.route("/api/_diag", methods=["GET"])
def diag():
    names = ["GMAIL_USER", "GMAIL_APP_PASSWORD", "RECEIVER_EMAIL",
             "PAYPAL_CLIENT_ID", "PAYPAL_SECRET", "PAYPAL_MODE",
             "PAYPAL_CURRENCY", "PAYPAL_SUPPORT_AMOUNT"]
    env = _cloudflare_env()
    return jsonify({
        "workers_env_in_request": request.environ.get("workers.env") is not None,
        "cloudflare_env_found": env is not None,
        "setting_found": {
            n: (_read_setting(env, n) != "") if env is not None else False
            for n in names
        },
        "loaded_into_app": {
            "GMAIL_USER": bool(GMAIL_USER),
            "GMAIL_APP_PASSWORD": bool(GMAIL_APP_PASSWORD),
            "PAYPAL_CLIENT_ID": bool(PAYPAL_CLIENT_ID),
            "PAYPAL_SECRET": bool(PAYPAL_SECRET),
        },
    })


# ---------------------------------------------------------------------
# Local development server
# ---------------------------------------------------------------------

if __name__ == "__main__":

    print()
    print(
        "=========================================="
    )
    print(
        " CoreLife Collaboration Form"
    )
    print(
        " Local server starting..."
    )
    print(
        "=========================================="
    )
    print()
    print(
        "Open this in Chrome:"
    )
    print(
        "http://127.0.0.1:5000/"
    )
    print()

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )