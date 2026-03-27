import json
import os

json_str = """
{
  "jute": {
    "display_name": "Jute",
    "hindi_name": "जूट / पटसन",
    "category": "fiber",
    "family": "Malvaceae",
    "seasons": { "primary": "Kharif", "secondary": null, "sowing_months": ["March", "April", "May"], "harvesting_months": ["July", "August", "September"], "growing_duration_days": [100, 120], "growing_duration_months": 4 },
    "climate_requirements": { "temperature": { "min": 24, "max": 37, "optimal_min": 28, "optimal_max": 34, "unit": "celsius" }, "rainfall": { "min": 150, "max": 300, "optimal_min": 180, "optimal_max": 250, "unit": "mm_monthly_avg", "total_season_need_mm": 1500 }, "humidity": { "min": 70, "max": 95, "optimal_min": 80, "optimal_max": 90, "unit": "percent" } },
    "soil_requirements": { "N": { "min": 40, "max": 80, "optimal": 60, "unit": "ppm" }, "P": { "min": 20, "max": 50, "optimal": 30, "unit": "ppm" }, "K": { "min": 30, "max": 60, "optimal": 40, "unit": "ppm" }, "pH": { "min": 6.0, "max": 7.5, "optimal": 6.8 }, "preferred_soil_types": ["alluvial", "loam"], "waterlogging_tolerance": "high" },
    "water_needs": { "category": "very_high", "irrigation_type": ["flood", "rainfed"], "drought_tolerance": "very_low", "waterlogging_tolerance": "high", "critical_water_stages": ["vegetative", "retting"] },
    "rotation": { "good_predecessors": ["potato", "mustard", "pulses"], "bad_predecessors": ["jute"], "good_successors": ["rice", "potato", "pulses"], "bad_successors": ["jute"], "rotation_gap_minimum_months": 3, "nitrogen_fixing": false, "soil_effect": "depleting", "recommended_rotation_cycle": ["jute", "rice", "potato"], "why_good_rotation": "Sheds leaves which add organic matter to soil." },
    "regional_suitability": { "best_states": ["West Bengal", "Bihar", "Assam", "Odisha"], "moderate_states": ["Meghalaya", "Uttar Pradesh"], "unsuitable_states": ["Rajasthan", "Gujarat", "Maharashtra", "Punjab", "Haryana", "Karnataka"], "why": "Requires hot and extremely humid climate with heavy rainfall." },
    "economics": { "investment_level": "medium", "labor_intensity": "high", "mechanization_potential": "low", "minimum_viable_farm_size_acres": 0.5, "ideal_farm_size_acres": [1, 10], "market_demand": "high", "msp_available": true, "value_category": "commercial" },
    "pest_disease_risk": { "major_pests": ["jute_hairy_caterpillar", "stem_weevil"], "major_diseases": ["stem_rot", "root_rot"], "risk_months": ["June", "July"], "risk_conditions": "High humidity and continuous rain without dry spells" },
    "fertilizer_advisory": { "N_schedule": "Basal and top dressing at 3-4 weeks", "P_schedule": "Full basal dosage", "K_schedule": "Full basal dosage", "organic_alternatives": "Compost 5t/ha", "micronutrients": "Not typically required unless severe deficiency" },
    "irrigation_advisory": { "method": "Rainfed mostly, or flood irrigation", "frequency": "Maintain moisture if rain fails", "water_saving": "Requires large stagnant water bodies for retting after harvest", "critical_periods": "Drought during vegetative phase severely affects fiber quality" },
    "tags": ["kharif", "cash_crop", "water_intensive", "commercial"]
  },
  "coffee": {
    "display_name": "Coffee",
    "hindi_name": "कॉफी",
    "category": "plantation",
    "family": "Rubiaceae",
    "seasons": { "primary": "Perennial", "secondary": null, "sowing_months": ["June", "July", "August"], "harvesting_months": ["November", "December", "January", "February"], "growing_duration_days": [250, 300], "growing_duration_months": 10 },
    "climate_requirements": { "temperature": { "min": 15, "max": 28, "optimal_min": 18, "optimal_max": 24, "unit": "celsius" }, "rainfall": { "min": 120, "max": 250, "optimal_min": 150, "optimal_max": 200, "unit": "mm_monthly_avg", "total_season_need_mm": 2000 }, "humidity": { "min": 60, "max": 90, "optimal_min": 70, "optimal_max": 85, "unit": "percent" } },
    "soil_requirements": { "N": { "min": 80, "max": 150, "optimal": 100, "unit": "ppm" }, "P": { "min": 20, "max": 60, "optimal": 40, "unit": "ppm" }, "K": { "min": 80, "max": 150, "optimal": 100, "unit": "ppm" }, "pH": { "min": 5.0, "max": 6.5, "optimal": 5.5 }, "preferred_soil_types": ["well_drained_loam", "forest_soil", "laterite"], "waterlogging_tolerance": "none" },
    "water_needs": { "category": "high", "irrigation_type": ["sprinkler", "drip", "rainfed"], "drought_tolerance": "low", "waterlogging_tolerance": "none", "critical_water_stages": ["blossom", "backing", "berry_development"] },
    "rotation": { "good_predecessors": [], "bad_predecessors": [], "good_successors": [], "bad_successors": [], "rotation_gap_minimum_months": 0, "nitrogen_fixing": false, "soil_effect": "neutral", "recommended_rotation_cycle": ["coffee"], "why_good_rotation": "Perennial plantation crop. Usually intercropped with pepper, cardamom, or shade trees." },
    "regional_suitability": { "best_states": ["Karnataka", "Kerala", "Tamil Nadu"], "moderate_states": ["Andhra Pradesh", "Odisha", "Meghalaya"], "unsuitable_states": ["Punjab", "Haryana", "Rajasthan", "Gujarat", "Uttar Pradesh"], "why": "Strict requirement for elevation (1000m+), cool temps, high rainfall, and shade." },
    "economics": { "investment_level": "very_high", "labor_intensity": "very_high", "mechanization_potential": "low", "minimum_viable_farm_size_acres": 2, "ideal_farm_size_acres": [5, 100], "market_demand": "high", "msp_available": false, "value_category": "export" },
    "pest_disease_risk": { "major_pests": ["white_stem_borer", "berry_borer", "mealybug"], "major_diseases": ["leaf_rust", "black_rot"], "risk_months": ["June", "July", "August", "September"], "risk_conditions": "Continuous monsoon rains cause black rot. Dry periods favor borers." },
    "fertilizer_advisory": { "N_schedule": "4 splits (pre-blossom, post-blossom, mid-monsoon, post-monsoon)", "P_schedule": "Pre-blossom and post-monsoon", "K_schedule": "Pre-blossom, post-blossom, post-monsoon", "organic_alternatives": "Compost 5t/ha, neem cake", "micronutrients": "Foliar spray of zinc, boron, magnesium frequently needed" },
    "irrigation_advisory": { "method": "Sprinkler or Drip", "frequency": " Crucial 'blossom showers' in Feb-March (25-40mm) if rain fails", "water_saving": "Drip irrigation highly successful", "critical_periods": "Blossom showers trigger flowering, backing showers 15 days later ensure fruit set" },
    "tags": ["perennial", "plantation", "cash_crop", "export", "shade_grown", "south_india"]
  },
  "lentil": {
    "display_name": "Lentil",
    "hindi_name": "मसूर दाल",
    "category": "pulse",
    "family": "Fabaceae",
    "seasons": { "primary": "Rabi", "secondary": null, "sowing_months": ["October", "November"], "harvesting_months": ["February", "March"], "growing_duration_days": [100, 120], "growing_duration_months": 4 },
    "climate_requirements": { "temperature": { "min": 10, "max": 30, "optimal_min": 15, "optimal_max": 25, "unit": "celsius" }, "rainfall": { "min": 20, "max": 60, "optimal_min": 30, "optimal_max": 50, "unit": "mm_monthly_avg", "total_season_need_mm": 200 }, "humidity": { "min": 30, "max": 60, "optimal_min": 40, "optimal_max": 50, "unit": "percent" } },
    "soil_requirements": { "N": { "min": 10, "max": 30, "optimal": 20, "unit": "ppm" }, "P": { "min": 30, "max": 60, "optimal": 40, "unit": "ppm" }, "K": { "min": 20, "max": 50, "optimal": 30, "unit": "ppm" }, "pH": { "min": 6.0, "max": 7.5, "optimal": 6.8 }, "preferred_soil_types": ["loam", "clay_loam"], "waterlogging_tolerance": "none" },
    "water_needs": { "category": "low", "irrigation_type": ["rainfed"], "drought_tolerance": "high", "waterlogging_tolerance": "none", "critical_water_stages": ["flowering", "pod_formation"] },
    "rotation": { "good_predecessors": ["rice", "maize", "pearl_millet", "kharif_pulses"], "bad_predecessors": ["lentil", "chickpea"], "good_successors": ["rice", "maize"], "bad_successors": ["lentil"], "rotation_gap_minimum_months": 3, "nitrogen_fixing": true, "soil_effect": "enriching", "recommended_rotation_cycle": ["rice", "lentil"], "why_good_rotation": "Excellent N-fixation. Fits perfectly after rice without land prep (utera/paira cropping)." },
    "regional_suitability": { "best_states": ["Madhya Pradesh", "Uttar Pradesh", "Bihar", "West Bengal"], "moderate_states": ["Assam", "Rajasthan", "Maharashtra", "Jharkhand"], "unsuitable_states": ["Kerala", "Tamil Nadu", "Andhra Pradesh", "Karnataka"], "why": "Strictly cold winter crop. Susceptible to waterlogging." },
    "economics": { "investment_level": "low", "labor_intensity": "low", "mechanization_potential": "medium", "minimum_viable_farm_size_acres": 0.5, "ideal_farm_size_acres": [1, 15], "market_demand": "high", "msp_available": true, "value_category": "staple" },
    "pest_disease_risk": { "major_pests": ["pod_borer", "aphids"], "major_diseases": ["wilt", "rust", "root_rot"], "risk_months": ["January", "February"], "risk_conditions": "Cloudy weather increases aphid attack." },
    "fertilizer_advisory": { "N_schedule": "Starter dose: 20kg N/ha basal", "P_schedule": "40kg P2O5/ha basal", "K_schedule": "20kg K2O/ha basal", "organic_alternatives": "Rhizobium culture 5g/kg seed", "micronutrients": "Zinc application in rice-lentil systems" },
    "irrigation_advisory": { "method": "Usually grown on residual soil moisture", "frequency": "One pre-flowering irrigation if dry", "water_saving": "Drought tolerant", "critical_periods": "Pod filling stage" },
    "tags": ["rabi", "legume", "low_water", "nitrogen_fixing"]
  },
  "mungbean": {
    "display_name": "Mungbean (Green Gram)",
    "hindi_name": "मूंग",
    "category": "pulse",
    "family": "Fabaceae",
    "seasons": { "primary": "Kharif", "secondary": "Zaid", "sowing_months": ["July", "March", "April"], "harvesting_months": ["September", "May", "June"], "growing_duration_days": [60, 80], "growing_duration_months": 3 },
    "climate_requirements": { "temperature": { "min": 25, "max": 35, "optimal_min": 28, "optimal_max": 32, "unit": "celsius" }, "rainfall": { "min": 50, "max": 80, "optimal_min": 60, "optimal_max": 75, "unit": "mm_monthly_avg", "total_season_need_mm": 400 }, "humidity": { "min": 50, "max": 85, "optimal_min": 60, "optimal_max": 75, "unit": "percent" } },
    "soil_requirements": { "N": { "min": 10, "max": 30, "optimal": 20, "unit": "ppm" }, "P": { "min": 30, "max": 60, "optimal": 40, "unit": "ppm" }, "K": { "min": 20, "max": 50, "optimal": 30, "unit": "ppm" }, "pH": { "min": 6.0, "max": 7.5, "optimal": 6.8 }, "preferred_soil_types": ["loam", "sandy_loam"], "waterlogging_tolerance": "low" },
    "water_needs": { "category": "low", "irrigation_type": ["rainfed", "sprinkler"], "drought_tolerance": "high", "waterlogging_tolerance": "low", "critical_water_stages": ["flowering", "pod_development"] },
    "rotation": { "good_predecessors": ["wheat", "potato", "sugarcane", "rice"], "bad_predecessors": ["mungbean", "urad"], "good_successors": ["wheat", "mustard", "rice"], "bad_successors": ["mungbean"], "rotation_gap_minimum_months": 2, "nitrogen_fixing": true, "soil_effect": "enriching", "recommended_rotation_cycle": ["rice", "wheat", "mungbean"], "why_good_rotation": "Short duration catch-crop. Provides summer income and fixes nitrogen before kharif rice." },
    "regional_suitability": { "best_states": ["Rajasthan", "Maharashtra", "Andhra Pradesh", "Gujarat", "Bihar", "Uttar Pradesh"], "moderate_states": ["Madhya Pradesh", "Karnataka", "Punjab", "Haryana", "West Bengal"], "unsuitable_states": ["Kerala", "Assam"], "why": "Loves hot and dry weather. Cannot tolerate heavy continuous rain or waterlogging." },
    "economics": { "investment_level": "low", "labor_intensity": "medium", "mechanization_potential": "medium", "minimum_viable_farm_size_acres": 0.5, "ideal_farm_size_acres": [1, 25], "market_demand": "high", "msp_available": true, "value_category": "staple" },
    "pest_disease_risk": { "major_pests": ["whitefly", "pod_borer", "thrips"], "major_diseases": ["yellow_mosaic_virus", "powdery_mildew", "leaf_spot"], "risk_months": ["August", "September", "May"], "risk_conditions": "High whitefly population spreads YMV rapidly." },
    "fertilizer_advisory": { "N_schedule": "Starter 15-20kg N/ha basal", "P_schedule": "40kg P2O5/ha basal", "K_schedule": "20kg K2O/ha basal if deficient", "organic_alternatives": "Rhizobium seed treatment is essential", "micronutrients": "Foliar spray of 2% urea at flowering if crop looks weak" },
    "irrigation_advisory": { "method": "Check basin or sprinkler", "frequency": "Kharif: rainfed. Zaid: 3-4 irrigations every 10-15 days.", "water_saving": "Do not irrigate near harvest or vegetative growth will re-start", "critical_periods": "Moisture stress at flowering causes severe flower drop" },
    "tags": ["kharif", "zaid", "summer_crop", "catch_crop", "legume", "short_duration"]
  }
}
"""

with open('data/crop_knowledge_base.json', 'r') as f:
    crop_data = json.load(f)

new_crops = json.loads(json_str)
crop_data.update(new_crops)

with open('data/crop_knowledge_base.json', 'w') as f:
    json.dump(crop_data, f, indent=2)
