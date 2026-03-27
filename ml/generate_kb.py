import json
import os

json_str = """
{
  "rice": {
    "display_name": "Rice (Paddy)",
    "hindi_name": "धान",
    "category": "cereal",
    "family": "Poaceae",
    "seasons": {
      "primary": "Kharif",
      "secondary": null,
      "sowing_months": ["June", "July"],
      "harvesting_months": ["October", "November"],
      "growing_duration_days": [120, 150],
      "growing_duration_months": 4
    },
    "climate_requirements": {
      "temperature": { "min": 20, "max": 37, "optimal_min": 25, "optimal_max": 32, "unit": "celsius" },
      "rainfall": { "min": 100, "max": 300, "optimal_min": 150, "optimal_max": 250, "unit": "mm_monthly_avg", "total_season_need_mm": 1200 },
      "humidity": { "min": 60, "max": 95, "optimal_min": 70, "optimal_max": 85, "unit": "percent" }
    },
    "soil_requirements": {
      "N": { "min": 40, "max": 120, "optimal": 80, "unit": "ppm" },
      "P": { "min": 20, "max": 80, "optimal": 40, "unit": "ppm" },
      "K": { "min": 20, "max": 80, "optimal": 40, "unit": "ppm" },
      "pH": { "min": 5.5, "max": 7.5, "optimal": 6.5 },
      "preferred_soil_types": ["clay", "clay_loam", "alluvial"],
      "waterlogging_tolerance": "high"
    },
    "water_needs": {
      "category": "high",
      "irrigation_type": ["flood", "puddled"],
      "drought_tolerance": "very_low",
      "waterlogging_tolerance": "high",
      "critical_water_stages": ["transplanting", "tillering", "flowering"]
    },
    "rotation": {
      "good_predecessors": ["wheat", "chickpea", "lentil", "mustard", "potato"],
      "bad_predecessors": ["rice"],
      "good_successors": ["wheat", "chickpea", "lentil", "mustard", "potato"],
      "bad_successors": ["rice"],
      "rotation_gap_minimum_months": 3,
      "nitrogen_fixing": false,
      "soil_effect": "depleting",
      "recommended_rotation_cycle": ["rice", "wheat", "rice", "chickpea"],
      "why_good_rotation": "Rice-wheat is India's most practiced rotation."
    },
    "regional_suitability": {
      "best_states": ["West Bengal", "Punjab", "Uttar Pradesh", "Andhra Pradesh", "Tamil Nadu", "Bihar", "Odisha", "Assam"],
      "moderate_states": ["Maharashtra", "Karnataka", "Madhya Pradesh", "Chhattisgarh", "Jharkhand"],
      "unsuitable_states": ["Rajasthan", "Gujarat"],
      "why": "Requires abundant water. Best in river plains and deltaic regions."
    },
    "economics": {
      "investment_level": "medium",
      "labor_intensity": "high",
      "mechanization_potential": "medium",
      "minimum_viable_farm_size_acres": 1,
      "ideal_farm_size_acres": [2, 50],
      "market_demand": "very_high",
      "msp_available": true,
      "value_category": "staple"
    },
    "pest_disease_risk": {
      "major_pests": ["stem_borer", "brown_planthopper", "leaf_folder"],
      "major_diseases": ["blast", "bacterial_leaf_blight", "sheath_blight"],
      "risk_months": ["August", "September"],
      "risk_conditions": "High humidity + warm temperature"
    },
    "fertilizer_advisory": {
      "N_schedule": "Split application: 50% basal, 25% at tillering, 25% at panicle initiation",
      "P_schedule": "Full dose as basal application",
      "K_schedule": "50% basal, 50% at panicle initiation",
      "organic_alternatives": "Green manure (dhaincha), FYM 10t/ha before transplanting",
      "micronutrients": "Zinc sulfate 25kg/ha in zinc-deficient soils"
    },
    "irrigation_advisory": {
      "method": "Flood irrigation with 5cm standing water during vegetative stage",
      "frequency": "Maintain 2-5cm water continuously until 2 weeks before harvest",
      "water_saving": "Alternate wetting and drying (AWD) can save 20-30% water",
      "critical_periods": "Do not allow water stress during flowering"
    },
    "tags": ["water_intensive", "kharif", "staple", "msp_crop", "flood_tolerant"]
  },
  "wheat": {
    "display_name": "Wheat",
    "hindi_name": "गेहूं",
    "category": "cereal",
    "family": "Poaceae",
    "seasons": {
      "primary": "Rabi",
      "secondary": null,
      "sowing_months": ["October", "November"],
      "harvesting_months": ["March", "April"],
      "growing_duration_days": [120, 150],
      "growing_duration_months": 5
    },
    "climate_requirements": {
      "temperature": { "min": 10, "max": 25, "optimal_min": 15, "optimal_max": 20, "unit": "celsius" },
      "rainfall": { "min": 50, "max": 100, "optimal_min": 50, "optimal_max": 75, "unit": "mm_monthly_avg", "total_season_need_mm": 500 },
      "humidity": { "min": 40, "max": 70, "optimal_min": 50, "optimal_max": 60, "unit": "percent" }
    },
    "soil_requirements": {
      "N": { "min": 40, "max": 120, "optimal": 80, "unit": "ppm" },
      "P": { "min": 40, "max": 80, "optimal": 60, "unit": "ppm" },
      "K": { "min": 40, "max": 80, "optimal": 60, "unit": "ppm" },
      "pH": { "min": 6.0, "max": 7.5, "optimal": 6.5 },
      "preferred_soil_types": ["loam", "clay_loam", "alluvial"],
      "waterlogging_tolerance": "low"
    },
    "water_needs": {
      "category": "medium",
      "irrigation_type": ["furrow", "sprinkler"],
      "drought_tolerance": "medium",
      "waterlogging_tolerance": "low",
      "critical_water_stages": ["crown_root_initiation", "flowering", "milk"]
    },
    "rotation": {
      "good_predecessors": ["rice", "maize", "cotton", "soybean", "mungbean"],
      "bad_predecessors": ["wheat"],
      "good_successors": ["rice", "maize", "cotton", "soybean", "mungbean"],
      "bad_successors": ["wheat"],
      "rotation_gap_minimum_months": 3,
      "nitrogen_fixing": false,
      "soil_effect": "depleting",
      "recommended_rotation_cycle": ["rice", "wheat", "mungbean"],
      "why_good_rotation": "Rice-wheat is India's default rotation. Rotating with legumes in summer helps soil health."
    },
    "regional_suitability": {
      "best_states": ["Punjab", "Haryana", "Uttar Pradesh", "Madhya Pradesh", "Rajasthan"],
      "moderate_states": ["Bihar", "Gujarat", "Maharashtra", "West Bengal"],
      "unsuitable_states": ["Kerala", "Tamil Nadu"],
      "why": "Requires cool winters for vegetative growth and warm spring for ripening."
    },
    "economics": {
      "investment_level": "medium",
      "labor_intensity": "medium",
      "mechanization_potential": "high",
      "minimum_viable_farm_size_acres": 1,
      "ideal_farm_size_acres": [2, 50],
      "market_demand": "very_high",
      "msp_available": true,
      "value_category": "staple"
    },
    "pest_disease_risk": {
      "major_pests": ["aphids", "termites", "brown_wheat_mite"],
      "major_diseases": ["rust", "loose_smut", "karnal_bunt"],
      "risk_months": ["February", "March"],
      "risk_conditions": "Warm and humid conditions during ear emergence"
    },
    "fertilizer_advisory": {
      "N_schedule": "50% basal, 50% at first irrigation (CRI stage)",
      "P_schedule": "Full dose as basal application",
      "K_schedule": "Full dose as basal application",
      "organic_alternatives": "FYM 10t/ha before sowing",
      "micronutrients": "Zinc sulfate 25kg/ha in deficient soils"
    },
    "irrigation_advisory": {
      "method": "Border strip or sprinkler irrigation",
      "frequency": "4-6 irrigations total during the season",
      "water_saving": "Sprinkler irrigation can save 30% water",
      "critical_periods": "Crown Root Initiation (21 days after sowing) is most critical"
    },
    "tags": ["rabi", "staple", "msp_crop", "winter_crop"]
  },
  "maize": {
    "display_name": "Maize (Corn)",
    "hindi_name": "मक्का",
    "category": "cereal",
    "family": "Poaceae",
    "seasons": {
      "primary": "Kharif",
      "secondary": "Rabi",
      "sowing_months": ["June", "July", "October"],
      "harvesting_months": ["September", "October", "March"],
      "growing_duration_days": [90, 110],
      "growing_duration_months": 4
    },
    "climate_requirements": {
      "temperature": { "min": 15, "max": 35, "optimal_min": 21, "optimal_max": 27, "unit": "celsius" },
      "rainfall": { "min": 50, "max": 150, "optimal_min": 60, "optimal_max": 100, "unit": "mm_monthly_avg", "total_season_need_mm": 600 },
      "humidity": { "min": 50, "max": 80, "optimal_min": 55, "optimal_max": 75, "unit": "percent" }
    },
    "soil_requirements": {
      "N": { "min": 60, "max": 120, "optimal": 90, "unit": "ppm" },
      "P": { "min": 30, "max": 80, "optimal": 50, "unit": "ppm" },
      "K": { "min": 30, "max": 80, "optimal": 50, "unit": "ppm" },
      "pH": { "min": 5.5, "max": 7.5, "optimal": 6.5 },
      "preferred_soil_types": ["loam", "sandy_loam", "well_drained"],
      "waterlogging_tolerance": "none"
    },
    "water_needs": {
      "category": "medium",
      "irrigation_type": ["furrow", "drip"],
      "drought_tolerance": "low",
      "waterlogging_tolerance": "none",
      "critical_water_stages": ["tasseling", "silking"]
    },
    "rotation": {
      "good_predecessors": ["wheat", "chickpea", "mustard", "potato"],
      "bad_predecessors": ["maize"],
      "good_successors": ["wheat", "chickpea", "mustard", "potato"],
      "bad_successors": ["maize"],
      "rotation_gap_minimum_months": 3,
      "nitrogen_fixing": false,
      "soil_effect": "depleting",
      "recommended_rotation_cycle": ["maize", "wheat", "mungbean"],
      "why_good_rotation": "Good alternative to rice in kharif. Rotates well with winter wheat."
    },
    "regional_suitability": {
      "best_states": ["Karnataka", "Madhya Pradesh", "Bihar", "Tamil Nadu", "Telangana", "Maharashtra", "Andhra Pradesh"],
      "moderate_states": ["Rajasthan", "Uttar Pradesh", "Gujarat"],
      "unsuitable_states": [],
      "why": "Requires well-drained soils and moderate rainfall. Highly adaptable."
    },
    "economics": {
      "investment_level": "medium",
      "labor_intensity": "medium",
      "mechanization_potential": "high",
      "minimum_viable_farm_size_acres": 1,
      "ideal_farm_size_acres": [2, 50],
      "market_demand": "high",
      "msp_available": true,
      "value_category": "commercial"
    },
    "pest_disease_risk": {
      "major_pests": ["fall_armyworm", "stem_borer"],
      "major_diseases": ["turcicum_leaf_blight", "maydis_leaf_blight"],
      "risk_months": ["July", "August"],
      "risk_conditions": "High humidity and moderate temperature favors armyworm"
    },
    "fertilizer_advisory": {
      "N_schedule": "3 splits: 1/3 basal, 1/3 at knee high, 1/3 at tasseling",
      "P_schedule": "Full dose as basal",
      "K_schedule": "Full dose as basal",
      "organic_alternatives": "FYM 10-15t/ha before sowing",
      "micronutrients": "Zinc application is highly recommended"
    },
    "irrigation_advisory": {
      "method": "Furrow irrigation",
      "frequency": "Irrigate at 10-12 day intervals if rain fails",
      "water_saving": "Avoid waterlogging at all costs",
      "critical_periods": "Tasseling and silking stages are highly sensitive to moisture stress"
    },
    "tags": ["kharif", "rabi", "feed_crop", "commercial", "waterlogging_sensitive"]
  },
  "chickpea": {
    "display_name": "Chickpea (Gram)",
    "hindi_name": "चना",
    "category": "pulse",
    "family": "Fabaceae",
    "seasons": {
      "primary": "Rabi",
      "secondary": null,
      "sowing_months": ["October", "November"],
      "harvesting_months": ["February", "March"],
      "growing_duration_days": [100, 130],
      "growing_duration_months": 4
    },
    "climate_requirements": {
      "temperature": { "min": 10, "max": 30, "optimal_min": 15, "optimal_max": 25, "unit": "celsius" },
      "rainfall": { "min": 20, "max": 75, "optimal_min": 30, "optimal_max": 50, "unit": "mm_monthly_avg", "total_season_need_mm": 250 },
      "humidity": { "min": 30, "max": 60, "optimal_min": 40, "optimal_max": 50, "unit": "percent" }
    },
    "soil_requirements": {
      "N": { "min": 10, "max": 40, "optimal": 20, "unit": "ppm" },
      "P": { "min": 30, "max": 60, "optimal": 40, "unit": "ppm" },
      "K": { "min": 20, "max": 50, "optimal": 30, "unit": "ppm" },
      "pH": { "min": 6.0, "max": 8.0, "optimal": 7.0 },
      "preferred_soil_types": ["loam", "sandy_loam", "black_cotton_soils"],
      "waterlogging_tolerance": "none"
    },
    "water_needs": {
      "category": "low",
      "irrigation_type": ["rainfed", "sprinkler"],
      "drought_tolerance": "high",
      "waterlogging_tolerance": "none",
      "critical_water_stages": ["flowering", "pod_formation"]
    },
    "rotation": {
      "good_predecessors": ["rice", "maize", "sorghum", "pearl_millet"],
      "bad_predecessors": ["chickpea", "lentil", "mustard"],
      "good_successors": ["rice", "maize", "sorghum", "pearl_millet"],
      "bad_successors": ["chickpea"],
      "rotation_gap_minimum_months": 3,
      "nitrogen_fixing": true,
      "soil_effect": "enriching",
      "recommended_rotation_cycle": ["rice", "chickpea"],
      "why_good_rotation": "Restores soil nitrogen after depleting cereal crops like rice."
    },
    "regional_suitability": {
      "best_states": ["Madhya Pradesh", "Maharashtra", "Rajasthan", "Uttar Pradesh", "Karnataka"],
      "moderate_states": ["Andhra Pradesh", "Gujarat", "Haryana"],
      "unsuitable_states": ["Kerala", "West Bengal", "Assam"],
      "why": "Requires cool, dry winter. Cannot tolerate waterlogging or high humidity."
    },
    "economics": {
      "investment_level": "low",
      "labor_intensity": "low",
      "mechanization_potential": "high",
      "minimum_viable_farm_size_acres": 0.5,
      "ideal_farm_size_acres": [1, 20],
      "market_demand": "high",
      "msp_available": true,
      "value_category": "staple"
    },
    "pest_disease_risk": {
      "major_pests": ["pod_borer", "cutworm"],
      "major_diseases": ["wilt", "ascochyta_blight"],
      "risk_months": ["January", "February"],
      "risk_conditions": "High humidity and unseasonal rains increase blight risk"
    },
    "fertilizer_advisory": {
      "N_schedule": "Starter dose only: 20kg N/ha as basal",
      "P_schedule": "40-60kg P2O5/ha as basal (very important for root dev)",
      "K_schedule": "20kg K2O/ha if soil is deficient",
      "organic_alternatives": "Seed treatment with Rhizobium and PSB",
      "micronutrients": "Sulphur in deficient soils"
    },
    "irrigation_advisory": {
      "method": "Mostly rainfed. If irrigated, one light irrigation before flowering",
      "frequency": "Max 1-2 irrigations",
      "water_saving": "Highly sensitive to excess water",
      "critical_periods": "Avoid irrigation during active flowering to prevent flower drop"
    },
    "tags": ["rabi", "legume", "nitrogen_fixing", "drought_tolerant", "low_water"]
  },
  "cotton": {
    "display_name": "Cotton",
    "hindi_name": "कपास",
    "category": "fiber",
    "family": "Malvaceae",
    "seasons": {
      "primary": "Kharif",
      "secondary": null,
      "sowing_months": ["May", "June", "July"],
      "harvesting_months": ["October", "November", "December"],
      "growing_duration_days": [150, 180],
      "growing_duration_months": 5
    },
    "climate_requirements": {
      "temperature": { "min": 21, "max": 37, "optimal_min": 25, "optimal_max": 32, "unit": "celsius" },
      "rainfall": { "min": 50, "max": 150, "optimal_min": 60, "optimal_max": 120, "unit": "mm_monthly_avg", "total_season_need_mm": 700 },
      "humidity": { "min": 50, "max": 80, "optimal_min": 55, "optimal_max": 75, "unit": "percent" }
    },
    "soil_requirements": {
      "N": { "min": 60, "max": 140, "optimal": 100, "unit": "ppm" },
      "P": { "min": 30, "max": 70, "optimal": 50, "unit": "ppm" },
      "K": { "min": 40, "max": 90, "optimal": 60, "unit": "ppm" },
      "pH": { "min": 5.8, "max": 8.0, "optimal": 6.5 },
      "preferred_soil_types": ["black_cotton_soils", "clay_loam", "loam"],
      "waterlogging_tolerance": "low"
    },
    "water_needs": {
      "category": "medium",
      "irrigation_type": ["furrow", "drip"],
      "drought_tolerance": "medium",
      "waterlogging_tolerance": "low",
      "critical_water_stages": ["flowering", "boll_development"]
    },
    "rotation": {
      "good_predecessors": ["wheat", "sorghum", "chickpea", "groundnut"],
      "bad_predecessors": ["cotton", "okra", "pigeonpeas"],
      "good_successors": ["wheat", "sorghum", "chickpea", "groundnut"],
      "bad_successors": ["cotton", "okra"],
      "rotation_gap_minimum_months": 3,
      "nitrogen_fixing": false,
      "soil_effect": "depleting",
      "recommended_rotation_cycle": ["cotton", "wheat", "cotton"],
      "why_good_rotation": "Deep-rooted crop. Rotating with cereals breaks pest cycles."
    },
    "regional_suitability": {
      "best_states": ["Maharashtra", "Gujarat", "Telangana", "Andhra Pradesh", "Madhya Pradesh", "Haryana", "Punjab"],
      "moderate_states": ["Rajasthan", "Karnataka", "Tamil Nadu"],
      "unsuitable_states": ["Kerala", "Assam", "West Bengal", "Bihar"],
      "why": "Requires plenty of sunshine and dry weather during boll bursting."
    },
    "economics": {
      "investment_level": "high",
      "labor_intensity": "high",
      "mechanization_potential": "medium",
      "minimum_viable_farm_size_acres": 2,
      "ideal_farm_size_acres": [5, 50],
      "market_demand": "high",
      "msp_available": true,
      "value_category": "commercial"
    },
    "pest_disease_risk": {
      "major_pests": ["bollworms", "whitefly", "jassids", "aphids", "thrips"],
      "major_diseases": ["leaf_curl_virus", "wilt"],
      "risk_months": ["July", "August", "September"],
      "risk_conditions": "High humidity increases sucking pest attacks"
    },
    "fertilizer_advisory": {
      "N_schedule": "3-4 split doses: basal, 30 DAS, 60 DAS",
      "P_schedule": "Full basal",
      "K_schedule": "Basal and at flowering",
      "organic_alternatives": "FYM or compost 10t/ha",
      "micronutrients": "Magnesium and Boron application improves boll opening"
    },
    "irrigation_advisory": {
      "method": "Furrow or Drip irrigation",
      "frequency": "Every 15-20 days if no rain",
      "water_saving": "Drip irrigation saves 40-50% water and improves yield",
      "critical_periods": "Moisture stress during flowering causes bud and boll drop"
    },
    "tags": ["kharif", "commercial", "cash_crop", "black_soil", "high_investment"]
  }
}
"""

crop_data = json.loads(json_str)

with open('data/crop_knowledge_base.json', 'w') as f:
    json.dump(crop_data, f, indent=2)
