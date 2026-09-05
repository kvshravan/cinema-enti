from pathlib import Path
import csv
import json


PROJECT_ROOT = Path(__file__).resolve().parent.parent

CSV_FILE = PROJECT_ROOT / "games.csv"
JSON_FILE = PROJECT_ROOT / "data" / "games.json"


games = []

with CSV_FILE.open("r", encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)

    for row in reader:
        games.append({
            "date": row["date"],
            "easy": {
                "movie": row["easy_movie"],
                "audio": row["easy_audio"],
                "clues": {
                    "actor": row["easy_actor"],
                    "year": int(row["easy_year"]),
                    "director": row["easy_director"]
                }
            },
            "hard": {
                "movie": row["hard_movie"],
                "audio": row["hard_audio"],
                "clues": {
                    "actor": row["hard_actor"],
                    "year": int(row["hard_year"]),
                    "director": row["hard_director"]
                }
            },
            "ultra_hard": {
                "movie": row["ultra_hard_movie"],
                "audio": row["ultra_hard_audio"],
                "clues": {
                    "actor": row["ultra_hard_actor"],
                    "year": int(row["ultra_hard_year"]),
                    "director": row["ultra_hard_director"]
                }
            }
        })


JSON_FILE.parent.mkdir(parents=True, exist_ok=True)

with JSON_FILE.open("w", encoding="utf-8") as f:
    json.dump(
        games,
        f,
        ensure_ascii=False,
        indent=2
    )


print(f"Generated {len(games)} day(s).")