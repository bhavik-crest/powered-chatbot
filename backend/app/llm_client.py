# llm_client.py

import requests
import os

def call_openrouter(messages):
    api_key = os.getenv("OPENROUTER_API_KEY")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "http://localhost",
        "X-Title": "llm-chatbot"
    }
    payload = {
        "model": os.getenv("LLM_MODEL", "mistralai/mistral-7b-instruct"),
        "messages": messages
    }
    url = "https://openrouter.ai/api/v1/chat/completions"
    response = requests.post(url, headers=headers, json=payload)
    response_json = response.json()

    print("OpenRouter response:", response_json)  # Debugging log

    if "choices" in response_json and len(response_json["choices"]) > 0:
        content = response_json["choices"][0].get("message", {}).get("content", "")
        return content
    elif "error" in response_json:
        raise Exception(f"LLM API Error: {response_json['error']}")
    else:
        raise Exception(f"Unexpected response format: {response_json}")