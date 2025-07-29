#!/usr/bin/env python3
"""
Demonstration of data sources in the crop recommendation system.
"""

def show_data_sources():
    print("🔍 DATA SOURCES IN CROP RECOMMENDATION SYSTEM")
    print("=" * 70)
    
    print("\n🤖 FROM TRAINED ML MODELS:")
    print("  ├── Crop Suitability Score (33%, 17%, 17%)")
    print("  │   └── Source: crop_model.predict_proba()")
    print("  │   └── Model: RandomForest Classifier")
    print("  │")
    print("  ├── Expected Yield (4.4 tons/ha)")
    print("  │   └── Source: yield_model.predict()")
    print("  │   └── Model: RandomForest Regressor")
    print("  │")
    print("  └── Harvest Time (112 days)")
    print("      └── Source: harvest_model.predict()")
    print("      └── Model: RandomForest Regressor")
    
    print("\n📊 FROM DATASET ANALYSIS (166K+ Real Farm Records):")
    print("  ├── Real Data Insights:")
    print("  │   ├── Avg Yield: 4.7 tons/ha")
    print("  │   ├── Max Potential: 9.8-10.0 tons/ha")
    print("  │   ├── Typical Harvest: 105 days")
    print("  │   ├── Best Soil: Loam/Peaty/Chalky")
    print("  │   └── Fertilizer/Irrigation Usage: ~50%")
    print("  │")
    print("  ├── Optimal Growing Conditions:")
    print("  │   ├── Rainfall: 719-926mm (IQR from top 25% farms)")
    print("  │   └── Temperature: 22.1-34.5°C (IQR from top 25% farms)")
    print("  │")
    print("  └── Current Conditions Status:")
    print("      └── Suboptimal/Optimal (user input vs data ranges)")
    
    print("\n🗃️ FROM STATIC DATABASE:")
    print("  ├── Seeds needed: 25-30 kg/ha, 100-120 kg/ha, etc.")
    print("  ├── Fertilizer: NPK 14-14-14, NPK 18-18-18, etc.")
    print("  ├── Season: Both seasons, Maha")
    print("  ├── Crop Type: Grain, Cash Crop")
    print("  └── Images: Stock photo URLs")
    
    print("\n🔄 DYNAMIC CALCULATIONS:")
    print("  ├── Harvest Month: November 2025")
    print("  │   └── Calculated from: predicted days + current date")
    print("  └── Growth Stage: Long-term crop")
    print("      └── Based on: harvest time ranges")

    print("\n" + "=" * 70)
    print("✅ ML MODELS provide PREDICTIONS")
    print("📊 DATASET provides REAL-WORLD INSIGHTS") 
    print("🗃️ DATABASE provides STATIC INFORMATION")
    print("🔄 CALCULATIONS provide CONTEXTUAL DATA")

if __name__ == "__main__":
    show_data_sources()
