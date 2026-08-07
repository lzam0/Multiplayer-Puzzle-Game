import os
import re
import json
import random
from groq import AsyncGroq

_PROMPT = (
    'You are a word list generator for a word puzzle game.\n'
    'Return ONLY a JSON array of 10 uppercase English words (3–8 letters each, '
    'single words only, no proper nouns) strongly associated with the topic: "{topic}".\n'
    'Include a mix of word lengths — at least 3 words must be 3 or 4 letters long.\n'
    'Example format: ["WORD","WORD","WORD"]'
)

async def generate_words(topic: str) -> list[str]:
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"), timeout=5.0)
    completion = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": _PROMPT.format(topic=topic)}],
        temperature=0.7,
    )

    content = completion.choices[0].message.content or ""

    # resilient parse: find first [...] block even if model adds prose
    match = re.search(r"\[.*?\]", content, re.DOTALL)
    if not match:
        raise ValueError(f'Not enough valid words for "{topic}". Try a different topic.')

    try:
        parsed = json.loads(match.group())
    except json.JSONDecodeError:
        raise ValueError(f'Not enough valid words for "{topic}". Try a different topic.')

    if not isinstance(parsed, list):
        raise ValueError(f'Not enough valid words for "{topic}". Try a different topic.')

    # validation pipeline: strings → uppercase → regex → deduplicate
    valid = list(dict.fromkeys(
        w.upper()
        for w in parsed
        if isinstance(w, str) and re.fullmatch(r"[A-Z]{3,8}", w.upper())
    ))

    # Drop any word that is a strict prefix of another word in the list.
    # Such pairs make board generation impossible (the shorter word's path is
    # always traceable inside the longer word's path).
    word_set = set(valid)
    valid = [w for w in valid if not any(other.startswith(w) and other != w for other in word_set)]

    if len(valid) < 6:
        raise ValueError(f'Not enough valid words for "{topic}". Try a different topic.')

    random.shuffle(valid)
    return valid[:6]
