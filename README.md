# Twelve - AI-Powered Habit & Journal Coach

Twelve is a mobile-first personal coaching app that converts free-form daily journals and simple yes/no toggles into an adaptive score, insight summaries, and forward-looking nudges.

## Features

- **Conversational Onboarding**: AI-powered interview to learn your goals and preferences
- **Conversational Journal**: Free-form chat interface with intelligent parsing and real-time feedback
- **Quick Input Buttons**: Fast entry for common metrics (weight, calories, protein, sleep, stress)
- **Smart Field Detection**: AI automatically extracts structured data from natural language
- **Daily Habit Tracking**: Simple yes/no toggles for tracking daily habits
- **AI Scoring**: Intelligent daily scores based on your journal and habits
- **Calendar Heatmap**: Visual representation of your progress over time
- **Data Export**: Export your data as CSV for external analysis
- **Push Notifications**: Timely reminders to keep you on track

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **AI**: OpenAI GPT-4 (via Edge Functions)
- **UI**: iOS-inspired minimal design with Reanimated animations

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase account
- OpenAI API key (for AI features)

### Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd twelve
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_USE_EDGE_FUNCTIONS=false # Set to true when edge functions are deployed
```

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the database schema:
   - Go to the SQL Editor in your Supabase dashboard
   - Copy the contents of `database-schema.sql`
   - Run the SQL to create all tables and policies

3. Enable Email Authentication:
   - Go to Authentication > Providers
   - Enable Email provider

4. Set up Edge Functions (for AI analysis):
   - Install Supabase CLI: `npm install -g supabase`
   - Link your project: `supabase link --project-ref your-project-ref`
   - Set the `OPENAI_API_KEY` in your Edge Function secrets
   - Deploy: `npm run edge:deploy`

### Running the App

```bash
# Start the development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

## Project Structure

```
twelve/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main app tabs
│   └── onboarding.tsx     # Onboarding flow
├── components/            # Reusable components
│   └── ConversationalJournal.tsx  # Chat-based journal interface
├── contexts/              # React contexts
├── lib/                   # Utilities and types
│   ├── api.ts            # API helper functions
│   ├── supabase.ts       # Supabase client
│   └── database.types.ts # TypeScript types
├── supabase/             # Supabase functions
│   └── functions/        # Edge functions
│       └── analyzeEntry/ # AI analysis function
├── assets/               # Images and fonts
└── database-schema.sql   # Database schema
```

## Key Features Implementation

### Conversational Journal

The app features a chat-like interface where users can naturally describe their day. The AI assistant:
- Parses natural language to extract structured data
- Provides real-time feedback and encouragement
- Asks follow-up questions for missing information
- Offers contextual tips based on user goals

### Quick Input System

- Horizontal scrollable buttons for common metrics
- Tap to quickly input numerical values
- Visual feedback showing current values
- Seamless integration with conversational flow

### AI Analysis

When edge functions are enabled:
- GPT-4 analyzes the complete journal entry
- Considers user goals and historical data
- Provides personalized scoring and recommendations
- Generates forward-looking focus areas

## Data Model

The app tracks:
- **Core Metrics**: Weight, calories, protein, sleep hours, stress level
- **Meals**: Time and description of each meal
- **Exercise**: Resistance training, cardio, and steps
- **Habits**: Custom yes/no habits defined by the user
- **Notes**: Free-form additional observations

## Placeholder vs Production Mode

The app can run in two modes:
1. **Placeholder Mode** (default): Uses local scoring algorithms
2. **Production Mode**: Uses GPT-4 via edge functions for intelligent analysis

Toggle between modes by setting `EXPO_PUBLIC_USE_EDGE_FUNCTIONS` in your `.env` file.

## Future Enhancements

- Deep integrations (Whoop, MyFitnessPal, Apple Health)
- Automatic budget scoring from connected services
- Voice input for journal entries
- Social accountability features
- Advanced analytics and trends
- Subscription model for premium features
- HIPAA-grade data export

## Contributing

This is an MVP implementation. Key areas for contribution:
- Additional integration connectors
- Enhanced natural language parsing
- UI/UX improvements
- Performance optimizations
- Additional edge functions

## License

[Add your license here]
