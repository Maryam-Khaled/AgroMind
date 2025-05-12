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
        'gemini-1.5-flash-latest')  # Changed model name
    response = model.generate_content(prompt)
    return jsonify({'response': response.text})


if __name__ == '__main__':
    app.run(port=5005)
