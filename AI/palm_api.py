from flask import Flask, request, jsonify
import google.generativeai as palm
from flask_cors import CORS
import os  # Import the os module
from dotenv import load_dotenv  # Import load_dotenv

load_dotenv()  # Load environment variables from .env file

app = Flask(__name__)
CORS(app)

# Set your Gemini 1.5 (PaLM) API key from environment variable
api_key = os.environ.get("PALM_API_KEY")
if not api_key:
    raise ValueError("PALM_API_KEY environment variable not set.")
palm.configure(api_key=api_key)


@app.route('/palm-chat', methods=['POST'])
def palm_chat():
    data = request.json
    prompt = data.get('prompt', '')
    model = palm.GenerativeModel(
        model_name='gemini-1.5-flash-latest',  # Explicitly set model_name
        system_instruction="You are a witty and humorous AI assistant. Your responses should be clever and entertaining, but still helpful.",
        generation_config={'temperature': 0.75}  # Temperature for witty/creative responses
    )
    response = model.generate_content(prompt)
    return jsonify({'response': response.text})


if __name__ == '__main__':
    app.run(port=5005)
