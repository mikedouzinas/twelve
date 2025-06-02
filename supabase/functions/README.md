# Supabase Edge Functions

This directory contains the edge functions for the Twelve app.

## Functions

### analyzeEntry

Analyzes journal entries using OpenAI GPT-4 to provide:
- Daily score (0-1)
- Reasoning for the score
- Focus for tomorrow
- Emotion summary
- Recommendations

## Setup

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Link your project:
```bash
supabase link --project-ref your-project-ref
```

3. Set up environment variables in Supabase Dashboard:
   - Go to Project Settings > Edge Functions
   - Add the following secrets:
     - `OPENAI_API_KEY`: Your OpenAI API key

## Local Development

To run the function locally:
```bash
npm run edge:serve
```

The function will be available at `http://localhost:54321/functions/v1/analyzeEntry`

## Deployment

To deploy the function:
```bash
npm run edge:deploy
```

Or deploy all functions:
```bash
npm run edge:deploy:all
```

## Testing

You can test the function with curl:

```bash
curl -X POST http://localhost:54321/functions/v1/analyzeEntry \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "journal": {
      "date": "2024-01-15",
      "calories": 1650,
      "protein_g": 150,
      "sleep_h": 7.5,
      "exercise": {
        "resistance": "Push day - bench press, shoulders",
        "steps": 8500
      }
    },
    "userGoals": {
      "calorieLimit": 1600,
      "proteinGoal": 140
    }
  }'
```

## Environment Variables

In the app, set `EXPO_PUBLIC_USE_EDGE_FUNCTIONS=true` in your `.env` file to enable edge function usage. 