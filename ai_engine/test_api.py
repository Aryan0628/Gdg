import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load env variables
load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("❌ CRITICAL: GOOGLE_API_KEY is missing from .env file!")
else:
    print(f"✅ Found API Key: {api_key[:10]}... (hidden)")
    
    # Configure the SDK
    genai.configure(api_key=api_key)
    
    print("\n--- QUERYING GOOGLE SERVERS ---")
    try:
        # Ask Google: "What models can I use?"
        found_any = False
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"AVAILABLE MODEL: {m.name}")
                found_any = True
        
        if not found_any:
            print("⚠️ No content generation models found. Check your API Key permissions.")
            
    except Exception as e:
        print(f"❌ API CONNECTION ERROR: {e}")