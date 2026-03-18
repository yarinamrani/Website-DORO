#!/bin/bash

# install-autostart.sh — התקנת הרצה אוטומטית של מערכת החשבוניות ב-macOS
#
# Usage:
#   chmod +x scripts/install-autostart.sh
#   ./scripts/install-autostart.sh
#
# This script:
#   1. Creates a macOS LaunchAgent plist
#   2. Installs it to ~/Library/LaunchAgents/
#   3. Loads it so it starts on login
#
# Idempotent — safe to run multiple times.

set -euo pipefail

# ─── Config ─────────────────────────────────────────────────────
PLIST_LABEL="com.paseo.invoices.daily"
PLIST_FILE="$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NODE_PATH="$(which node 2>/dev/null || echo "/usr/local/bin/node")"
LOG_DIR="$PROJECT_DIR/tmp/logs"

# ─── Validate ───────────────────────────────────────────────────
if [[ "$(uname)" != "Darwin" ]]; then
    echo "שגיאה: סקריפט זה מיועד ל-macOS בלבד"
    echo "במערכות לינוקס, השתמש ב-crontab או systemd"
    echo ""
    echo "דוגמה ל-crontab:"
    echo "  crontab -e"
    echo "  0 8 * * * cd $PROJECT_DIR && $NODE_PATH scripts/run-daily.mjs >> $LOG_DIR/daily.log 2>&1"
    exit 1
fi

if [ ! -f "$SCRIPT_DIR/run-daily.mjs" ]; then
    echo "שגיאה: לא נמצא run-daily.mjs ב-$SCRIPT_DIR"
    exit 1
fi

if [ ! -x "$NODE_PATH" ] && [ ! -f "$NODE_PATH" ]; then
    echo "שגיאה: Node.js לא נמצא ב-$NODE_PATH"
    echo "התקן Node.js או עדכן את NODE_PATH בסקריפט"
    exit 1
fi

# ─── Create log directory ───────────────────────────────────────
mkdir -p "$LOG_DIR"

# ─── Create LaunchAgents directory if needed ────────────────────
mkdir -p "$HOME/Library/LaunchAgents"

# ─── Unload existing agent if loaded ───────────────────────────
if launchctl list "$PLIST_LABEL" &>/dev/null; then
    echo "מסיר את ה-agent הקיים..."
    launchctl unload "$PLIST_FILE" 2>/dev/null || true
fi

# ─── Load .env to get environment variables ─────────────────────
ENV_FILE="$PROJECT_DIR/.env"
ENV_KEYS=""
if [ -f "$ENV_FILE" ]; then
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip empty lines and comments
        trimmed=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        if [ -z "$trimmed" ] || [[ "$trimmed" == \#* ]]; then
            continue
        fi
        key=$(echo "$trimmed" | cut -d= -f1)
        val=$(echo "$trimmed" | cut -d= -f2-)
        ENV_KEYS="$ENV_KEYS
        <key>$key</key>
        <string>$val</string>"
    done < "$ENV_FILE"
fi

# ─── Write plist ────────────────────────────────────────────────
cat > "$PLIST_FILE" << PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_LABEL}</string>

    <key>ProgramArguments</key>
    <array>
        <string>${NODE_PATH}</string>
        <string>${SCRIPT_DIR}/run-daily.mjs</string>
        <string>--watch</string>
    </array>

    <key>WorkingDirectory</key>
    <string>${PROJECT_DIR}</string>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>

    <key>StandardOutPath</key>
    <string>${LOG_DIR}/daily-stdout.log</string>

    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/daily-stderr.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
        <key>GEMINI_API_KEY</key>
        <string>${GEMINI_API_KEY:-}</string>${ENV_KEYS}
    </dict>

    <key>ProcessType</key>
    <string>Background</string>

    <key>ThrottleInterval</key>
    <integer>60</integer>
</dict>
</plist>
PLIST_EOF

echo "נוצר קובץ plist: $PLIST_FILE"

# ─── Load the agent ─────────────────────────────────────────────
launchctl load "$PLIST_FILE"
echo "ה-agent נטען בהצלחה"

# ─── Verify ─────────────────────────────────────────────────────
if launchctl list "$PLIST_LABEL" &>/dev/null; then
    echo ""
    echo "======================================="
    echo "   התקנה הושלמה בהצלחה"
    echo "======================================="
    echo ""
    echo "   הסקריפט יפעל אוטומטית בכל כניסה למשתמש"
    echo "   במצב --watch (בדיקה כל 30 דקות)"
    echo ""
    echo "   לוגים:"
    echo "     stdout: $LOG_DIR/daily-stdout.log"
    echo "     stderr: $LOG_DIR/daily-stderr.log"
    echo ""
    echo "   פקודות שימושיות:"
    echo "     בדיקת סטטוס:  launchctl list $PLIST_LABEL"
    echo "     עצירה:        launchctl unload $PLIST_FILE"
    echo "     הפעלה:        launchctl load $PLIST_FILE"
    echo "     הסרה:         rm $PLIST_FILE"
    echo ""
else
    echo "אזהרה: ה-agent לא נטען כראוי. בדוק את הלוגים."
    exit 1
fi
