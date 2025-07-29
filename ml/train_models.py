import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib

# Debug: Starting script
print("Starting script...")

# Debug: Check dataset loading
print("Dataset loading...")
data = pd.read_csv('crop_yield.csv')
print("Dataset loaded successfully.")

# Debug: Check dataset loading
print("Dataset Preview:")
print(data.head())
print("\nDataset Info:")
print(data.info())

# # Limit dataset to 1000 rows for testing
print("Limiting dataset to 1000 rows for testing...")
data = data.sample(1000, random_state=42)
print("Dataset limited to 1000 rows.")
# print(f"Using full dataset with {len(data)} records for training...")

# Encode categorical features
label_encoders = {}
for col in ['Region', 'Soil_Type', 'Weather_Condition']:
    le = LabelEncoder()
    data[col] = le.fit_transform(data[col])
    label_encoders[col] = le

# Debug: Check encoded features
for col in ['Region', 'Soil_Type', 'Weather_Condition']:
    print(f"\nUnique values in {col} after encoding:")
    print(data[col].unique())

# Prepare features and targets
X = data[['Region', 'Soil_Type', 'Rainfall_mm', 'Temperature_Celsius', 'Fertilizer_Used', 'Irrigation_Used', 'Weather_Condition']]

# Crop Recommendation Model
y_crop = data['Crop']
X_train_crop, X_test_crop, y_train_crop, y_test_crop = train_test_split(X, y_crop, test_size=0.2, random_state=42)

crop_model = RandomForestClassifier(random_state=42)

# Debug: Starting crop recommendation model training
print("Training crop recommendation model...")
crop_model.fit(X_train_crop, y_train_crop)
print("Crop recommendation model trained successfully.")

# Debug: Check training and testing dataset shapes
print("\nTraining and Testing Dataset Shapes:")
print(f"Crop Recommendation: X_train: {X_train_crop.shape}, X_test: {X_test_crop.shape}")

# Save the crop recommendation model
joblib.dump(crop_model, 'crop_recommendation_model.pkl')

# Harvest Time Prediction Model
y_harvest = data['Days_to_Harvest']
X_train_harvest, X_test_harvest, y_train_harvest, y_test_harvest = train_test_split(X, y_harvest, test_size=0.2, random_state=42)

harvest_model = RandomForestRegressor(random_state=42)

# Debug: Starting harvest time prediction model training
print("Training harvest time prediction model...")
harvest_model.fit(X_train_harvest, y_train_harvest)
print("Harvest time prediction model trained successfully.")

# Debug: Check training and testing dataset shapes
print(f"Harvest Time: X_train: {X_train_harvest.shape}, X_test: {X_test_harvest.shape}")

# Save the harvest time prediction model
joblib.dump(harvest_model, 'harvest_time_model.pkl')

# Yield Prediction Model
y_yield = data['Yield_tons_per_hectare']
X_train_yield, X_test_yield, y_train_yield, y_test_yield = train_test_split(X, y_yield, test_size=0.2, random_state=42)

yield_model = RandomForestRegressor(random_state=42)

# Debug: Starting yield prediction model training
print("Training yield prediction model...")
yield_model.fit(X_train_yield, y_train_yield)
print("Yield prediction model trained successfully.")

# Debug: Check training and testing dataset shapes
print(f"Yield Prediction: X_train: {X_train_yield.shape}, X_test: {X_test_yield.shape}")

# Save the yield prediction model
joblib.dump(yield_model, 'yield_prediction_model.pkl')

# Save label encoders
joblib.dump(label_encoders, 'label_encoders.pkl')

print("Models and encoders saved successfully!")
