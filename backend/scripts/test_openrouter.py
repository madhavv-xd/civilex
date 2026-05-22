import json
import urllib.request
import urllib.error
import os

def test_openrouter():
    api_key = None
    for path in ["../.env", ".env", "c:/civilex/.env", "c:/civilex/backend/.env"]:
        if os.path.exists(path):
            with open(path, "r") as f:
                for line in f:
                    if line.startswith("OPENROUTER_API_KEY="):
                        key = line.split("=", 1)[1].strip()
                        if key and not key.startswith("sk-ant-your"):
                            api_key = key
                            print(f"Found key in {path} (starts with {api_key[:10]}...)")
                            break
        if api_key:
            break

    if not api_key:
        print("[ERROR] Could not find a valid OpenRouter API key in any .env file.")
        return

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/google/antigravity",
        "X-Title": "Antigravity Civ Sim Test"
    }
    
    data = {
        "model": "openai/gpt-oss-120b:free",
        "messages": [
            {"role": "user", "content": "Say hello!"}
        ]
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    print("Sending test request to OpenRouter...")
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            res_data = json.loads(res_body)
            print("[SUCCESS] Response received successfully!")
            print(json.dumps(res_data, indent=2))
    except urllib.error.HTTPError as e:
        print(f"[HTTP ERROR] {e.code}: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"[ERROR] Exception occurred: {str(e)}")

if __name__ == "__main__":
    test_openrouter()
