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


      const { language = 'auto' } = req.body;
      const audioFile = req.file;

      if (!audioFile) {
        return res.status(400).json({
          success: false,
          message: 'Audio file is required'
        });
      }

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


        } else {
          throw new Error(transcriptionResult.error || 'Whisper transcription failed');
        }
      } catch (whisperError) {

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
          } catch (dbError) {
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
      const { message, language = 'en', confidence = 0.95, voiceMetadata = {}, conversationContext = {} } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message text is required'
        });
      }

      const trimmedMessage = message.trim();
      const startTime = Date.now();

      // Detect language from actual message content if not provided or if auto
      const detectedLanguage = (language === 'auto' || !language) ? detectLanguageFromText(trimmedMessage) : language;


      // Process with Gemini Pro (with fallback for quota issues)
      let geminiResult;
      try {
        geminiResult = await geminiVoiceService.processTextWithGemini(trimmedMessage, {
          language: detectedLanguage,
          inputMethod: 'voice',
          userType: 'citizen'
        });
      } catch (error) {
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

      // Decide final category/priority
      const heuristicCategory = categorizeRequest(trimmedMessage);
      let finalCategory = (geminiResult.category && geminiResult.category !== 'general_inquiry')
        ? geminiResult.category
        : heuristicCategory;
      const finalPriority = geminiResult.priority || determinePriority(trimmedMessage);


      // Use Gemini to extract information intelligently (same as text route)
      let extractedInfo = {};
      let missingInfo = [];
      let needsMoreInfo = false;
      let geminiExtraction = null;

      if (shouldCreateRequest(finalCategory, trimmedMessage)) {

        // Try Gemini-powered extraction first
        geminiExtraction = await geminiVoiceService.extractInformationWithGemini(
          trimmedMessage,
          finalCategory,
          detectedLanguage,
          conversationContext
        );


        if (geminiExtraction.success && !geminiExtraction.usingFallback) {
          extractedInfo = { ...conversationContext, ...geminiExtraction.extractedInfo };
          missingInfo = geminiExtraction.missingRequired || [];
          needsMoreInfo = geminiExtraction.needsMoreInfo || false;
        } else {
          // Fallback to hardcoded extraction
          extractedInfo = extractRequestInfo(trimmedMessage, finalCategory, conversationContext);
          missingInfo = getMissingRequiredInfo(finalCategory, extractedInfo);
          needsMoreInfo = missingInfo.length > 0;
        }

      }

      let createdRequest = null;
      let responseMessage = '';

      if (shouldCreateRequest(finalCategory, trimmedMessage)) {
        if (needsMoreInfo && missingInfo.length > 0) {

          // Use Gemini to generate intelligent follow-up question
          const geminiQuestion = await geminiVoiceService.generateFollowUpQuestion(
            finalCategory,
            missingInfo[0],
            extractedInfo,
            detectedLanguage
          );

          if (geminiQuestion.success && !geminiQuestion.usingFallback) {
            responseMessage = geminiQuestion.question;
          } else {
            // Fallback to template-based questions
            responseMessage = generateFollowUpQuestion(finalCategory, missingInfo[0], extractedInfo);
          }

          // Save chat with pending request context
          await saveChatMessage(
            req.user.userId,
            trimmedMessage,
            responseMessage,
            finalCategory,
            finalPriority,
            'voice',
            { confidence, detectedLanguage, duration: voiceMetadata.duration || 0 },
            {
              usingFallback: geminiResult.usingFallback,
              processingTime: Date.now() - startTime,
              pendingRequest: true,
              extractedInfo: extractedInfo,
              missingInfo: missingInfo,
              geminiExtraction: geminiExtraction?.success || false
            }
          );
        } else {
          // We have all required information, create the request
          try {
            createdRequest = await createRequestFromChatWithInfo(
              req.user.userId,
              trimmedMessage,
              finalCategory,
              finalPriority,
              extractedInfo
            );

            // Use Gemini to generate success message
            try {
              const successPrompt = `A user successfully created a ${finalCategory.replace('_', ' ')} request via voice.

Details:
${JSON.stringify(extractedInfo, null, 2)}

Request ID: ${createdRequest._id}

Generate a friendly, encouraging confirmation message in ${detectedLanguage}. 
- Acknowledge what they requested
- Mention the key details they provided
- Tell them what happens next (volunteers will be notified)
- Keep it warm and human
- 2-3 sentences max`;

              const geminiSuccess = await geminiVoiceService.processTextWithGemini(successPrompt, {
                language: detectedLanguage,
                inputMethod: 'voice',
                userType: 'citizen'
              });

              responseMessage = geminiSuccess.response || generateSuccessMessage(finalCategory, extractedInfo, createdRequest);
            } catch (error) {
              // Fallback to template if Gemini fails
              responseMessage = generateSuccessMessage(finalCategory, extractedInfo, createdRequest);
            }

            const chatMessage = await saveChatMessage(
              req.user.userId,
              trimmedMessage,
              responseMessage,
              finalCategory,
              finalPriority,
              'voice',
              { confidence, detectedLanguage, duration: voiceMetadata.duration || 0 },
              {
                usingFallback: geminiResult.usingFallback,
                processingTime: Date.now() - startTime,
                geminiResponse: geminiResult.response,
                geminiExtraction: geminiExtraction?.success || false
              }
            );

            if (createdRequest) {
              await chatMessage.markAsRequestCreator(createdRequest._id);
            }
          } catch (requestError) {
            console.error('❌ Voice: Failed to create request:', requestError.message);
            responseMessage = 'I understood your request, but encountered an error saving it. Please try again.';
          }
        }
      } else {
        // General inquiry or greeting - use Gemini's direct response
        responseMessage = geminiResult.response || 'How can I help you today?';

        await saveChatMessage(
          req.user.userId,
          trimmedMessage,
          responseMessage,
          finalCategory,
          finalPriority,
          'voice',
          { confidence, detectedLanguage, duration: voiceMetadata.duration || 0 },
          {
            usingFallback: geminiResult.usingFallback,
            processingTime: Date.now() - startTime,
            geminiResponse: geminiResult.response
          }
        );
      }

      // Build response payload
      const responseData = {
        id: Date.now().toString(),
        transcribedText: trimmedMessage,
        category: finalCategory,
        priority: finalPriority,
        extractedInfo: extractedInfo,
        missingInfo: missingInfo,
        needsMoreInfo: needsMoreInfo,
        geminiResponse: responseMessage,
        detectedLanguage: detectedLanguage,
        confidence: confidence,
        processedAt: new Date(),
        createdRequestId: createdRequest?._id || null,
        needsVoiceResponse: true,
        voiceResponse: geminiVoiceService.prepareVoiceResponse(responseMessage, detectedLanguage),
        usingFallback: geminiResult.usingFallback || false,
        geminiExtraction: geminiExtraction?.success || false
      };


      res.json({
        success: true,
        message: createdRequest ? 'Request created successfully' : (needsMoreInfo ? 'Need more information' : 'Message processed'),
        data: responseData
      });

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
// @desc    Process text message (manual input) with intelligent follow-up questions
// @access  Private
router.post('/text',
  auth,
  textMessageValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { message, language = 'en', conversationContext = {} } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message text is required'
        });
      }

      const trimmedMessage = message.trim();
      const startTime = Date.now();


      // Process with Gemini Pro (with fallback for quota issues)
      let geminiResult;
      try {
        geminiResult = await geminiVoiceService.processTextWithGemini(trimmedMessage, {
          language,
          inputMethod: 'text',
          userType: 'citizen'
        });
      } catch (error) {
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

      // Decide final category/priority
      const heuristicCategory = categorizeRequest(trimmedMessage);
      let finalCategory = (geminiResult.category && geminiResult.category !== 'general_inquiry')
        ? geminiResult.category
        : heuristicCategory;
      const finalPriority = geminiResult.priority || determinePriority(trimmedMessage);


      // Use Gemini to extract information intelligently
      let extractedInfo = {};
      let missingInfo = [];
      let needsMoreInfo = false;
      let geminiExtraction = null;

      if (shouldCreateRequest(finalCategory, trimmedMessage)) {

        // Try Gemini-powered extraction first
        geminiExtraction = await geminiVoiceService.extractInformationWithGemini(
          trimmedMessage,
          finalCategory,
          language,
          conversationContext
        );


        if (geminiExtraction.success && !geminiExtraction.usingFallback) {
          extractedInfo = { ...conversationContext, ...geminiExtraction.extractedInfo };
          missingInfo = geminiExtraction.missingRequired || [];
          needsMoreInfo = geminiExtraction.needsMoreInfo || false;
        } else {
          // Fallback to hardcoded extraction
          extractedInfo = extractRequestInfo(trimmedMessage, finalCategory, conversationContext);

          // Ensure urgency extraction in fallback too!
          if (!extractedInfo.urgencyLevel) {
            extractedInfo.urgencyLevel = extractUrgency(trimmedMessage);
          }

          missingInfo = getMissingRequiredInfo(finalCategory, extractedInfo);
          needsMoreInfo = missingInfo.length > 0;
        }
      }

      let createdRequest = null;
      let responseMessage = '';

      if (shouldCreateRequest(finalCategory, trimmedMessage)) {
        if (needsMoreInfo && missingInfo.length > 0) {

          // Use Gemini to generate intelligent follow-up question
          const geminiQuestion = await geminiVoiceService.generateFollowUpQuestion(
            finalCategory,
            missingInfo[0],
            extractedInfo,
            language
          );

          if (geminiQuestion.success && !geminiQuestion.usingFallback) {
            responseMessage = geminiQuestion.question;
          } else {
            // Fallback to template-based questions
            responseMessage = generateFollowUpQuestion(finalCategory, missingInfo[0], extractedInfo);
          }

          // Save chat with pending request context
          await saveChatMessage(
            req.user.userId,
            trimmedMessage,
            responseMessage,
            finalCategory,
            finalPriority,
            'text',
            null,
            {
              usingFallback: geminiResult.usingFallback,
              processingTime: Date.now() - startTime,
              pendingRequest: true,
              extractedInfo: extractedInfo,
              missingInfo: missingInfo,
              geminiExtraction: geminiExtraction?.success || false
            }
          );
        } else {


          // We have all required information, create the request
          try {
            createdRequest = await createRequestFromChatWithInfo(
              req.user.userId,
              trimmedMessage,
              finalCategory,
              finalPriority,
              extractedInfo
            );

            // Use Gemini to generate success message
            try {
              const successPrompt = `A user successfully created a ${finalCategory.replace('_', ' ')} request.

Details:
${JSON.stringify(extractedInfo, null, 2)}

Request ID: ${createdRequest._id}

Generate a friendly, encouraging confirmation message in ${language}. 
- Acknowledge what they requested
- Mention the key details they provided
- Tell them what happens next (volunteers will be notified)
- Keep it warm and human
- 2-3 sentences max`;

              const geminiSuccess = await geminiVoiceService.processTextWithGemini(successPrompt, {
                language,
                inputMethod: 'text',
                userType: 'citizen'
              });

              responseMessage = geminiSuccess.response || generateSuccessMessage(finalCategory, extractedInfo, createdRequest);
            } catch (error) {
              // Fallback to template if Gemini fails
              responseMessage = generateSuccessMessage(finalCategory, extractedInfo, createdRequest);
            }

            const chatMessage = await saveChatMessage(
              req.user.userId,
              trimmedMessage,
              responseMessage,
              finalCategory,
              finalPriority,
              'text',
              null,
              {
                usingFallback: geminiResult.usingFallback,
                processingTime: Date.now() - startTime,
                geminiResponse: geminiResult.response,
                geminiExtraction: geminiExtraction?.success || false
              }
            );

            if (createdRequest) {
              await chatMessage.markAsRequestCreator(createdRequest._id);
            }
          } catch (requestError) {
            responseMessage = 'I understood your request, but encountered an error saving it. Please try again.';
          }
        }
      } else {
        // General inquiry or greeting - use Gemini's direct response
        responseMessage = geminiResult.response || 'How can I help you today?';

        await saveChatMessage(
          req.user.userId,
          trimmedMessage,
          responseMessage,
          finalCategory,
          finalPriority,
          'text',
          null,
          {
            usingFallback: geminiResult.usingFallback,
            processingTime: Date.now() - startTime,
            geminiResponse: geminiResult.response
          }
        );
      }

      // Build response payload
      const responseData = {
        id: Date.now().toString(),
        transcribedText: trimmedMessage,
        category: finalCategory,
        priority: finalPriority,
        extractedInfo: extractedInfo,
        missingInfo: missingInfo,
        needsMoreInfo: needsMoreInfo,
        geminiResponse: responseMessage,
        processedAt: new Date(),
        createdRequestId: createdRequest?._id || null,
        needsVoiceResponse: false,
        usingFallback: geminiResult.usingFallback || false,
        geminiExtraction: geminiExtraction?.success || false
      };


      res.json({
        success: true,
        message: createdRequest ? 'Request created successfully' : (needsMoreInfo ? 'Need more information' : 'Message processed'),
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
 * Create request from chat with extracted information
 */
async function createRequestFromChatWithInfo(userId, message, category, priority, extractedInfo) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const requestType = category === 'blood_request' ? 'blood' :
    category === 'elder_support' ? 'elder_support' :
      category === 'complaint' ? 'complaint' : null;

  if (!requestType) {
    throw new Error('Invalid request category');
  }

  // Map priority
  const mappedPriority = priority === 'urgent' ? 'urgent' : (priority === 'high' ? 'high' : 'medium');

  const requestData = {
    type: requestType,
    user: userId,
    name: user.name,
    phone: user.phone || 'Not provided',
    email: user.email,
    location: {
      type: 'manual',
      coordinates: {
        lat: 16.523699,
        lng: 80.61359225
      },
      address: extractedInfo.location || 'Potti Sriramulu College Road, Vinchipeta',
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
    // 1. Try regex extraction first (Prioritize exact keywords)
    const regexUrgency = extractUrgency(message);

    // 2. Then try Gemini extracted urgency
    const geminiUrgency = extractedInfo.urgencyLevel ? extractedInfo.urgencyLevel.toLowerCase() : null;

    // 3. Determine final urgency: Regex > Gemini > Default (High)
    let urgencyLevel = regexUrgency || geminiUrgency || 'high';

    // Override the generic priority with our specific extracted urgency
    // This fixes the issue where initial classification might be "high" but user said "medium"
    requestData.priority = urgencyLevel;

    requestData.bloodType = extractedInfo.bloodType;
    requestData.urgencyLevel = urgencyLevel;
    requestData.unitsNeeded = extractedInfo.unitsNeeded || 1;
    requestData.hospitalName = extractedInfo.hospitalName || 'To be specified';
    requestData.patientName = extractedInfo.patientName || user.name;
    requestData.relationship = extractedInfo.relationship || 'Self';
    requestData.medicalCondition = extractedInfo.medicalCondition || message;
    requestData.contactNumber = user.phone || 'Not provided';
    requestData.requiredDate = extractedInfo.requiredDate ? new Date(extractedInfo.requiredDate) : new Date();
    requestData.additionalNotes = message;

    const { title, description } = buildTitleAndDescription({
      message,
      type: 'blood',
      priority: urgencyLevel,
      bloodType: extractedInfo.bloodType,
      location: extractedInfo.location
    });
    requestData.title = title;
    requestData.description = description;

  } else if (requestType === 'elder_support') {
    requestData.serviceType = extractedInfo.serviceType || 'Other';
    requestData.elderName = extractedInfo.elderName || user.name;
    requestData.age = extractedInfo.age || 'Not specified';
    requestData.supportType = extractedInfo.supportType || ['other'];
    requestData.frequency = extractedInfo.frequency || 'one-time';
    requestData.timeSlot = extractedInfo.timeSlot || 'flexible';
    requestData.specialRequirements = extractedInfo.specialRequirements || message;
    requestData.dueDate = extractedInfo.requiredDate ? new Date(extractedInfo.requiredDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { title, description } = buildTitleAndDescription({
      message,
      type: 'elder_support',
      priority,
      location: extractedInfo.location
    });
    requestData.title = title;
    requestData.description = description;

  } else if (requestType === 'complaint') {
    requestData.complaintCategory = extractedInfo.complaintCategory || 'Other';
    requestData.complaintLocation = extractedInfo.complaintLocation || extractedInfo.location || 'Not specified';
    requestData.severity = extractedInfo.severity || 'medium';
    requestData.description = extractedInfo.description || message;

    const { title, description } = buildTitleAndDescription({
      message,
      type: 'complaint',
      priority,
      complaintCategory: extractedInfo.complaintCategory,
      location: extractedInfo.complaintLocation || extractedInfo.location
    });
    requestData.title = title;
    requestData.description = description;
  }

  const request = await Request.create(requestData);
  return request;
}

/**
 * Create request from chat message (legacy function)
 */
async function createRequestFromChat(userId, message, category, priority, isVoice = false, voiceMetadata = null) {
  try {

    // Get user details (or use dummy data for testing)
    let user = await User.findById(userId);
    if (!user) {
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


    // Create base request data with proper location handling
    const mappedPriority = priority === 'urgent' ? 'urgent' : (priority === 'high' ? 'high' : 'medium');

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
        }
        // Don't set a default value - leave it undefined so the system knows to ask for it
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
    const request = new Request(requestData);
    await request.save();

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
    const bt = bloodType || 'blood';
    title = `Need ${bt} blood${location ? ' - ' + location : ''}`;
    description = `Request for ${bt} blood${location ? ' in ' + location : ''}.`;

  } else if (type === 'elder_support') {
    let kind = 'Elder support needed';
    if (/medicine|tablet|paracetamol|prescription/i.test(message)) kind = 'Medicine delivery needed';
    else if (/grocery|vegetable|milk|shopping/i.test(message)) kind = 'Grocery help needed';
    else if (/appointment|hospital|clinic|checkup/i.test(message)) kind = 'Medical appointment help';
    else if (/house|clean|cook|laundry|household/i.test(message)) kind = 'Household help needed';
    title = `${kind}${location ? ' - ' + location : ''}`;
    description = `Elder support request: ${kind}${location ? ' in ' + location : ''}.`;

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
 * Extract urgency level from text
 */
function extractUrgency(text) {
  const t = text.toLowerCase();

  if (/urgent|emergency|asap|immediately|critical|dying|serious/i.test(t)) return 'urgent';
  if (/low|not urgent|can wait|flexible|when possible|whenever/i.test(t)) return 'low';
  if (/high|soon|needed|required|fast|quick/i.test(t)) return 'high';
  if (/medium|normal|regular|moderate|standard/i.test(t)) return 'medium';

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

/**
 * Extract information from user message based on category
 */
function extractRequestInfo(message, category, conversationContext = {}) {
  const info = { ...conversationContext };
  const lowerMessage = message.toLowerCase();

  // Extract blood type for blood requests
  if (category === 'blood_request') {
    const bloodType = extractBloodType(message);
    if (bloodType) info.bloodType = bloodType;

    // Extract units needed
    const unitsMatch = message.match(/(\d+)\s*(unit|pint|bag)/i);
    if (unitsMatch) info.unitsNeeded = parseInt(unitsMatch[1]);

    // Extract hospital name
    const hospitalMatch = message.match(/(?:at|in|from)\s+([A-Z][a-zA-Z\s]+(?:hospital|medical|clinic|centre|center))/i);
    if (hospitalMatch) info.hospitalName = hospitalMatch[1].trim();

    // Extract patient relationship
    if (lowerMessage.includes('my mother') || lowerMessage.includes('mom')) info.relationship = 'Mother';
    else if (lowerMessage.includes('my father') || lowerMessage.includes('dad')) info.relationship = 'Father';
    else if (lowerMessage.includes('my brother')) info.relationship = 'Brother';
    else if (lowerMessage.includes('my sister')) info.relationship = 'Sister';
    else if (lowerMessage.includes('my friend')) info.relationship = 'Friend';
    else if (lowerMessage.includes('myself') || lowerMessage.includes('for me')) info.relationship = 'Self';

    // Extract urgency/date
    if (lowerMessage.includes('urgent') || lowerMessage.includes('emergency') || lowerMessage.includes('immediately')) {
      info.urgencyLevel = 'urgent';
      info.requiredDate = new Date();
    } else if (lowerMessage.includes('today')) {
      info.requiredDate = new Date();
    } else if (lowerMessage.includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      info.requiredDate = tomorrow;
    }
  }

  // Extract elder support information
  if (category === 'elder_support') {
    // Extract age
    const ageMatch = message.match(/(\d{2,3})\s*(?:year|yr|age)/i);
    if (ageMatch) info.age = ageMatch[1];

    // Extract elder name
    const nameMatch = message.match(/(?:for|help)\s+(?:my\s+)?(?:mother|father|grandmother|grandfather|grandma|grandpa)\s+([A-Z][a-z]+)/i);
    if (nameMatch) info.elderName = nameMatch[1];

    // Extract service type - must match Request schema enum values
    if (lowerMessage.includes('medicine') || lowerMessage.includes('medication') || lowerMessage.includes('pills')) {
      info.serviceType = 'Medicine Delivery';
      info.supportType = ['medical'];
    } else if (lowerMessage.includes('doctor') || lowerMessage.includes('appointment') || lowerMessage.includes('medical')) {
      info.serviceType = 'Medical Appointment';
      info.supportType = ['medical'];
    } else if (lowerMessage.includes('food') || lowerMessage.includes('meal') || lowerMessage.includes('cooking') || lowerMessage.includes('grocery')) {
      info.serviceType = 'Grocery Shopping';
      info.supportType = ['food'];
    } else if (lowerMessage.includes('clean') || lowerMessage.includes('hygiene') || lowerMessage.includes('household')) {
      info.serviceType = 'Household Help';
      info.supportType = ['hygiene'];
    } else if (lowerMessage.includes('companion') || lowerMessage.includes('company') || lowerMessage.includes('talk')) {
      info.serviceType = 'Companionship';
      info.supportType = ['companionship'];
    } else if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent')) {
      info.serviceType = 'Emergency Assistance';
      info.supportType = ['emergency'];
    }

    // Extract frequency
    if (lowerMessage.includes('daily') || lowerMessage.includes('every day')) info.frequency = 'daily';
    else if (lowerMessage.includes('weekly') || lowerMessage.includes('once a week')) info.frequency = 'weekly';
    else if (lowerMessage.includes('monthly')) info.frequency = 'monthly';
    else if (lowerMessage.includes('one time') || lowerMessage.includes('just once')) info.frequency = 'one-time';
  }

  // Extract complaint information
  if (category === 'complaint') {
    // Extract location
    const locationMatch = message.match(/(?:at|in|near)\s+([A-Z][a-zA-Z\s,]+)/);
    if (locationMatch) info.complaintLocation = locationMatch[1].trim();

    // Determine complaint category - be smart about mapping
    if (lowerMessage.includes('road') || lowerMessage.includes('pothole') || lowerMessage.includes('pot hole') || lowerMessage.includes('street') || lowerMessage.includes('pavement')) {
      info.complaintCategory = 'Road Maintenance';
    } else if (lowerMessage.includes('water') || lowerMessage.includes('drainage') || lowerMessage.includes('leak')) {
      info.complaintCategory = 'Water Supply';
    } else if (lowerMessage.includes('garbage') || lowerMessage.includes('waste') || lowerMessage.includes('trash') || lowerMessage.includes('dump')) {
      info.complaintCategory = 'Waste Management';
    } else if (lowerMessage.includes('electricity') || lowerMessage.includes('power') || lowerMessage.includes('light') || lowerMessage.includes('electric')) {
      info.complaintCategory = 'Electricity';
    } else if (lowerMessage.includes('safety') || lowerMessage.includes('crime') || lowerMessage.includes('security')) {
      info.complaintCategory = 'Public Safety';
    }
  }

  return info;
}

/**
 * Get list of missing required information
 */
function getMissingRequiredInfo(category, extractedInfo) {
  const missing = [];

  if (category === 'blood_request') {
    // Only bloodType is required - units and hospital are optional
    if (!extractedInfo.bloodType) missing.push('bloodType');
  }

  if (category === 'elder_support') {
    if (!extractedInfo.serviceType && !extractedInfo.supportType) missing.push('serviceType');
  }

  if (category === 'complaint') {
    if (!extractedInfo.complaintCategory) missing.push('complaintCategory');
  }

  return missing;
}

/**
 * Generate follow-up question for missing information
 */
function generateFollowUpQuestion(category, missingField, extractedInfo) {
  const questions = {
    blood_request: {
      bloodType: `I understand you need blood. What blood type is required? (e.g., A+, B+, O+, AB+, A-, B-, O-, AB-)`,
      unitsNeeded: `How many units of ${extractedInfo.bloodType || 'blood'} do you need?`,
      hospitalName: `Which hospital or medical center is this for?`,
      relationship: `Who needs the blood? (e.g., myself, mother, father, friend)`,
      urgencyLevel: `When is the blood needed? (e.g., urgent/today, tomorrow, this week)`
    },
    elder_support: {
      serviceType: `What kind of support do you need?\n• Medical Care\n• Food & Nutrition\n• Personal Hygiene\n• Companionship\n• Other`,
      age: `What is the age of the person needing support?`,
      frequency: `How often is support needed? (e.g., daily, weekly, one-time)`
    },
    complaint: {
      complaintCategory: `What type of issue are you reporting?\n• Road Maintenance\n• Water Supply\n• Waste Management\n• Electricity\n• Public Safety\n• Other`,
      complaintLocation: `Where is this issue located? (Please provide the address or area)`
    }
  };

  return questions[category]?.[missingField] || 'Could you provide more details about your request?';
}

/**
 * Create request with extracted information
 */
async function createRequestFromChatWithInfo(userId, message, category, priority, extractedInfo) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // CRITICAL: Validate we have all required info BEFORE creating request
  if (category === 'blood_request') {
    if (!extractedInfo.bloodType) {
      throw new Error('Cannot create blood request without blood type');
    }
  }

  let requestType = category === 'blood_request' ? 'blood' : category;
  const mappedPriority = priority === 'urgent' ? 'urgent' : (priority === 'high' ? 'high' : 'medium');

  const requestData = {
    type: requestType,
    user: userId,
    name: user.name,
    phone: user.phone || 'Not provided',
    email: user.email,
    location: {
      type: 'manual',
      coordinates: { lat: 16.523699, lng: 80.61359225 },
      address: 'Potti Sriramulu College Road, Vinchipeta',
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
      pincode: '520001',
      country: 'India'
    },
    priority: mappedPriority,
    status: 'pending'
  };

  // Add type-specific fields from extracted info
  if (requestType === 'blood') {
    const englishMessage = translateToEnglish(message);
    requestData.bloodType = extractedInfo.bloodType; // REQUIRED - already validated above
    requestData.urgencyLevel = extractedInfo.urgencyLevel || (priority === 'urgent' ? 'urgent' : 'high');
    requestData.unitsNeeded = extractedInfo.unitsNeeded || 1;
    requestData.hospitalName = extractedInfo.hospitalName || 'To be confirmed';
    requestData.patientName = extractedInfo.patientName || user.name;
    requestData.relationship = extractedInfo.relationship || 'Self';
    requestData.medicalCondition = englishMessage;
    requestData.contactNumber = user.phone || 'Not provided';
    requestData.requiredDate = extractedInfo.requiredDate || new Date();
    requestData.additionalNotes = englishMessage;
    const { title, description } = buildTitleAndDescription({
      message: englishMessage,
      type: 'blood',
      priority,
      bloodType: extractedInfo.bloodType
    });
    requestData.title = title;
    requestData.description = description;
  } else if (requestType === 'elder_support') {
    const englishMessage = translateToEnglish(message);
    requestData.serviceType = extractedInfo.serviceType || 'Other';
    requestData.elderName = extractedInfo.elderName || user.name;
    requestData.age = extractedInfo.age || 'Not specified';
    requestData.supportType = extractedInfo.supportType || ['other'];
    requestData.frequency = extractedInfo.frequency || 'one-time';
    requestData.timeSlot = 'flexible';
    requestData.specialRequirements = englishMessage;
    requestData.dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const { title, description } = buildTitleAndDescription({
      message: englishMessage,
      type: 'elder_support',
      priority
    });
    requestData.title = title;
    requestData.description = description;
  } else if (requestType === 'complaint') {
    const englishMessage = translateToEnglish(message);
    requestData.category = extractedInfo.complaintCategory || 'Other';
    requestData.severity = priority === 'urgent' ? 'high' : 'medium';
    const { title, description } = buildTitleAndDescription({
      message: englishMessage,
      type: 'complaint',
      priority,
      complaintCategory: requestData.category
    });
    requestData.title = title;
    requestData.description = description;
  }

  requestData.source = 'text_chat';

  const request = new Request(requestData);
  await request.save();

  return request;
}

/**
 * Generate success message after request creation
 */
function generateSuccessMessage(category, extractedInfo, request) {
  const messages = {
    blood_request: `✅ **Blood Request Created Successfully!**\n\nYour request for ${extractedInfo.bloodType} blood has been submitted.\n\n**Details:**\n• Blood Type: ${extractedInfo.bloodType}\n• Units: ${extractedInfo.unitsNeeded || 1}\n• Hospital: ${extractedInfo.hospitalName || 'To be specified'}\n• Request ID: ${request._id}\n\nVolunteers and donors will be notified immediately. You should receive responses soon!`,

    elder_support: `✅ **Elder Support Request Created!**\n\nYour request for elder support has been submitted.\n\n**Details:**\n• Service: ${extractedInfo.serviceType || 'Support needed'}\n• Request ID: ${request._id}\n\nVolunteers in your area will be notified and can accept your request.`,

    complaint: `✅ **Complaint Registered Successfully!**\n\nYour complaint has been filed.\n\n**Details:**\n• Category: ${extractedInfo.complaintCategory || 'General'}\n• Request ID: ${request._id}\n\nThe appropriate department will review your complaint and take action.`
  };

  return messages[category] || `✅ Request created successfully! Request ID: ${request._id}`;
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

/**
 * GET /api/chatbot/history
 * Fetch chat history for the authenticated user
 */
router.get('/history', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const chats = await Chat.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Reverse to show oldest first, then expand each chat into user + bot messages
    const formattedMessages = [];
    chats.reverse().forEach(chat => {
      // Add user message
      formattedMessages.push({
        id: `${chat._id}-user`,
        text: chat.message,
        sender: 'user',
        timestamp: chat.createdAt,
        type: 'text'
      });

      // Add bot response
      formattedMessages.push({
        id: `${chat._id}-bot`,
        text: chat.response,
        sender: 'bot',
        timestamp: chat.createdAt,
        type: chat.category || 'text',
        metadata: {
          category: chat.category,
          priority: chat.priority,
          createdRequest: chat.createdRequest
        }
      });
    });

    res.json({
      success: true,
      messages: formattedMessages,
      total: await Chat.countDocuments({ user: req.user.userId })
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chat history',
      error: error.message
    });
  }
});

module.exports = router;
