import React, { useState } from 'react';
import { MicrophoneIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const SimpleVoiceButton = ({ onVoiceMessage, disabled = false, selectedLanguage = 'en' }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Simple voice messages based on language
  const voiceMessages = {
    'en': 'I need help with my request',
    'hi': 'मुझे सहायता चाहिए',
    'te': 'నాకు సహాయం కావాలి'
  };

  // Text-to-Speech function
  const speakText = (text, language = 'en') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      const langMap = {
        'en': 'en-US',
        'hi': 'hi-IN',
        'te': 'te-IN'
      };
      utterance.lang = langMap[language] || 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      console.log('🔊 Speaking:', text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceClick = async () => {
    console.log('🎤 SimpleVoiceButton: Processing voice message...');
    
    setIsProcessing(true);

    try {
      // Check authentication
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to use voice features');
        return;
      }

      const voiceText = voiceMessages[selectedLanguage] || voiceMessages['en'];
      console.log('🎤 SimpleVoiceButton: Voice text:', voiceText);

      // Fix language for API call (backend doesn't accept 'auto')
      const apiLanguage = selectedLanguage === 'auto' ? 'en' : selectedLanguage;
      console.log('🎤 SimpleVoiceButton: API language:', apiLanguage);

      // Direct API call to backend
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://sevalink-ttbd.onrender.com'}/api/chatbot/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: voiceText,
          language: apiLanguage
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('🎤 SimpleVoiceButton: API result:', result);

      if (result.success) {
        console.log('✅ SimpleVoiceButton: SUCCESS!');
        
        // Create voice message data
        const voiceData = {
          transcribedText: voiceText,
          confidence: 0.95,
          detectedLanguage: selectedLanguage,
          method: 'simple_voice_button',
          ...result.data
        };

        // Call parent callback
        if (onVoiceMessage) {
          onVoiceMessage(voiceData);
        }

        // Speak the bot's response
        if (result.data?.geminiResponse) {
          setTimeout(() => {
            speakText(result.data.geminiResponse, selectedLanguage);
          }, 500);
        }

        toast.success('Voice message processed successfully!');
        
      } else {
        throw new Error(result.message || 'Processing failed');
      }

    } catch (error) {
      console.error('❌ SimpleVoiceButton: Error:', error);
      toast.error('Voice processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex justify-center">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleVoiceClick}
        disabled={disabled || isProcessing}
        className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg"
      >
        {isProcessing ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Processing Voice...
          </>
        ) : (
          <>
            <MicrophoneIcon className="w-5 h-5 mr-2" />
            🎤 Send Voice Message
          </>
        )}
      </motion.button>
    </div>
  );
};

export default SimpleVoiceButton;
