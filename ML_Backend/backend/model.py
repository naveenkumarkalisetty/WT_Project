import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
from sklearn.linear_model import LinearRegression, MultiTaskLasso, MultiTaskElasticNet
from sklearn.ensemble import RandomForestRegressor, ExtraTreesRegressor
from sklearn.neighbors import KNeighborsRegressor
from sklearn.neural_network import MLPRegressor
import joblib
import os
from datetime import datetime
from pathlib import Path

def get_user_model_path(user_id: str) -> str:
    return os.path.join("models", user_id)

def get_saved_model_info(user_id=None):
    """Get information about the saved model"""
    try:
        model_path = os.path.join(get_user_model_path(user_id), 'model.joblib')
        
        if not os.path.exists(model_path):
            return {"has_model": False}

        model_data = joblib.load(model_path)
        return {
            "has_model": True,
            "metrics": {
                "r2_scores": model_data.get('r2_scores', {}),
                "mae_scores": model_data.get('mae_scores', {}),
                "rmse_scores": model_data.get('rmse_scores', {}),
                "model_name": model_data.get('model_name', 'Unknown'),
                "model_params": model_data.get('model_params', {})
            },
            "created_at": model_data.get('created_at', datetime.now().isoformat())
        }
    except Exception as e:
        print(f"Error getting model info: {e}")
        return {"has_model": False, "error": str(e)}

def train_model(file_path: str, user_id: str):
    print(f"\n🔄 Starting model training for user: {user_id}")
    try:
        print(f"📖 Reading data from: {file_path}")
        df = pd.read_csv(file_path)
        print(f"📊 Original data shape: {df.shape}")
        
        # Extract unique items before renaming columns
        unique_items = {
            'item_1_options': df['item_1_name'].unique().tolist(),
            'item_2_options': df['item_2_name'].unique().tolist(),
            'item_3_options': df['item_3_name'].unique().tolist()
        }
        
        # Rename columns to match expected format
        column_mapping = {
            'no_of_student': 'No_of_Students',
            'day': 'Day',
            'item_1_name': 'Item_1_Name',
            'item_1_cooked': 'Item_1_Cooked',
            'item_1_left_over': 'Item_1_Left_Over',
            'item_2_name': 'Item_2_Name',
            'item_2_cooked': 'Item_2_Cooked',
            'item_2_left_over': 'Item_2_Left_Over',
            'item_3_name': 'Item_3_Name',
            'item_3_cooked': 'Item_3_Cooked',
            'item_3_left_over': 'Item_3_Left_Over'
        }
        
        # Convert column names to lowercase for case-insensitive mapping
        df.columns = df.columns.str.lower()
        
        # Rename columns
        df = df.rename(columns=column_mapping)
        print("📝 Mapped columns:", df.columns.tolist())
        
        features = ['No_of_Students', 'Day', 
                   'Item_1_Name', 'Item_1_Cooked', 'Item_1_Left_Over',
                   'Item_2_Name', 'Item_2_Cooked', 'Item_2_Left_Over',
                   'Item_3_Name', 'Item_3_Cooked', 'Item_3_Left_Over']
        
        # Validate columns after mapping
        missing_cols = [col for col in features if col not in df.columns]
        if missing_cols:
            print(f"❌ Missing columns after mapping: {missing_cols}")
            print(f"💡 Available columns: {df.columns.tolist()}")
            raise ValueError(f"CSV file missing required columns: {missing_cols}")
        
        print("🔧 Preparing features and targets...")
        X = pd.get_dummies(df[features], columns=['Day', 'Item_1_Name', 'Item_2_Name', 'Item_3_Name'])
        y = df[['Item_1_Cooked', 'Item_2_Cooked', 'Item_3_Cooked']]
        print(f"📈 Feature matrix shape: {X.shape}, Target shape: {y.shape}")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Define models and their parameter grids
        models = {
            'MultiTaskLasso': (
                MultiTaskLasso(),
                {'alpha': [0.1, 1.0, 10.0]}
            ),
            'MultiTaskElasticNet': (
                MultiTaskElasticNet(),
                {'alpha': [0.1, 1.0], 'l1_ratio': [0.25, 0.5, 0.75]}
            ),
            'RandomForestRegressor': (
                RandomForestRegressor(),
                {
                    'n_estimators': [100, 200],
                    'max_depth': [None, 10, 20],
                    'min_samples_split': [2, 5]
                }
            ),
            'ExtraTreesRegressor': (
                ExtraTreesRegressor(),
                {
                    'n_estimators': [100, 200],
                    'max_depth': [None, 10, 20]
                }
            ),
            'KNeighborsRegressor': (
                KNeighborsRegressor(),
                {
                    'n_neighbors': [3, 5, 7],
                    'weights': ['uniform', 'distance']
                }
            ),
            'MLPRegressor': (
                MLPRegressor(max_iter=1000),
                {
                    'hidden_layer_sizes': [(50,), (100,), (50, 50)],
                    'alpha': [0.0001, 0.001]
                }
            )
        }

        # Train and evaluate models
        model_results = []
        
        for name, (model, param_grid) in models.items():
            print(f"\n🔍 Training {name}...")
            grid_search = GridSearchCV(
                model, param_grid, 
                cv=5, n_jobs=-1, 
                scoring='r2'
            )
            
            grid_search.fit(X_train_scaled, y_train)
            predictions = grid_search.predict(X_test_scaled)
            
            # Calculate metrics
            r2_scores = [r2_score(y_test[col], predictions[:, i]) 
                        for i, col in enumerate(y_test.columns)]
            mae_scores = [mean_absolute_error(y_test[col], predictions[:, i]) 
                         for i, col in enumerate(y_test.columns)]
            mse_scores = [mean_squared_error(y_test[col], predictions[:, i]) 
                         for i, col in enumerate(y_test.columns)]
            rmse_scores = [np.sqrt(mse) for mse in mse_scores]
            
            model_results.append({
                'name': name,
                'model': grid_search.best_estimator_,
                'params': grid_search.best_params_,
                'r2_scores': {f'item_{i+1}': score for i, score in enumerate(r2_scores)},
                'mae_scores': {f'item_{i+1}': score for i, score in enumerate(mae_scores)},
                'mse_scores': {f'item_{i+1}': score for i, score in enumerate(mse_scores)},
                'rmse_scores': {f'item_{i+1}': score for i, score in enumerate(rmse_scores)},
                'avg_r2': np.mean(r2_scores)
            })

        # Sort models by average R² score and select the best one
        model_results.sort(key=lambda x: x['avg_r2'], reverse=True)
        best_model = model_results[0]
        
        print(f"\n✨ Best model: {best_model['name']}")
        print(f"📊 Average R² Score: {best_model['avg_r2']:.4f}")
        
        # Save model with metadata
        model_data = {
            'model': best_model['model'],
            'scaler': scaler,
            'feature_columns': X.columns.tolist(),
            'r2_scores': best_model['r2_scores'],
            'mae_scores': best_model['mae_scores'],
            'mse_scores': best_model['mse_scores'],
            'rmse_scores': best_model['rmse_scores'],
            'model_name': best_model['name'],
            'model_params': best_model['params'],
            'created_at': datetime.now().isoformat()
        }
        
        user_dir = get_user_model_path(user_id)
        os.makedirs(user_dir, exist_ok=True)
        joblib.dump(model_data, os.path.join(user_dir, 'model.joblib'))
        
        # Return top 3 models info
        top_3_results = [{
            'name': res['name'],
            'r2_scores': res['r2_scores'],
            'params': res['params'],
            'avg_r2': res['avg_r2']
        } for res in model_results[:3]]
        
        return {
            'r2_scores': best_model['r2_scores'],
            'top_3_models': top_3_results,
            'unique_items': unique_items  # Add unique items to response
        }
        
    except Exception as e:
        print(f"❌ Training error: {str(e)}")
        raise Exception(f"Training error: {str(e)}")

def predict(input_data: dict, user_id: str):
    print(f"\n🔮 Starting prediction for user: {user_id}")
    try:
        model_path = os.path.join(get_user_model_path(user_id), 'model.joblib')
        print(f"📂 Loading model from: {model_path}")
        
        if not os.path.exists(model_path):
            print("❌ Model file not found")
            raise Exception("Model not found")
            
        print("🔄 Loading model and preprocessing data...")
        model_data = joblib.load(model_path)
        model = model_data['model']
        scaler = model_data['scaler']
        feature_columns = model_data['feature_columns']
        
        print(f"📥 Input data: {input_data}")
        input_df = pd.DataFrame([input_data])
        print("🔧 Encoding categorical features...")
        input_encoded = pd.get_dummies(input_df, columns=['Day', 'Item_1_Name', 'Item_2_Name', 'Item_3_Name'])
        
        # Align columns with training data
        for col in feature_columns:
            if col not in input_encoded.columns:
                input_encoded[col] = 0
        input_encoded = input_encoded[feature_columns]
        
        # Scale and predict
        input_scaled = scaler.transform(input_encoded)
        print(f"📊 Making prediction...")
        predictions = model.predict(input_scaled)[0]
        result = {
            'item_1_quantity': round(float(predictions[0]), 2),
            'item_2_quantity': round(float(predictions[1]), 2),
            'item_3_quantity': round(float(predictions[2]), 2)
        }
        print(f"✅ Prediction result: {result}")
        return result
        
    except Exception as e:
        print(f"❌ Prediction error: {str(e)}")
        raise Exception(f"Prediction error: {str(e)}")
