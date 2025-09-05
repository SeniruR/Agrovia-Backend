from flask import Flask, request, jsonify
from flask_cors import CORS

from ml.recommendation import get_crop_recommendations

app = Flask(__name__)
CORS(app)

@app.route('/test', methods=['GET'])
def test():
    return jsonify({"message": "Server is running!"})

@app.route('/recommend', methods=['POST'])
def recommend_crop():
    try:
        # Extract data from the request
        data = request.get_json()
        region = data.get('region')
        soil_type = data.get('soilType')
        rainfall = data.get('rainfall')
        temperature = data.get('temperature')
        fertilizer_used = data.get('fertilizerUsed')
        irrigation_used = data.get('irrigationUsed')
        weather_condition = data.get('weatherCondition')
        days_to_harvest = data.get('daysToHarvest')

        # Get recommendations using the ML module
        recommendations = get_crop_recommendations(
            region, soil_type, rainfall, temperature,
            fertilizer_used, irrigation_used,
            weather_condition, days_to_harvest
        )
                
        return jsonify(recommendations)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
