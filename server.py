from flask import Flask, jsonify, send_from_directory, request, render_template_string, Response
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
# import datetime
from datetime import datetime, timezone, date
import sqlite3
import os
import requests  # for hCaptcha verify
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import urlparse

app = Flask(__name__, static_folder=None)
CORS(app, origins=["SITEURL"])

HCAPTCHA_SECRET = os.environ.get("HCAPTCHA_SECRET")  
HCAPTCHA_VERIFY_URL = "https://hcaptcha.com/siteverify"
DATABASE_URL = os.getenv("DATABASE_URL")  
DATABASE_URL_PUBLIC = os.getenv("DATABASE_URL_PUBLIC")  
ADMIN_PASS = os.getenv("ADMIN_PASS")


# =================== DATABASE ===================
# --- Add Limiter (Postgres storage) ---
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=DATABASE_URL,
    default_limits=["200 per day", "50 per hour"]
)

def get_db_conn(admin):
    """
    If admin=True, connect with full access.
    If admin=False, connect with restricted role (feedback only).
    """
    url = DATABASE_URL if admin else DATABASE_URL_PUBLIC
    return psycopg2.connect(url)

# Initialize table if not exists
def init_db():
    conn = get_db_conn(admin=True)
    cur = conn.cursor()
    #words
    cur.execute("""
        CREATE TABLE IF NOT EXISTS words (
            id SERIAL PRIMARY KEY,
            word TEXT NOT NULL UNIQUE,
            meaning_en TEXT NOT NULL,
            meaning_so TEXT NOT NULL,
            hint_en TEXT NOT NULL,
            hint_so TEXT NOT NULL,
            used BOOLEAN DEFAULT FALSE
        )
    """)
    #feedback
    cur.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    cur.close()
    conn.close()

init_db()

# =================== WORD API ===================
@app.route("/api/word")
def get_word():
    try:
        today_utc = datetime.now(timezone.utc).date()
        day_number = (today_utc - date(2025, 1, 1)).days

        conn = get_db_conn(admin=False)
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Count unused words. If all are used, reset all to unused
        cur.execute("SELECT COUNT(*) FROM words WHERE used = FALSE;")
        unused_words = cur.fetchone()["count"]

        if unused_words == 0:
            cur.execute("UPDATE words SET used = FALSE;")
            conn.commit()

        # Get the unused words ordered by id
        cur.execute("""
            SELECT id, word, meaning_en, meaning_so, hint_en, hint_so
            FROM words
            WHERE used = FALSE
            ORDER BY id;
        """)
        unused_words = cur.fetchall()

        if not unused_words:
            return jsonify({"error": "No words available"}), 404
        
        # Pick today’s word by cycling through with modulo
        offset = day_number % len(unused_words)
        word_obj = unused_words[offset]

        # Mark the selected word as used
        cur.execute("UPDATE words SET used = TRUE WHERE id = %s;", (word_obj["id"],))
        conn.commit()

        cur.close()
        conn.close()

        return jsonify({
            "solution": word_obj["word"],
            "meaning_en": word_obj["meaning_en"],
            "meaning_so": word_obj["meaning_so"],
            "hint_en": word_obj["hint_en"],
            "hint_so": word_obj["hint_so"]
        })

    except Exception as e:
        print("Error in /api/word:", e)
        return jsonify({"error": str(e)}), 500
    
# =================== ADMIN API ===================
# Function to prompt for password
def check_auth(password):
    return password == ADMIN_PASS

def authenticate():
    return Response(
        'Authentication required', 401,
        {'WWW-Authenticate': 'Basic realm="Admin Area"',
         'Cache-Control': 'no-store, must-revalidate',
         'Pragma': 'no-cache'}
    )

# Protect a route
def requires_auth(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.authorization
        if not auth or not check_auth(auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated

@app.route("/api/admin/feedback", methods=["POST"])
@limiter.limit("3 per hour")  # 🔒 specific limit for feedback
def feedback():
    data = request.get_json()
    fb_type = data.get("type")
    message = data.get("message")
    token = data.get("hcaptcha_token")

    if not fb_type or not message:
        return jsonify({"success": False, "error": "Missing fields"}), 400
    
    # Require captcha
    if not token:
        return jsonify({"success": False, "error": "Missing hCaptcha token"}), 400
    if not HCAPTCHA_SECRET:
        # Safety: you forgot to set the env var on the server
        return jsonify({"success": False, "error": "Server captcha secret not configured"}), 500

    try:
        verify_resp = requests.post(
            HCAPTCHA_VERIFY_URL,
            data={"secret": HCAPTCHA_SECRET, "response": token},
            timeout=5
        )
        vr = verify_resp.json()
        print("hCaptcha verify response:", vr)  # log this to server logs
        if not vr.get("success"):
            return jsonify({"success": False, "error": "Captcha failed", "details": vr}), 400
    except Exception as e:
        return jsonify({"success": False, "error": "Captcha verification error"}), 500

    # Insert into Postgres
    try:
        conn = get_db_conn(admin=False)
        cur = conn.cursor()
        cur.execute("INSERT INTO feedback (type, message) VALUES (%s, %s)", (fb_type, message))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        return jsonify({"success": False, "error": f"DB insert failed: {e}"}), 500
    
    return jsonify({"success": True})

@app.route("/api/admin/words", methods=["POST"])
@requires_auth
def admin_add_word():
    data = request.get_json()
    conn = get_db_conn(admin=True)
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO words (word, meaning_en, meaning_so, hint_en, hint_so) VALUES (%s, %s, %s, %s, %s)",
        (data["word"], data["meaning_en"], data["meaning_so"], data["hint_en"], data["hint_so"])
    )
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True})

@app.route("/api/admin/words/<int:word_id>", methods=["DELETE"])
@requires_auth
def admin_delete_word(word_id):
    conn = get_db_conn(admin=True)
    cur = conn.cursor()
    cur.execute("DELETE FROM words WHERE id=%s", (word_id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True})

@app.route("/api/admin/words/<int:word_id>", methods=["PATCH"])
@requires_auth
def admin_update_word(word_id):
    data = request.get_json()
    # Only update the fields provided
    fields = []
    values = []
    for key in ["meaning_en", "meaning_so", "hint_en", "hint_so"]:
        if key in data:
            fields.append(f"{key} = %s")
            values.append(data[key])
    if not fields:
        return jsonify({"success": False, "error": "No fields to update"}), 400

    values.append(word_id)
    conn = get_db_conn(admin=True)
    cur = conn.cursor()
    cur.execute(f"UPDATE words SET {', '.join(fields)} WHERE id = %s", values)
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True})

# =================== SECURE ADMIN PAGE ===================
admin_html_template = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Admin Feedback</title>
<style>
  body { font-family: Arial; margin: 20px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
  th { background-color: #f2f2f2; }
</style>
</head>
<body>
<h1>Feedback / Bug Reports</h1>
<table>
  <thead>
    <tr>
      <th>ID</th><th>Type</th><th>Message</th><th>Timestamp</th>
    </tr>
  </thead>
  <tbody>
  {% for fb in feedbacks %}
    <tr>
      <td>{{ fb.id }}</td>
      <td>{{ fb.type }}</td>
      <td>{{ fb.message }}</td>
      <td>{{ fb.timestamp }}</td>
    </tr>
  {% endfor %}
  </tbody>
</table>

<h2>Words</h2>
<form id="addWordForm">
  <input type="text" name="word" placeholder="Word" required>
  <input type="text" name="meaning_en" placeholder="Meaning (EN)" required>
  <input type="text" name="meaning_so" placeholder="Meaning (SO)" required>
  <input type="text" name="hint_en" placeholder="Hint (EN)" required>
  <input type="text" name="hint_so" placeholder="Hint (SO)" required>
  <button type="submit">Add Word</button>
</form>

<table>
  <thead>
    <tr>
        <th>ID</th>
        <th>Word</th>
        <th>Meaning EN</th>
        <th>Meaning SO</th>
        <th>Hint EN</th>
        <th>Hint SO</th>
        <th>Action</th>
    </tr>
  </thead>
  <tbody>
    {% for w in words %}
    <tr>
        <td>{{ w.id }}</td>
        <td>{{ w.word }}</td>
        <td><input type="text" value="{{ w.meaning_en }}" id="meaning_en_{{ w.id }}"></td>
        <td><input type="text" value="{{ w.meaning_so }}" id="meaning_so_{{ w.id }}"></td>
        <td><input type="text" value="{{ w.hint_en }}" id="hint_en_{{ w.id }}"></td>
        <td><input type="text" value="{{ w.hint_so }}" id="hint_so_{{ w.id }}"></td>
        <td>
            <button onclick="updateWord({{ w.id }})">Update</button>
            <button type="button" onclick="deleteWord({{ w.id }})">Delete</button>
        </td>
    </tr>
    {% endfor %}
  </tbody>
</table>
<script>
    const auth = new URLSearchParams(window.location.search).get("auth");

    // Add Word
    document.getElementById("addWordForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = Object.fromEntries(new FormData(e.target).entries());

        const res = await fetch(`/api/admin/words?auth=${auth}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        if (res.ok) {
            alert("Word added!");
            location.reload(); // reload page to show new word
        } else {
            alert("Failed to add word");
        }
    });

    async function updateWord(id) {
        const data = {
            meaning_en: document.getElementById(`meaning_en_${id}`).value,
            meaning_so: document.getElementById(`meaning_so_${id}`).value,
            hint_en: document.getElementById(`hint_en_${id}`).value,
            hint_so: document.getElementById(`hint_so_${id}`).value
        };
        
        const res = await fetch(`/api/admin/words/${id}?auth=${auth}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            alert("Word updated!");
        } else {
            alert("Failed to update word");
        }
    }

    // Delete Word
    async function deleteWord(id) {
        if (!confirm("Delete this word?")) return;

        const res = await fetch(`/api/admin/words/${id}?auth=${auth}`, { method: "DELETE" });
        if (res.ok) {
            alert("Word deleted!");
            location.reload();
        } else {
            alert("Failed to delete word");
        }
    }
</script>
</body>
</html>
"""

@app.route("/admin")
@requires_auth
def admin():
    conn = get_db_conn(admin=True)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    # Get feedback
    cur.execute("SELECT * FROM feedback ORDER BY timestamp DESC LIMIT 50")
    feedbacks = cur.fetchall()
    # Get words
    cur.execute("SELECT * FROM words ORDER BY id DESC")
    words = cur.fetchall()
    cur.close()
    conn.close()

    return render_template_string(admin_html_template, feedbacks=feedbacks, words=words)

# =================== PUBLIC ROUTES ===================
@app.route("/")
def index():
    return send_from_directory("static", "index.html")

# Serve only allowed JS/CSS
@app.route("/static/<path:filename>")
def serve_static(filename):
    allowed = ["images/titleImg.png", "images/logoImg.png", "style.css", "initializeDOM.js", "initializeHCaptcha.js", "language.js", "game.js"]
    if filename not in allowed:
        return "Not Found", 404
    
    return send_from_directory("static", filename)
