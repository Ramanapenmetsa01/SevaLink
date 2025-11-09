import { useState } from 'react';
import { MicrophoneIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';

const SimpleVoiceInput = ({ onTranscriptionReceived, disabled = false, selectedLanguage = 'en' }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Simple speech recognition with better error handling
  const startSpeechRecognition = () => {
    return new Promise((resolve, reject) => {
      // Check browser support
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Speech recognition not supported in this browser'));
        return;
      }

      // Stop any existing recognition
      if (window.currentRecognition) {
        window.currentRecognition.stop();
        window.currentRecognition = null;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      // Store globally to prevent conflicts
      window.currentRecognition = recognition;

      // Configure recognition
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      // Set language
      const langMap = {
        'en': 'en-US',
        'hi': 'hi-IN',
        'te': 'te-IN',
        'auto': 'en-US'
      };
      recognition.lang = langMap[selectedLanguage] || 'en-US';

      console.log('🎤 Starting speech recognition with language:', recognition.lang);

      let hasResult = false;

      recognition.onstart = () => {
        console.log('🎤 Speech recognition started - SPEAK NOW!');
        setError('🎤 Listening... Please speak clearly!');
      };

      recognition.onresult = (event) => {
        if (hasResult) return; // Prevent multiple results
        hasResult = true;

        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        console.log('🎤 Speech recognized:', transcript, 'Confidence:', confidence);

        setError(null);
        window.currentRecognition = null;
        resolve(transcript);
      };

      recognition.onerror = (event) => {
        console.error('🎤 Speech recognition error:', event.error);
        setError(null);
        window.currentRecognition = null;

        if (event.error === 'aborted') {
          reject(new Error('Speech recognition was cancelled. Please try again.'));
        } else if (event.error === 'no-speech') {
          reject(new Error('No speech detected. Please speak clearly and try again.'));
        } else {
          reject(new Error(`Speech recognition failed: ${event.error}`));
        }
      };

      recognition.onend = () => {
        console.log('🎤 Speech recognition ended');
        setError(null);
        window.currentRecognition = null;

        if (!hasResult) {
          reject(new Error('No speech detected. Please try again.'));
        }
      };

      // Start recognition with a small delay to prevent conflicts
      setTimeout(() => {
        try {
          recognition.start();
        } catch (error) {
          console.error('🎤 Failed to start recognition:', error);
          reject(new Error('Failed to start speech recognition. Please try again.'));
        }
      }, 100);
    });
  };

  // LIVE VOICE TRANSCRIPTION - Click to speak
  const handleLiveVoiceInput = async () => {
    console.log('🎤 SimpleVoiceInput: Starting LIVE voice input...');
    
    setIsProcessing(true);
    setError(null);

    try {
      // Check authentication
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to use voice features');
        return;
      }

      console.log('✅ SimpleVoiceInput: Starting live speech recognition...');

      // Start speech recognition
      const transcribedText = await startSpeechRecognition();
      
      if (!transcribedText || transcribedText.trim().length === 0) {
        throw new Error('No speech detected. Please speak clearly and try again.');
      }

      console.log('🎤 SimpleVoiceInput: Live transcription:', transcribedText);

      // Fix language for API call
      const apiLanguage = selectedLanguage === 'auto' ? 'en' : selectedLanguage;
      console.log('🚀 SimpleVoiceInput: API language:', apiLanguage);

      // Direct API call to backend
      console.log('🚀 SimpleVoiceInput: Making API call...');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://sevalink-ttbd.onrender.com'}/api/chatbot/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: transcribedText,
          language: apiLanguage
        })
      });

      console.log('🚀 SimpleVoiceInput: Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🚀 SimpleVoiceInput: Error response:', errorText);
        throw new Error(`Backend error: ${response.status}`);
      }

      const result = await response.json();
      console.log('🚀 SimpleVoiceInput: Backend result:', result);

      if (result.success && onTranscriptionReceived) {
        console.log('✅ SimpleVoiceInput: SUCCESS!');
        
        const voiceData = {
          transcribedText: transcribedText,
          confidence: 0.95,
          detectedLanguage: selectedLanguage === 'auto' ? 'en' : selectedLanguage,
          method: 'real_voice_transcription',
          ...result.data
        };

        console.log('✅ SimpleVoiceInput: Calling onTranscriptionReceived...');
        onTranscriptionReceived(voiceData);
        
        console.log('✅ SimpleVoiceInput: Voice processing completed!');
        
      } else {
        throw new Error(result.message || 'Backend processing failed');
      }

    } catch (error) {
      console.error('❌ SimpleVoiceInput: Error:', error);
      
      let userErrorMessage = 'Voice processing failed. Please try again.';
      
      if (error.message?.includes('Speech recognition')) {
        userErrorMessage = 'Speech recognition failed. Please try again and speak clearly.';
      } else if (error.message?.includes('not supported')) {
        userErrorMessage = 'Speech recognition not supported in this browser.';
      } else if (error.message?.includes('Backend error')) {
        userErrorMessage = 'Backend service error. Please try again in a moment.';
      }
      
      setError(userErrorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Voice Input Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleLiveVoiceInput}
        disabled={disabled || isProcessing}
        className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg"
      >
        {isProcessing ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            <MicrophoneIcon className="w-5 h-5 mr-2" />
            🎤 Speak Now
          </>
        )}
      </motion.button>

      {/* Error Display */}
      {error && (
        <div className={`text-sm text-center px-4 py-2 rounded-lg ${
          error.includes('Listening')
            ? 'text-green-400 bg-green-900/30 border border-green-500/30'
            : 'text-red-400 bg-red-900/30 border border-red-500/30'
        }`}>
          {error}
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-400 text-center max-w-xs">
        🎤 **Speech → Text → AI Response → Voice**
        <br />
        Click and say: "I need O positive blood for my friend"
      </div>
    </div>
  );
};

export default SimpleVoiceInput;
