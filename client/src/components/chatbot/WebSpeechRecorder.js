import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MicrophoneIcon,
  StopIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline';

const WebSpeechRecorder = ({ onTranscriptionReceived, disabled = false, language = 'en' }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supportsSpeech, setSupportsSpeech] = useState(false);

  const recognitionRef = useRef(null);
  const speechSynthRef = useRef(null);

  // Language mapping for Web Speech API
  const languageMap = {
    'en': 'en-US',
    'hi': 'hi-IN',
    'te': 'te-IN',
    'auto': 'en-US'
  };

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;
    
    if (SpeechRecognition && speechSynthesis) {
      setSupportsSpeech(true);
      speechSynthRef.current = speechSynthesis;
      console.log('WebSpeechRecorder: Browser supports Web Speech API');
    } else {
      setSupportsSpeech(false);
      console.warn('WebSpeechRecorder: Browser does not support Web Speech API');
    }
  }, []);

  // Initialize speech recognition
  const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported in this browser');
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = languageMap[language] || 'en-US';

    recognition.onstart = () => {
      console.log('WebSpeechRecorder: Speech recognition started');
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let bestConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];

        if (result.isFinal) {
          // Get the best alternative from multiple options
          let bestAlternative = result[0];
          let bestScore = result[0].confidence || 0.5;

          // Check all alternatives if available
          for (let j = 1; j < result.length && j < 3; j++) {
            const alternative = result[j];
            const score = alternative.confidence || 0.5;

            // Boost score for service-related keywords
            const serviceBoost = containsServiceKeywords(alternative.transcript) ? 0.1 : 0;
            const adjustedScore = score + serviceBoost;

            if (adjustedScore > bestScore) {
              bestAlternative = alternative;
              bestScore = adjustedScore;
            }
          }

          finalTranscript += bestAlternative.transcript;
          bestConfidence = Math.max(bestConfidence, bestAlternative.confidence || 0.95);
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const fullTranscript = finalTranscript || interimTranscript;

      // Apply post-processing for better accuracy
      const processedTranscript = postProcessTranscript(fullTranscript, language);

      setTranscript(processedTranscript);
      setConfidence(bestConfidence || 0.95);
      console.log('WebSpeechRecorder: Processed transcript:', processedTranscript);
    };

    recognition.onerror = (event) => {
      console.error('WebSpeechRecorder: Speech recognition error:', event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('WebSpeechRecorder: Speech recognition ended');
      setIsListening(false);
    };

    return recognition;
  };

  const startListening = async () => {
    try {
      setError(null);
      setTranscript('');
      setConfidence(0);

      if (!supportsSpeech) {
        throw new Error('Speech recognition not supported in this browser');
      }

      recognitionRef.current = initializeSpeechRecognition();
      recognitionRef.current.start();
    } catch (error) {
      console.error('WebSpeechRecorder: Error starting speech recognition:', error);
      setError(error.message);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const sendTranscription = async () => {
    if (!transcript.trim()) {
      setError('No speech detected. Please try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('WebSpeechRecorder: Sending transcription:', transcript);
      
      const transcriptionData = {
        transcribedText: transcript,
        detectedLanguage: language,
        confidence: confidence,
        method: 'web-speech-api',
        timestamp: new Date().toISOString()
      };

      if (onTranscriptionReceived) {
        await onTranscriptionReceived(transcriptionData);
      }

      // Clear transcript after successful send
      setTranscript('');
      setConfidence(0);

    } catch (error) {
      console.error('WebSpeechRecorder: Error sending transcription:', error);
      setError('Failed to send transcription. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = (text, lang = language) => {
    if (!speechSynthRef.current || !text) return;

    // Stop any ongoing speech
    speechSynthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageMap[lang] || 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      console.log('WebSpeechRecorder: Started speaking');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      console.log('WebSpeechRecorder: Finished speaking');
    };

    utterance.onerror = (event) => {
      setIsSpeaking(false);
      console.error('WebSpeechRecorder: Speech synthesis error:', event.error);
    };

    speechSynthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setConfidence(0);
    setError(null);
  };

  // Helper function to check for service-related keywords
  const containsServiceKeywords = (text) => {
    const serviceKeywords = [
      'complaint', 'complain', 'problem', 'issue', 'help', 'support',
      'blood', 'donation', 'donate', 'elderly', 'care', 'assistance',
      'government', 'service', 'request', 'need', 'want', 'require',
      'emergency', 'urgent', 'hospital', 'medicine'
    ];

    const lowerText = text.toLowerCase();
    return serviceKeywords.some(keyword => lowerText.includes(keyword));
  };

  // Helper function to post-process transcript for better accuracy
  const postProcessTranscript = (transcript, language) => {
    if (!transcript) return '';

    let processed = transcript.trim();

    // Common corrections for Indian English and government services
    if (language === 'en' || language === 'auto') {
      const corrections = {
        'complain': 'complaint',
        'seva link': 'SevaLink',
        'sewa link': 'SevaLink',
        'blood donate': 'blood donation',
        'elder care': 'elderly care',
        'goverment': 'government',
        'servise': 'service',
        'servis': 'service',
        'medicin': 'medicine',
        'hosptial': 'hospital',
        'emergancy': 'emergency'
      };

      Object.entries(corrections).forEach(([wrong, correct]) => {
        const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
        processed = processed.replace(regex, correct);
      });
    }

    // Capitalize first letter and ensure proper punctuation
    if (processed.length > 0) {
      processed = processed.charAt(0).toUpperCase() + processed.slice(1);
      if (!processed.match(/[.!?]$/)) {
        processed += '.';
      }
    }

    return processed;
  };

  if (!supportsSpeech) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800 text-sm">
          🚫 Your browser doesn't support Web Speech API. Please use a modern browser like Chrome, Edge, or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className="web-speech-recorder bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">🎤 Voice Input</h3>
      
      {/* Language Display */}
      <div className="mb-4 text-sm text-gray-600">
        Language: <span className="font-medium">{languageMap[language]}</span>
      </div>

      {/* Recording Controls */}
      <div className="flex items-center justify-center space-x-4 mb-4">
        {!isListening && !transcript && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startListening}
            disabled={disabled || isProcessing}
            className="flex items-center justify-center w-16 h-16 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-full shadow-lg transition-colors duration-200"
          >
            <MicrophoneIcon className="w-8 h-8" />
          </motion.button>
        )}

        {isListening && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={stopListening}
            className="flex items-center justify-center w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg animate-pulse"
          >
            <StopIcon className="w-8 h-8" />
          </motion.button>
        )}

        {transcript && !isListening && (
          <div className="flex items-center space-x-3">
            <button
              onClick={sendTranscription}
              disabled={isProcessing}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200"
            >
              {isProcessing ? 'Sending...' : 'Send Message'}
            </button>
            
            <button
              onClick={clearTranscript}
              disabled={isProcessing}
              className="px-4 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Status Display */}
      <div className="text-center mb-4">
        {isListening && (
          <div className="text-blue-600 font-medium">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
              <span>🎤 Listening... Speak now</span>
            </div>
          </div>
        )}

        {transcript && !isListening && (
          <div className="text-green-600">
            <p className="font-medium">✅ Speech captured!</p>
            <p className="text-sm">Confidence: {Math.round(confidence * 100)}%</p>
          </div>
        )}

        {isProcessing && (
          <div className="text-blue-600 font-medium">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Processing...</span>
            </div>
          </div>
        )}

        {!isListening && !transcript && !isProcessing && (
          <p className="text-gray-500 text-sm">
            Click the microphone to start voice input
          </p>
        )}
      </div>

      {/* Transcript Display */}
      {transcript && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Transcript:</h4>
          <p className="text-gray-800">{transcript}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium text-red-800">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSpeechRecorder;
