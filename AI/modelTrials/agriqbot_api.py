from flask import Flask, request, jsonify
from transformers import pipeline
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

pipe = pipeline("text2text-generation", model="mrSoul7766/AgriQBot")


@app.route('/agriqbot', methods=['POST'])
def agriqbot():
    data = request.json
    prompt = data.get('prompt', '')
    result = pipe(f"Q: {prompt}", max_length=256)
    return jsonify({'response': result[0]['generated_text']})


if __name__ == '__main__':
    app.run(port=5002)
