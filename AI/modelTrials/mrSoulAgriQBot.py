from transformers import pipeline

# Load the AgriQBot pipeline
pipe = pipeline("text2text-generation", model="mrSoul7766/AgriQBot")


def get_response(prompt):
    result = pipe(f"Q: {prompt}", max_length=256)
    return result[0]['generated_text']


# Example usage
if __name__ == "__main__":
    user_query = input("Ask AgriQBot: ")
    print(get_response(user_query))
