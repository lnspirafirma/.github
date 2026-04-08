# OpenAI Node SDK Haiku Example

## 1) Install SDK

```bash
npm install openai
```

## 2) Set your API key

```bash
export OPENAI_API_KEY="<your-api-key>"
```

## 3) Run

```bash
node haiku.mjs
```

This script uses the Chat Completions API with gpt-4o to generate a haiku.

> Security note: do not hardcode API keys in source files. If a key is exposed publicly, revoke and rotate it immediately.
