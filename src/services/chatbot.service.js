const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');

// ─── Load dataset at startup ─────────────────────────────────────────────────
const productsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/products.json'), 'utf-8')
);

// ─── Build compact dataset summary for prompt injection ──────────────────────
const buildDatasetContext = () => {
  return productsData.map((p) => ({
    id: p.id,
    productName: p.productName,
    productNameAr: p.productNameAr,
    targetDiseases: p.targetDiseases,
    targetDiseasesAr: p.targetDiseasesAr,
    activeIngredients: p.activeIngredients,
    activeIngredientsAr: p.activeIngredientsAr,
    description: p.description,
    descriptionAr: p.descriptionAr,
    usageInstructions: p.usageInstructions,
    usageInstructionsAr: p.usageInstructionsAr,
    recommendedDosage: p.recommendedDosage,
    recommendedDosageAr: p.recommendedDosageAr,
    applicationMethod: p.applicationMethod,
    applicationMethodAr: p.applicationMethodAr,
    safetyPrecautions: p.safetyPrecautions,
    safetyPrecautionsAr: p.safetyPrecautionsAr,
    additionalNotes: p.additionalNotes,
    additionalNotesAr: p.additionalNotesAr,
  }));
};

// ─── System Prompt ────────────────────────────────────────────────────────────
const buildSystemPrompt = () => {
  const datasetJson = JSON.stringify(buildDatasetContext(), null, 2);

  return `You are a professional agricultural assistant specialized exclusively in tomato plant disease treatments and related products. Your name is "TomatoBot" (in English) or "مساعد الطماطم" (in Arabic).

## YOUR KNOWLEDGE SOURCE
You ONLY use the following product dataset as your knowledge source. You MUST NOT generate, hallucinate, or infer any information that is not explicitly present in this dataset.

## DATASET
${datasetJson}

## DISEASE NAMES MAPPING (for reference)
- Bacterial_spot = البقعة البكتيرية
- Early_blight = اللفحة المبكرة
- Late_blight = اللفحة المتأخرة
- Leaf_Mold = عفن الأوراق
- Septoria_leaf_spot = تبقع أوراق السبتوريا
- Spider_mites_Two_spotted_spider_mite = العنكبوت الأحمر ذو النقطتين
- Target_Spot = البقعة الهدفية
- Tomato_mosaic_virus = فيروس موزاييك الطماطم
- Tomato_Yellow_Leaf_Curl_Virus = فيروس تجعد أوراق الطماطم الصفراء
- Powdery_Mildew = البياض الدقيقي
- Healthy = نبات سليم

## RULES YOU MUST FOLLOW
1. **Answer ONLY in the same language as the user's question.** If the user writes in Arabic, respond fully in Arabic. If in English, respond fully in English.
2. **Use ONLY information from the dataset above.** Never fabricate product names, dosages, ingredients, or any other data.
3. **If information is not in the dataset**, politely inform the user that this information is not available in your database.
4. **If the user asks about something unrelated to tomato diseases or the product dataset**, politely explain that you specialize only in tomato disease treatments and related products.
5. **When answering about a product**, always include (when available):
   - Product name
   - Target disease(s)
   - Active ingredient(s)
   - Usage instructions
   - Recommended dosage
   - Safety precautions
6. **If multiple products match the user's request**, list all matching options and explain the key differences between them.
7. **For product comparisons**, present both products side by side with their key differences clearly highlighted.
8. **Keep responses clear, practical, and easy for farmers to understand.** Avoid overly technical jargon where possible.
9. **Be concise but complete.** Do not omit important safety information.
10. **Format responses clearly** using bullet points, numbered lists, or headers where appropriate.

## PERSONA
- Speak in a friendly, helpful, and professional tone.
- You are like a trusted agricultural advisor who knows the farmer's needs.
- Always prioritize safety information when relevant.`;
};

// ─── Gemini Client ────────────────────────────────────────────────────────────
let genAI = null;
let model = null;

const getModel = () => {
  if (!model) {
    if (!env.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables.');
    }
    genAI = new GoogleGenerativeAI(env.geminiApiKey);
    model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: buildSystemPrompt(),
      generationConfig: {
        temperature: 0.2,       // Low temperature = more accurate, less creative
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });
  }
  return model;
};

// ─── Language Detection ───────────────────────────────────────────────────────
const detectLanguage = (text) => {
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(text) ? 'ar' : 'en';
};

// ─── Main Chat Function ───────────────────────────────────────────────────────
/**
 * Sends a message to the Gemini model and returns the chatbot's reply.
 * @param {string} userMessage - The user's question
 * @returns {Promise<{reply: string, language: string, relatedProducts: Array}>}
 */
const chat = async (userMessage) => {
  const language = detectLanguage(userMessage);
  const aiModel = getModel();

  // Start a fresh chat session (single-turn)
  const chatSession = aiModel.startChat({
    history: [],
  });

  const result = await chatSession.sendMessage(userMessage);
  const reply = result.response.text();

  // Find related products mentioned in the context (for optional frontend use)
  const relatedProducts = findRelatedProducts(userMessage);

  return {
    reply,
    language,
    relatedProducts,
  };
};

// ─── Helper: Find Related Products ────────────────────────────────────────────
/**
 * Finds products in the dataset that may be related to the user's query.
 * Used to provide structured data alongside the text reply.
 * @param {string} query
 * @returns {Array}
 */
const findRelatedProducts = (query) => {
  const normalizedQuery = query.toLowerCase();

  // Disease name mappings for keyword matching
  const diseaseKeywords = {
    Bacterial_spot: ['bacterial spot', 'البقعة البكتيرية', 'bacterial', 'بكتيريا', 'بكتيري'],
    Early_blight: ['early blight', 'اللفحة المبكرة', 'لفحة مبكرة', 'early blight'],
    Late_blight: ['late blight', 'اللفحة المتأخرة', 'لفحة متأخرة'],
    Leaf_Mold: ['leaf mold', 'عفن الأوراق', 'عفن أوراق', 'leaf mold'],
    Septoria_leaf_spot: ['septoria', 'سبتوريا', 'septoria leaf spot', 'تبقع'],
    Spider_mites_Two_spotted_spider_mite: ['spider mite', 'عنكبوت', 'أكاروس', 'spider mites'],
    Target_Spot: ['target spot', 'البقعة الهدفية', 'بقعة هدفية'],
    Tomato_mosaic_virus: ['mosaic', 'موزاييك', 'تبرقش', 'mosaic virus'],
    Tomato_Yellow_Leaf_Curl_Virus: ['yellow leaf curl', 'تجعد', 'ذبابة بيضاء', 'whitefly', 'tylcv'],
    Powdery_Mildew: ['powdery mildew', 'بياض دقيقي', 'عفن أبيض', 'مسحوق أبيض'],
  };

  const matchedDiseases = [];
  for (const [disease, keywords] of Object.entries(diseaseKeywords)) {
    if (keywords.some((kw) => normalizedQuery.includes(kw))) {
      matchedDiseases.push(disease);
    }
  }

  if (matchedDiseases.length === 0) {
    // Try to match by product name
    return productsData
      .filter(
        (p) =>
          normalizedQuery.includes(p.productName.toLowerCase()) ||
          normalizedQuery.includes(p.productNameAr)
      )
      .slice(0, 3)
      .map(formatProductSummary);
  }

  return productsData
    .filter((p) => p.targetDiseases.some((d) => matchedDiseases.includes(d)))
    .slice(0, 5)
    .map(formatProductSummary);
};

// ─── Format Product Summary ───────────────────────────────────────────────────
const formatProductSummary = (p) => ({
  id: p.id,
  productName: p.productName,
  productNameAr: p.productNameAr,
  targetDiseases: p.targetDiseases,
  activeIngredients: p.activeIngredients,
  recommendedDosage: p.recommendedDosage,
});

// ─── Get All Products (utility) ───────────────────────────────────────────────
const getAllProducts = () => productsData.map(formatProductSummary);

// ─── Get Products by Disease ──────────────────────────────────────────────────
const getProductsByDisease = (diseaseName) => {
  return productsData.filter(
    (p) =>
      p.targetDiseases.some((d) => d.toLowerCase() === diseaseName.toLowerCase()) ||
      p.targetDiseasesAr.some((d) => d.includes(diseaseName))
  );
};

module.exports = { chat, getAllProducts, getProductsByDisease };
