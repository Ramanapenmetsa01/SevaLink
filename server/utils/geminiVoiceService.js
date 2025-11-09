const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

class GeminiVoiceService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.enableVoiceResponses = process.env.ENABLE_VOICE_RESPONSES === 'true';
    this.useGeminiAPI = process.env.USE_GEMINI_API !== 'false'; // Default to true unless explicitly disabled
    this.geminiAvailable = false;
    this.quotaExceeded = false;
    this.quotaExceededTime = null;
    this.quotaResetTime = null;

    if (!this.useGeminiAPI) {
      console.log('🚫 GeminiVoiceService: Gemini API disabled via USE_GEMINI_API=false - using fallback mode only');
      this.geminiAvailable = false;
    } else if (!this.apiKey || this.apiKey === 'your-actual-gemini-api-key-here') {
      console.warn('GEMINI_API_KEY not configured - using fallback mode');
      console.log('To enable Gemini: Get API key from https://makersuite.google.com/app/apikey');
      this.geminiAvailable = false;
    } else {
      try {
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        // Use the new model name - gemini-1.5-flash is the current free model
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        this.geminiAvailable = true;
        console.log('GeminiVoiceService: Initialized with Gemini 1.5 Flash');
      } catch (error) {
        console.error('GeminiVoiceService: Failed to initialize Gemini:', error.message);
        this.geminiAvailable = false;
      }
    }

    console.log('GeminiVoiceService: Gemini available:', this.geminiAvailable);
    console.log('GeminiVoiceService: Voice responses enabled:', this.enableVoiceResponses);

    // Reset quota status on initialization (fresh start)
    if (this.geminiAvailable) {
      this.resetQuotaStatus();
    }
  }

  /**
   * Check if quota is exceeded and if we should try again
   */
  isQuotaExceeded() {
    if (!this.quotaExceeded) return false;

    // Check if it's been more than 24 hours since quota exceeded
    if (this.quotaExceededTime && Date.now() - this.quotaExceededTime > 24 * 60 * 60 * 1000) {
      console.log('GeminiVoiceService: 24 hours passed, resetting quota status');
      this.quotaExceeded = false;
      this.quotaExceededTime = null;
      this.quotaResetTime = null;
      return false;
    }

    return true;
  }

  /**
   * Mark quota as exceeded
   */
  markQuotaExceeded(retryDelay = null) {
    if (!this.quotaExceeded) {
      console.log('🚫 GeminiVoiceService: Quota exceeded - switching to fallback mode for 24 hours');
      this.quotaExceeded = true;
      this.quotaExceededTime = Date.now();

      if (retryDelay) {
        // Parse retry delay (e.g., "21s", "1h")
        const delay = this.parseRetryDelay(retryDelay);
        this.quotaResetTime = Date.now() + delay;
        console.log(`GeminiVoiceService: Quota will reset in ${retryDelay}`);
      }
    }
  }

  /**
   * Parse retry delay string to milliseconds
   */
  parseRetryDelay(delayStr) {
    const match = delayStr.match(/(\d+)([smh])/);
    if (!match) return 24 * 60 * 60 * 1000; // Default to 24 hours

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Get current quota status for debugging
   */
  getQuotaStatus() {
    return {
      quotaExceeded: this.quotaExceeded,
      quotaExceededTime: this.quotaExceededTime,
      quotaResetTime: this.quotaResetTime,
      geminiAvailable: this.geminiAvailable,
      timeUntilReset: this.quotaResetTime ? Math.max(0, this.quotaResetTime - Date.now()) : null
    };
  }

  /**
   * Reset quota status (useful when switching API keys)
   */
  resetQuotaStatus() {
    this.quotaExceeded = false;
    this.quotaExceededTime = null;
    this.quotaResetTime = null;
    console.log('✅ GeminiVoiceService: Quota status reset - ready to use Gemini API');
  }

  /**
   * Convert audio to text using browser's Web Speech API (client-side)
   * This is a fallback method - actual implementation will be on frontend
   */
  async transcribeAudio(audioBuffer, options = {}) {
    try {
      const { language = 'en' } = options;
      
      console.log('GeminiVoiceService: Processing audio transcription...');
      
      // For now, we'll use a mock transcription since Gemini Pro doesn't directly support audio
      // The actual transcription will happen on the frontend using Web Speech API
      const mockTranscriptions = {
        'en': 'I need help with my request',
        'hi': 'मुझे अपने अनुरोध में सहायता चाहिए',
        'te': 'నాకు నా అభ్యర్థనలో సహాయం కావాలి'
      };

      const transcribedText = mockTranscriptions[language] || mockTranscriptions['en'];
      
      return {
        success: true,
        text: transcribedText,
        language: language,
        confidence: 0.95,
        method: 'gemini_mock'
      };
    } catch (error) {
      console.error('GeminiVoiceService: Transcription error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process text with Gemini Pro and generate intelligent response
   */
  async processTextWithGemini(text, context = {}) {
    try {
      const { userType = 'citizen', language = 'en', inputMethod = 'text' } = context;

      console.log('GeminiVoiceService: Processing text...');
      console.log('GeminiVoiceService: Input text:', text);
      console.log('GeminiVoiceService: Gemini available:', this.geminiAvailable);

      // Check if quota is exceeded
      if (this.isQuotaExceeded()) {
        const status = this.getQuotaStatus();
        const hoursUntilReset = status.timeUntilReset ? Math.ceil(status.timeUntilReset / (1000 * 60 * 60)) : 24;
        console.log(`🚫 GeminiVoiceService: Quota exceeded - using fallback mode (resets in ~${hoursUntilReset}h)`);
        const fallbackResponse = this.getFallbackResponse(text, context);
        return {
          success: true,
          originalText: text,
          response: fallbackResponse.response,
          category: fallbackResponse.category,
          priority: fallbackResponse.priority,
          language: context.language || 'en',
          inputMethod: inputMethod,
          needsVoiceResponse: inputMethod === 'voice' && this.enableVoiceResponses,
          usingFallback: true
        };
      }

      if (!this.geminiAvailable) {
        console.log('GeminiVoiceService: Using fallback mode (no Gemini)');
        const fallbackResponse = this.getFallbackResponse(text, context);
        return {
          success: true,
          originalText: text,
          response: fallbackResponse.response,
          category: fallbackResponse.category,
          priority: fallbackResponse.priority,
          language: context.language || 'en',
          inputMethod: inputMethod,
          needsVoiceResponse: inputMethod === 'voice' && this.enableVoiceResponses,
          usingFallback: true
        };
      }

      // Create a comprehensive prompt for Gemini
      const prompt = this.createGeminiPrompt(text, context);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const generatedText = response.text();

      console.log('GeminiVoiceService: Gemini response:', generatedText);

      // Parse the response to extract structured data
      const parsedResponse = this.parseGeminiResponse(generatedText, text);

      return {
        success: true,
        originalText: text,
        response: parsedResponse.response,
        category: parsedResponse.category,
        priority: parsedResponse.priority,
        language: context.language || 'en',
        inputMethod: inputMethod,
        needsVoiceResponse: inputMethod === 'voice' && this.enableVoiceResponses,
        usingFallback: false
      };

    } catch (error) {
      console.error('GeminiVoiceService: Gemini processing error:', error);

      // Check if this is a quota exceeded error
      if (error.status === 429 || error.message.includes('quota') || error.message.includes('Too Many Requests')) {
        // Extract retry delay if available
        let retryDelay = null;
        if (error.errorDetails) {
          const retryInfo = error.errorDetails.find(detail => detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
          if (retryInfo && retryInfo.retryDelay) {
            retryDelay = retryInfo.retryDelay;
          }
        }
        this.markQuotaExceeded(retryDelay);
      }

      console.log('GeminiVoiceService: Falling back to basic processing');
      const fallbackResponse = this.getFallbackResponse(text, context);
      return {
        success: true,
        originalText: text,
        response: fallbackResponse.response,
        category: fallbackResponse.category,
        priority: fallbackResponse.priority,
        language: context.language || 'en',
        inputMethod: context.inputMethod || 'text',
        needsVoiceResponse: (context.inputMethod === 'voice') && this.enableVoiceResponses,
        usingFallback: true,
        error: error.message
      };
    }
  }

  /**
   * Create a comprehensive prompt for Gemini Pro
   */
  createGeminiPrompt(text, context) {
    const { language = 'en', userType = 'citizen' } = context;
    
    const languageInstructions = {
      'en': 'Respond in English',
      'hi': 'Respond in Hindi (हिंदी)',
      'te': 'Respond in Telugu (తెలుగు)'
    };

    return `
You are SevaLink AI Assistant, a helpful and knowledgeable AI assistant. Answer any question the user asks naturally and conversationally.

User Input: "${text}"
User Language: ${language}
Response Language: ${languageInstructions[language] || 'English'}

IMPORTANT: Always respond in the user's language (${language}). If user speaks in Hindi, respond in Hindi. If Telugu, respond in Telugu. If English, respond in English.

Instructions:
1. Answer the user's question directly and helpfully IN THEIR LANGUAGE
2. Be natural, conversational, and informative
3. For any topic - health, science, math, general knowledge, advice, etc. - provide a good answer
4. If it's a service request (blood, elder care, complaints), also categorize it appropriately
5. Always be helpful and friendly
6. RESPOND IN THE SAME LANGUAGE AS THE USER INPUT

Categories (only for service requests):
- blood_request: Blood donation needs, transfusion requests (रक्त अनुरोध / రక్త అభ్యర్థన)
- elder_support: Help for elderly citizens, medicine, groceries, care (बुजुर्ग सहायता / వృద్ధుల సహాయం)
- complaint: Infrastructure issues, broken services, civic problems (शिकायत / ఫిర్యాదు)
- emergency: Urgent situations requiring immediate help (आपातकाल / అత్యవసరం)
- general_inquiry: Everything else (सामान्य पूछताछ / సాధారణ విచారణ)

Priority levels:
- urgent: Emergency situations (तत्काल / అత్యవసరం)
- high: Important requests (उच्च / అధిక)
- medium: Standard requests (मध्यम / మధ్యమ)
- low: General questions and conversations (कम / తక్కువ)

Format as JSON:
{
  "response": "Your natural, helpful answer in the user's language",
  "category": "appropriate_category",
  "priority": "appropriate_priority",
  "nextSteps": []
}

Language Examples:
- English: "I need O+ blood" → "I understand you need O+ blood. Your blood request has been registered..."
- Hindi: "मुझे O+ खून चाहिए" → "मैं समझता हूं कि आपको O+ खून की जरूरत है। आपका रक्त अनुरोध दर्ज कर दिया गया है..."
- Telugu: "నాకు O+ రక్తం కావాలి" → "మీకు O+ రక్తం అవసరమని నేను అర్థం చేసుకున్నాను। మీ రక్త అభ్యర్థన నమోదు చేయబడింది..."
`;
  }

  /**
   * Parse Gemini's response to extract structured data
   */
  parseGeminiResponse(geminiText, originalText) {
    try {
      // Try to parse as JSON first
      const jsonMatch = geminiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          response: parsed.response || geminiText,
          category: parsed.category || this.fallbackCategorize(originalText),
          priority: parsed.priority || this.fallbackPriority(originalText),
          nextSteps: parsed.nextSteps || ['Request saved', 'Volunteers notified']
        };
      }
    } catch (error) {
      console.log('GeminiVoiceService: Could not parse JSON, using fallback');
    }

    // Fallback parsing
    return {
      response: geminiText,
      category: this.fallbackCategorize(originalText),
      priority: this.fallbackPriority(originalText),
      nextSteps: ['Request saved', 'Volunteers will be notified']
    };
  }

  /**
   * Fallback categorization if Gemini doesn't provide structured response - supports multiple languages
   */
  fallbackCategorize(text) {
    const lowerText = text.toLowerCase().trim();

    // Math questions - clearly general
    if (/^\s*\d+\s*[\+\-\*\/]\s*\d+\s*$/.test(lowerText)) {
      return 'general_inquiry';
    }

    // Greetings and casual conversation - clearly general (multi-language)
    if (/^(hi|hello|hey|good morning|good afternoon|good evening|namaste|नमस्ते|హలో|వందనలు|hola|how are you|what's up|thank you|thanks|bye|goodbye|धन्यवाद|ధన్యవాదాలు)$/i.test(lowerText)) {
      return 'general_inquiry';
    }

    // General knowledge questions - clearly general (multi-language)
    if (/what is|who is|when is|where is|how to|tell me about|explain|define|capital of|time is it|क्या है|कौन है|कब है|कहाँ है|कैसे|बताओ|समझाओ|ఏమిటి|ఎవరు|ఎప్పుడు|ఎక్కడ|ఎలా|చెప్పండి|వివరించండి/i.test(lowerText)) {
      return 'general_inquiry';
    }

    // Blood request patterns (multi-language)
    if (/blood|donate|donation|transfusion|plasma|platelets|रक्त|खून|रक्तदान|రక్తం|రక్తదానం|donor|o\+|o-|a\+|a-|b\+|b-|ab\+|ab-|surgery|operation|hospital|patient|सर्जरी|अस्पताल|मरीज|శస్త్రచికిత్స|ఆసుపత్రి|రోగి/.test(lowerText)) {
      return 'blood_request';
    }

    // Emergency patterns (check before other categories) (multi-language)
    if (/emergency|urgent|critical|immediate|asap|help.*urgent|आपातकाल|तुरंत|तत्काल|అత్యవసరం|తక్షణం|911|108|ambulance|एम्बुलेंस|అంబులెన్స్/.test(lowerText)) {
      return 'emergency';
    }

    // Elder support patterns (multi-language)
    if (/elderly|old|senior|medicine|grocery|care|caregiver|nursing|assistance|बुजुर्ग|बूढ़े|दवा|किराना|देखभाल|వృద్ధులు|పెద్దలు|మందు|కిరాణా|సంరక్షణ|grandfather|grandmother|parent|mom|dad|mother|father|दादा|दादी|माता|पिता|తాత|అజ్జి|తల్లి|తండ్రి/.test(lowerText)) {
      return 'elder_support';
    }

    // Complaint patterns (multi-language)
    if (/complaint|problem|issue|broken|not working|damaged|fault|repair|fix|शिकायत|समस्या|खराब|टूटा|मरम्मत|ఫిర్యాదు|సమస్య|పాడైన|పని చేయడం లేదు|మరమ్మత్తు|street|light|road|water|electricity|garbage|sewage|drainage|pothole|noise|pollution|सड़क|बत्ती|पानी|बिजली|कचरा|రోడ్డు|లైట్|నీరు|కరెంట్|చెత్త/.test(lowerText)) {
      return 'complaint';
    }

    return 'general_inquiry';
  }

  /**
   * Fallback priority detection
   */
  fallbackPriority(text) {
    const lowerText = text.toLowerCase();
    
    if (/emergency|urgent|critical|आपातकाल|तुरंत|అత్యవసరం/.test(lowerText)) return 'urgent';
    if (/important|asap|soon|जल्दी|త్వరగా/.test(lowerText)) return 'high';
    if (/whenever|no rush|जब समय हो|సమయం ఉన్నప్పుడు/.test(lowerText)) return 'low';
    
    return 'medium';
  }

  /**
   * Get fallback response if Gemini fails - generate dynamic responses based on input
   */
  getFallbackResponse(text, context) {
    const { language = 'en' } = context;
    const category = this.fallbackCategorize(text);
    const priority = this.fallbackPriority(text);

    // Generate dynamic responses based on the actual input content
    return this.generateDynamicResponse(text, category, priority, language);
  }

  /**
   * Generate dynamic responses that reference the actual user input
   */
  generateDynamicResponse(text, category, priority, language = 'en') {
    const lowerText = text.toLowerCase().trim();

    // Handle general questions and conversations first
    if (category === 'general_inquiry') {
      return this.handleGeneralQuestion(text, lowerText, language);
    }

    // Extract specific details from the text for service requests
    let bloodType = null;
    let urgencyWords = [];

    // Extract blood type if mentioned - support multiple languages
    bloodType = this.extractBloodTypeFromText(text);

    // Extract urgency indicators - support multiple languages
    if (/urgent|emergency|asap|immediately|critical|serious|तुरंत|आपातकाल|जल्दी|అత్యవసరం|త్వరగా|తక్షణం/i.test(text)) {
      urgencyWords.push('urgent');
    }

    // Generate category-specific responses for service requests in appropriate language
    return this.generateServiceResponse(category, text, bloodType, urgencyWords, priority, language);
  }

  /**
   * Generate service-specific responses in the user's language
   */
  generateServiceResponse(category, text, bloodType, urgencyWords, priority, language) {
    const responses = {
      'blood_request': {
        'en': {
          base: 'Thank you for your blood donation request. ',
          bloodType: (bt) => `I understand you need ${bt} blood. `,
          urgent: 'I can see this is urgent. ',
          end: `Your request has been categorized as a ${priority} priority blood request and will be shared with our volunteer donors immediately.`
        },
        'hi': {
          base: 'आपके रक्तदान अनुरोध के लिए धन्यवाद। ',
          bloodType: (bt) => `मैं समझता हूं कि आपको ${bt} रक्त की आवश्यकता है। `,
          urgent: 'मैं देख सकता हूं कि यह तत्काल है। ',
          end: `आपका अनुरोध ${priority} प्राथमिकता रक्त अनुरोध के रूप में वर्गीकृत किया गया है और तुरंत हमारे स्वयंसेवी दाताओं के साथ साझा किया जाएगा।`
        },
        'te': {
          base: 'మీ రక్తదాన అభ్యర్థనకు ధన్యవాదాలు। ',
          bloodType: (bt) => `మీకు ${bt} రక్తం అవసరమని నేను అర్థం చేసుకున్నాను। `,
          urgent: 'ఇది అత్యవసరమని నేను చూడగలను। ',
          end: `మీ అభ్యర్థన ${priority} ప్రాధాన్యత రక్త అభ్యర్థనగా వర్గీకరించబడింది మరియు వెంటనే మా స్వచ్ఛంద దాతలతో పంచుకోబడుతుంది।`
        }
      },
      'elder_support': {
        'en': {
          base: 'Thank you for reaching out about elder care support. ',
          medicine: 'I understand you need help with medication management. ',
          grocery: 'I see you need assistance with grocery shopping. ',
          care: 'I understand you need general care assistance. ',
          end: `Your elder support request has been marked as ${priority} priority and our volunteers will be notified.`
        },
        'hi': {
          base: 'बुजुर्ग देखभाल सहायता के लिए संपर्क करने के लिए धन्यवाद। ',
          medicine: 'मैं समझता हूं कि आपको दवा प्रबंधन में सहायता चाहिए। ',
          grocery: 'मैं देखता हूं कि आपको किराने की खरीदारी में सहायता चाहिए। ',
          care: 'मैं समझता हूं कि आपको सामान्य देखभाल सहायता चाहिए। ',
          end: `आपका बुजुर्ग सहायता अनुरोध ${priority} प्राथमिकता के रूप में चिह्नित किया गया है और हमारे स्वयंसेवकों को सूचित किया जाएगा।`
        },
        'te': {
          base: 'వృద్ధుల సంరక్షణ సహాయం కోసం సంప్రదించినందుకు ధన్యవాదాలు। ',
          medicine: 'మీకు మందుల నిర్వహణలో సహాయం అవసరమని నేను అర్థం చేసుకున్నాను। ',
          grocery: 'మీకు కిరాణా షాపింగ్‌లో సహాయం అవసరమని నేను చూస్తున్నాను। ',
          care: 'మీకు సాధారణ సంరక్షణ సహాయం అవసరమని నేను అర్థం చేసుకున్నాను। ',
          end: `మీ వృద్ధుల సహాయ అభ్యర్థన ${priority} ప్రాధాన్యతగా గుర్తించబడింది మరియు మా స్వచ్ఛంద సేవకులకు తెలియజేయబడుతుంది।`
        }
      },
      'complaint': {
        'en': {
          base: 'Thank you for bringing this issue to our attention. ',
          service: 'I understand you have concerns about service quality. ',
          delay: 'I see you\'re experiencing delays. ',
          problem: 'I understand you\'re facing some difficulties. ',
          end: `Your complaint has been registered with ${priority} priority and will be forwarded to the appropriate authorities for resolution.`
        },
        'hi': {
          base: 'इस मुद्दे को हमारे ध्यान में लाने के लिए धन्यवाद। ',
          service: 'मैं समझता हूं कि आपको सेवा की गुणवत्ता के बारे में चिंता है। ',
          delay: 'मैं देखता हूं कि आप देरी का सामना कर रहे हैं। ',
          problem: 'मैं समझता हूं कि आप कुछ कठिनाइयों का सामना कर रहे हैं। ',
          end: `आपकी शिकायत ${priority} प्राथमिकता के साथ दर्ज की गई है और समाधान के लिए उपयुक्त अधिकारियों को भेजी जाएगी।`
        },
        'te': {
          base: 'ఈ సమస్యను మా దృష్టికి తీసుకువచ్చినందుకు ధన్యవాదాలు। ',
          service: 'మీకు సేవా నాణ్యత గురించి ఆందోళనలు ఉన్నాయని నేను అర్థం చేసుకున్నాను। ',
          delay: 'మీరు ఆలస్యాలను ఎదుర్కొంటున్నారని నేను చూస్తున్నాను। ',
          problem: 'మీరు కొన్ని ఇబ్బందులను ఎదుర్కొంటున్నారని నేను అర్థం చేసుకున్నాను। ',
          end: `మీ ఫిర్యాదు ${priority} ప్రాధాన్యతతో నమోదు చేయబడింది మరియు పరిష్కారం కోసం తగిన అధికారులకు పంపబడుతుంది।`
        }
      }
    };

    const langResponses = responses[category]?.[language] || responses[category]?.['en'];
    if (!langResponses) {
      return this.handleGeneralQuestion(text, text.toLowerCase(), language);
    }

    let response = langResponses.base;

    // Add specific details based on category
    if (category === 'blood_request') {
      if (bloodType) {
        response += langResponses.bloodType(bloodType);
      }
      if (urgencyWords.length > 0) {
        response += langResponses.urgent;
      }
      response += langResponses.end;
    } else if (category === 'elder_support') {
      if (/medicine|medication|pills|tablets|दवा|మందు/i.test(text)) {
        response += langResponses.medicine;
      } else if (/grocery|shopping|food|किराना|కిరాణా/i.test(text)) {
        response += langResponses.grocery;
      } else if (/care|assistance|help|देखभाल|సంరక్షణ/i.test(text)) {
        response += langResponses.care;
      }
      response += langResponses.end;
    } else if (category === 'complaint') {
      if (/service|staff|employee|सेवा|సేవ/i.test(text)) {
        response += langResponses.service;
      } else if (/delay|late|slow|देरी|ఆలస్యం/i.test(text)) {
        response += langResponses.delay;
      } else if (/problem|issue|trouble|समस्या|సమస్య/i.test(text)) {
        response += langResponses.problem;
      }
      response += langResponses.end;
    } else if (category === 'emergency') {
      return this.generateEmergencyResponse(language);
    }

    return {
      response: response,
      category: category,
      priority: priority
    };
  }

  /**
   * Handle emergency requests in multiple languages
   */
  generateEmergencyResponse(language) {
    const emergencyResponses = {
      'en': '🚨 EMERGENCY REQUEST RECEIVED 🚨\n\nI understand this is an urgent situation requiring immediate attention. Your emergency request has been marked as URGENT priority and emergency volunteers are being notified RIGHT NOW. You should receive contact within 30 minutes.\n\nFor life-threatening emergencies, please also call 108 (ambulance) or 112 (emergency services).',
      'hi': '🚨 आपातकालीन अनुरोध प्राप्त 🚨\n\nमैं समझता हूं कि यह एक तत्काल स्थिति है जिसमें तत्काल ध्यान देने की आवश्यकता है। आपका आपातकालीन अनुरोध तत्काल प्राथमिकता के रूप में चिह्नित किया गया है और आपातकालीन स्वयंसेवकों को अभी सूचित किया जा रहा है। आपको 30 मिनट के भीतर संपर्क मिलना चाहिए।\n\nजीवन-घातक आपातकाल के लिए, कृपया 108 (एम्बुलेंस) या 112 (आपातकालीन सेवाएं) भी कॉल करें।',
      'te': '🚨 అత్యవసర అభ్యర్థన స్వీకరించబడింది 🚨\n\nఇది తక్షణ దృష్టి అవసరమైన అత్యవసర పరిస్థితి అని నేను అర్థం చేసుకున్నాను। మీ అత్యవసర అభ్యర్థన అత్యవసర ప్రాధాన్యతగా గుర్తించబడింది మరియు అత్యవసర స్వచ్ఛంద సేవకులకు ఇప్పుడే తెలియజేయబడుతోంది. మీరు 30 నిమిషాలలో సంప్రదింపులను అందుకోవాలి.\n\nప్రాణాంతక అత్యవసర పరిస్థితుల కోసం, దయచేసి 108 (అంబులెన్స్) లేదా 112 (అత్యవసర సేవలు) కూడా కాల్ చేయండి.'
    };

    return {
      response: emergencyResponses[language] || emergencyResponses['en'],
      category: 'emergency',
      priority: 'urgent'
    };
  }

  /**
   * Extract blood type from text - supports multiple languages
   */
  extractBloodTypeFromText(text) {
    console.log('🩸 Extracting blood type from text:', text);

    // English patterns
    const englishPattern = /\b(O\+|O-|A\+|A-|B\+|B-|AB\+|AB-|O\s*positive|O\s*negative|A\s*positive|A\s*negative|B\s*positive|B\s*negative|AB\s*positive|AB\s*negative|o\+|o-|a\+|a-|b\+|b-|ab\+|ab-|o\s*positive|o\s*negative|a\s*positive|a\s*negative|b\s*positive|b\s*negative|ab\s*positive|ab\s*negative)\b/i;
    const englishMatch = text.match(englishPattern);

    if (englishMatch) {
      let bloodType = englishMatch[1].toUpperCase();
      bloodType = bloodType.replace(/\s+/g, '').replace('POSITIVE', '+').replace('NEGATIVE', '-');
      console.log('🩸 Found English blood type:', bloodType);
      return bloodType;
    }

    // Hindi patterns like "ए पॉजिटिव खून" or "ओ नेगेटिव रक्त"
    const hindiPattern = /\b(ए|बी|एबी|ओ)\s*(पॉजिटिव|नेगेटिव|\+|\-)/i;
    const hindiMatch = text.match(hindiPattern);

    if (hindiMatch) {
      const bloodGroupMap = { 'ए': 'A', 'बी': 'B', 'एबी': 'AB', 'ओ': 'O' };
      const bloodGroup = bloodGroupMap[hindiMatch[1]] || hindiMatch[1];
      const rh = (hindiMatch[2] === 'पॉजिटिव' || hindiMatch[2] === '+') ? '+' : '-';
      console.log('🩸 Found Hindi blood type:', bloodGroup + rh);
      return bloodGroup + rh;
    }

    // Telugu patterns like "ఎ పాజిటివ్ రక్తం" or "ఓ నెగటివ్ రక్తం"
    const teluguPattern = /\b(ఎ|బి|ఎబి|ఓ)\s*(పాజిటివ్|నెగటివ్|\+|\-)/i;
    const teluguMatch = text.match(teluguPattern);

    if (teluguMatch) {
      const bloodGroupMap = { 'ఎ': 'A', 'బి': 'B', 'ఎబి': 'AB', 'ఓ': 'O' };
      const bloodGroup = bloodGroupMap[teluguMatch[1]] || teluguMatch[1];
      const rh = (teluguMatch[2] === 'పాజిటివ్' || teluguMatch[2] === '+') ? '+' : '-';
      console.log('🩸 Found Telugu blood type:', bloodGroup + rh);
      return bloodGroup + rh;
    }

    // Alternative patterns with need/want keywords
    const alternativePattern = /\b(need|want|require|looking for|चाहिए|आवश्यक|కావాలి|అవసరం)\s+(A|B|AB|O|ए|बी|एबी|ओ|ఎ|బి|ఎబి|ఓ)\s*(positive|negative|\+|\-|पॉजिटिव|नेगेटिव|పాజిటివ్|నెగటివ్)/i;
    const altMatch = text.match(alternativePattern);

    if (altMatch) {
      const bloodGroupMap = { 'ए': 'A', 'बी': 'B', 'एबी': 'AB', 'ओ': 'O', 'ఎ': 'A', 'బి': 'B', 'ఎబి': 'AB', 'ఓ': 'O' };
      const bloodGroup = bloodGroupMap[altMatch[2]] || altMatch[2].toUpperCase();
      const rhFactor = altMatch[3].toLowerCase();
      const rh = (rhFactor === 'positive' || rhFactor === '+' || rhFactor === 'पॉजिटिव' || rhFactor === 'పాజిటివ్') ? '+' : '-';
      console.log('🩸 Found alternative pattern blood type:', bloodGroup + rh);
      return bloodGroup + rh;
    }

    // Try more flexible patterns without word boundaries for mixed scripts
    const flexiblePattern = /(ఓ\s*పాజిటివ్|ఓ\s*నెగటివ్|ఎ\s*పాజిటివ్|ఎ\s*నెగటివ్|బి\s*పాజిటివ్|బি\s*నెగటివ్|ఎబి\s*పాజిటివ్|ఎబి\s*నెగటివ్|ओ\s*पॉजिटिव|ओ\s*नेगेटिव|ए\s*पॉजिटिव|ए\s*नेगेटिव|बी\s*पॉजिटिव|बी\s*नेगेटिव|एबी\s*पॉजिटिव|एबी\s*नेगेटिव)/i;
    const flexMatch = text.match(flexiblePattern);

    if (flexMatch) {
      const match = flexMatch[1];
      let bloodGroup, rh;

      // Telugu mappings
      if (match.includes('ఓ')) bloodGroup = 'O';
      else if (match.includes('ఎబి')) bloodGroup = 'AB';
      else if (match.includes('ఎ')) bloodGroup = 'A';
      else if (match.includes('బి')) bloodGroup = 'B';
      // Hindi mappings
      else if (match.includes('ओ')) bloodGroup = 'O';
      else if (match.includes('एबी')) bloodGroup = 'AB';
      else if (match.includes('ए')) bloodGroup = 'A';
      else if (match.includes('बी')) bloodGroup = 'B';

      rh = (match.includes('పాజిటివ్') || match.includes('पॉजिटिव')) ? '+' : '-';

      console.log('🩸 Found flexible pattern blood type:', bloodGroup + rh);
      return bloodGroup + rh;
    }

    console.log('🩸 No blood type found in text');
    return null;
  }

  /**
   * Handle general questions when Gemini is not available - try to be helpful in user's language
   */
  handleGeneralQuestion(text, lowerText, language = 'en') {
    // Math questions (universal)
    if (/^\s*\d+\s*[\+\-\*\/]\s*\d+\s*$/.test(lowerText)) {
      try {
        const result = Function('"use strict"; return (' + lowerText.replace(/[^0-9+\-*/().]/g, '') + ')')();
        return {
          response: `${text} = ${result}`,
          category: 'general_inquiry',
          priority: 'low'
        };
      } catch (e) {
        const mathError = {
          'en': 'I can help with simple math! Could you rephrase your calculation?',
          'hi': 'मैं सरल गणित में मदद कर सकता हूं! क्या आप अपनी गणना को दोबारा बता सकते हैं?',
          'te': 'నేను సాధారణ గణితంలో సహాయం చేయగలను! మీ లెక్కను మళ్లీ చెప్పగలరా?'
        };
        return {
          response: mathError[language] || mathError['en'],
          category: 'general_inquiry',
          priority: 'low'
        };
      }
    }

    // Health-related questions
    if (/fever|temperature|cold|cough|headache|pain|sick|illness|disease|symptoms|बुखार|सर्दी|खांसी|बीमारी|జ్వరం|జలుబు|దగ్గు|అనారోగ్యం/i.test(lowerText)) {
      if (/fever|बुखार|జ్వరం/i.test(lowerText)) {
        const feverInfo = {
          'en': 'Fever is your body\'s natural response to infection or illness. Normal body temperature is around 98.6°F (37°C). A fever is generally considered 100.4°F (38°C) or higher. Common causes include infections, flu, colds, or other illnesses. Stay hydrated, rest, and consider seeing a doctor if fever persists over 3 days or is very high.',
          'hi': 'बुखार संक्रमण या बीमारी के लिए आपके शरीर की प्राकृतिक प्रतिक्रिया है। सामान्य शरीर का तापमान लगभग 98.6°F (37°C) होता है। बुखार आमतौर पर 100.4°F (38°C) या उससे अधिक माना जाता है। सामान्य कारणों में संक्रमण, फ्लू, सर्दी या अन्य बीमारियां शामिल हैं। हाइड्रेटेड रहें, आराम करें, और यदि बुखार 3 दिनों से अधिक बना रहे या बहुत तेज हो तो डॉक्टर से मिलने पर विचार करें।',
          'te': 'జ్వరం అంటే ఇన్ఫెక్షన్ లేదా అనారోగ్యానికి మీ శరీరం యొక్క సహజ ప్రతిస్పందన. సాధారణ శరీర ఉష్ణోగ్రత దాదాపు 98.6°F (37°C) ఉంటుంది. జ్వరం సాధారణంగా 100.4°F (38°C) లేదా అంతకంటే ఎక్కువగా పరిగణించబడుతుంది. సాధారణ కారణాలలో ఇన్ఫెక్షన్లు, ఫ్లూ, జలుబు లేదా ఇతర అనారోగ్యాలు ఉన్నాయి. హైడ్రేటెడ్‌గా ఉండండి, విశ్రాంతి తీసుకోండి, మరియు జ్వరం 3 రోజులకు మించి కొనసాగితే లేదా చాలా ఎక్కువగా ఉంటే వైద్యుడిని చూడడాన్ని పరిగణించండి.'
        };
        return {
          response: feverInfo[language] || feverInfo['en'],
          category: 'general_inquiry',
          priority: 'low'
        };
      }

      const healthAdvice = {
        'en': 'I understand you\'re asking about health symptoms. While I can provide general information, it\'s always best to consult with a healthcare professional for medical advice.',
        'hi': 'मैं समझता हूं कि आप स्वास्थ्य लक्षणों के बारे में पूछ रहे हैं। जबकि मैं सामान्य जानकारी प्रदान कर सकता हूं, चिकित्सा सलाह के लिए हमेशा एक स्वास्थ्य पेशेवर से सलाह लेना सबसे अच्छा होता है।',
        'te': 'మీరు ఆరోగ్య లక్షణాల గురించి అడుగుతున్నారని నేను అర్థం చేసుకున్నాను. నేను సాధారణ సమాచారం అందించగలిగినప్పటికీ, వైద్య సలహా కోసం ఆరోగ్య నిపుణుడిని సంప్రదించడం ఎల్లప్పుడూ ఉత్తమం.'
      };
      return {
        response: healthAdvice[language] || healthAdvice['en'],
        category: 'general_inquiry',
        priority: 'low'
      };
    }

    // Basic greetings
    if (/^(hi|hello|hey|good morning|good afternoon|good evening|namaste|नमस्ते|హలో|వందనలు)$/i.test(lowerText)) {
      const greetings = {
        'en': 'Hello! I\'m your SevaLink AI assistant. I can answer questions, help with information, or assist with community services. What would you like to know?',
        'hi': 'नमस्ते! मैं आपका SevaLink AI सहायक हूं। मैं प्रश्नों के उत्तर दे सकता हूं, जानकारी में मदद कर सकता हूं, या सामुदायिक सेवाओं में सहायता कर सकता हूं। आप क्या जानना चाहेंगे?',
        'te': 'హలో! నేను మీ SevaLink AI సహాయకుడిని. నేను ప్రశ్నలకు సమాధానాలు ఇవ్వగలను, సమాచారంతో సహాయం చేయగలను, లేదా కమ్యూనిటీ సేవలతో సహాయం చేయగలను. మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?'
      };
      return {
        response: greetings[language] || greetings['en'],
        category: 'general_inquiry',
        priority: 'low'
      };
    }

    // For everything else, try to be helpful but acknowledge limitations
    const generalHelp = {
      'en': `I'd be happy to help with your question about "${text}". While I have some general knowledge, I work best with community service requests like blood donations, elder support, and complaints. Is there anything specific I can help you with?`,
      'hi': `मैं "${text}" के बारे में आपके प्रश्न में मदद करने में खुश हूं। जबकि मेरे पास कुछ सामान्य ज्ञान है, मैं रक्तदान, बुजुर्ग सहायता और शिकायतों जैसे सामुदायिक सेवा अनुरोधों के साथ सबसे अच्छा काम करता हूं। क्या कोई विशिष्ट चीज है जिसमें मैं आपकी मदद कर सकता हूं?`,
      'te': `"${text}" గురించి మీ ప్రశ్నతో సహాయం చేయడంలో నేను సంతోషిస్తాను. నాకు కొంత సాధారణ జ్ఞానం ఉన్నప్పటికీ, రక్తదానం, వృద్ధుల సహాయం మరియు ఫిర్యాదుల వంటి కమ్యూనిటీ సేవా అభ్యర్థనలతో నేను ఉత్తమంగా పని చేస్తాను. నేను మీకు సహాయం చేయగల ఏదైనా నిర్దిష్టమైనది ఉందా?`
    };

    return {
      response: generalHelp[language] || generalHelp['en'],
      category: 'general_inquiry',
      priority: 'low'
    };
  }

  /**
   * Generate audio response using Web Speech API (client-side implementation)
   */
  prepareVoiceResponse(text, language = 'en') {
    // This will be implemented on the frontend using Web Speech API
    return {
      text: text,
      language: language,
      shouldSpeak: this.enableVoiceResponses,
      voiceSettings: {
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0
      }
    };
  }

  /**
   * Get service status
   */
  async getServiceStatus() {
    try {
      // Test Gemini connection
      const testResult = await this.model.generateContent('Hello');
      const response = await testResult.response;

      return {
        available: true,
        service: 'gemini-pro',
        voiceEnabled: this.enableVoiceResponses,
        status: 'operational'
      };
    } catch (error) {
      return {
        available: false,
        service: 'gemini-pro',
        voiceEnabled: this.enableVoiceResponses,
        status: 'error',
        error: error.message
      };
    }
  }
}

module.exports = new GeminiVoiceService();
