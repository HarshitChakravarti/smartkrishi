import json
import os

new_en = {
  "new_results.analyzing": "Analyzing your farm conditions...",
  "new_results.loadingSteps": "Evaluating crops • Checking season • Analyzing soil • Computing",
  "new_results.noRecommendationsTitle": "Unable to generate recommendations",
  "new_results.noSuitableTitle": "No suitable crops found",
  "new_results.noSuitableBody": "No suitable crops found for your current inputs. Try adjusting soil parameters or selecting a different season.",
  "new_results.modifyInputs": "Modify Inputs",
  "new_results.tryAgain": "Try Again",
  "new_results.backToHome": "Back to Home",
  "new_results.recommendationReady": "Recommendation Ready",
  "new_results.aiConfidence": "AI Confidence",
  "new_results.topCrop": "Top Crop",
  "new_results.growingTime": "Growing Time",
  "new_results.seasonText": "season",
  "new_results.mlConfidence": "ML Confidence",
  "new_results.ruleAdj": "Rule adj",
  "new_results.farmSize": "Farm",
  "new_results.climate": "Climate",
  "new_results.rainfall": "Rainfall",
  "new_results.source": "Source",
  "new_results.topCropChoices": "Top {{count}} Crop Choices",
  "new_results.rank": "Rank {{count}}",
  "new_results.mlScore": "ML Score",
  "new_results.rule": "Rule",
  "new_results.actionPlan": "Action Plan",
  "new_results.cropAdvisories": "Crop Advisories",
  "new_results.advisoryHint": "Open each section for irrigation, fertilizer, pest control, and weather guidance.",
  "new_results.advisoryTitle": "{{crop}} Advisory",
  "new_results.analyzedInfo": "Analyzed {{crops}} crops • Processing time: {{time}}ms • Model {{version}}",
  "new_results.rulesApplied": "Rules applied: {{rules}}",
  "new_results.reviewInputs": "Review Inputs",
  "new_results.startNewPlan": "Start New Plan",
  
  "new_results.advisoryRows.irrigation": "Irrigation",
  "new_results.advisoryRows.fertilizer": "Fertilizer",
  "new_results.advisoryRows.pest_watch": "Pest Watch",
  "new_results.advisoryRows.weather_note": "Weather Note",
  
  "new_results.fallback.disclaimer": "AI-based advisory. Please consult local agricultural experts for final decisions."
}

new_hi = {
  "new_results.analyzing": "आपके खेत की स्थिति का विश्लेषण हो रहा है...",
  "new_results.loadingSteps": "फसलों का मूल्यांकन • मौसम की जांच • मिट्टी विश्लेषण • गणना",
  "new_results.noRecommendationsTitle": "सिफारिशें उत्पन्न करने में असमर्थ",
  "new_results.noSuitableTitle": "कोई उपयुक्त फसल नहीं मिली",
  "new_results.noSuitableBody": "आपके वर्तमान इनपुट के लिए कोई उपयुक्त फसल नहीं मिली। मिट्टी के मापदंडों को बदलने या एक अलग मौसम चुनने का प्रयास करें।",
  "new_results.modifyInputs": "इनपुट बदलें",
  "new_results.tryAgain": "फिर से प्रयास करें",
  "new_results.backToHome": "होम पर वापस जाएं",
  "new_results.recommendationReady": "सिफारिश तैयार है",
  "new_results.aiConfidence": "एआई पर विश्वास",
  "new_results.topCrop": "शीर्ष फसल",
  "new_results.growingTime": "बढ़ने का समय",
  "new_results.seasonText": "मौसम",
  "new_results.mlConfidence": "ML विश्वास",
  "new_results.ruleAdj": "नियम समायोजन",
  "new_results.farmSize": "खेत (एकड़)",
  "new_results.climate": "जलवायु",
  "new_results.rainfall": "वर्षा",
  "new_results.source": "स्रोत",
  "new_results.topCropChoices": "शीर्ष {{count}} फसल विकल्प",
  "new_results.rank": "रैंक {{count}}",
  "new_results.mlScore": "ML स्कोर",
  "new_results.rule": "नियम",
  "new_results.actionPlan": "कार्य योजना",
  "new_results.cropAdvisories": "फसल सलाह",
  "new_results.advisoryHint": "सिंचाई, खाद, कीट नियंत्रण और मौसम मार्गदर्शन के लिए प्रत्येक अनुभाग खोलें।",
  "new_results.advisoryTitle": "{{crop}} सलाह",
  "new_results.analyzedInfo": "{{crops}} फसलों का विश्लेषण किया गया • प्रसंस्करण समय: {{time}}ms • मॉडल {{version}}",
  "new_results.rulesApplied": "लागू नियम: {{rules}}",
  "new_results.reviewInputs": "इनपुट की जाँच करें",
  "new_results.startNewPlan": "नया प्लान शुरू करें",

  "new_results.advisoryRows.irrigation": "सिंचाई",
  "new_results.advisoryRows.fertilizer": "उर्वरक/खाद",
  "new_results.advisoryRows.pest_watch": "कीट नियंत्रण",
  "new_results.advisoryRows.weather_note": "मौसम सलाह",

  "new_results.fallback.disclaimer": "AI आधारित सलाह। कृपया अंतिम निर्णय के लिए स्थानीय कृषि विशेषज्ञों से परामर्श लें।"
}

locales = {
    'en': new_en,
    'hi': new_hi
}

base_dir = '/Users/harshitchakravarti/My Data/smartkrishi ai/src/i18n/locales'

for lang, data in locales.items():
    path = os.path.join(base_dir, f'{lang}.json')
    with open(path, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    
    existing.update(data)
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, indent=2, ensure_ascii=False)

print("Locales updated successfully.")
