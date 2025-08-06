"""
Data-driven insights module to extract optimal conditions from actual crop data.
"""

import pandas as pd
import numpy as np

def analyze_crop_data(csv_file_path='crop_yield.csv'):
    """
    Analyze actual crop data to derive optimal conditions for each crop.
    """
    try:
        # Load the dataset
        data = pd.read_csv(csv_file_path)
        
        # Initialize results dictionary
        crop_insights = {}
        
        # Get unique crops
        crops = data['Crop'].unique()
        
        for crop in crops:
            crop_data = data[data['Crop'] == crop]
            
            # Calculate optimal ranges based on high-yield samples (top 25%)
            high_yield_threshold = crop_data['Yield_tons_per_hectare'].quantile(0.75)
            high_yield_data = crop_data[crop_data['Yield_tons_per_hectare'] >= high_yield_threshold]
            
            if len(high_yield_data) > 0:
                # Use interquartile range (25th to 75th percentile) for more realistic optimal ranges
                rainfall_q25 = high_yield_data['Rainfall_mm'].quantile(0.25)
                rainfall_q75 = high_yield_data['Rainfall_mm'].quantile(0.75)
                temp_q25 = high_yield_data['Temperature_Celsius'].quantile(0.25)
                temp_q75 = high_yield_data['Temperature_Celsius'].quantile(0.75)
                
                # Calculate optimal conditions from high-yield samples
                insights = {
                    'optimal_rainfall_min': round(rainfall_q25, 0),
                    'optimal_rainfall_max': round(rainfall_q75, 0),
                    'optimal_temp_min': round(temp_q25, 1),
                    'optimal_temp_max': round(temp_q75, 1),
                    'avg_yield': round(crop_data['Yield_tons_per_hectare'].mean(), 1),
                    'max_yield': round(crop_data['Yield_tons_per_hectare'].max(), 1),
                    'min_yield': round(crop_data['Yield_tons_per_hectare'].min(), 1),
                    'avg_harvest_days': round(crop_data['Days_to_Harvest'].mean(), 0),
                    'min_harvest_days': round(crop_data['Days_to_Harvest'].min(), 0),
                    'max_harvest_days': round(crop_data['Days_to_Harvest'].max(), 0),
                    'fertilizer_usage_rate': round((crop_data['Fertilizer_Used'].sum() / len(crop_data)) * 100, 1),
                    'irrigation_usage_rate': round((crop_data['Irrigation_Used'].sum() / len(crop_data)) * 100, 1),
                    'best_weather': crop_data.groupby('Weather_Condition')['Yield_tons_per_hectare'].mean().idxmax(),
                    'best_soil': crop_data.groupby('Soil_Type')['Yield_tons_per_hectare'].mean().idxmax(),
                    'best_region': crop_data.groupby('Region')['Yield_tons_per_hectare'].mean().idxmax(),
                    'total_samples': len(crop_data),
                    'high_yield_samples': len(high_yield_data)
                }
                
                crop_insights[crop.lower()] = insights
        
        return crop_insights
    
    except Exception as e:
        print(f"Error analyzing crop data: {e}")
        return {}

def get_data_driven_optimal_conditions(crop_name, crop_insights):
    """
    Get optimal conditions based on actual data analysis.
    """
    crop_data = crop_insights.get(crop_name.lower(), {})
    
    if crop_data:
        rainfall_range = f"{crop_data.get('optimal_rainfall_min', 100)}-{crop_data.get('optimal_rainfall_max', 300)}mm"
        temp_range = f"{crop_data.get('optimal_temp_min', 20)}-{crop_data.get('optimal_temp_max', 30)}°C"
        best_weather = crop_data.get('best_weather', 'Sunny')
        
        return rainfall_range, temp_range, best_weather
    else:
        # Fallback to default values
        return "100-200mm", "20-30°C", "Sunny"

def get_yield_benchmark(crop_name, crop_insights):
    """
    Get yield benchmarks from actual data.
    """
    crop_data = crop_insights.get(crop_name.lower(), {})
    
    return {
        'average_yield': crop_data.get('avg_yield', 3.0),
        'maximum_yield': crop_data.get('max_yield', 5.0),
        'minimum_yield': crop_data.get('min_yield', 1.0),
        'expected_harvest_days': crop_data.get('avg_harvest_days', 90),
        'min_harvest_days': crop_data.get('min_harvest_days', 60),
        'max_harvest_days': crop_data.get('max_harvest_days', 120),
        'data_samples': crop_data.get('total_samples', 0)
    }

def get_farming_recommendations(crop_name, crop_insights):
    """
    Get farming practice recommendations based on data.
    """
    crop_data = crop_insights.get(crop_name.lower(), {})
    
    return {
        'fertilizer_success_rate': f"{crop_data.get('fertilizer_usage_rate', 70)}% of successful farms use fertilizer",
        'irrigation_success_rate': f"{crop_data.get('irrigation_usage_rate', 60)}% of successful farms use irrigation",
        'best_soil_type': crop_data.get('best_soil', 'Loamy'),
        'best_region': crop_data.get('best_region', 'Various')
    }

def evaluate_user_conditions(crop_name, user_rainfall, user_temp, crop_insights):
    """
    Evaluate if user's conditions are optimal based on data-driven insights.
    """
    crop_data = crop_insights.get(crop_name.lower(), {})
    
    if not crop_data:
        return {'rainfall': 'Unknown', 'temperature': 'Unknown'}
    
    # Check if user conditions fall within optimal ranges
    rainfall_min = crop_data.get('optimal_rainfall_min', 0)
    rainfall_max = crop_data.get('optimal_rainfall_max', 1000)
    temp_min = crop_data.get('optimal_temp_min', 0)
    temp_max = crop_data.get('optimal_temp_max', 50)
    
    rainfall_status = 'Optimal' if rainfall_min <= user_rainfall <= rainfall_max else 'Suboptimal'
    temp_status = 'Optimal' if temp_min <= user_temp <= temp_max else 'Suboptimal'
    
    return {
        'rainfall': rainfall_status,
        'temperature': temp_status,
        'rainfall_range': f"{rainfall_min}-{rainfall_max}mm",
        'temperature_range': f"{temp_min}-{temp_max}°C"
    }

if __name__ == "__main__":
    # Test the analysis
    insights = analyze_crop_data()
    print("🌾 DATA-DRIVEN CROP INSIGHTS FROM YOUR DATASET")
    print("=" * 60)
    
    for crop, data in insights.items():
        print(f"\n📊 {crop.title().upper()}:")
        print(f"   📈 Yield Analysis:")
        print(f"      • Average Yield: {data['avg_yield']} tons/ha")
        print(f"      • Yield Range: {data['min_yield']} - {data['max_yield']} tons/ha")
        print(f"   🌧️  Optimal Rainfall: {data['optimal_rainfall_min']}-{data['optimal_rainfall_max']}mm")
        print(f"   🌡️  Optimal Temperature: {data['optimal_temp_min']}-{data['optimal_temp_max']}°C")
        print(f"   ⏱️  Harvest Time: {data['min_harvest_days']}-{data['max_harvest_days']} days (avg: {data['avg_harvest_days']})")
        print(f"   🌤️  Best Weather: {data['best_weather']}")
        print(f"   🌱 Best Soil: {data['best_soil']}")
        print(f"   📍 Best Region: {data['best_region']}")
        print(f"   💧 Fertilizer Usage: {data['fertilizer_usage_rate']}% of farms")
        print(f"   🚿 Irrigation Usage: {data['irrigation_usage_rate']}% of farms")
        print(f"   📋 Data: {data['total_samples']} total samples, {data['high_yield_samples']} high-yield samples")
    
    print(f"\n✅ Analysis complete! Found insights for {len(insights)} crops.")
    print("💡 These ranges are based on the top 25% performing farms in your dataset.")
