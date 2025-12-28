from flask import Flask, request, jsonify, render_template
import sqlite3
from datetime import datetime

app = Flask(__name__)
DB_NAME = "database.db"


# ---------- DATABASE ----------
def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            chords TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


# ---------- ROUTES ----------
@app.route("/")
def index():
    return render_template("index.html")


# ---------- API ----------
@app.route("/api/songs", methods=["GET"])
def get_songs():
    conn = get_db()
    songs = conn.execute("SELECT * FROM songs ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(song) for song in songs])


@app.route("/api/songs", methods=["POST"])
def add_song():
    data = request.json
    conn = get_db()
    conn.execute(
        "INSERT INTO songs (title, chords, created_at) VALUES (?, ?, ?)",
        (data["title"], data["chords"], datetime.now().isoformat())
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "success"}), 201


@app.route("/api/songs/<int:song_id>", methods=["PUT"])
def update_song(song_id):
    data = request.json
    conn = get_db()
    conn.execute(
        "UPDATE songs SET title=?, chords=? WHERE id=?",
        (data["title"], data["chords"], song_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "updated"})


@app.route("/api/songs/<int:song_id>", methods=["DELETE"])
def delete_song(song_id):
    conn = get_db()
    conn.execute("DELETE FROM songs WHERE id=?", (song_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "deleted"})

init_db()

if __name__ == "__main__":
    init_db()
    app.run(debug=True)


