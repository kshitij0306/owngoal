import os
import google.generativeai as genai
from dotenv import load_dotenv

# 1. Load Environment Variables (Create a .env file with GEMINI_API_KEY=your_key)
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("No API Key found. Please set GEMINI_API_KEY in your .env file.")

# 2. Configure Gemini
genai.configure(api_key=api_key)

def get_semantic_visual_descriptors(user_input):
    """
    Uses Gemini Pro to translate abstract user vibes into concrete visual cues.
    """
    print(f"Gemini is reasoning about: '{user_input}'...")
    
    # We use 'gemini-pro' (or gemini-1.5-flash) for text generation
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    # THE SYSTEM PROMPT (The Semantic Translation Layer)
    prompt = f"""
    You are an expert AI Video Director. 
    Your goal is to translate a basketball viewer's abstract preference into SPECIFIC visual descriptions that a computer vision model can detect.
    
    User Preference: "{user_input}"
    
    Task:
    1. Identify the core interest (e.g., Emotion, Tactics, Crowd, Action).
    2. List 5-7 specific visual elements, objects, or actions that would appear on screen for this viewer.
    3. Focus on nouns and verbs (e.g., "Player dunking", "Coach shouting", "Mascot dancing").
    
    Return ONLY a single string of comma-separated phrases. Do not add conversational text.
    """
    
    response = model.generate_content(prompt)
    return response.text.strip()

def generate_user_embedding(text_descriptors):
    """
    Converts the optimized text into a mathematical vector embedding.
    """
    print(f"Vectorizing: {text_descriptors[:50]}...")
    
    # We use the text-embedding model
    # Note: 'models/text-embedding-004' is the current standard
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text_descriptors,
        task_type="retrieval_query"
    )
    
    return result['embedding']

# --- MAIN EXECUTION ---
if __name__ == "__main__":
    # Example: A user who loves the "Show" aspect of NBA
    user_vibe = "I love the intense moments, specifically the funny interactions, kiss cams, and mascots."
    
    try:
        # Step 1: Semantic Translation (Vibe -> Visuals)
        optimized_text = get_semantic_visual_descriptors(user_vibe)
        print(f"\n✨ Gemini Translated Vibe to Visuals:\n-> {optimized_text}\n")
        
        # Step 2: Generate Embedding
        vector = generate_user_embedding(optimized_text)
        
        print(f"Generated User Persona Embedding!")
        print(f"   Vector Dimensions: {len(vector)}")
        print(f"   First 5 values: {vector[:5]}")
        
        # This 'vector' is what you will compare against your Video Embeddings using Cosine Similarity
        
    except Exception as e:
        print(f"Error: {e}")