import React, { useState, useRef, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  PaperAirplaneIcon,
  MicrophoneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import VoiceRecorder from '../components/chatbot/VoiceRecorder';
import voiceService from '../utils/voiceService';
import toast from 'react-hot-toast';
import { AuthContext } from '../contexts/AuthContext';

const ChatAIPage = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Welcome to SevaLink AI Assistant! 🤖\n\nI can help you with:\n• Blood donation requests\n• Elder support services\n• Filing complaints\n• General inquiries\n\nYou can type your message or use voice recording in English, Hindi, or Telugu.',
      sender: 'bot',
      timestamp: new Date(),
      type: 'welcome'
    }
  ]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);


  const messagesEndRef = useRef(null);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !isAuthenticated) {
      console.log('No valid authentication found');
      // Don't redirect immediately, let the user see the page first
    }
  }, [isAuthenticated, navigate]);

  // Show loading or login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <SparklesIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access the AI Assistant</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isProcessing) return;

    const userMessage = {
      id: Date.now(),
      text: message.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsProcessing(true);

    // Add typing indicator
    const typingMessage = {
      id: Date.now() + 0.5,
      text: 'AI is thinking...',
      sender: 'bot',
      timestamp: new Date(),
      type: 'typing'
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      // Check authentication before sending
      const token = localStorage.getItem('token');
      console.log('ChatAI: Sending message, token exists:', !!token);
      console.log('ChatAI: User authenticated:', isAuthenticated);

      if (!token || !isAuthenticated) {
        throw new Error('AUTHENTICATION_REQUIRED');
      }

      console.log('ChatAI: Calling voiceService.sendTextMessage with:', userMessage.text);
      const result = await voiceService.sendTextMessage(userMessage.text);
      console.log('ChatAI: Received result:', result);

      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.type !== 'typing'));

      if (result.success) {
        // Prefer server-provided message if present (Gemini or fallback)
        const responseText = result.data.geminiResponse ||
          `Thank you for your message! I've received your ${result.data.category} request with ${result.data.priority} priority. Your request has been saved and will be reviewed by our volunteers soon.`;

        const botResponse = {
          id: Date.now() + 1,
          text: responseText,
          sender: 'bot',
          timestamp: new Date(),
          type: 'success',
          data: result.data
        };

        setMessages(prev => [...prev, botResponse]);

        // Show appropriate success message
        if (result.data.usingFallback) {
          toast.success('Request processed successfully! (Basic mode - add Gemini API key for AI features)');
        } else {
          toast.success('Request processed with AI assistance!');
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);

      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.type !== 'typing'));

      let errorMessage = '❌ **Error Processing Request**\n\nSorry, I encountered an error. Please try again or contact support.';

      if (error.message === 'AUTHENTICATION_REQUIRED' || error.response?.status === 401) {
        errorMessage = '🔐 **Authentication Required**\n\nYour session has expired. Redirecting to login...';
        toast.error('Session expired - redirecting to login');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else if (error.response?.status === 500) {
        errorMessage = '🔧 **Server Error**\n\nOur servers are experiencing issues. Please try again in a few minutes.';
      }

      const errorResponse = {
        id: Date.now() + 1,
        text: errorMessage,
        sender: 'bot',
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorResponse]);

      if (error.message !== 'AUTHENTICATION_REQUIRED') {
        toast.error('Failed to process request');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendAudio = async (formData) => {
    setIsProcessing(true);

    // Add processing message
    const processingMessage = {
      id: Date.now(),
      text: '🎤 Processing your voice message...',
      sender: 'bot',
      timestamp: new Date(),
      type: 'processing'
    };
    setMessages(prev => [...prev, processingMessage]);

    try {
      // Check authentication before sending
      const token = localStorage.getItem('token');
      console.log('ChatAI Voice: Token exists:', !!token);
      console.log('ChatAI Voice: User authenticated:', isAuthenticated);
      console.log('ChatAI Voice: User object:', user);

      if (!token || !isAuthenticated || !user) {
        throw new Error('AUTHENTICATION_REQUIRED');
      }

      console.log('ChatAI Voice: Calling voiceService.uploadAudio...');
      const result = await voiceService.uploadAudio(formData);
      console.log('ChatAI Voice: Upload result:', result);

      // Remove processing message
      setMessages(prev => prev.filter(msg => msg.type !== 'processing'));

      if (result.success) {
        // Create a temporary response while processing
        const tempResponse = {
          ...result.data,
          transcribedText: result.data.transcribedText || 'Voice received! Processing transcription...'
        };
        return { success: true, data: tempResponse };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error processing audio:', error);

      // Remove processing message
      setMessages(prev => prev.filter(msg => msg.type !== 'processing'));

      let errorMessage = '🎤 **Voice Processing Failed**\n\nCouldn\'t process your voice message. Please try again or type your message.';
      let shouldLogout = false;

      // Only logout for actual authentication errors, not general voice processing errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        errorMessage = '🔐 **Authentication Required**\n\nYour session has expired. Redirecting to login...';
        shouldLogout = true;
        toast.error('Session expired - redirecting to login');
      } else if (error.message?.includes('Route not found')) {
        errorMessage = '🔧 **Service Error**\n\nVoice processing service is temporarily unavailable. Please try typing your message instead.';
        toast.error('Voice service unavailable');
      } else if (error.message?.includes('Network Error') || error.code === 'NETWORK_ERROR') {
        errorMessage = '🌐 **Network Error**\n\nPlease check your internet connection and try again.';
        toast.error('Network error');
      } else {
        // Generic voice processing error - don't logout
        toast.error('Voice processing failed - please try again');
      }

      const errorResponse = {
        id: Date.now() + 1,
        text: errorMessage,
        sender: 'bot',
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorResponse]);

      // Only logout for authentication errors
      if (shouldLogout) {
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }

      // Don't throw the error to prevent further issues
      return { success: false, error: error.message };
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranscriptionReceived = (transcriptionData) => {

    // Add user's voice message
    const userMessage = {
      id: Date.now(),
      text: transcriptionData.transcribedText,
      sender: 'user',
      timestamp: new Date(),
      type: 'voice',
      metadata: {
        language: transcriptionData.detectedLanguage,
        confidence: transcriptionData.confidence,
        category: transcriptionData.category,
        priority: transcriptionData.priority,
        isMock: transcriptionData.isMock
      }
    };

    setMessages(prev => [...prev, userMessage]);

    // Build bot response exactly like text input flow
    const categoryDisplay = transcriptionData.category === 'blood_request' ? 'Blood Request' :
                           transcriptionData.category === 'elder_support' ? 'Elder Support' :
                           transcriptionData.category === 'complaint' ? 'Complaint' :
                           (transcriptionData.category || '').replace('_', ' ').toUpperCase();

    const responseText = transcriptionData.geminiResponse ||
      `Thank you for your message! I've received your ${transcriptionData.category} request with ${transcriptionData.priority} priority. Your request has been saved and will be reviewed by our volunteers soon.`;

    const botResponse = {
      id: Date.now() + 1,
      text: responseText,
      sender: 'bot',
      timestamp: new Date(),
      type: 'success',
      data: transcriptionData
    };

    setMessages(prev => [...prev, botResponse]);

    // Speak the bot response
    speakResponse(responseText, transcriptionData.detectedLanguage || 'en');

    toast.success('Request processed!');
  };

  const getLanguageName = (code) => {
    const languages = {
      'en': 'English',
      'hi': 'Hindi (हिंदी)',
      'te': 'Telugu (తెలుగు)'
    };
    return languages[code] || 'Unknown';
  };

  const toggleVoiceRecorder = () => {
    setShowVoiceRecorder(!showVoiceRecorder);
  };



  // Speak response using Web Speech API
  const speakResponse = (text, language = 'en') => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      window.speechSynthesis.speak(utterance);
    }
  };

  const getMessageIcon = (type) => {
    switch (type) {
      case 'success':
      case 'voice_success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'welcome':
        return <SparklesIcon className="w-5 h-5 text-blue-500" />;
      case 'voice':
        return <MicrophoneIcon className="w-5 h-5 text-purple-500" />;
      default:
        return <ChatBubbleLeftRightIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="h-full max-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-hero-pattern opacity-5 pointer-events-none"></div>

      {/* Enhanced Header */}
      <div className="relative bg-gradient-to-r from-slate-900/95 via-purple-900/95 to-slate-900/95 backdrop-blur-lg border-b border-purple-500/30 shadow-2xl">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20">
              <SparklesIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                AI Assistant
              </h1>
              <p className="text-gray-300 text-sm flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span>🎤 Voice-enabled • 🌐 Multilingual</span>
              </p>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="hidden sm:flex items-center space-x-3">
            <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
              <span className="text-green-400 text-xs font-medium">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative messages-container pb-4 max-h-[calc(100vh-200px)]">
        {/* Custom Scrollbar Styling */}
        <style jsx>{`
          .messages-container::-webkit-scrollbar {
            width: 6px;
          }
          .messages-container::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
          }
          .messages-container::-webkit-scrollbar-thumb {
            background: rgba(139, 92, 246, 0.5);
            border-radius: 3px;
          }
          .messages-container::-webkit-scrollbar-thumb:hover {
            background: rgba(139, 92, 246, 0.7);
          }
          .input-area {
            z-index: 50;
            position: relative;
          }
        `}</style>

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl px-5 py-3 rounded-xl border ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white border-blue-500/50'
                  : msg.type === 'error'
                  ? 'bg-red-800/90 text-red-100 border-red-600/50'
                  : msg.type === 'success' || msg.type === 'voice_success'
                  ? 'bg-green-800/90 text-green-100 border-green-600/50'
                  : msg.type === 'processing' || msg.type === 'typing'
                  ? 'bg-blue-800/90 text-blue-100 border-blue-600/50'
                  : 'bg-gray-700/90 text-gray-100 border-gray-600/50'
              }`}
            >
              {msg.sender === 'bot' && (
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                    {getMessageIcon(msg.type)}
                  </div>
                  <span className="text-sm font-medium text-gray-300">AI Assistant</span>
                  {msg.type === 'processing' && (
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              )}

              <div className="text-sm leading-relaxed">
                {msg.type === 'typing' || msg.type === 'processing' ? (
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="font-medium">{msg.text}</span>
                  </div>
                ) : (
                  <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                )}

                {/* Voice message metadata */}
                {msg.type === 'voice' && msg.metadata && (
                  <div className="mt-2 p-2 bg-gray-800/50 rounded border border-gray-600/50">
                    <div className="flex items-center space-x-3 text-xs text-gray-400">
                      <span>🌐 {getLanguageName(msg.metadata.language)}</span>
                      <span>📊 {Math.round(msg.metadata.confidence * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500 mt-2">
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Recorder */}
      {showVoiceRecorder && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-gray-600/50 bg-gray-800/50"
        >
          <div className="p-4">
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
              <div className="flex items-center space-x-2 mb-3">
                <MicrophoneIcon className="w-5 h-5 text-purple-400" />
                <span className="text-white font-medium">Voice Input</span>
              </div>

              <VoiceRecorder
                onSendAudio={handleSendAudio}
                onTranscriptionReceived={handleTranscriptionReceived}
                disabled={isProcessing}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Input Area - Fixed at bottom */}
      <div className="input-area sticky bottom-0 p-4 border-t border-gray-600/50 bg-gray-800/95 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isProcessing && handleSendMessage()}
              onFocus={(e) => console.log('Input focused')}
              onClick={(e) => console.log('Input clicked')}
              placeholder="Type your message here..."
              disabled={isProcessing}
              className="w-full px-4 py-3 bg-gray-700/80 border border-gray-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-700/30 disabled:cursor-not-allowed text-white placeholder-gray-400 transition-all duration-200 cursor-text chat-input-glow"
              autoComplete="off"
              style={{ pointerEvents: 'auto', zIndex: 100 }}
            />
          </div>

          <button
            onClick={toggleVoiceRecorder}
            disabled={isProcessing}
            className={`p-3 rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 ${
              showVoiceRecorder
                ? 'text-purple-400 bg-purple-900/50 border-purple-500/50 shadow-lg shadow-purple-500/20'
                : 'text-gray-400 hover:text-purple-400 hover:bg-gray-700/50 border-gray-600/50 hover:border-purple-500/30'
            } disabled:text-gray-600 disabled:cursor-not-allowed disabled:hover:scale-100`}
            title={showVoiceRecorder ? 'Hide voice recorder' : 'Show voice recorder'}
          >
            <MicrophoneIcon className="w-5 h-5" />
          </button>

          <button
            onClick={handleSendMessage}
            disabled={isProcessing || !message.trim()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center space-x-2 font-medium transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:hover:scale-100"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <PaperAirplaneIcon className="w-4 h-4" />
            )}
            <span>Send</span>
          </button>
        </div>


      </div>
    </div>
  );
};

export default ChatAIPage;
