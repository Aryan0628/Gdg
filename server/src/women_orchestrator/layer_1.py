from typing import List, Optional, TypedDict, Annotated
from pydantic import BaseModel, Field
from lang
import operator
from fastapi import FastAPI
from .model import app_graph, ChatRequest
class SentimentScore(BaseModel):
    sentiment_score: float
    reason: str

class UrgencyScore(BaseModel):
    urgency_score:float
    reason:str

class SeverityScore(BaseModel):
    severity_score: float
    reason: str
class FrontendMessage(BaseModel):
    userId:str
    message:str
class ChatMessage(BaseModel):
    roomId:str
    messages:List[FrontendMessage]

class GraphState(TypedDict):
    roomId:str
    messages:List[FrontendMessage]
    model_1_score:Optional[SentimentScore]
    model_2_score:Optional[UrgencyScore]
    model_3_score:Optional[SeverityScore]
    model_4_score:Optional[]

# --- 3. Define the Request Body (What the Frontend Sends) ---
# This validates the JSON coming from React
class ChatRequest(BaseModel):
    roomId: str
    messages: List[FrontendMessage]  # This matches your [{userId:..., message:...}] structure

# --- 4. Define the LangGraph State ---
# This is the internal memory of your graph
class GraphState(TypedDict):
    roomId: str
    # We map the frontend messages to a list of dicts or LangChain objects here
    messages: List[FrontendMessage] 
    
    # The outputs your models will populate later
    model_1_score: Optional[SentimentResult]
    model_2_score: Optional[SentimentResult]
    model_3_aggregates: Optional[SentimentResult]