import os
import requests 
from typing import List, Optional, Annotated, Dict, Any
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph
from langchain_core.messages import HumanMessage
from datetime import datetime, timezone

load_dotenv()


if not os.getenv("GOOGLE_API_KEY"):
    raise ValueError("GOOGLE_API_KEY not found! Please check your ai_engine/.env file.")

class FrontendMessage(BaseModel):
    userId: str
    message: str

class GraphState(BaseModel):
    userId: str = Field(description="The ID of the user who pressed the throttle")
    routeId: Optional[str] = Field(default=None, description="The active route ID")
    messages: List[FrontendMessage] = Field(description="Chat history")
    context: Optional[str] = Field(default=None, description="AI Analysis Result")

flash_model = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    temperature=0, 
    max_retries=2,
)



async def analyzeEmergency(state: GraphState):
    """
    Analyzes chat history.
    """
    print(f"--- ANALYZING EMERGENCY FOR USER: {state.userId} ---")
    
    rawHistory = state.messages
    history_str = "\n".join([f"[{m.userId}]: {m.message}" for m in rawHistory]) if rawHistory else "No recent chat history."

    prompt = f"""
    You are an emergency safety analysis AI. 
    
    CONTEXT:
    A user (User ID: {state.userId}) has just pressed the EMERGENCY THROTTLE button.
    
    CHAT HISTORY:
    {history_str}

    INSTRUCTIONS:
    1. If you see threats/distress, summarize the anomaly.
    2. If normal, state: "No textual anomaly detected, but throttle pressed by user."
    """
    
    response = await flash_model.ainvoke([HumanMessage(content=prompt)])
    

    return {"context": response.content}

async def saveToDatabase(state: GraphState):
    """
    Sends the analyzed data to your Node.js Backend.
    """
    current_time = datetime.now(timezone.utc).isoformat()
    
    payload = {
        "triggeredByUserId": state.userId,
        "routeId": state.routeId,
        "aiAnalysis": state.context,
        "alertLevel": "HIGH",
        "timestamp": current_time
    }
    backend_url = os.getenv("BACKEND_URL", "http://localhost:3000")
    endpoint = f"{backend_url}/api/room/throttle-room"
    try:
        response = requests.post(endpoint, json=payload)
        
        response.raise_for_status()
        
        print(f" SUCCESS: Backend received the log. Status Code: {response.status_code}")
        
    except requests.exceptions.ConnectionError:
        print(f" ERROR: Could not connect to backend at {backend_url}. Is the Node server running?")
    except requests.exceptions.HTTPError as e:
        print(f"ERROR: Backend returned an error: {e}")
    except Exception as e:
        print(f" ERROR: An unexpected error occurred: {e}")


    return {}


graph = StateGraph(GraphState)

graph.add_node("analyzeEmergency", analyzeEmergency)
graph.add_node("saveToDatabase", saveToDatabase)

graph.add_edge(START, "analyzeEmergency")
graph.add_edge("analyzeEmergency", "saveToDatabase")
graph.add_edge("saveToDatabase", END)

analyze_emergency = graph.compile()

