import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import torch
from transformers import AutoImageProcessor, AutoModelForImageClassification

app = Flask(__name__)
CORS(app)

# Load new model and processor: wambugu71/crop_leaf_diseases_vit
MODEL_NAME = "wambugu71/crop_leaf_diseases_vit"
try:
    processor = AutoImageProcessor.from_pretrained(MODEL_NAME)
    model = AutoModelForImageClassification.from_pretrained(
        MODEL_NAME, ignore_mismatched_sizes=True)
    print(f"Successfully loaded model and processor for {MODEL_NAME}")
    print("Model config id2label:", model.config.id2label)  # Newly added line
except Exception as e:
    print(f"Error loading model {MODEL_NAME}: {e}")
    processor = None
    model = None

# KNOWN_PLANT_MAPPING based on wambugu71/crop_leaf_diseases_vit model card
KNOWN_PLANT_MAPPING = {
    "corn": "Corn",
    "maize": "Corn",
    "potato": "Potato",
    "rice": "Rice",
    "wheat": "Wheat"
}
MODEL_PLANT_PREFIXES = sorted(
    list(set(KNOWN_PLANT_MAPPING.values())), key=len, reverse=True)

# advice_dict for wambugu71/crop_leaf_diseases_vit
advice_dict = {
    'Corn___Common_Rust': "Apply appropriate fungicides. Resistant varieties can help manage Common Rust in Corn.",
    'Corn___Gray_Leaf_Spot': "Use resistant hybrids and consider fungicide application for Gray Leaf Spot in Corn. Crop rotation can also help.",
    'Corn___Leaf_Blight': "Several types of leaf blight affect corn. Fungicides and resistant varieties are key. (Specify if Northern, Southern, etc. if model distinguishes)",
    'Corn___Healthy': "Your corn plants appear healthy. Continue good crop management practices.",
    'Potato___Early_Blight': "Apply fungicides preventatively or at first sign. Rotate crops and remove infected debris for Potato Early Blight.",
    'Potato___Late_Blight': "Late Blight is aggressive. Use resistant varieties, ensure good air circulation, and apply fungicides proactively.",
    'Potato___Healthy': "Your potato plants appear healthy. Monitor for pests and diseases.",
    'Rice___Brown_Spot': "Ensure balanced nutrition, manage water properly. Fungicides can be used for Rice Brown Spot.",
    'Rice___Leaf_Blast': "Use resistant varieties. Water management and fungicide application are important for Rice Leaf Blast.",
    'Rice___Healthy': "Your rice plants appear healthy.",
    'Wheat___Brown_Rust': "Use resistant varieties. Fungicides can be effective for Wheat Brown Rust (Leaf Rust).",
    'Wheat___Yellow_Rust': "Use resistant varieties. Early fungicide application is crucial for Wheat Yellow Rust (Stripe Rust).",
    'Wheat___Healthy': "Your wheat crop appears healthy."
}


@app.route('/detect-disease', methods=['POST'])
def detect_disease():
    if not model or not processor:
        return jsonify({'error': 'Model not loaded. Please check server logs.'}), 500

    if 'image' not in request.files or 'plant' not in request.form:
        return jsonify({'error': 'Image and plant name are required.'}), 400

    file = request.files['image']
    user_plant_input_raw = request.form['plant'].strip()
    user_plant_input_lower = user_plant_input_raw.lower()

    try:
        img = Image.open(file.stream).convert('RGB')
    except Exception as e:
        return jsonify({'error': f"Invalid image file: {e}"}), 400

    inputs = processor(images=img, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        pred_idx = logits.argmax(-1).item()
        model_full_label = model.config.id2label[pred_idx]
        confidence = torch.softmax(logits, dim=-1)[0, pred_idx].item()

    canonical_model_plant_name_for_user_input = KNOWN_PLANT_MAPPING.get(
        user_plant_input_lower)
    if not canonical_model_plant_name_for_user_input:
        recognized_plants = ", ".join(sorted(list(KNOWN_PLANT_MAPPING.keys())))
        return jsonify({
            'confirmation': False,
            'message': f"The plant name '{user_plant_input_raw}' is not one the system is trained to specifically analyze with this model. This model supports: {recognized_plants}."
        })

    detected_model_plant_actual = None
    detected_model_disease_part = None
    for prefix in MODEL_PLANT_PREFIXES:
        if model_full_label.startswith(prefix + "___"):
            detected_model_plant_actual = prefix
            detected_model_disease_part = model_full_label[len(
                prefix) + 3:].strip()
            break

    if not detected_model_plant_actual or not detected_model_disease_part:
        return jsonify({
            'confirmation': False,
            'message': f"Model prediction format unexpected. Predicted: '{model_full_label}'. Could not determine plant/disease.",
            'confidence': confidence
        })

    if canonical_model_plant_name_for_user_input != detected_model_plant_actual:
        user_plant_display = user_plant_input_raw.title()
        model_plant_display = detected_model_plant_actual.replace('_', ' ')
        model_disease_display = detected_model_disease_part.replace('_', ' ')
        return jsonify({
            'confirmation': False,
            'message': f"Image for '{user_plant_display}' identified by model as '{model_plant_display}' (disease: {model_disease_display}). Please upload correct image for '{user_plant_display}'.",
            'confidence': confidence
        })

    disease_name_to_display = detected_model_disease_part.replace('_', ' ')

    if detected_model_disease_part.lower() == "healthy":
        return jsonify({
            'confirmation': True,
            'healthy': True,
            'message': f"Your {user_plant_input_raw.title()} ({detected_model_plant_actual.replace('_', ' ')}) appears healthy!",
            'confidence': confidence
        })
    else:
        advice = advice_dict.get(
            model_full_label, "Specific treatment advice not found. Please consult a local agricultural expert.")
        return jsonify({
            'confirmation': True,
            'healthy': False,
            'disease': disease_name_to_display,
            'confidence': confidence,
            'advice': advice
        })


if __name__ == '__main__':
    if model and processor:
        app.run(port=5006)
    else:
        print("API could not start because the model failed to load.")
