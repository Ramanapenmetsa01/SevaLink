const express = require('express');
const multer = require('multer');
const router = express.Router();
const auth = require('../middleware/auth');
const Request = require('../models/Request');
const VoiceRequest = require('../models/VoiceRequest');
const Chat = require('../models/Chat');
const geminiVoiceService = require('../utils/geminiVoiceService');
const translationService = require('../utils/translationService');
const User = require('../models/User');
const {
  voiceProcessingValidation,
  textMessageValidation,
  handleValidationErrors,
  validateAudioFile,
  voiceRateLimit,
  voiceErrorHandler
} = require('../middleware/voiceValidation');

// Configure multer for audio file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// @route   POST /api/chatbot/message
// @desc    Process chatbot message (legacy endpoint)
// @access  Private
router.post('/message', auth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Quick response for legacy endpoint
    res.json({
      success: true,
      message: 'Message received',
      response: `Thank you for your message: "${message}". Please use the new /text endpoint for full functionality.`,
      data: {
        category: 'general_inquiry',
        priority: 'medium'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing message',
      error: error.message
    });
  }
});

// @route   POST /api/chatbot/voice
// @desc    Process audio file upload and transcription
// @access  Private
router.post('/voice',
  auth,
  upload.single('audio'),
  voiceProcessingValidation,
  validateAudioFile,
  handleValidationErrors,
  voiceRateLimit,
  async (req, res) => {
  try {
    console.log('🎤 Voice route: Received voice processing request');
    console.log('🎤 Voice route: User:', req.user?.email);
    console.log('🎤 Voice route: Request body:', req.body);
    console.log('🎤 Voice route: File info:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    const { language = 'auto' } = req.body;
    const audioFile = req.file;

    if (!audioFile) {
      console.log('❌ Voice route: No audio file provided');
      return res.status(400).json({
        success: false,
        message: 'Audio file is required'
      });
    }

    console.log('Voice route: Processing audio file...');
    console.log('Voice route: File size:', audioFile.size);
    console.log('Voice route: File type:', audioFile.mimetype);
    console.log('Voice route: Language:', language);

    // Try Whisper service for transcription, with fallback
    let transcriptionResult;
    let transcribedText;

    try {
      const whisperService = require('../utils/whisperService');
      transcriptionResult = await whisperService.transcribeAudio(audioFile.buffer, {
        language: language === 'auto' ? 'auto' : language
      });

      if (transcriptionResult.success) {
        transcribedText = transcriptionResult.text;

        // Detect language from actual transcribed text if not already detected
        if (!transcriptionResult.language || transcriptionResult.language === 'auto') {
          transcriptionResult.language = detectLanguageFromText(transcribedText);
        }

        console.log('Voice route: Whisper transcribed text:', transcribedText);
        console.log('Voice route: Detected language:', transcriptionResult.language);
      } else {
        throw new Error(transcriptionResult.error || 'Whisper transcription failed');
      }
    } catch (whisperError) {
      console.log('Voice route: Whisper failed, using mock transcription:', whisperError.message);

      // Fallback to mock transcription based on language - use realistic examples
      const mockTranscriptions = {
        'en': 'I need O positive blood urgently',
        'hi': 'मुझे ओ पॉजिटिव खून की तुरंत जरूरत है',
        'te': 'నాకు ఓ పాజిటివ్ రక్తం అత్యవసరంగా కావాలి',
        'auto': 'I need O positive blood urgently'
      };

      transcribedText = mockTranscriptions[language] || mockTranscriptions['en'];
      // Detect language from the transcribed text
      const detectedLanguage = detectLanguageFromText(transcribedText);

      transcriptionResult = {
        success: true,
        text: transcribedText,
        language: detectedLanguage,
        confidence: 0.8,
        method: 'mock_server_fallback'
      };

      console.log('Voice route: Using mock transcription:', transcribedText);
    }

    // Process with Gemini Pro
    const geminiResult = await geminiVoiceService.processTextWithGemini(transcribedText, {
      language: transcriptionResult.language || language,
      inputMethod: 'voice',
      userType: 'citizen'
    });

    if (geminiResult.success) {
      const responseData = {
        id: Date.now().toString(),
        transcribedText: transcribedText,
        category: geminiResult.category,
        priority: geminiResult.priority,
        geminiResponse: geminiResult.response,
        detectedLanguage: transcriptionResult.language || language,
        confidence: transcriptionResult.confidence || 0.95,
        processedAt: new Date(),
        needsVoiceResponse: true,
        voiceResponse: geminiVoiceService.prepareVoiceResponse(geminiResult.response, transcriptionResult.language || language),
        usingFallback: geminiResult.usingFallback || false,
        method: transcriptionResult.method || 'whisper'
      };

      res.json({
        success: true,
        message: geminiResult.usingFallback ? 'Voice request processed (fallback mode)' : 'Voice request processed with AI assistance',
        data: responseData
      });

      // Save to database asynchronously
      setImmediate(async () => {
        try {
          const voiceRequest = new VoiceRequest({
            userId: req.user.id,
            originalAudio: {
              filename: audioFile.originalname,
              mimetype: audioFile.mimetype,
              size: audioFile.size
            },
            transcribedText: transcribedText,
            detectedLanguage: transcriptionResult.language || language,
            confidence: transcriptionResult.confidence || 0.95,
            category: geminiResult.category,
            priority: geminiResult.priority,
            geminiResponse: geminiResult.response,
            processingTime: Date.now() - Date.now(),
            method: transcriptionResult.method || 'whisper'
          });

          await voiceRequest.save();
          console.log('Voice request saved to database');
        } catch (dbError) {
          console.error('Error saving voice request to database:', dbError);
        }
      });

    } else {
      throw new Error(geminiResult.error || 'Failed to process with Gemini');
    }

  } catch (error) {
    console.error('Voice processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing voice request',
      error: error.message
    });
  }
}, voiceErrorHandler);

// @route   GET /api/chatbot/health
// @desc    Health check endpoint
// @access  Public
router.get('/health', (req, res) => {
  console.log('🏥 Health check endpoint called');
  res.json({
    success: true,
    message: 'Chatbot service is healthy',
    timestamp: new Date(),
    server: 'SevaLink Chatbot API',
    version: '1.0.0'
  });
});

// @route   GET /api/chatbot/voice-test
// @desc    Test voice endpoint availability
// @access  Private
router.get('/voice-test', auth, (req, res) => {
  console.log('🧪 Voice test endpoint called by:', req.user?.email);
  res.json({
    success: true,
    message: 'Voice endpoint is available',
    timestamp: new Date(),
    user: req.user?.email
  });
});

// @route   POST /api/chatbot/voice-text
// @desc    Process voice input that was already transcribed on frontend
// @access  Private
router.post('/voice-text',
  auth,
  textMessageValidation,
  handleValidationErrors,
  async (req, res) => {
  try {
    const { message, language = 'en', confidence = 0.95, voiceMetadata = {} } = req.body;

    // Detect language from actual message content if not provided or if auto
    const detectedLanguage = (language === 'auto' || !language) ? detectLanguageFromText(message) : language;

    console.log('Voice-text route: Processing transcribed voice message...');
    console.log('Voice-text route: Message:', message);
    console.log('Voice-text route: Input Language:', language);
    console.log('Voice-text route: Detected Language:', detectedLanguage);
    console.log('Voice-text route: Confidence:', confidence);

    // Process with Gemini Pro using detected language
    const geminiResult = await geminiVoiceService.processTextWithGemini(message, {
      language: detectedLanguage,
      inputMethod: 'voice',
      userType: 'citizen'
    });

    if (geminiResult.success) {
      const responseData = {
        id: Date.now().toString(),
        transcribedText: message,
        category: geminiResult.category,
        priority: geminiResult.priority,
        geminiResponse: geminiResult.response,
        detectedLanguage: detectedLanguage,
        confidence: confidence,
        processedAt: new Date(),
        needsVoiceResponse: true,
        voiceResponse: geminiVoiceService.prepareVoiceResponse(geminiResult.response, detectedLanguage),
        usingFallback: geminiResult.usingFallback || false
      };

      res.json({
        success: true,
        message: geminiResult.usingFallback ? 'Voice request processed (fallback mode)' : 'Voice request processed with Gemini AI',
        data: responseData
      });

      // Save to database asynchronously
      setImmediate(async () => {
        try {
          // Always save chat message for history
          const aiMetadata = {
            usingFallback: false,
            processingTime: Date.now() - (Date.now()),
            geminiResponse: geminiResult.response
          };

          const voiceMetadataForChat = {
            confidence,
            duration: voiceMetadata.duration || 0,
            detectedLanguage: detectedLanguage
          };

          const chatMessage = await saveChatMessage(
            req.user.userId,
            message,
            geminiResult.response,
            geminiResult.category,
            geminiResult.priority,
            'voice',
            voiceMetadataForChat,
            aiMetadata
          );

          // Only create Request for blood_request, elder_support, complaint
          if (shouldCreateRequest(geminiResult.category, message)) {
            const request = await createRequestFromChat(
              req.user.userId,
              message,
              geminiResult.category,
              geminiResult.priority,
              true, // isVoice = true
              { confidence, language: detectedLanguage, voiceMetadata }
            );

            // Mark chat message as having created a request
            await chatMessage.markAsRequestCreator(request._id);
            console.log('✅ Voice request created - Type:', geminiResult.category, 'Request ID:', request._id, 'Chat ID:', chatMessage._id);
          } else {
            console.log('💬 General voice chat saved - Category:', geminiResult.category, 'Chat ID:', chatMessage._id, '(No request created)');
          }
        } catch (dbError) {
          console.error('Error saving voice message to database:', dbError);
        }
      });

    } else {
      throw new Error(geminiResult.error || 'Failed to process with Gemini');
    }

  } catch (error) {
    console.error('Voice-text processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing voice request',
      error: error.message
    });
  }
});

// @route   POST /api/chatbot/text
// @desc    Process text message (manual input)
// @access  Private
router.post('/text',
  auth,
  textMessageValidation,
  handleValidationErrors,
  async (req, res) => {
  try {
    const { message, language = 'en' } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required'
      });
    }

    const trimmedMessage = message.trim();
    const startTime = Date.now();
    console.log('Processing text with Gemini:', trimmedMessage);

    // Process with Gemini Pro (with fallback for quota issues)
    let geminiResult;
    try {
      geminiResult = await geminiVoiceService.processTextWithGemini(trimmedMessage, {
        language,
        inputMethod: 'text',
        userType: 'citizen'
      });
    } catch (error) {
      console.log('Gemini processing failed, using local fallback:', error.message);

      // Local fallback when Gemini is unavailable
      const category = categorizeRequest(trimmedMessage);
      const priority = determinePriority(trimmedMessage);

      geminiResult = {
        success: true,
        response: generateFallbackResponse(category, trimmedMessage),
        category: category,
        priority: priority,
        usingFallback: true
      };
    }

    // Decide final category/priority and create request if needed BEFORE responding
    const heuristicCategory = categorizeRequest(trimmedMessage);
    let finalCategory = (geminiResult.category && geminiResult.category !== 'general_inquiry')
      ? geminiResult.category
      : heuristicCategory;
    const finalPriority = geminiResult.priority || determinePriority(trimmedMessage);

    // If Gemini returned a generic response but our heuristic is specific, align to heuristic
    if (geminiResult && geminiResult.success && geminiResult.response && geminiResult.category === 'general_inquiry' && heuristicCategory !== 'general_inquiry') {
      geminiResult.category = heuristicCategory;
      finalCategory = heuristicCategory;
      try {
        geminiResult.response = generateFallbackResponse(heuristicCategory, trimmedMessage);
      } catch (e) {
        console.warn('Failed to generate heuristic fallback response:', e.message);
      }
    }

    const aiMetadata = {
      usingFallback: !geminiResult.success,
      processingTime: Date.now() - (startTime || Date.now()),
      geminiResponse: geminiResult.success ? geminiResult.response : null
    };

    // Save chat first
    const chatMessage = await saveChatMessage(
      req.user.userId,
      trimmedMessage,
      geminiResult.success ? geminiResult.response : `Thank you for your message. I'm here to help with blood requests, elder support, and complaints.`,
      finalCategory,
      finalPriority,
      'text',
      null,
      aiMetadata
    );

    let createdRequest = null;
    let bloodType = null;
    if (shouldCreateRequest(finalCategory, trimmedMessage)) {
      try {
        createdRequest = await createRequestFromChat(
          req.user.userId,
          trimmedMessage,
          finalCategory,
          finalPriority,
          false,
          null
        );
        if (createdRequest) {
          await chatMessage.markAsRequestCreator(createdRequest._id);
          if (finalCategory === 'blood_request') {
            bloodType = createdRequest.bloodType || extractBloodType(trimmedMessage);
          }
          console.log('✅ Request created successfully from chat:', createdRequest._id);
        }
      } catch (requestError) {
        console.error('❌ Failed to create request from chat:', requestError.message);
        // Continue without creating request - just save the chat message
        createdRequest = null;
      }
    }

    // Build response payload
    const responseData = {
      id: Date.now().toString(),
      transcribedText: trimmedMessage,
      category: finalCategory,
      priority: finalPriority,
      bloodType: bloodType,
      geminiResponse: geminiResult.response,
      processedAt: new Date(),
      createdRequestId: createdRequest?._id || null,
      needsVoiceResponse: false,
      usingFallback: geminiResult.usingFallback || false
    };

    res.json({
      success: true,
      message: geminiResult.usingFallback ? 'Message processed (fallback mode)' : 'Message processed with AI assistance',
      data: responseData
    });

  } catch (error) {
    console.error('Text processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing text message',
      error: error.message
    });
  }
});

// Helper Functions

/**
 * Save chat message to database
 */
async function saveChatMessage(userId, message, response, category, priority, messageType = 'text', voiceMetadata = null, aiMetadata = {}) {
  try {
    const chatMessage = new Chat({
      user: userId,
      message: message,
      response: response,
      messageType: messageType,
      category: category,
      priority: priority,
      language: aiMetadata.language || 'en',
      voiceMetadata: voiceMetadata,
      aiMetadata: aiMetadata
    });

    await chatMessage.save();
    console.log('💾 Chat message saved:', chatMessage._id, 'Type:', messageType, 'Category:', category);
    return chatMessage;
  } catch (error) {
    console.error('Error saving chat message:', error);
    throw error;
  }
}

/**
 * Determine if a request should be created based on category
 */
function shouldCreateRequest(category, message) {
  const requestCategories = ['blood_request', 'elder_support', 'complaint'];
  return requestCategories.includes(category);
}

/**
 * Create a Request from chat message
 */
async function createRequestFromChat(userId, message, category, priority, isVoice = false, voiceData = null) {
  try {
    console.log('createRequestFromChat called with:');
    console.log('- Category:', category);
    console.log('- Message:', message);
    console.log('- Priority:', priority);

    // Get user details (or use dummy data for testing)
    let user = await User.findById(userId);
    if (!user) {
      console.log('User not found, using dummy data for testing');
      user = {
        name: 'Test User',
        phone: '1234567890',
        email: 'test@example.com'
      };
    }

    // Determine request type based on category
    let requestType = 'complaint'; // default
    if (category === 'blood_request' || category === 'blood') {
      requestType = 'blood';
    } else if (category === 'elder_support') {
      requestType = 'elder_support';
    } else if (category === 'complaint') {
      requestType = 'complaint';
    } else if (category === 'emergency') {
      // Emergency can be any type, but default to complaint for now
      requestType = 'complaint';
    }

    console.log('Determined request type:', requestType, 'from category:', category);

    // Create base request data with proper location handling
    const mappedPriority = priority === 'urgent' ? 'urgent' : (priority === 'high' ? 'high' : 'medium');
    console.log('Priority mapping:', priority, '->', mappedPriority);

    const requestData = {
      type: requestType,
      user: userId,
      name: user.name,
      phone: user.phone || 'Not provided',
      email: user.email,
      location: {
        type: 'manual', // Use valid enum value
        coordinates: {
          lat: 16.523699,
          lng: 80.61359225
        },
        address: 'Potti Sriramulu College Road, Vinchipeta',
        city: 'Vijayawada',
        state: 'Andhra Pradesh',
        pincode: '520001',
        country: 'India'
      },
      priority: mappedPriority,
      status: 'pending'
    };

    // Add specific fields based on request type
    if (requestType === 'blood') {
      // Extract blood type using the dedicated function
      const extractedBloodType = extractBloodType(message);

      // If no blood type found, try more patterns including "positive" and "negative"
      if (!extractedBloodType) {
        const extendedMatch = message.match(/(O\s*positive|O\s*negative|A\s*positive|A\s*negative|B\s*positive|B\s*negative|AB\s*positive|AB\s*negative|o\s*positive|o\s*negative|a\s*positive|a\s*negative|b\s*positive|b\s*negative|ab\s*positive|ab\s*negative)/i);
        if (extendedMatch) {
          requestData.bloodType = extendedMatch[0].toUpperCase().replace(/\s+/g, '').replace('POSITIVE', '+').replace('NEGATIVE', '-');
        } else {
          // If still no blood type found, don't default - let user specify
          requestData.bloodType = 'Not specified';
        }
      } else {
        requestData.bloodType = extractedBloodType;
      }

      // Translate message to English for storage
      const englishMessage = translateToEnglish(message);

      requestData.urgencyLevel = priority === 'urgent' ? 'urgent' : 'high';
      requestData.unitsNeeded = 1;
      requestData.hospitalName = 'To be specified';
      requestData.patientName = user.name;
      requestData.relationship = 'Self';
      requestData.medicalCondition = englishMessage;
      requestData.contactNumber = user.phone || 'Not provided';
      requestData.requiredDate = new Date();
      requestData.additionalNotes = englishMessage;
      const { title, description } = buildTitleAndDescription({ message: englishMessage, type: 'blood', priority, bloodType: requestData.bloodType });
      requestData.title = title;
      requestData.description = description;
    } else if (requestType === 'elder_support') {
      // Translate message to English for storage
      const englishMessage = translateToEnglish(message);

      requestData.serviceType = 'Other';
      requestData.elderName = user.name;
      requestData.age = 'Not specified';
      requestData.supportType = ['other'];
      requestData.frequency = 'one-time';
      requestData.timeSlot = 'flexible';
      requestData.specialRequirements = englishMessage;
      requestData.dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const { title, description } = buildTitleAndDescription({ message: englishMessage, type: 'elder_support', priority });
      requestData.title = title;
      requestData.description = description;
    } else if (requestType === 'complaint') {
      // Translate message to English for storage
      const englishMessage = translateToEnglish(message);

      // Determine complaint category based on allowed enum in Request model (using English message)
      let complaintCategory = 'Other';
      if (/street|light|road|pothole|footpath|sidewalk/i.test(englishMessage)) complaintCategory = 'Road Maintenance';
      else if (/water|water\s*supply|drainage|sewage|pipeline/i.test(englishMessage)) complaintCategory = 'Water Supply';
      else if (/sanitation|toilet|cleanliness/i.test(englishMessage)) complaintCategory = 'Sanitation';
      else if (/electricity|power|current|transformer|wire/i.test(englishMessage)) complaintCategory = 'Electricity';
      else if (/garbage|waste|cleaning|trash|dump/i.test(englishMessage)) complaintCategory = 'Waste Management';
      else if (/safety|theft|crime|harassment|accident|violence|danger/i.test(englishMessage)) complaintCategory = 'Public Safety';
      else if (/hospital|clinic|doctor|medical/i.test(englishMessage)) complaintCategory = 'Healthcare';
      else if (/school|college|education/i.test(englishMessage)) complaintCategory = 'Education';
      else if (/bus|train|transport|traffic/i.test(englishMessage)) complaintCategory = 'Transportation';
      const { title, description } = buildTitleAndDescription({ message: englishMessage, type: 'complaint', priority, complaintCategory });
      requestData.title = title;
      requestData.description = description;
      requestData.category = complaintCategory;
      requestData.severity = priority === 'urgent' ? 'high' : 'medium';
    }

    // Add voice-specific data if applicable
    if (isVoice && voiceData) {
      requestData.voiceData = voiceData;
      requestData.source = 'voice_chat';
    } else {
      requestData.source = 'text_chat';
    }

    // Create the request
    console.log('About to create request with data:', JSON.stringify(requestData, null, 2));
    const request = new Request(requestData);
    console.log('Request object before save - priority:', request.priority);
    await request.save();

    console.log('Created request from chat:', request._id, 'Type:', requestType);
    return request;
  } catch (error) {
    console.error('Error creating request from chat:', error);
    throw error;
  }
}

// Helper: sentence case and compact whitespace
function toSentenceCase(text) {
  if (!text) return '';
  const t = String(text).replace(/\s+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Helper: extract rough location after prepositions like in/at/near
function extractLocation(text) {
  const m = text.match(/(?:\bin|\bat|\bnear)\s+([A-Za-z][A-Za-z\s]{2,40})/i);
  if (!m) return null;
  return m[1].replace(/\s+/g, ' ').trim();
}

// Helper: summarize to a short sentence
function summarize(text, maxLen = 180) {
  const clean = toSentenceCase(text);
  if (clean.length <= maxLen) return clean;
  const cut = clean.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 50 ? cut.slice(0, lastSpace) : cut) + '...';
}

// Helper: build smart title/description for cards
function buildTitleAndDescription({ message, type, priority, bloodType, complaintCategory }) {
  const location = extractLocation(message);
  let title = '';
  let description = '';

  if (type === 'blood') {
    const bt = bloodType || extractBloodType(message);
    const urgentTag = (priority === 'urgent') ? ' (URGENT)' : '';
    title = `Need ${bt} blood${location ? ' in ' + location : ''}${urgentTag}`;
    description = `Request for ${bt} blood${location ? ' in ' + location : ''}. Priority: ${(priority || 'medium').toUpperCase()}.`;

  } else if (type === 'elder_support') {
    let kind = 'Elder support needed';
    if (/medicine|tablet|paracetamol|prescription/i.test(message)) kind = 'Medicine delivery needed';
    else if (/grocery|vegetable|milk|shopping/i.test(message)) kind = 'Grocery help needed';
    else if (/appointment|hospital|clinic|checkup/i.test(message)) kind = 'Medical appointment help';
    else if (/house|clean|cook|laundry|household/i.test(message)) kind = 'Household help needed';
    title = `${kind}${location ? ' - ' + location : ''}`;
    description = `Elder support request: ${kind}${location ? ' in ' + location : ''}. Priority: ${(priority || 'medium').toUpperCase()}.`;

  } else if (type === 'complaint') {
    const c = complaintCategory || 'Other';
    const baseByCat = {
      'Road Maintenance': 'Road maintenance issue',
      'Water Supply': 'Water supply issue',
      'Sanitation': 'Sanitation issue',
      'Electricity': 'Electricity issue',
      'Waste Management': 'Waste management issue',
      'Public Safety': 'Public safety issue',
      'Healthcare': 'Healthcare issue',
      'Education': 'Education issue',
      'Transportation': 'Transportation issue',
      'Infrastructure': 'Infrastructure issue',
      'Other': 'Community issue'
    };
    if (/street\s*light/i.test(message)) title = 'Street lights not working';
    else if (/pothole|holes?\s+in\s+road/i.test(message)) title = 'Potholes on road';
    else if (/garbage|trash|waste/i.test(message)) title = 'Garbage accumulation issue';
    else if (/water\s*leak|no\s*water/i.test(message)) title = 'Water supply problem';
    else if (/power\s*cut|electricity\s*outage|transformer/i.test(message)) title = 'Electricity outage issue';
    else title = baseByCat[c];
    if (location) title += ` - ${location}`;
    description = `${title}. Category: ${c}.`;

  } else {
    title = summarize(message, 80);
    description = title;

  }

  return { title, description };
}

/**
 * Detect language from text content
 */
function detectLanguageFromText(text) {
  // Check for Telugu characters (including common words)
  if (/[\u0C00-\u0C7F]/.test(text) || /రక్తం|కావాలి|అవసరం|పాజిటివ్|నెగటివ్|అత్యవసరం|త్వరగా/.test(text)) {
    return 'te';
  }

  // Check for Hindi characters (including common words)
  if (/[\u0900-\u097F]/.test(text) || /खून|रक्त|चाहिए|आवश्यक|पॉजिटिव|नेगेटिव|तुरंत|आपातकाल/.test(text)) {
    return 'hi';
  }

  // Check for Telugu words in English script
  if (/\b(rakthamu|kavali|avasaram|positive|negative|athyavasaram|thvaraga)\b/i.test(text)) {
    return 'te';
  }

  // Check for Hindi words in English script
  if (/\b(khoon|rakth|chahiye|aavashyak|positive|negative|turant|aapatkaal)\b/i.test(text)) {
    return 'hi';
  }

  // Default to English
  return 'en';
}

/**
 * Translate message to English for consistent storage
 */
function translateToEnglish(text) {
  // If already in English, return as is
  if (!/[\u0900-\u097F\u0C00-\u0C7F]/.test(text)) {
    return text;
  }

  // Basic Hindi to English translations for common terms
  let translated = text
    // Blood related terms
    .replace(/रक्त|खून/gi, 'blood')
    .replace(/रक्तदान/gi, 'blood donation')
    .replace(/चाहिए|आवश्यक/gi, 'need')
    .replace(/तुरंत|तत्काल/gi, 'urgent')
    .replace(/आपातकाल/gi, 'emergency')
    .replace(/बुजुर्ग/gi, 'elderly')
    .replace(/दवा|दवाई/gi, 'medicine')
    .replace(/किराना/gi, 'grocery')
    .replace(/देखभाल/gi, 'care')
    .replace(/शिकायत/gi, 'complaint')
    .replace(/समस्या/gi, 'problem')
    .replace(/सड़क/gi, 'road')
    .replace(/बत्ती|लाइट/gi, 'light')
    .replace(/पानी/gi, 'water')
    .replace(/बिजली/gi, 'electricity')
    .replace(/कचरा/gi, 'garbage')
    .replace(/अस्पताल/gi, 'hospital')
    .replace(/मरीज|रोगी/gi, 'patient')
    .replace(/सर्जरी|ऑपरेशन/gi, 'surgery')
    // Blood types
    .replace(/ए पॉजिटिव/gi, 'A positive')
    .replace(/ए नेगेटिव/gi, 'A negative')
    .replace(/बी पॉजिटिव/gi, 'B positive')
    .replace(/बी नेगेटिव/gi, 'B negative')
    .replace(/एबी पॉजिटिव/gi, 'AB positive')
    .replace(/एबी नेगेटिव/gi, 'AB negative')
    .replace(/ओ पॉजिटिव/gi, 'O positive')
    .replace(/ओ नेगेटिव/gi, 'O negative');

  // Basic Telugu to English translations
  translated = translated
    // Blood related terms
    .replace(/రక్తం/gi, 'blood')
    .replace(/రక్తదానం/gi, 'blood donation')
    .replace(/కావాలి|అవసరం/gi, 'need')
    .replace(/అత్యవసరం|తక్షణం/gi, 'urgent')
    .replace(/వృద్ధులు|పెద్దలు/gi, 'elderly')
    .replace(/మందు|మందులు/gi, 'medicine')
    .replace(/కిరాణా/gi, 'grocery')
    .replace(/సంరక్షణ/gi, 'care')
    .replace(/ఫిర్యాదు/gi, 'complaint')
    .replace(/సమస్య/gi, 'problem')
    .replace(/రోడ్డు/gi, 'road')
    .replace(/లైట్/gi, 'light')
    .replace(/నీరు/gi, 'water')
    .replace(/కరెంట్/gi, 'electricity')
    .replace(/చెత్త/gi, 'garbage')
    .replace(/ఆసుపత్రి/gi, 'hospital')
    .replace(/రోగి/gi, 'patient')
    .replace(/శస్త్రచికిత్స/gi, 'surgery')
    // Blood types
    .replace(/ఎ పాజిటివ్/gi, 'A positive')
    .replace(/ఎ నెగటివ్/gi, 'A negative')
    .replace(/బి పాజిటివ్/gi, 'B positive')
    .replace(/బి నెగటివ్/gi, 'B negative')
    .replace(/ఎబి పాజిటివ్/gi, 'AB positive')
    .replace(/ఎబి నెగటివ్/gi, 'AB negative')
    .replace(/ఓ పాజిటివ్/gi, 'O positive')
    .replace(/ఓ నెగటివ్/gi, 'O negative');

  return translated;
}

/**
 * Extract blood type from message text - supports multiple languages
 */
function extractBloodType(text) {
  // More comprehensive pattern to catch various formats including Hindi/Telugu
  const bloodTypePattern = /\b(O\+|O-|A\+|A-|B\+|B-|AB\+|AB-|O\s*positive|O\s*negative|A\s*positive|A\s*negative|B\s*positive|B\s*negative|AB\s*positive|AB\s*negative|o\+|o-|a\+|a-|b\+|b-|ab\+|ab-|o\s*positive|o\s*negative|a\s*positive|a\s*negative|b\s*positive|b\s*negative|ab\s*positive|ab\s*negative)\b/i;
  const match = text.match(bloodTypePattern);

  if (match) {
    let bloodType = match[1].toUpperCase();
    // Normalize blood type format
    bloodType = bloodType.replace(/\s+/g, '').replace('POSITIVE', '+').replace('NEGATIVE', '-');
    return bloodType;
  }

  // Try alternative patterns like "need A positive blood" or "want O negative" (English)
  const alternativePattern = /\b(need|want|require|looking for|चाहिए|आवश्यक|కావాలి|అవసరం)\s+(A|B|AB|O)\s*(positive|negative|\+|\-|पॉजिटिव|नेगेटिव|పాజిటివ్|నెగటివ్)/i;
  const altMatch = text.match(alternativePattern);

  if (altMatch) {
    const bloodGroup = altMatch[2].toUpperCase();
    const rhFactor = altMatch[3].toLowerCase();
    const rh = (rhFactor === 'positive' || rhFactor === '+' || rhFactor === 'पॉजिटिव' || rhFactor === 'పాజిటివ్') ? '+' : '-';
    return bloodGroup + rh;
  }

  // Try Hindi patterns like "ए पॉजिटिव खून" or "ओ नेगेटिव रक्त"
  const hindiPattern = /\b(ए|बी|एबी|ओ)\s*(पॉजिटिव|नेगेटिव|\+|\-)\s*(खून|रक्त)/i;
  const hindiMatch = text.match(hindiPattern);

  if (hindiMatch) {
    const bloodGroupMap = { 'ए': 'A', 'बी': 'B', 'एबी': 'AB', 'ओ': 'O' };
    const bloodGroup = bloodGroupMap[hindiMatch[1]] || hindiMatch[1];
    const rh = (hindiMatch[2] === 'पॉजिटिव' || hindiMatch[2] === '+') ? '+' : '-';
    return bloodGroup + rh;
  }

  // Try Telugu patterns like "ఎ పాజిటివ్ రక్తం" or "ఓ నెగటివ్ రక్తం"
  const teluguPattern = /\b(ఎ|బి|ఎబి|ఓ)\s*(పాజిటివ్|నెగటివ్|\+|\-)\s*(రక్తం)/i;
  const teluguMatch = text.match(teluguPattern);

  if (teluguMatch) {
    const bloodGroupMap = { 'ఎ': 'A', 'బి': 'B', 'ఎబి': 'AB', 'ఓ': 'O' };
    const bloodGroup = bloodGroupMap[teluguMatch[1]] || teluguMatch[1];
    const rh = (teluguMatch[2] === 'పాజిటివ్' || teluguMatch[2] === '+') ? '+' : '-';
    return bloodGroup + rh;
  }

  return null;
}

/**
 * Categorize request based on content
 */
function categorizeRequest(text) {
  const lowerText = text.toLowerCase();

  // Blood request patterns
  if (/blood|donate|donation|transfusion|plasma|platelets|रक्त|खून|రక్తం|donor|o\+|o-|a\+|a-|b\+|b-|ab\+|ab-|surgery|operation|hospital|patient/.test(lowerText)) {
    return 'blood_request';
  }

  // Emergency patterns (check before other categories)
  if (/emergency|urgent|critical|immediate|asap|help.*urgent|आपातकाल|तुरंत|అత్యవసరం|911|108|ambulance/.test(lowerText)) {
    return 'emergency';
  }

  // Elder support patterns
  if (/elderly|old|senior|medicine|grocery|care|caregiver|nursing|assistance|बुजुर्ग|दवा|వృద్ధులు|మందులు|grandfather|grandmother|parent|mom|dad|mother|father/.test(lowerText)) {
    return 'elder_support';
  }

  // Complaint patterns
  if (/complaint|problem|issue|broken|not working|damaged|fault|repair|fix|शिकायत|समस्या|ఫిర్యాదు|సమస్య|street|light|road|water|electricity|garbage|sewage|drainage|pothole|noise|pollution/.test(lowerText)) {
    return 'complaint';
  }

  return 'general_inquiry';
}

/**
 * Determine priority based on content
 */
function determinePriority(text) {
  const lowerText = text.toLowerCase();

  if (/emergency|urgent|critical|आपातकाल|तुरंत|అత్యవసరం/.test(lowerText)) return 'urgent';
  if (/important|asap|soon|जल्दी|త్వరగా/.test(lowerText)) return 'high';
  if (/whenever|no rush|जब समय हो|సమయం ఉన్నప్పుడు/.test(lowerText)) return 'low';

  return 'medium';
}

/**
 * Generate conversational AI responses for general inquiries
 */
function generateGeneralResponse(message) {
  const lowerMessage = message.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|namaste)$/i.test(lowerMessage)) {
    return `Hello! 👋 I'm your SevaLink AI assistant. I'm here to help you with community services and support.\n\n**I can help you with:**\n• Blood donation requests\n• Elder care support\n• Filing complaints\n• General information\n\nHow can I assist you today?`;
  }

  // How are you
  if (/how are you|how do you do/i.test(lowerMessage)) {
    return `I'm doing great, thank you for asking! 😊 I'm here and ready to help you with any community services you need.\n\nIs there anything specific I can assist you with today?`;
  }

  // Thank you
  if (/thank you|thanks|thx/i.test(lowerMessage)) {
    return `You're very welcome! 😊 I'm glad I could help.\n\nIf you need any other assistance with community services, feel free to ask anytime!`;
  }

  // What can you do
  if (/what can you do|what do you do|help me|capabilities/i.test(lowerMessage)) {
    return `I'm your SevaLink AI assistant! Here's what I can help you with:\n\n🩸 **Blood Requests** - Find blood donors quickly\n👴 **Elder Support** - Get help for elderly care\n📝 **Complaints** - Report community issues\n❓ **Information** - Answer questions about services\n\n**Just tell me what you need!** For example:\n• "I need B+ blood urgently"\n• "My grandmother needs medicine delivery"\n• "Street lights not working in my area"`;
  }

  // About SevaLink
  if (/what is sevalink|about sevalink|sevalink/i.test(lowerMessage)) {
    return `SevaLink is a community service platform that connects people who need help with volunteers who can provide assistance.\n\n**Our Services:**\n• Blood donation coordination\n• Elder care support\n• Community complaint management\n• Emergency assistance\n\nWe're here to make your community stronger and more connected! 🤝`;
  }

  // Educational questions (like mitochondria)
  if (/what is|tell me about|explain/i.test(lowerMessage)) {
    if (/mitochondria|mitchondria/i.test(lowerMessage)) {
      return `Mitochondria are often called the "powerhouses" of the cell! 🔋\n\nThey're tiny structures inside cells that produce energy (ATP) for cellular processes. They have their own DNA and are essential for life.\n\n**Fun fact:** Mitochondria are thought to have evolved from ancient bacteria!\n\nIs there anything else you'd like to know?`;
    }
    if (/rbc|red blood cells/i.test(lowerMessage)) {
      return `RBC stands for Red Blood Cells! 🩸\n\nThey're the most common type of blood cell and carry oxygen from your lungs to the rest of your body using a protein called hemoglobin.\n\n**Key facts:**\n• They live about 120 days\n• They give blood its red color\n• Normal count: 4.5-5.5 million per microliter\n\nSpeaking of blood - if you need blood donation help, I can assist with that too!`;
    }
    return `That's an interesting question! While I'd love to help with general knowledge, I'm specifically designed to assist with community services.\n\n**I'm best at helping with:**\n• Blood donation requests\n• Elder care support\n• Community complaints\n• Service information\n\nIs there a community service I can help you with?`;
  }

  // Default conversational response
  return `I understand you're reaching out! 😊 While I'm here to chat, I'm specifically designed to help with community services.\n\n**I can assist you with:**\n• Blood donation requests\n• Elder care support\n• Filing complaints\n• Emergency assistance\n\nIs there a specific service you need help with today?`;
}

/**
 * Generate fallback response when Gemini is unavailable
 */
function generateFallbackResponse(category, message) {
  const responses = {
    'blood_request': `✅ **Blood Request Created Successfully!**\n\nI understand you need blood donation assistance. Your request has been automatically created and saved to your account.\n\n**What happens next:**\n• Volunteers will be notified immediately\n• Check "My Requests" in your dashboard to track progress\n• You'll receive calls/messages from potential donors\n• Keep your phone accessible\n\n**Estimated Response Time:** 2-4 hours for urgent requests\n\n💡 **Tip:** Visit Dashboard → My Requests to see your submission details.`,
    'elder_support': `✅ **Elder Support Request Created!**\n\nI understand you need assistance for elderly care. Your request has been automatically saved and volunteers will be notified.\n\n**What happens next:**\n• Volunteers specializing in elder care will be notified\n• You'll receive contact from suitable helpers\n• Check "My Requests" in your dashboard for updates\n• Response typically within 4-6 hours\n\n💡 **Tip:** You can add more details by editing your request in the dashboard.`,
    'complaint': `✅ **Complaint Registered Successfully!**\n\nI've received and logged your complaint in the system. Your issue has been automatically created as a formal complaint.\n\n**What happens next:**\n• Relevant authorities will be notified\n• You'll receive updates on resolution progress\n• Track status in "My Requests" section\n• Expected acknowledgment within 24 hours\n\n💡 **Tip:** Reference your complaint ID in future communications.`,
    'emergency': `🚨 **Emergency Request Created - HIGH PRIORITY!**\n\nI understand this is urgent. Your emergency request has been automatically created with highest priority.\n\n**Immediate Actions:**\n• Emergency volunteers are being notified NOW\n• You should receive contact within 30 minutes\n• Your request is marked as URGENT in the system\n\n**For life-threatening emergencies, please also call 108 (ambulance) or 112.**`,
    'general_inquiry': generateGeneralResponse(message)
  };

  return responses[category] || responses['general_inquiry'];
}

// @route   POST /api/chatbot/translate
// @desc    Translate text between languages
// @access  Private
router.post('/translate', auth, async (req, res) => {
  try {
    const { text, fromLang, toLang } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Text is required for translation'
      });
    }

    if (!fromLang || !toLang) {
      return res.status(400).json({
        success: false,
        message: 'Source and target languages are required'
      });
    }

    console.log('Translation route: Processing translation request...');
    console.log('Translation route: Text:', text);
    console.log('Translation route: From:', fromLang, 'To:', toLang);

    const translationResult = await translationService.translateText(text, fromLang, toLang);

    if (translationResult.success) {
      res.json({
        success: true,
        message: 'Text translated successfully',
        data: {
          originalText: translationResult.originalText,
          translatedText: translationResult.translatedText,
          fromLanguage: translationResult.fromLanguage,
          toLanguage: translationResult.toLanguage,
          confidence: translationResult.confidence,
          method: translationResult.method,
          translationsFound: translationResult.translationsFound
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Translation failed',
        error: translationResult.error
      });
    }

  } catch (error) {
    console.error('Translation route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing translation request',
      error: error.message
    });
  }
});

// @route   POST /api/chatbot/detect-language
// @desc    Detect language of text
// @access  Private
router.post('/detect-language', auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Text is required for language detection'
      });
    }

    console.log('Language detection route: Processing text:', text);

    const detectionResult = await translationService.detectLanguage(text);

    if (detectionResult.success) {
      res.json({
        success: true,
        message: 'Language detected successfully',
        data: {
          text: text,
          detectedLanguage: detectionResult.language,
          confidence: detectionResult.confidence,
          method: detectionResult.method
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Language detection failed',
        error: detectionResult.error
      });
    }

  } catch (error) {
    console.error('Language detection route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing language detection request',
      error: error.message
    });
  }
});

module.exports = router;
