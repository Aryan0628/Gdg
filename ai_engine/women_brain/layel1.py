from typing import List, Optional, TypedDict, Annotated
from pydantic import BaseModel, Field
import operator

# --- 1. Define the Sub-Structure for Scores ---
class SentimentScore(BaseModel):
    sentiment_score: Annotated[float,Field(description="")]
    reason: str

class UrgencyScore(BaseModel):
    urgency_score: Annotated[float,Field(description="")]
    reason: str

class SeverityScore(BaseModel):
    severity_score: Annotated[float,Field(description="")]
    reason: str
class FinalScore(BaseModel):
    final_safety_score:Annotated[float,Field(description="")]
    reason:str

# --- 2. Define the Structure of a Single Message from Frontend ---
class FrontendMessage(BaseModel):
    userId: str
    message: str


# --- 3. Define the Request Body (What the Frontend Sends) ---
# This validates the JSON coming from React
class ChatRequest(BaseModel):
    roomId: str
    messages: List[FrontendMessage]
    currentUsermessage:str
    currentUserId:str

# --- 4. Define the LangGraph State ---
# This is the internal memory of your graph
class GraphState(TypedDict):
    roomId: Annotated[str,Field(description="Unique room id for the women user on the same route ")]
    # We map the frontend messages to a list of dicts or LangChain objects here
    messages: Annotated[List[FrontendMessage],Field(description="Array of objects containing the messages and user ID ")]  
    currentUserMessage:Annotated[str,Field(description="Current User message Pushed")]
    currentUserId:Annotated[str,Field(description="User Id of the message being pushed")]
    # The outputs your models will populate later
    model_1_score: Optional[SentimentScore]
    model_2_score: Optional[UrgencyScore]
    model_3_score: Optional[SeverityScore]

    final_model_score:Optional[FinalScore]

#forming the functions 
