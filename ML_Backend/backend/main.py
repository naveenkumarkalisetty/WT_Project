from fastapi import FastAPI, File, UploadFile, Request, Form, HTTPException, Cookie, Header
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from io import StringIO
from model import train_model, predict, get_saved_model_info, get_user_model_path
import os
import jwt
from typing import Optional
from datetime import datetime

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "../frontend")

app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR), name="frontend")

# Configure CORS properly
origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://127.0.0.1",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add global variable to store historical data
historical_data = None

JWT_SECRET = "937ecf8211be506c8ca605e79db39aef39131141eb5bc10957157e69603ff059a5ed51d7ef2f3d1949185f869dab48b3eac42c00c30d54f04691310aaf5267af"
def get_user_id(token: Optional[str]) -> str:
    if not token:
        raise HTTPException(status_code=401, detail="No token provided")
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = decoded.get('id')
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    file_path = os.path.join(FRONTEND_DIR, "prediction.html")
    with open(file_path, "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)

@app.get("/check-model/")
async def check_user_model(userToken: Optional[str] = Cookie(None)):
    try:
        if not userToken:
            return JSONResponse(content={"has_model": False, "error": "No user token found"})
            
        user_id = get_user_id(userToken)
        if not user_id:
            return JSONResponse(content={"has_model": False, "error": "Invalid user token"})
            
        # Check both model file and info
        model_info = get_saved_model_info(user_id)
        
        return JSONResponse(content={
            "has_model": model_info["has_model"],
            "metrics": model_info.get("metrics", {}),
            "created_at": model_info.get("created_at")
        })
        
    except Exception as e:
        print(f"❌ Error checking model: {str(e)}")
        return JSONResponse(
            content={"has_model": False, "error": str(e)}
        )

@app.post("/upload-csv/")
async def upload_csv(
    file: UploadFile = File(...),
    retrain: Optional[bool] = Form(False),
    userToken: Optional[str] = Cookie(None)
):
    try:
        print(f"\n📂 Received upload request - Filename: {file.filename}, Retrain: {retrain}")
        if not userToken:
            raise HTTPException(status_code=401, detail="No token provided")
            
        user_id = get_user_id(userToken)
        print(f"👤 Processing for user: {user_id}")
        
        user_dir = os.path.join("models", user_id)
        os.makedirs(user_dir, exist_ok=True)
        
        file_path = os.path.join(user_dir, "data.csv")
        content = await file.read()
        print(f"📄 Saving file to: {file_path}")
        
        # Save the CSV file
        with open(file_path, "wb") as f:
            f.write(content)
        
        print("🚀 Starting model training...")
        training_result = train_model(file_path, user_id)
        
        # Store unique items in the model info
        model_info = get_saved_model_info(user_id)
        model_info['unique_items'] = training_result.get('unique_items', {})
        
        return JSONResponse(        
            content={
                "message": f"Model successfully {'retrained' if retrain else 'trained'}",
                "metrics": training_result,
                "status": "success",
                "model_info": model_info,
                "has_model": True,
                "unique_items": training_result.get('unique_items', {}),  # Include unique items
                "timestamp": datetime.now().isoformat()
            }
        )
    except Exception as e:
        print(f"❌ Error in upload_csv: {str(e)}")
        raise HTTPException(
            status_code=400, 
            detail=str(e)
        )

@app.get("/model-info/")
async def get_model_info(userToken: Optional[str] = Cookie(None)):
    try:
        if not userToken:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        user_id = get_user_id(userToken)
        return get_saved_model_info(user_id)
        
    except Exception as e:
        print(f"❌ Error getting model info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/")
async def make_prediction(
    Date: str = Form(...),
    Day: str = Form(...),
    No_of_Students: int = Form(...),
    Item_1_Name: str = Form(...),
    Item_2_Name: str = Form(...),
    Item_3_Name: str = Form(...),
    userToken: Optional[str] = Cookie(None)
):
    try:
        if not userToken:
            raise HTTPException(status_code=401, detail="Authentication required")

        user_id = get_user_id(userToken)
        print(f"🔮 Processing prediction request for user: {user_id}")

        # Validate inputs
        if No_of_Students <= 0:
            raise HTTPException(status_code=400, detail="Number of students must be positive")

        if len({Item_1_Name, Item_2_Name, Item_3_Name}) != 3:
            raise HTTPException(status_code=400, detail="All items must be different")

        input_data = {
            "No_of_Students": No_of_Students,
            "Day": Day,
            "Item_1_Name": Item_1_Name,
            "Item_2_Name": Item_2_Name,
            "Item_3_Name": Item_3_Name
        }

        prediction = predict(input_data, user_id)
        
        return JSONResponse(content={
            "prediction": prediction,
            "status": "success",
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

