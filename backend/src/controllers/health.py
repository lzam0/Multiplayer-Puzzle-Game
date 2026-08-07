import os

def get_health():
    return {"Backend Service": "Multiplayer Puzzle Game", "Port": os.getenv("PORT")}
