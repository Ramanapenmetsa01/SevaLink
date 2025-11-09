import axios from 'axios';
import API_CONFIG from '../config/api';

class VoiceService {
  constructor() {
    this.baseURL = `${API_CONFIG.baseURL}/api/chatbot`;
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor to add auth token
    axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('VoiceService: Adding token to request:', config.url);
        } else {
          console.warn('VoiceService: No token found for request:', config.url);
        }
        return config;
      },
      (error) => {
        console.error('VoiceService: Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    axios.interceptors.response.use(
      (response) => {
        console.log('VoiceService: Successful response from:', response.config.url);
        return response;
      },
      (error) => {
        console.error('VoiceService: Response error:', error.response?.status, error.response?.data);

        // Don't automatically handle auth errors here - let the calling component decide
        if (error.response?.status === 401) {
          console.warn('VoiceService: Authentication failed - token may be invalid');
          // Add a flag to indicate this is an auth error
          error.isAuthError = true;
        }

        // Add error type for better handling
        if (error.response?.status === 404) {
          error.isRouteNotFound = true;
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Upload and process audio file
   * @param {FormData} formData - Form data containing audio file and metadata
   * @returns {Promise<Object>} Processing result
   */
  async uploadAudio(formData) {
    try {
      // Ensure we have a valid token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('VoiceService: No token found in localStorage');
        throw new Error('Authentication required - no token found');
      }

      console.log('VoiceService: Uploading audio with token:', token.substring(0, 20) + '...');
      console.log('VoiceService: FormData contents:', Array.from(formData.entries()));

      // Note: We're using Web Speech API for transcription and backend for text processing
      console.log('VoiceService: Using hybrid approach - Web Speech API + Backend text processing');

      const response = await axios.post(`${this.baseURL}/voice`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`, // Explicitly set token
        },
        timeout: 60000, // 60 seconds timeout for audio processing
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`VoiceService: Upload Progress: ${percentCompleted}%`);
        }
      });

      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };

    } catch (error) {
      console.error('Audio upload error:', error);

      let errorMessage = 'Failed to process audio';
      let errorType = 'GENERAL_ERROR';

      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        errorMessage = error.response.data?.message || errorMessage;

        if (status === 401 || status === 403) {
          errorType = 'AUTHENTICATION_ERROR';
          errorMessage = 'Authentication failed. Please login again.';
        } else if (status === 400) {
          errorType = 'VALIDATION_ERROR';
          errorMessage = error.response.data?.errors?.join(', ') || errorMessage;
        } else if (status === 404) {
          errorType = 'ROUTE_NOT_FOUND';
          errorMessage = 'Voice processing service not available.';
        } else if (status >= 500) {
          errorType = 'SERVER_ERROR';
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.request) {
        // Network error
        errorType = 'NETWORK_ERROR';
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.code === 'ECONNABORTED') {
        // Timeout error
        errorType = 'TIMEOUT_ERROR';
        errorMessage = 'Request timeout. Please try again.';
      }

      return {
        success: false,
        error: errorMessage,
        errorType: errorType,
        details: error.response?.data
      };
    }
  }

  /**
   * Send text message (manual input)
   * @param {string} message - Text message
   * @param {string} language - Language code
   * @returns {Promise<Object>} Processing result
   */
  async sendTextMessage(message, language = 'en') {
    try {
      // Ensure we have a valid token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('VoiceService: No token found for text message');
        throw new Error('Authentication required - no token found');
      }

      console.log('VoiceService: Sending text message:', message);
      console.log('VoiceService: Using token:', token.substring(0, 20) + '...');
      console.log('VoiceService: Language:', language);

      const response = await axios.post(`${this.baseURL}/text`, {
        message,
        language
      }, {
        headers: {
          'Authorization': `Bearer ${token}`, // Explicitly set token
        }
      });

      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };

    } catch (error) {
      console.error('Text message error:', error);
      
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to process text message',
        details: error.response?.data
      };
    }
  }

  /**
   * Get user's voice requests
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Voice requests list
   */
  async getVoiceRequests(params = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/voice-requests`, {
        params
      });

      return {
        success: true,
        data: response.data.data,
        pagination: response.data.pagination
      };

    } catch (error) {
      console.error('Error fetching voice requests:', error);
      
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch voice requests',
        details: error.response?.data
      };
    }
  }

  /**
   * Get specific voice request details
   * @param {string} requestId - Voice request ID
   * @returns {Promise<Object>} Voice request details
   */
  async getVoiceRequest(requestId) {
    try {
      const response = await axios.get(`${this.baseURL}/voice-requests/${requestId}`);

      return {
        success: true,
        data: response.data.data
      };

    } catch (error) {
      console.error('Error fetching voice request:', error);
      
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch voice request',
        details: error.response?.data
      };
    }
  }

  /**
   * Validate audio file before upload
   * @param {File} file - Audio file
   * @returns {Object} Validation result
   */
  validateAudioFile(file) {
    const maxSize = 25 * 1024 * 1024; // 25MB
    const supportedTypes = [
      'audio/webm',
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/m4a'
    ];

    const validation = {
      isValid: true,
      errors: []
    };

    // Check file type
    if (!supportedTypes.includes(file.type)) {
      validation.isValid = false;
      validation.errors.push(`Unsupported file type: ${file.type}`);
    }

    // Check file size
    if (file.size > maxSize) {
      validation.isValid = false;
      validation.errors.push(`File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum limit of 25MB`);
    }

    // Check minimum size
    if (file.size < 1000) {
      validation.isValid = false;
      validation.errors.push('Audio file is too small');
    }

    return validation;
  }

  /**
   * Process voice using enhanced Web Speech API with better accuracy
   * @param {Blob} audioBlob - Audio blob from recording
   * @param {string} language - Target language
   * @returns {Promise<Object>} Transcription result
   */
  async processVoiceWithEnhancedSpeech(audioBlob, language = 'auto') {
    return new Promise((resolve) => {
      try {
        // Check browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          resolve({
            success: false,
            error: 'Speech recognition not supported in this browser'
          });
          return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        // Enhanced configuration for better accuracy
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 5; // Get more alternatives for better accuracy

        // Comprehensive language mapping with regional variants
        const languageMap = {
          'auto': 'en-US',
          'en': 'en-US',
          'hi': 'hi-IN',
          'te': 'te-IN',
          'ta': 'ta-IN',
          'bn': 'bn-IN',
          'gu': 'gu-IN',
          'kn': 'kn-IN',
          'ml': 'ml-IN',
          'mr': 'mr-IN',
          'or': 'or-IN',
          'pa': 'pa-IN',
          'ur': 'ur-IN',
          'as': 'as-IN',
          'ne': 'ne-NP'
        };

        recognition.lang = languageMap[language] || 'en-US';

        recognition.onresult = async (event) => {
          const results = event.results[0];
          const alternatives = [];

          // Collect all alternatives with confidence scores
          for (let i = 0; i < results.length; i++) {
            alternatives.push({
              transcript: results[i].transcript.trim(),
              confidence: results[i].confidence || 0.5
            });
          }

          // Sort by confidence and pick the best one
          alternatives.sort((a, b) => b.confidence - a.confidence);
          let bestResult = alternatives[0];

          console.log('VoiceService: Speech recognition results:', alternatives);

          // Apply post-processing for better accuracy
          bestResult.transcript = this.postProcessTranscript(bestResult.transcript, language);

          // If confidence is low, try to improve with context
          if (bestResult.confidence < 0.7 && alternatives.length > 1) {
            bestResult = this.selectBestAlternative(alternatives, language);
          }

          resolve({
            success: true,
            transcript: bestResult.transcript,
            confidence: bestResult.confidence,
            alternatives: alternatives,
            language: recognition.lang,
            method: 'web_speech_enhanced'
          });
        };

        recognition.onerror = (event) => {
          console.error('VoiceService: Speech recognition error:', event.error);

          let errorMessage = 'Speech recognition failed';
          switch (event.error) {
            case 'no-speech':
              errorMessage = 'No speech detected. Please try speaking clearly.';
              break;
            case 'audio-capture':
              errorMessage = 'Microphone not accessible. Please check permissions.';
              break;
            case 'not-allowed':
              errorMessage = 'Microphone permission denied. Please allow microphone access.';
              break;
            case 'network':
              errorMessage = 'Network error. Please check your internet connection.';
              break;
            case 'service-not-allowed':
              errorMessage = 'Speech recognition service not available.';
              break;
            default:
              errorMessage = `Speech recognition error: ${event.error}`;
          }

          resolve({
            success: false,
            error: errorMessage,
            method: 'web_speech_enhanced'
          });
        };

        recognition.onend = () => {
          console.log('VoiceService: Speech recognition ended');
        };

        // Start recognition
        recognition.start();

      } catch (error) {
        console.error('VoiceService: Web Speech API error:', error);
        resolve({
          success: false,
          error: error.message,
          method: 'web_speech_enhanced'
        });
      }
    });
  }

  /**
   * Post-process transcript for better accuracy
   * @param {string} transcript - Raw transcript
   * @param {string} language - Language code
   * @returns {string} Processed transcript
   */
  postProcessTranscript(transcript, language) {
    if (!transcript) return '';

    let processed = transcript;

    // Common corrections for Indian English
    if (language === 'en' || language === 'auto') {
      const corrections = {
        'complain': 'complaint',
        'complains': 'complaints',
        'seva link': 'SevaLink',
        'sewa link': 'SevaLink',
        'blood donation': 'blood donation',
        'blood donate': 'blood donation',
        'elder care': 'elderly care',
        'old people': 'elderly',
        'government': 'government',
        'goverment': 'government',
        'servise': 'service',
        'servis': 'service'
      };

      Object.entries(corrections).forEach(([wrong, correct]) => {
        const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
        processed = processed.replace(regex, correct);
      });
    }

    // Capitalize first letter and add proper punctuation
    processed = processed.charAt(0).toUpperCase() + processed.slice(1);
    if (!processed.match(/[.!?]$/)) {
      processed += '.';
    }

    return processed;
  }

  /**
   * Select best alternative based on context and common patterns
   * @param {Array} alternatives - Array of transcript alternatives
   * @param {string} language - Language code
   * @returns {Object} Best alternative
   */
  selectBestAlternative(alternatives, language) {
    // Keywords that indicate government service requests
    const serviceKeywords = [
      'complaint', 'complain', 'problem', 'issue', 'help', 'support',
      'blood', 'donation', 'donate', 'elderly', 'care', 'assistance',
      'government', 'service', 'request', 'need', 'want', 'require'
    ];

    let bestScore = 0;
    let bestAlternative = alternatives[0];

    alternatives.forEach(alt => {
      let score = alt.confidence;

      // Boost score if contains service-related keywords
      const words = alt.transcript.toLowerCase().split(' ');
      const keywordMatches = words.filter(word =>
        serviceKeywords.some(keyword => word.includes(keyword))
      ).length;

      score += keywordMatches * 0.1;

      // Prefer longer, more complete sentences
      if (alt.transcript.length > 10) {
        score += 0.05;
      }

      if (score > bestScore) {
        bestScore = score;
        bestAlternative = alt;
      }
    });

    return bestAlternative;
  }

  /**
   * Translate text using backend translation service
   * @param {string} text - Text to translate
   * @param {string} fromLang - Source language
   * @param {string} toLang - Target language
   * @returns {Promise<Object>} Translation result
   */
  async translateText(text, fromLang, toLang) {
    try {
      console.log('VoiceService: Translating text:', text, 'from', fromLang, 'to', toLang);

      const response = await axios.post(`${this.baseURL}/translate`, {
        text,
        fromLang,
        toLang
      });

      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };

    } catch (error) {
      console.error('Translation error:', error);

      let errorMessage = 'Translation failed';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        originalText: text
      };
    }
  }

  /**
   * Detect language of text using backend service
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Detection result
   */
  async detectLanguage(text) {
    try {
      console.log('VoiceService: Detecting language for text:', text);

      const response = await axios.post(`${this.baseURL}/detect-language`, {
        text
      });

      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };

    } catch (error) {
      console.error('Language detection error:', error);

      let errorMessage = 'Language detection failed';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        text: text
      };
    }
  }

  /**
   * Get audio duration from file
   * @param {File} file - Audio file
   * @returns {Promise<number>} Duration in seconds
   */
  getAudioDuration(file) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(objectUrl);
        resolve(audio.duration);
      });
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load audio file'));
      });
      
      audio.src = objectUrl;
    });
  }

  /**
   * Convert blob to file with proper name and type
   * @param {Blob} blob - Audio blob
   * @param {string} filename - File name
   * @param {string} mimeType - MIME type
   * @returns {File} File object
   */
  blobToFile(blob, filename = 'recording.webm', mimeType = 'audio/webm') {
    return new File([blob], filename, {
      type: mimeType,
      lastModified: Date.now()
    });
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format duration for display
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get supported languages
   * @returns {Array} List of supported languages
   */
  getSupportedLanguages() {
    return [
      { code: 'auto', name: 'Auto Detect', nativeName: 'Auto Detect' },
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
      { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' }
    ];
  }
}

// Create and export singleton instance
const voiceService = new VoiceService();
export default voiceService;
