from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import requests
import os


@csrf_exempt
def ai_chat(request):

    if request.method == "POST":

        data = json.loads(request.body)
        question = data.get("question", "")

        OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "openai/gpt-4o-mini",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an AI Tutor. Help students."
                    },
                    {
                        "role": "user",
                        "content": question
                    }
                ]
            }
        )

        result = response.json()

        print("OPENROUTER RESPONSE:", result)   # add this

        if "choices" in result:
            answer = result["choices"][0]["message"]["content"]
        else:
            answer = result.get(
                "error",
                "OpenRouter API failed"
            )

        return JsonResponse({
            "answer": answer
        })

    return JsonResponse({
        "error": "POST request required"
    })