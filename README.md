# Twelve - AI-Powered Habit & Journal Coach

Twelve is a mobile-first personal coaching app that converts free-form daily journals and simple yes/no toggles into an adaptive score, insight summaries, and forward-looking nudges.

## Features

- **Conversational Onboarding**: AI-powered interview to learn your goals and preferences
- **Daily Journal**: Free-form text entry to capture your thoughts and progress
- **Habit Tracking**: Simple yes/no toggles for tracking daily habits
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

4. (Optional) Set up Edge Functions for AI analysis:
   - Create edge functions for `analyzeEntry`, `sendReminder`, etc.
   - Set the `OPENAI_API_KEY` in your Edge Function secrets

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
├── contexts/              # React contexts
├── lib/                   # Utilities and types
│   ├── supabase.ts       # Supabase client
│   └── database.types.ts # TypeScript types
├── assets/               # Images and fonts
└── database-schema.sql   # Database schema
```

## Key Screens

### Authentication
- **Login**: Email/password sign in
- **Signup**: New user registration with email verification

### Onboarding
- Conversational interview to set up user preferences
- Collects: name, goals, calorie limit, workout frequency, grading style, timezone

### Home (Today)
- Daily journal entry input
- Yes/no habit toggles
- Submit button to analyze entry

### Results
- Animated score display (0-100)
- AI-generated reasoning
- Tomorrow's focus
- Recommendations

### Calendar (History)
- Month view with color-coded heatmap
- Tap days to view details
- Monthly average score

### Settings
- Profile management
- Habit configuration
- Data export (CSV)
- Notification preferences
- Sign out

## Placeholder Implementation

For the MVP, the app uses placeholder scoring instead of real AI analysis:
- Score is calculated based on completed habits percentage
- Generic encouraging messages are provided
- Real AI integration can be added via Supabase Edge Functions

## Future Enhancements

- Deep integrations (Whoop, MyFitnessPal, Apple Health)
- Automatic budget scoring from connected services
- Social accountability features
- Subscription model for premium features
- HIPAA-grade data export

## Contributing

This is an MVP implementation. Key areas for contribution:
- Edge Function implementation for real AI analysis
- Push notification scheduling
- Integration connectors
- UI/UX improvements

## License

[Add your license here]
