import os

from google import genai

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


class AssistantAskView(APIView):

    permission_classes = [
        IsAuthenticated
    ]


    def post(self, request):

        try:

            question = request.data.get(
                "question",
                ""
            ).strip()


            if not question:

                return Response(
                    {
                        "answer":
                        "Please enter a question."
                    },
                    status=200
                )


            response = client.models.generate_content(
                model="gemini-2.0-flash-lite",
                contents=question
            )


            return Response(
                {
                    "answer": response.text
                }
            )


        except Exception as e:

            print(
                "AI ERROR:",
                e
            )

            return Response(
                {
                    "answer":
                    "AI Tutor is busy right now. Please try again after some time."
                },
                status=200
            )