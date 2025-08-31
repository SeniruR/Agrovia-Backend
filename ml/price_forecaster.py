import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
import json
import sys
import os
import joblib
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# Paths
MODEL_DIR = os.path.dirname(__file__)
MODEL_MODEL_PATH = os.path.join(MODEL_DIR, 'model.pkl')
LE_CROP_PATH = os.path.join(MODEL_DIR, 'le_crop.pkl')
LE_CATEGORY_PATH = os.path.join(MODEL_DIR, 'le_category.pkl')
CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'daily-crop-prices.csv')

def preprocess_data():
    """Load and preprocess the CSV data"""
    try:
        # Read the CSV file
        df = pd.read_csv(CSV_PATH)
        
        # Clean the data
        df = df.dropna()
        
        # Extract price values from the price_range column
        def extract_price(price_str):
            try:
                # Remove 'Rs.' and any other non-numeric characters except digits, hyphens, and dots
                price_str = str(price_str).replace('Rs.', '').replace(' ', '').replace(',', '')
                if '-' in price_str:
                    prices = price_str.split('-')
                    # Take the average of the price range
                    return (float(prices[0]) + float(prices[1])) / 2
                else:
                    return float(price_str)
            except Exception as e:
                print(f"Error extracting price from {price_str}: {e}")
                return None
        
        df['price'] = df['price_range'].apply(extract_price)
        df = df.dropna(subset=['price'])
        
        # Convert date to datetime
        df['date'] = pd.to_datetime(df['date'])
        
        # Extract features from date
        df['day_of_week'] = df['date'].dt.dayofweek
        df['day_of_month'] = df['date'].dt.day
        df['month'] = df['date'].dt.month
        df['year'] = df['date'].dt.year
        
        # Encode categorical variables
        le_crop = LabelEncoder()
        le_category = LabelEncoder()
        
        df['crop_encoded'] = le_crop.fit_transform(df['crop'])
        df['category_encoded'] = le_category.fit_transform(df['category'])
        
        return df, le_crop, le_category
        
    except Exception as e:
        print(f"Error preprocessing data: {e}")
        return None, None, None

def train_model():
    """Train the forecasting model"""
    try:
        df, le_crop, le_category = preprocess_data()
        
        if df is None or len(df) == 0:
            return {"error": "Failed to preprocess data or no data available"}
        
        # Features and target
        features = ['crop_encoded', 'category_encoded', 'day_of_week', 'day_of_month', 'month', 'year']
        X = df[features]
        y = df['price']
        
        # Split the data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train the model
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)
        
        # Evaluate the model
        y_pred = model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        mse = mean_squared_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        
        print(f"Model trained successfully:")
        print(f"MAE: {mae:.2f}")
        print(f"RMSE: {rmse:.2f}")

        # Save the model and encoders as separate .pkl files
        joblib.dump(model, MODEL_MODEL_PATH)
        joblib.dump(le_crop, LE_CROP_PATH)
        joblib.dump(le_category, LE_CATEGORY_PATH)

        return {
            "success": True,
            "mae": mae,
            "rmse": rmse,
            "samples": len(df)
        }

    except Exception as e:
        return {"error": f"Error training model: {e}"}

def predict_price(crop_name, category_name, days=7):
    """Predict prices for the next days"""
    try:
        # Load the model and encoders
        if not (os.path.exists(MODEL_MODEL_PATH) and os.path.exists(LE_CROP_PATH) and os.path.exists(LE_CATEGORY_PATH)):
            return {"error": "Model or encoders not found. Please run training first (python price_forecaster.py train)."}

        model = joblib.load(MODEL_MODEL_PATH)
        le_crop = joblib.load(LE_CROP_PATH)
        le_category = joblib.load(LE_CATEGORY_PATH)
        
        # Get the current date
        current_date = datetime.now()
        
        # Create future dates
        future_dates = [current_date + timedelta(days=i) for i in range(1, days+1)]
        
        # Prepare prediction data
        predictions = []
        
        for i, date in enumerate(future_dates):
            # Encode crop and category
            try:
                crop_encoded = le_crop.transform([crop_name])[0]
            except:
                # If crop not in training data, use average encoding
                crop_encoded = np.mean(range(len(le_crop.classes_)))
            
            try:
                category_encoded = le_category.transform([category_name])[0]
            except:
                # If category not in training data, use average encoding
                category_encoded = np.mean(range(len(le_category.classes_)))
            
            # Create feature vector
            features = np.array([[
                crop_encoded,
                category_encoded,
                date.weekday(),
                date.day,
                date.month,
                date.year
            ]])
            
            # Make prediction
            price = model.predict(features)[0]
            
            # Add some randomness to simulate confidence intervals
            confidence = max(70, 95 - (i * 2))  # Decreasing confidence for further predictions
            
            predictions.append({
                "date": date.strftime("%Y-%m-%d"),
                "price": round(float(price), 2),
                "confidence": confidence
            })
        
        return predictions
        
    except Exception as e:
        return {"error": f"Error making predictions: {e}"}

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "train":
        result = train_model()
        print(json.dumps(result))
    
    elif len(sys.argv) > 1 and sys.argv[1] == "predict":
        if len(sys.argv) < 5:
            print(json.dumps({"error": "Please provide crop name, category, and days"}))
        else:
            crop_name = sys.argv[2]
            category_name = sys.argv[3]
            days = int(sys.argv[4])
            
            predictions = predict_price(crop_name, category_name, days)
            print(json.dumps(predictions))
    
    else:
        print(json.dumps({"error": "Invalid command. Use 'train' or 'predict'"}))