"""
This module contains the crop recommendation logic using trained machine learning models.
"""

import joblib
import pandas as pd
import numpy as np
import os
from .data_analyzer import analyze_crop_data, get_data_driven_optimal_conditions, get_yield_benchmark, get_farming_recommendations, evaluate_user_conditions

# Load trained models and encoders
current_dir = os.path.dirname(os.path.abspath(__file__))

# Load crop insights from actual data
print("Analyzing crop data for insights...")
crop_insights = analyze_crop_data(os.path.join(current_dir, 'crop_yield.csv'))
print(f"✓ Analyzed data for {len(crop_insights)} crops")

try:
    crop_model = joblib.load(os.path.join(current_dir, 'crop_recommendation_model.pkl'))
    yield_model = joblib.load(os.path.join(current_dir, 'yield_prediction_model.pkl'))
    harvest_model = joblib.load(os.path.join(current_dir, 'harvest_time_model.pkl'))
    label_encoders = joblib.load(os.path.join(current_dir, 'label_encoders.pkl'))
    print("✓ All ML models loaded successfully")
except Exception as e:
    print(f"Error loading models: {e}")
    # Fallback to None if models don't exist
    crop_model = None
    yield_model = None
    harvest_model = None
    label_encoders = None

# Crop database for additional information
crop_database = {
    'rice': {
        'name': 'Rice',
        'type': 'Grain',
        'season': 'Both seasons',
        'image': 'https://media.istockphoto.com/id/1183896276/photo/ripe-rice-and-beautiful-sky-in-daylight.jpg?s=612x612&w=0&k=20&c=W17eTu9E6egqK-5PDOBEARbf1zytAqg1AOl9RuuxQ4E=',
        'seedRequired': '25-30 kg/ha',
        'fertilizerNeeded': 'NPK 14-14-14'
    },
    'maize': {
        'name': 'Maize',
        'type': 'Grain',
        'season': 'Both seasons',
        'image': 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=200&h=150&fit=crop&crop=center',
        'seedRequired': '20-25 kg/ha',
        'fertilizerNeeded': 'NPK 15-15-15'
    },
    'wheat': {
        'name': 'Wheat',
        'type': 'Grain',
        'season': 'Maha',
        'image': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=150&fit=crop&crop=center',
        'seedRequired': '100-120 kg/ha',
        'fertilizerNeeded': 'NPK 18-18-18'
    },
    'barley': {
        'name': 'Barley',
        'type': 'Grain',
        'season': 'Both seasons',
        'image': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=150&fit=crop&crop=center',
        'seedRequired': '80-100 kg/ha',
        'fertilizerNeeded': 'NPK 16-16-16'
    },
    'cotton': {
        'name': 'Cotton',
        'type': 'Cash Crop',
        'season': 'Both seasons',
        'image': 'https://media.istockphoto.com/id/1282980437/photo/cotton-field-agriculture-concept-photo.jpg?s=612x612&w=0&k=20&c=mrHNwK-Rq78bJmBMG8hWOxn2w-gReb99v99HOYBJ14Q=',
        'seedRequired': '20-25 kg/ha',
        'fertilizerNeeded': 'NPK 17-17-17'
    },
    'soybean': {
        'name': 'Soybean',
        'type': 'Legume',
        'season': 'Both seasons',
        'image': 'https://media.istockphoto.com/id/184878412/photo/soybean.jpg?s=612x612&w=0&k=20&c=y2ErWVIJEIZ2o_O2YGjfLHePuMLyRwf_5_felYaD-Qc=',
        'seedRequired': '60-80 kg/ha',
        'fertilizerNeeded': 'NPK 20-20-20'
    }
}

def encode_input_data(region, soil_type, weather_condition, label_encoders):
    """
    Encode categorical input data using the trained label encoders.
    """
    try:
        # Map region names to match training data
        region_mapping = {
            'North': 'Northern',
            'South': 'Southern', 
            'East': 'Eastern',
            'West': 'Western'
        }
        region = region_mapping.get(region, region)
        
        # Map soil types to match training data
        soil_mapping = {
            'Clay': 'Clay',
            'Sandy': 'Sandy',
            'Loam': 'Loamy',
            'Silt': 'Silty',
            'Peaty': 'Peaty',
            'Chalky': 'Chalky'
        }
        soil_type = soil_mapping.get(soil_type, soil_type)
        
        # Map weather conditions
        weather_mapping = {
            'Sunny': 'Sunny',
            'Rainy': 'Rainy',
            'Cloudy': 'Cloudy'
        }
        weather_condition = weather_mapping.get(weather_condition, weather_condition)
        
        encoded_region = label_encoders['Region'].transform([region])[0]
        encoded_soil = label_encoders['Soil_Type'].transform([soil_type])[0]
        encoded_weather = label_encoders['Weather_Condition'].transform([weather_condition])[0]
        
        return encoded_region, encoded_soil, encoded_weather
    except Exception as e:
        print(f"Encoding error: {e}")
        # Return default values if encoding fails
        return 0, 0, 0

def get_optimal_rainfall_range(crop_name):
    """Get optimal rainfall range for a specific crop from actual data."""
    rainfall_range, _, _ = get_data_driven_optimal_conditions(crop_name, crop_insights)
    return rainfall_range

def get_optimal_temperature_range(crop_name):
    """Get optimal temperature range for a specific crop from actual data."""
    _, temp_range, _ = get_data_driven_optimal_conditions(crop_name, crop_insights)
    return temp_range

def get_best_weather_condition(crop_name):
    """Get best weather condition for a specific crop from actual data."""
    _, _, best_weather = get_data_driven_optimal_conditions(crop_name, crop_insights)
    
    # Enhance with context based on crop type
    weather_context = {
        'sunny': 'Sunny conditions for optimal growth',
        'rainy': 'Adequate rainfall during growing season',
        'cloudy': 'Moderate conditions with cloud cover'
    }
    
    return weather_context.get(best_weather.lower(), best_weather)

def get_harvest_month(days_to_harvest):
    """Calculate approximate harvest month based on days to harvest."""
    from datetime import datetime, timedelta
    
    today = datetime.now()
    harvest_date = today + timedelta(days=days_to_harvest)
    
    months = {
        1: 'January', 2: 'February', 3: 'March', 4: 'April',
        5: 'May', 6: 'June', 7: 'July', 8: 'August',
        9: 'September', 10: 'October', 11: 'November', 12: 'December'
    }
    
    return f"{months[harvest_date.month]} {harvest_date.year}"

def get_growth_stage(days_to_harvest):
    """Determine growth stage description based on days to harvest."""
    if days_to_harvest <= 30:
        return "Quick harvest crop"
    elif days_to_harvest <= 60:
        return "Short-term crop"
    elif days_to_harvest <= 90:
        return "Medium-term crop"
    elif days_to_harvest <= 120:
        return "Long-term crop" 
    else:
        return "Extended season crop"

def get_crop_recommendations(region, soil_type, rainfall, temperature,
                           fertilizer_used, irrigation_used,
                           weather_condition, days_to_harvest):
    """
    Get crop recommendations based on input parameters using trained ML models.
    
    Args:
        region (str): Geographic region
        soil_type (str): Type of soil
        rainfall (float): Average rainfall in mm
        temperature (float): Average temperature in Celsius
        fertilizer_used (str): Type of fertilizer used
        irrigation_used (str): Type of irrigation
        weather_condition (str): Current weather conditions
        days_to_harvest (int): Desired days to harvest
        
    Returns:
        list: List of recommended crops with their scores
    """
    
    # If models are not loaded, return mock data
    if not all([crop_model, yield_model, harvest_model, label_encoders]):
        return get_mock_recommendations(rainfall, temperature)
    
    try:
        # Convert and validate input parameters
        rainfall = float(rainfall) if rainfall else 0
        temperature = float(temperature) if temperature else 0
        days_to_harvest = int(days_to_harvest) if days_to_harvest else 90
        
        # Convert string boolean inputs to numeric
        fertilizer_numeric = 1 if fertilizer_used.lower() == 'true' else 0
        irrigation_numeric = 1 if irrigation_used.lower() == 'true' else 0
        
        # Encode categorical features
        encoded_region, encoded_soil, encoded_weather = encode_input_data(
            region, soil_type, weather_condition, label_encoders
        )
        
        # Prepare input data for ML models
        input_data = pd.DataFrame({
            'Region': [encoded_region],
            'Soil_Type': [encoded_soil],
            'Rainfall_mm': [rainfall],
            'Temperature_Celsius': [temperature],
            'Fertilizer_Used': [fertilizer_numeric],
            'Irrigation_Used': [irrigation_numeric],
            'Weather_Condition': [encoded_weather]
        })
        
        # Get crop prediction probabilities
        crop_probabilities = crop_model.predict_proba(input_data)[0]
        crop_classes = crop_model.classes_
        
        # Get top 3 crop recommendations
        top_indices = np.argsort(crop_probabilities)[-3:][::-1]
        recommendations = []
        
        for i, idx in enumerate(top_indices):
            crop_name = crop_classes[idx]
            confidence = crop_probabilities[idx] * 100
            
            # Skip if confidence is too low
            if confidence < 5:  # Lowered threshold to show more results
                continue
            
            # Predict yield and harvest time for this specific crop input
            predicted_yield = yield_model.predict(input_data)[0]
            predicted_harvest_time = harvest_model.predict(input_data)[0]
            
            # Get crop details from database
            crop_info = crop_database.get(crop_name.lower(), {
                'name': crop_name.title(),
                'type': 'Crop',
                'season': 'Both seasons',
                'image': 'https://via.placeholder.com/200x150/22c55e/ffffff?text=🌱',
                'seedRequired': 'Contact local supplier',
                'fertilizerNeeded': 'NPK fertilizer'
            })
            
                # Get yield benchmarks from actual data
            yield_benchmark = get_yield_benchmark(crop_name, crop_insights)
            farming_recommendations = get_farming_recommendations(crop_name, crop_insights)
            
            # Evaluate user conditions against data-driven optimal ranges
            user_condition_evaluation = evaluate_user_conditions(crop_name, rainfall, temperature, crop_insights)
            
            recommendation = {
                'name': crop_info['name'],
                'type': crop_info['type'],
                'suitabilityScore': round(confidence, 1),
                'yield': f"{predicted_yield:.1f} tons/ha",
                'seedRequired': crop_info['seedRequired'],
                'fertilizerNeeded': crop_info['fertilizerNeeded'],
                'season': crop_info['season'],
                'image': crop_info['image'],
                'predicted_harvest_time': int(predicted_harvest_time),
                'expected_conditions': {
                    'optimal_rainfall': get_optimal_rainfall_range(crop_name),
                    'optimal_temperature': get_optimal_temperature_range(crop_name),
                    'best_weather': get_best_weather_condition(crop_name),
                    'recommended_fertilizer': 'Yes' if fertilizer_numeric else 'Recommended',
                    'recommended_irrigation': 'Yes' if irrigation_numeric else 'Recommended'
                },
                'data_insights': {
                    'average_yield_benchmark': f"{yield_benchmark['average_yield']:.1f} tons/ha",
                    'maximum_yield_potential': f"{yield_benchmark['maximum_yield']:.1f} tons/ha",
                    'minimum_yield_recorded': f"{yield_benchmark['minimum_yield']:.1f} tons/ha",
                    'typical_harvest_time': f"{yield_benchmark['expected_harvest_days']:.0f} days",
                    'harvest_range': f"{yield_benchmark['min_harvest_days']:.0f}-{yield_benchmark['max_harvest_days']:.0f} days",
                    'fertilizer_success_rate': farming_recommendations['fertilizer_success_rate'],
                    'irrigation_success_rate': farming_recommendations['irrigation_success_rate'],
                    'best_soil_type': farming_recommendations['best_soil_type'],
                    'best_region': farming_recommendations['best_region'],
                    'data_samples': f"Based on {yield_benchmark['data_samples']} real farm records"
                },
                'suitability_factors': {
                    'rainfall': user_condition_evaluation['rainfall'],
                    'temperature': user_condition_evaluation['temperature'],
                    'rainfall_optimal_range': user_condition_evaluation['rainfall_range'],
                    'temperature_optimal_range': user_condition_evaluation['temperature_range']
                },
                'harvest_prediction': {
                    'expected_days': int(predicted_harvest_time),
                    'harvest_month': get_harvest_month(int(predicted_harvest_time)),
                    'growth_stage': get_growth_stage(int(predicted_harvest_time))
                }
            }
            
            recommendations.append(recommendation)
        
        return recommendations if recommendations else get_mock_recommendations(rainfall, temperature)
        
    except Exception as e:
        print(f"ML prediction error: {e}")
        # Fallback to mock data if ML prediction fails
        return get_mock_recommendations(rainfall, temperature)

def get_mock_recommendations(rainfall, temperature):
    """
    Fallback function that returns mock recommendations when ML models fail.
    """
    # Ensure rainfall and temperature are numeric
    try:
        rainfall = float(rainfall) if rainfall else 200
        temperature = float(temperature) if temperature else 25
    except (ValueError, TypeError):
        rainfall = 200
        temperature = 25
    
    mock_recommendations = [
        {
            'name': 'Rice',
            'type': 'Grain',
            'suitabilityScore': 85.5,
            'yield': '4.2 tons/ha',
            'seedRequired': '25-30 kg/ha',
            'fertilizerNeeded': 'NPK 14-14-14',
            'season': 'Both seasons',
            'image': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=150&fit=crop&crop=center',
            'predicted_harvest_time': 120,
            'expected_conditions': {
                'optimal_rainfall': '150-300mm/month',
                'optimal_temperature': '20-35°C',
                'best_weather': 'Rainy (during growth), Sunny (during harvest)',
                'recommended_fertilizer': 'Yes',
                'recommended_irrigation': 'Yes'
            },
            'suitability_factors': {
                'rainfall': 'Optimal' if 150 <= rainfall <= 300 else 'Suboptimal',
                'temperature': 'Optimal' if 20 <= temperature <= 35 else 'Suboptimal'
            },
            'harvest_prediction': {
                'expected_days': 120,
                'harvest_month': get_harvest_month(120),
                'growth_stage': 'Long-term crop'
            }
        },
        {
            'name': 'Corn',
            'type': 'Grain',
            'suitabilityScore': 75.2,
            'yield': '3.8 tons/ha',
            'seedRequired': '20-25 kg/ha',
            'fertilizerNeeded': 'NPK 15-15-15',
            'season': 'Both seasons',
            'image': 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=200&h=150&fit=crop&crop=center',
            'predicted_harvest_time': 140,
            'expected_conditions': {
                'optimal_rainfall': '100-200mm/month',
                'optimal_temperature': '18-30°C',
                'best_weather': 'Sunny with adequate moisture',
                'recommended_fertilizer': 'Yes',
                'recommended_irrigation': 'Yes'
            },
            'suitability_factors': {
                'rainfall': 'Optimal' if 75 <= rainfall <= 150 else 'Suboptimal',
                'temperature': 'Optimal' if 15 <= temperature <= 25 else 'Suboptimal'
            },
            'harvest_prediction': {
                'expected_days': 140,
                'harvest_month': get_harvest_month(140),
                'growth_stage': 'Extended season crop'
            }
        }
    ]
    
    return mock_recommendations
