# SWAP THIS FUNCTION if you are using TwelveLabs for video
import requests

def generate_twelvelabs_embedding(text_descriptors):
    url = "https://api.twelvelabs.io/v1.2/embed"
    headers = {
        "x-api-key": "YOUR_TWELVELABS_KEY"
    }
    data = {
        "engine_name": "marengo2.6", # Must match the engine used for video!
        "text": text_descriptors
    }
    
    response = requests.post(url, json=data, headers=headers)
    return response.json()['embedding']