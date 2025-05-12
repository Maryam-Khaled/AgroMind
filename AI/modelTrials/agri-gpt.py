# Python
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

tokenizer = AutoTokenizer.from_pretrained("Sicnarf01/agrigpt_expert")
model = AutoModelForSeq2SeqLM.from_pretrained("Sicnarf01/agrigpt_expert")


def get_response(query):
    inputs = tokenizer(query, return_tensors="pt")
    outputs = model.generate(**inputs, max_new_tokens=128)
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return response


if __name__ == "__main__":
    user_query = input("Ask AgriGPT: ")
    print(get_response(user_query))
