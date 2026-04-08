import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("Please set OPENAI_API_KEY before running this script.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

const response = await openai.responses.create({
  model: "gpt-5-nano",
  input: "write a haiku about ai",
  store: true,
});

console.log(response.output_text);
