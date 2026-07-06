import os
from google import genai

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def ask_gemini(question):

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=question
    )

    return response.text