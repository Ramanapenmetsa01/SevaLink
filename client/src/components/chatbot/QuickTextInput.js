import { useState } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';

const QuickTextInput = ({ onTextSubmit, disabled = false }) => {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const quickTexts = [
    "I need O positive blood for my friend",
    "I need help with my request",
    "I want to donate blood",
    "I have a complaint about service"
  ];

  const handleQuickText = async (quickText) => {
    setText(quickText);
    await handleSubmit(quickText);
  };

  const handleSubmit = async (textToSubmit = text) => {
    if (!textToSubmit.trim()) return;

    setIsProcessing(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to use this feature');
        return;
      }

      console.log('📝 QuickTextInput: Sending text:', textToSubmit);

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://sevalink-ttbd.onrender.com'}/api/chatbot/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: textToSubmit,
          language: 'en'
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('📝 QuickTextInput: API result:', result);

      if (result.success && onTextSubmit) {
        const textData = {
          transcribedText: textToSubmit,
          confidence: 1.0,
          detectedLanguage: 'en',
          method: 'quick_text_input',
          ...result.data
        };

        onTextSubmit(textData);
        setText('');
      }

    } catch (error) {
      console.error('❌ QuickTextInput: Error:', error);
      alert('Failed to process text. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col space-y-3">
      {/* Quick Text Buttons */}
      <div className="grid grid-cols-1 gap-2">
        {quickTexts.map((quickText, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleQuickText(quickText)}
            disabled={disabled || isProcessing}
            className="text-left px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg transition-all duration-200 text-sm border border-gray-600/30 hover:border-blue-500/50"
          >
            💬 {quickText}
          </motion.button>
        ))}
      </div>

      {/* Custom Text Input */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Or type your own message..."
          disabled={disabled || isProcessing}
          className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-700/50 disabled:cursor-not-allowed text-white placeholder-gray-400 text-sm"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSubmit()}
          disabled={disabled || isProcessing || !text.trim()}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors duration-200"
        >
          {isProcessing ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <PaperAirplaneIcon className="w-4 h-4" />
          )}
        </motion.button>
      </div>

      <div className="text-xs text-gray-400 text-center">
        📝 **Text → AI Response → Voice**
        <br />
        Quick buttons or type your own message
      </div>
    </div>
  );
};

export default QuickTextInput;
