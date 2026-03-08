#!/usr/bin/env python3
"""
Ontopo Daily Report — GitHub Actions + Supabase + Telegram
Pulls reservation data from Ontopo for Paseo & Umino, formats a Hebrew message,
and sends it via Telegram bot.
"""

import os
import sys
import json
import requests
from datetime import datetime, timedelta, timezone

# ─── Configuration ────────────────────────────────────────────────────────────

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
ONTOPO_PHONE = os.environ.get("ONTOPO_PHONE", "+972543332696")

GRAPHQL_ENDPOINT = "https://top-openapi-legacy.prod-01.ontopo.cz/graphql"
ANON_LOGIN_URL = "https://ontopo.com/api/loginAnonymously"

PASEO_VENUE_ID = "62caa154a9f912000f698bc3"
UMINO_VENUE_ID = "64a3d2729a74080014bc9515"

VENUES = [
    {"name": "פסאו", "venue_id": PASEO_VENUE_ID, "has_events": True},
    {"name": "אומינו", "venue_id": UMINO_VENUE_ID, "has_events": False},
]

ACTIVE_STATUSES = {"approved", "invited", "callback", "seated", "arrived", "created", "not_piked_up"}
CANCELLED_STATUSES = {"cancelled", "no_show", "declined"}

HEBREW_DAYS = {0: "ראשון", 1: "שני", 2: "שלישי", 3: "רביעי", 4: "חמישי", 5: "שישי", 6: "שבת"}

ISRAEL_TZ = timezone(timedelta(hours=3))

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


# ─── Startup Banner ──────────────────────────────────────────────────────────

def print_banner():
    now = datetime.now(ISRAEL_TZ).strftime("%Y-%m-%d %H:%M:%S")
    print("""
═══════════════════════════════════════
  דוח הזמנות אונטופו — הרצה יומית
═══════════════════════════════════════

📋 דרך פעולה:
  1. טוען טוקנים מ-Supabase
  2. מנסה לרענן טוקן (refreshToken)
  3. אם הרענון נכשל — שולח SMS ומבקש OTP בטלגרם
  4. אם הטוקן תקין — מושך הזמנות מפסאו ואומינו
  5. מפרמט הודעה ושולח בטלגרם
  6. שומר טוקנים מעודכנים ב-Supabase

⏰ התחלת ריצה: {}
═══════════════════════════════════════
""".format(now))


# ─── Hebrew Date Helpers ──────────────────────────────────────────────────────

def py_to_heb(dt):
    """Convert Python weekday (Mon=0) to Hebrew weekday (Sun=0)."""
    return (dt.weekday() + 1) % 7


def heb_day_name(dt):
    return HEBREW_DAYS[py_to_heb(dt)]


def days_until_saturday(today):
    """Return list of dates from today until end of Hebrew week (Saturday)."""
    remaining = 6 - py_to_heb(today)
    return [today + timedelta(days=i) for i in range(remaining + 1)]


def day_emoji(dt):
    hw = py_to_heb(dt)
    if hw == 5:   # Friday
        return "🟡"
    elif hw == 6:  # Saturday
        return "🔴"
    return "⚪"


def is_overload_day(dt):
    """Thursday, Friday, Saturday in Hebrew calendar."""
    return py_to_heb(dt) in {4, 5, 6}


# ─── Supabase Helpers ─────────────────────────────────────────────────────────

def supabase_get_tokens():
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/ontopo_tokens?select=*&id=eq.1",
        headers=SUPABASE_HEADERS, timeout=15,
    )
    resp.raise_for_status()
    rows = resp.json()
    if not rows:
        raise Exception("No tokens found in Supabase (table empty)")
    return rows[0]


def supabase_save_tokens(login_token, login_refresh):
    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/ontopo_tokens?id=eq.1",
        headers={**SUPABASE_HEADERS, "Prefer": "return=minimal"},
        json={
            "login_token": login_token,
            "login_refresh": login_refresh,
            "status": "active",
            "anon_token": None,
            "saved_at": datetime.now(ISRAEL_TZ).isoformat(),
        },
        timeout=15,
    )
    resp.raise_for_status()


def supabase_save_otp_state(anon_token):
    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/ontopo_tokens?id=eq.1",
        headers={**SUPABASE_HEADERS, "Prefer": "return=minimal"},
        json={
            "status": "waiting_for_otp",
            "anon_token": anon_token,
            "saved_at": datetime.now(ISRAEL_TZ).isoformat(),
        },
        timeout=15,
    )
    resp.raise_for_status()


# ─── Telegram Helper ─────────────────────────────────────────────────────────

def send_telegram(text):
    """Send a message via Telegram Bot API. Splits if >4096 chars."""
    for i in range(0, len(text), 4096):
        chunk = text[i:i + 4096]
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": chunk, "parse_mode": "Markdown"},
            timeout=15,
        )


# ─── Ontopo API Helpers ──────────────────────────────────────────────────────

def gql(query, variables, token):
    resp = requests.post(
        GRAPHQL_ENDPOINT,
        json={"query": query, "variables": variables},
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        timeout=30,
    )
    data = resp.json()
    if "errors" in data:
        raise Exception(f"GraphQL error: {data['errors'][0]['message']}")
    return data.get("data", data)


def get_anonymous_token():
    resp = requests.post(ANON_LOGIN_URL, json={}, timeout=15)
    resp.raise_for_status()
    return resp.json()["jwt_token"]


def send_otp_sms(anon_token, phone):
    gql(
        """mutation($i:LoginVerifyInput!,$p:String){
            loginSendCode(input:$i,platform:$p){statusCode error message}}""",
        {"i": {"phoneOrEmail": phone, "regionCode": "IL", "locale": "he",
                "recaptcha": "ontopo"}, "p": "mobile"},
        anon_token,
    )


def refresh_token_api(login_refresh):
    anon = get_anonymous_token()
    result = gql(
        """mutation($i:RefreshTokenInput!){
            refreshToken(input:$i){jwt_token refresh_token}}""",
        {"i": {"refresh_token": login_refresh}},
        anon,
    )
    return {
        "login_token": result["refreshToken"]["jwt_token"],
        "login_refresh": result["refreshToken"]["refresh_token"],
    }


def switch_venue(login_token, login_refresh, venue_id):
    sv = gql(
        """mutation($i:SwitchVenueInput!){
            switchVenue(input:$i){jwt_token refresh_token}}""",
        {"i": {"refresh_token": login_refresh, "venue_id": venue_id,
                "phone": ONTOPO_PHONE, "regionCode": "IL"}},
        login_token,
    )
    return sv["switchVenue"]["jwt_token"]


def fetch_parties(venue_token, date_str):
    """date_str = YYYYMMDD"""
    result = gql(
        "query($i:GetPartiesByInput!){getPartiesBy(input:$i)}",
        {"i": {"filterType": "date", "filterParam": date_str, "hour": "0400"}},
        venue_token,
    )
    parties = result.get("getPartiesBy", [])
    if isinstance(parties, str):
        parties = json.loads(parties)
    return parties or []


# ─── Party Parsing Helpers ────────────────────────────────────────────────────

def parse_party_time(party):
    """Extract HH:MM from party time field 'YYYYMMDD HHMM'."""
    t = party.get("time", "") or party.get("party_time", "")
    if " " in t:
        hhmm = t.split(" ")[1]
        return f"{hhmm[:2]}:{hhmm[2:]}"
    return t


def party_guests(party):
    return party.get("guests_number", 0) or party.get("pax", 0) or 0


def party_name(party):
    first = party.get("first_name", "") or ""
    last = party.get("last_name", "") or ""
    name = f"{first} {last}".strip()
    return name if name else "ללא שם"


def party_status(party):
    return (party.get("status", "") or party.get("statusId", "") or "").lower()


def party_is_active(party):
    return party_status(party) in ACTIVE_STATUSES


def party_is_cancelled(party):
    return party_status(party) in CANCELLED_STATUSES


def party_has_verified_cc(party):
    return (party.get("creditcardStatusId", "") or "").lower() == "verified"


def party_notes(party):
    return (party.get("notes", "") or party.get("note", "") or "").strip()


def party_date_str(party):
    """Extract YYYYMMDD from party time field."""
    t = party.get("time", "") or party.get("party_time", "")
    return t.split(" ")[0] if " " in t else t


# ─── Message Formatting ──────────────────────────────────────────────────────

def format_today_detail(parties, dt):
    """Format detailed view for today's reservations grouped by hour."""
    active = [p for p in parties if party_is_active(p)]
    if not active:
        return "אין הזמנות להיום"

    # Group by hour
    by_hour = {}
    for p in active:
        hour = parse_party_time(p)
        by_hour.setdefault(hour, []).append(p)

    lines = []
    for hour in sorted(by_hour.keys()):
        group = by_hour[hour]
        tables = len(group)
        guests = sum(party_guests(p) for p in group)
        lines.append(f"*{hour}* ⚠️ {tables} שולחנות | {guests} סועדים")

        for p in group:
            cc = " ✅" if party_has_verified_cc(p) else ""
            lines.append(f"  • {party_name(p)} — {party_guests(p)} סועדים{cc}")
            note = party_notes(p)
            if note:
                truncated = note[:60] + "..." if len(note) > 60 else note
                lines.append(f"    📝 {truncated}")

        # Overload alert: Thu/Fri/Sat, 5+ tables same hour
        if is_overload_day(dt) and tables >= 5:
            lines.append(f"⚠️ *תיאום נדרש — {tables} שולחנות נכנסים ביחד!*")
            lines.append("מארחת בוקר — לנסות לרווח ולהזיז הזמנות בשעה הזו 🙏")

    return "\n".join(lines)


def format_day_summary(parties, dt):
    """Format summary for non-today days."""
    active = [p for p in parties if party_is_active(p)]
    total_res = len(active)
    total_guests = sum(party_guests(p) for p in active)
    line = f"{total_res} הזמנות | {total_guests} סועדים"

    # Overload alerts for Thu-Sat
    if is_overload_day(dt) and active:
        by_hour = {}
        for p in active:
            hour = parse_party_time(p)
            by_hour.setdefault(hour, []).append(p)
        alerts = []
        for hour in sorted(by_hour.keys()):
            group = by_hour[hour]
            if len(group) >= 5:
                guests = sum(party_guests(p) for p in group)
                alerts.append(f"⚠️ עומס ב-{hour}: {len(group)} שולחנות / {guests} אורחים")
        if alerts:
            line += "\n" + "\n".join(alerts)

    return line


def format_cancelled_big(parties):
    """Format cancelled reservations with 8+ guests."""
    cancelled = [p for p in parties if party_is_cancelled(p) and party_guests(p) >= 8]
    if not cancelled:
        return ""
    lines = []
    for p in cancelled:
        lines.append(f"🚫 ביטול: {party_name(p)} — {party_guests(p)} סועדים ({parse_party_time(p)})")
    return "\n".join(lines)


def format_events(all_parties_by_date, venue_name):
    """Format events section — Paseo only, 14-day lookahead, 15+ guests."""
    events = []
    for date_str, parties in sorted(all_parties_by_date.items()):
        for p in parties:
            if party_is_active(p) and party_guests(p) >= 15:
                try:
                    dt = datetime.strptime(date_str, "%Y%m%d").date()
                except ValueError:
                    continue
                events.append({
                    "date": dt,
                    "time": parse_party_time(p),
                    "guests": party_guests(p),
                    "name": party_name(p),
                    "notes": party_notes(p),
                })

    if not events:
        return ""

    lines = ["🎉 *אירועים בשבועיים הקרובים:*"]
    for e in sorted(events, key=lambda x: (x["date"], x["time"])):
        day_name = heb_day_name(e["date"])
        date_fmt = e["date"].strftime("%d/%m")
        line = f"  • יום {day_name} {date_fmt} | {e['time']} | {e['guests']} אורחים | {e['name']}"
        lines.append(line)
        if e["notes"]:
            truncated = e["notes"][:60] + "..." if len(e["notes"]) > 60 else e["notes"]
            lines.append(f"    📝 {truncated}")

    return "\n".join(lines)


def format_venue_message(venue_name, today, week_days, all_parties_by_date, has_events):
    """Format the full message block for one venue."""
    # Header with date range
    start_fmt = today.strftime("%d/%m")
    end_fmt = week_days[-1].strftime("%d/%m")
    lines = [f"📊 *הזמנות {venue_name}*", f"📅 {start_fmt} - {end_fmt}", ""]

    total_res = 0
    total_guests = 0

    for dt in week_days:
        date_key = dt.strftime("%Y%m%d")
        parties = all_parties_by_date.get(date_key, [])
        active = [p for p in parties if party_is_active(p)]
        total_res += len(active)
        total_guests += sum(party_guests(p) for p in active)

        emoji = day_emoji(dt)
        day_name = heb_day_name(dt)
        date_fmt = dt.strftime("%d/%m")
        today_marker = " 👈 היום" if dt == today else ""

        lines.append(f"{emoji} *יום {day_name} {date_fmt}*{today_marker}")

        if dt == today:
            lines.append(format_today_detail(parties, dt))
        else:
            lines.append(format_day_summary(parties, dt))

        # Cancelled big reservations for any day
        cancelled_text = format_cancelled_big(parties)
        if cancelled_text:
            lines.append(cancelled_text)

        lines.append("")

    # Events section (Paseo only, 14-day lookahead)
    if has_events:
        events_text = format_events(all_parties_by_date, venue_name)
        if events_text:
            lines.append(events_text)
            lines.append("")

    # Summary footer
    lines.append(f"📈 *סה\"כ עד שבת:* {total_res} הזמנות | {total_guests} סועדים")

    return "\n".join(lines)


# ─── Main Flow ────────────────────────────────────────────────────────────────

def main():
    print_banner()

    # Step 1: Load tokens from Supabase
    print("🔄 שלב 1: טוען טוקנים מ-Supabase...")
    try:
        tokens = supabase_get_tokens()
        saved_at = tokens.get("saved_at", "לא ידוע")
        print(f"✅ שלב 1: טוקנים נטענו מ-Supabase (נשמרו ב: {saved_at})")
    except Exception as e:
        print(f"❌ שלב 1: שגיאה בטעינת טוקנים — {e}")
        send_telegram(f"❌ דוח אונטופו נכשל — שגיאה בטעינת טוקנים:\n{e}")
        sys.exit(1)

    login_token = tokens.get("login_token", "")
    login_refresh = tokens.get("login_refresh", "")

    # Step 2: Try refresh token
    print("🔄 שלב 2: מנסה לרענן טוקן...")
    try:
        new_tokens = refresh_token_api(login_refresh)
        login_token = new_tokens["login_token"]
        login_refresh = new_tokens["login_refresh"]
        print("✅ שלב 2: טוקן רוענן בהצלחה")
    except Exception as e:
        print(f"❌ שלב 2: רענון טוקן נכשל — מתחיל תהליך OTP")
        print(f"   שגיאה: {e}")

        # Step 3: OTP flow
        try:
            anon = get_anonymous_token()
            send_otp_sms(anon, ONTOPO_PHONE)
            print(f"📱 SMS נשלח ל-{ONTOPO_PHONE}")

            supabase_save_otp_state(anon)
            send_telegram("❗ הטוקן של אונטופו פג.\nשלח לי את קוד ה-OTP בן 4 ספרות שקיבלת ב-SMS.")
            print("📨 הודעה נשלחה בטלגרם: \"שלח קוד OTP\"")
            print("⏸️ ממתין לתשובה דרך Telegram webhook...")
        except Exception as otp_err:
            print(f"❌ שגיאה בתהליך OTP: {otp_err}")
            send_telegram(f"❌ דוח אונטופו נכשל — גם OTP נכשל:\n{otp_err}")

        sys.exit(0)

    # Step 3-4: Fetch data for both venues
    today = datetime.now(ISRAEL_TZ).date()
    week_days = days_until_saturday(today)
    # For events lookahead (14 days)
    event_days = [today + timedelta(days=i) for i in range(14)]

    message_parts = []

    for idx, venue in enumerate(VENUES):
        step_num = 3 + idx
        venue_name = venue["name"]
        print(f"🔄 שלב {step_num}: מושך הזמנות מ{venue_name}...")

        try:
            venue_token = switch_venue(login_token, login_refresh, venue["venue_id"])

            # Determine which dates to fetch
            dates_to_fetch = set()
            for d in week_days:
                dates_to_fetch.add(d.strftime("%Y%m%d"))
            if venue["has_events"]:
                for d in event_days:
                    dates_to_fetch.add(d.strftime("%Y%m%d"))

            all_parties = {}
            for date_str in sorted(dates_to_fetch):
                parties = fetch_parties(venue_token, date_str)
                all_parties[date_str] = parties

            # Count stats for today's log
            week_active = 0
            week_guests = 0
            for d in week_days:
                dk = d.strftime("%Y%m%d")
                active = [p for p in all_parties.get(dk, []) if party_is_active(p)]
                week_active += len(active)
                week_guests += sum(party_guests(p) for p in active)

            print(f"✅ שלב {step_num}: {venue_name} — {week_active} הזמנות, {week_guests} סועדים")

            venue_msg = format_venue_message(
                venue_name, today, week_days, all_parties, venue["has_events"]
            )
            message_parts.append(venue_msg)

        except Exception as e:
            print(f"❌ שלב {step_num}: שגיאה במשיכת הזמנות מ{venue_name} — {e}")
            message_parts.append(f"📊 *{venue_name}*\n❌ שגיאה: {e}")

    # Step 5: Send Telegram message
    step_send = 5
    print(f"🔄 שלב {step_send}: שולח הודעה בטלגרם...")
    full_message = "\n\n━━━━━━━━━━━━━━━━━━━━━\n\n".join(message_parts)
    try:
        send_telegram(full_message)
        print(f"✅ שלב {step_send}: הודעה נשלחה בטלגרם")
    except Exception as e:
        print(f"❌ שלב {step_send}: שגיאה בשליחת הודעה — {e}")

    # Step 6: Save tokens
    step_save = 6
    print(f"🔄 שלב {step_save}: שומר טוקנים ב-Supabase...")
    try:
        supabase_save_tokens(login_token, login_refresh)
        print(f"✅ שלב {step_save}: טוקנים נשמרו ב-Supabase")
    except Exception as e:
        print(f"❌ שלב {step_save}: שגיאה בשמירת טוקנים — {e}")

    print("\n✅ הריצה הסתיימה בהצלחה!")


if __name__ == "__main__":
    main()
