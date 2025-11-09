const axios = require('axios');

class TranslationService {
  constructor() {
    // You can add Google Translate API key here
    this.googleTranslateApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    this.baseURL = 'https://translation.googleapis.com/language/translate/v2';
    
    // Fallback translations for common government service terms
    this.fallbackTranslations = {
      'hi-en': {
        'शिकायत': 'complaint',
        'मदद': 'help',
        'सहायता': 'assistance',
        'रक्तदान': 'blood donation',
        'बुजुर्ग': 'elderly',
        'देखभाल': 'care',
        'सेवा': 'service',
        'सरकार': 'government',
        'समस्या': 'problem',
        'जरूरत': 'need',
        'आवश्यकता': 'requirement',
        'अनुरोध': 'request'
      },
      'te-en': {
        'ఫిర్యాదు': 'complaint',
        'సహాయం': 'help',
        'రక్తదానం': 'blood donation',
        'వృద్ధులు': 'elderly',
        'సంరక్షణ': 'care',
        'సేవ': 'service',
        'ప్రభుత్వం': 'government',
        'సమస్య': 'problem',
        'అవసరం': 'need',
        'అభ్యర్థన': 'request'
      },
      'en-hi': {
        'complaint': 'शिकायत',
        'help': 'मदद',
        'assistance': 'सहायता',
        'blood donation': 'रक्तदान',
        'elderly': 'बुजुर्ग',
        'care': 'देखभाल',
        'service': 'सेवा',
        'government': 'सरकार',
        'problem': 'समस्या',
        'need': 'जरूरत',
        'request': 'अनुरोध'
      },
      'en-te': {
        'complaint': 'ఫిర్యాదు',
        'help': 'సహాయం',
        'blood donation': 'రక్తదానం',
        'elderly': 'వృద్ధులు',
        'care': 'సంరక్షణ',
        'service': 'సేవ',
        'government': 'ప్రభుత్వం',
        'problem': 'సమస్య',
        'need': 'అవసరం',
        'request': 'అభ్యర్థన'
      }
    };
  }

  /**
   * Translate text using Google Translate API or fallback
   * @param {string} text - Text to translate
   * @param {string} fromLang - Source language code
   * @param {string} toLang - Target language code
   * @returns {Promise<Object>} Translation result
   */
  async translateText(text, fromLang, toLang) {
    try {
      console.log(`TranslationService: Translating "${text}" from ${fromLang} to ${toLang}`);

      // If source and target are the same, return original text
      if (fromLang === toLang) {
        return {
          success: true,
          translatedText: text,
          originalText: text,
          fromLanguage: fromLang,
          toLanguage: toLang,
          confidence: 1.0,
          method: 'no_translation_needed'
        };
      }

      // Try Google Translate API if key is available
      if (this.googleTranslateApiKey) {
        try {
          const result = await this.translateWithGoogle(text, fromLang, toLang);
          if (result.success) {
            return result;
          }
        } catch (error) {
          console.log('Google Translate failed, falling back to local translation:', error.message);
        }
      }

      // Use fallback translation
      return this.translateWithFallback(text, fromLang, toLang);

    } catch (error) {
      console.error('TranslationService: Translation error:', error);
      return {
        success: false,
        error: error.message,
        originalText: text,
        fromLanguage: fromLang,
        toLanguage: toLang
      };
    }
  }

  /**
   * Translate using Google Translate API
   * @param {string} text - Text to translate
   * @param {string} fromLang - Source language
   * @param {string} toLang - Target language
   * @returns {Promise<Object>} Translation result
   */
  async translateWithGoogle(text, fromLang, toLang) {
    try {
      const response = await axios.post(this.baseURL, null, {
        params: {
          key: this.googleTranslateApiKey,
          q: text,
          source: fromLang,
          target: toLang,
          format: 'text'
        },
        timeout: 10000
      });

      const translatedText = response.data.data.translations[0].translatedText;
      const detectedSourceLanguage = response.data.data.translations[0].detectedSourceLanguage || fromLang;

      return {
        success: true,
        translatedText: translatedText,
        originalText: text,
        fromLanguage: detectedSourceLanguage,
        toLanguage: toLang,
        confidence: 0.95,
        method: 'google_translate'
      };

    } catch (error) {
      console.error('Google Translate API error:', error);
      throw new Error(`Google Translate failed: ${error.message}`);
    }
  }

  /**
   * Translate using fallback dictionary
   * @param {string} text - Text to translate
   * @param {string} fromLang - Source language
   * @param {string} toLang - Target language
   * @returns {Object} Translation result
   */
  translateWithFallback(text, fromLang, toLang) {
    const translationKey = `${fromLang}-${toLang}`;
    const dictionary = this.fallbackTranslations[translationKey];

    if (!dictionary) {
      return {
        success: false,
        error: `Translation not supported from ${fromLang} to ${toLang}`,
        originalText: text,
        fromLanguage: fromLang,
        toLanguage: toLang
      };
    }

    let translatedText = text;
    let foundTranslations = 0;

    // Translate word by word for known terms
    Object.entries(dictionary).forEach(([original, translation]) => {
      const regex = new RegExp(`\\b${original}\\b`, 'gi');
      if (regex.test(translatedText)) {
        translatedText = translatedText.replace(regex, translation);
        foundTranslations++;
      }
    });

    return {
      success: true,
      translatedText: translatedText,
      originalText: text,
      fromLanguage: fromLang,
      toLanguage: toLang,
      confidence: foundTranslations > 0 ? 0.7 : 0.3,
      method: 'fallback_dictionary',
      translationsFound: foundTranslations
    };
  }

  /**
   * Detect language of text
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Detection result
   */
  async detectLanguage(text) {
    try {
      // Simple language detection based on character sets
      const hindiPattern = /[\u0900-\u097F]/;
      const teluguPattern = /[\u0C00-\u0C7F]/;
      const englishPattern = /^[a-zA-Z\s.,!?]+$/;

      if (hindiPattern.test(text)) {
        return {
          success: true,
          language: 'hi',
          confidence: 0.9,
          method: 'character_pattern'
        };
      }

      if (teluguPattern.test(text)) {
        return {
          success: true,
          language: 'te',
          confidence: 0.9,
          method: 'character_pattern'
        };
      }

      if (englishPattern.test(text)) {
        return {
          success: true,
          language: 'en',
          confidence: 0.8,
          method: 'character_pattern'
        };
      }

      // Default to English if uncertain
      return {
        success: true,
        language: 'en',
        confidence: 0.5,
        method: 'default'
      };

    } catch (error) {
      console.error('Language detection error:', error);
      return {
        success: false,
        error: error.message,
        language: 'en',
        confidence: 0.1
      };
    }
  }

  /**
   * Get supported language pairs
   * @returns {Array} List of supported translation pairs
   */
  getSupportedLanguagePairs() {
    return [
      { from: 'hi', to: 'en', name: 'Hindi to English' },
      { from: 'te', to: 'en', name: 'Telugu to English' },
      { from: 'en', to: 'hi', name: 'English to Hindi' },
      { from: 'en', to: 'te', name: 'English to Telugu' }
    ];
  }

  /**
   * Check if translation is supported
   * @param {string} fromLang - Source language
   * @param {string} toLang - Target language
   * @returns {boolean} Support status
   */
  isTranslationSupported(fromLang, toLang) {
    if (fromLang === toLang) return true;
    
    const translationKey = `${fromLang}-${toLang}`;
    return !!this.fallbackTranslations[translationKey] || !!this.googleTranslateApiKey;
  }
}

module.exports = new TranslationService();
