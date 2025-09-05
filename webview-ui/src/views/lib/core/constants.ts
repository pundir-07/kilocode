// ----------------------------------------------------------------------------------------------------------

export const ASSISTANT_DISPLAY_NAME = "CodeMate"
export const ASSISTANT_DP_URL = "https://drive.codemate.ai/c-icon-bw.png"

// ----------------------------------------------------------------------------------------------------------

export const USER_NAME_PLACEHOLDER = "You"
export const USER_DP_PLACEHOLDER = "https://mighty.tools/mockmind-api/content/human/128.jpg"

// ----------------------------------------------------------------------------------------------------------

export const SAMPLE_CHAT_MESSAGE_CODE = `
\`\`\`python
def greet_and_calculate():
    # Greeting
    name = input("What's your name? ")
    print(f"Hello, {name}! Welcome to programming!")
    
    # Basic calculations
    num1 = float(input("Enter first number: "))
    num2 = float(input("Enter second number: "))
    
    print(f"\\nSome basic calculations:")
    print(f"Addition: {num1} + {num2} = {num1 + num2}")
    print(f"Subtraction: {num1} - {num2} = {num1 - num2}")
    print(f"Multiplication: {num1} * {num2} = {num1 * num2}")
    print(f"Division: {num1} / {num2} = {num1 / num2}" if num2 != 0 else "Division by zero not allowed")

if __name__ == "__main__":
    greet_and_calculate()
\`\`\`
`

export const SAMPLE_CHAT_MESSAGE_CONTENT = `
$thought$
I need to help the user with coding, but they haven't provided any specific details yet. I'll start by asking them for their needs.
$/thought$

$answer$
Hello! I'd be happy to help you with coding, but could you please be more specific about what kind of code you're looking for? For example:
1. Do \`you\` want to learn a specific programming language?
   \`\`\`python
   print("Hello, world!")
   \`\`\`
2. Do you need help with a particular programming concept?
3. Are you working on a specific project?
   \`\`\`python
   print("Hello, world!")
   \`\`\`
4. Do you want to see some example programs?

Here's a simple example \`program\` in Python that prints a hello message and does some basic calculations:


${SAMPLE_CHAT_MESSAGE_CODE}

$FILE_PATH$
basic_calculator.py
$/FILE_PATH$

Let me know what specific type of code you're interested in, and I'll be happy to provide more targeted examples or help!
$/answer$
`

// ----------------------------------------------------------------------------------------------------------
