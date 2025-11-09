# AI Chatbot Integration Setup Guide

## Overview
Your SevaLink project now includes an enhanced AI chatbot with voice recording capabilities, multi-language support (English, Hindi, Telugu), and intelligent request categorization using Gemini AI.

## Features Added
- 🎤 **Voice Recording**: Record voice messages in English, Hindi, and Telugu
- 🤖 **AI Processing**: Gemini AI for intelligent response generation
- 📝 **Text Chat**: Enhanced text messaging with smart categorization
- 🗣️ **Speech-to-Text**: Hugging Face Whisper API integration
- 💾 **Chat History**: All conversations are saved to database
- 🏷️ **Auto-Categorization**: Automatically categorizes requests (blood_request, elder_support, complaint, etc.)

## Required API Keys

### 1. Gemini AI API Key (Required for AI responses)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key
5. Update your `.env` file:
   ```
   GEMINI_API_KEY=your-actual-gemini-api-key-here
   ```

### 2. Hugging Face Token (Required for voice transcription)
1. Go to [Hugging Face](https://huggingface.co/)
2. Create an account or sign in
3. Go to Settings → Access Tokens
4. Click "New token" → "Read" access is sufficient
5. Copy the generated token
6. Update your `.env` file:
   ```
   HUGGING_FACE_TOKEN=your-actual-hugging-face-token-here
   ```

## Environment Variables Added

The following new environment variables have been added to your `.env` file:

```env
# Gemini AI API
GEMINI_API_KEY=your-gemini-api-key-here

# Hugging Face API (for voice transcription)
HUGGING_FACE_TOKEN=your-hugging-face-token-here

# Voice Features Configuration
ENABLE_VOICE_RESPONSES=true
```

## Files Added/Modified

### Backend Files Added:
- `server/utils/whisperService.js` - Handles speech-to-text conversion
- `server/utils/geminiVoiceService.js` - AI processing and response generation
- `server/middleware/voiceValidation.js` - Voice request validation
- `server/models/Chat.js` - Chat message storage
- `server/models/VoiceRequest.js` - Voice request tracking

### Backend Files Modified:
- `server/routes/chatbot.js` - Enhanced with voice and AI processing

### Frontend Files Added:
- `client/src/components/chatbot/VoiceRecorder.js` - Voice recording component
- `client/src/utils/voiceService.js` - API service for voice features

### Frontend Files Modified:
- `client/src/components/chatbot/ChatBot.js` - Enhanced with voice support

### Dependencies Added:
**Backend:**
- `@google/generative-ai` - Gemini AI integration
- `form-data` - File upload handling
- `node-fetch` - HTTP requests

**Frontend:**
- `react-media-recorder` - Voice recording functionality

## How It Works

### Text Messages:
1. User types a message
2. Message is sent to Gemini AI for processing
3. AI categorizes the request and generates a response
4. If the category requires it (blood_request, elder_support, complaint), a Request is automatically created
5. Chat history is saved to database

### Voice Messages:
1. User clicks the microphone button to show voice recorder
2. User records their voice message
3. Audio is processed using browser's Web Speech API or Hugging Face Whisper
4. Transcribed text is sent to Gemini AI for processing
5. Same flow as text messages continues

### Supported Languages:
- **English** (en)
- **Hindi** (hi) - हिंदी
- **Telugu** (te) - తెలుగు

## Testing Without API Keys

The system includes fallback modes:

1. **Without Gemini API Key**: Uses local categorization and predefined responses
2. **Without Hugging Face Token**: Uses browser's Web Speech API or mock transcription
3. **Without Authentication**: Shows login prompt but allows basic testing

## Request Categories

The AI automatically categorizes messages into:
- `blood_request` - Blood donation needs, transfusion requests
- `elder_support` - Help for elderly citizens, medicine, groceries
- `complaint` - Infrastructure issues, civic problems
- `emergency` - Urgent situations requiring immediate attention
- `general_inquiry` - General questions and information requests

## Priority Levels

Messages are assigned priority levels:
- `urgent` - Emergency situations, critical needs
- `high` - Important but not life-threatening
- `medium` - Standard requests (default)
- `low` - General inquiries, non-urgent matters

## Usage Instructions

1. **For Users**: 
   - Click the chat button in the bottom-right corner
   - Type messages or click the microphone for voice input
   - Select language for voice recording
   - All conversations are saved automatically

2. **For Volunteers**:
   - Voice requests appear in the volunteer dashboard
   - Chat messages that create requests are linked to the original chat
   - Full conversation history is available

## Troubleshooting

### Voice Recording Issues:
- Ensure microphone permissions are granted
- Check browser compatibility (Chrome/Edge recommended)
- Verify HTTPS connection for production

### AI Response Issues:
- Verify Gemini API key is correct and has quota
- Check server logs for detailed error messages
- Fallback responses will be used if AI fails

### Database Issues:
- Ensure MongoDB connection is working
- Check that new models (Chat, VoiceRequest) are properly indexed

## Next Steps

1. **Get API Keys**: Follow the instructions above to get your Gemini and Hugging Face API keys
2. **Update Environment**: Add the API keys to your `.env` file
3. **Test the System**: Start both server and client, test voice and text features
4. **Monitor Usage**: Check server logs and database for chat/voice request storage

## Support

The enhanced chatbot maintains 100% compatibility with your existing project. All original functionality remains unchanged, and the new features are additive only.

For issues or questions, check the server console logs which provide detailed information about the AI processing pipeline.
