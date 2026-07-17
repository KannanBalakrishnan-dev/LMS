import os
import requests
from dotenv import load_dotenv

load_dotenv()


OPENROUTER_KEYS = [
    os.getenv("OPENROUTER_API_KEY_1"),
    os.getenv("OPENROUTER_API_KEY_2"),
    os.getenv("OPENROUTER_API_KEY_3"),
]

OPENROUTER_KEYS = [key for key in OPENROUTER_KEYS if key]


URL = "https://openrouter.ai/api/v1/chat/completions"


def ask_openrouter(question):

    for index, key in enumerate(OPENROUTER_KEYS, start=1):

        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

        data = {
            "model": "openai/gpt-4.1-mini",
            "messages": [
                {
                    "role": "user",
                    "content": question
                }
            ]
        }

        response = requests.post(
            URL,
            headers=headers,
            json=data
        )


        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"]


        elif response.status_code == 429:
            print(
                f"OpenRouter key {index} limit finished. Switching..."
            )
            continue


        else:
            print(response.text)
            continue


    raise Exception("All OpenRouter keys exhausted")