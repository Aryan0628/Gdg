import os
from typing import List, Optional, TypedDict, Annotated
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph
from langgraph.checkpoint.memory import MemorySaver

load_dotenv()

if not os.getenv("GOOGLE_API_KEY"):
    raise ValueError("GOOGLE_API_KEY not found! Please check your ai_engine/.env file.")

# --- 1. SETUP MODELS ---
flash_model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0, 
    max_retries=2,
)

pro_model = ChatGoogleGenerativeAI(
    model="gemini-2.5-pro", # Using Pro for the heavy lifting of context analysis
    temperature=0.1,
)

# --- 2. DEFINE OUTPUT STRUCTURES ---
class SentimentScore(BaseModel):
    sentiment_score: float = Field(description="Float 0.0 to 1.0. 0=Hostile, 1=Friendly")
    reason: str = Field(description="Concise evidence from text")

class UrgencyScore(BaseModel):
    urgency_score: float = Field(description="Float 0.0 to 1.0. 1=Immediate Danger")
    reason: str = Field(description="Keywords or tone indicating time-sensitivity")

class SeverityScore(BaseModel):
    severity_score: float = Field(description="Float 0.0 to 1.0. 1=Severe Harassment/Threat")
    reason: str = Field(description="Specific category of threat detected")

class FinalScore(BaseModel):
    final_safety_score: float = Field(description="Integer-like float 1.0 to 10.0")
    reason: str = Field(description="Detailed verdict citing history and current threats")

# --- 3. STATE DEFINITIONS ---
class FrontendMessage(BaseModel):
    userId: str
    message: str

class GraphState(TypedDict):
    roomId: str
    messages: List[FrontendMessage] # Full history from frontend
    currentUserMessage: str
    currentUserId: str
    # Outputs
    model_1: Optional[SentimentScore]
    model_2: Optional[UrgencyScore]
    model_3: Optional[SeverityScore]
    final_model_score: Optional[FinalScore]

# --- 4. BINDINGS ---
sentiment_engine = flash_model.with_structured_output(SentimentScore)
urgency_engine = flash_model.with_structured_output(UrgencyScore)
severity_engine = flash_model.with_structured_output(SeverityScore)
final_engine = pro_model.with_structured_output(FinalScore)

# --- 5. WORKER NODES (Specialized & Efficient) ---

# Changed to 'async def' and 'await ... .ainvoke()'
async def analyze_sentiment(state: GraphState):
    msg = state["currentUserMessage"]
    prompt = f"""
    ROLE: Linguistic Sentiment Analyst.
    TASK: Analyze the emotional tone of the target message ONLY.
    
    TARGET MESSAGE: "{msg}"
    
    INSTRUCTIONS:
    - Ignore the safety implications; focus purely on emotion.
    - 0.0 = Extremely Negative (Angry, Hateful, Hostile, Disgusted).
    - 0.5 = Neutral (Factual, Questioning, Bored).
    - 1.0 = Extremely Positive (Happy, Grateful, Excited).
    
    OUTPUT: Provide a precise float score and a 5-word explanation.
    """
    result = await sentiment_engine.ainvoke(prompt)
    return {"model_1": result}

# Changed to 'async def' and 'await ... .ainvoke()'
async def analyze_urgency(state: GraphState):
    msg = state["currentUserMessage"]
    prompt = f"""
    ROLE: Emergency Response Dispatcher.
    TASK: Determine if this message requires IMMEDIATE intervention.
    
    TARGET MESSAGE: "{msg}"
    
    INSTRUCTIONS:
    - Look for "trigger words": Help, Police, Now, Scared, Followed, Location.
    - 0.0 = Casual conversation (No time pressure).
    - 0.5 = Uncomfortable but not immediate (e.g., "Stop texting me").
    - 1.0 = CRITICAL EMERGENCY (e.g., "He is following me", "Call police").
    
    OUTPUT: specific urgency_score and reason.
    """
    result = await urgency_engine.ainvoke(prompt)
    return {"model_2": result}

# Changed to 'async def' and 'await ... .ainvoke()'
async def analyze_severity(state: GraphState):
    msg = state["currentUserMessage"]
    prompt = f"""
    ROLE: Harassment & Threat Detection Specialist.
    TASK: Classify the nature of the threat in the message.
    
    TARGET MESSAGE: "{msg}"
    
    INSTRUCTIONS:
    - 0.0 = Safe / Friendly.
    - 0.3 = Annoying / Spam / Unwanted attention.
    - 0.7 = Sexual Harassment / Stalking / Explicit Slurs.
    - 1.0 = Direct Threat of Violence / Kidnapping / Rape.
    
    OUTPUT: specific severity_score and reason.
    """
    result = await severity_engine.ainvoke(prompt)
    return {"model_3": result}

# --- 6. THE FINAL JUDGE (With Memory Context) ---

# Changed to 'async def' and 'await ... .ainvoke()'
async def final_judge(state: GraphState):
    # 1. Extract & Format History (Last 10 messages for efficiency)
    raw_history = state["messages"][-10:] 
    history_str = "\n".join([f"[{m.userId}]: {m.message}" for m in raw_history])
    
    # 2. Extract Current Data
    current_msg = state["currentUserMessage"]
    s = state["model_1"]
    u = state["model_2"]
    sev = state["model_3"]
    
    # 3. The "Deep" Prompt
    prompt = f"""
    ROLE: Senior Safety Operations Manager for a Women's Safety App.
    
    GOAL: Calculate a Final Safety Score (1-10) based on Context, History, and Expert Reports.
    
    --- DATA SOURCES ---
    
    A. RECENT CHAT HISTORY (Context):
    {history_str}
    
    B. CURRENT MESSAGE (The Trigger):
    "{current_msg}"
    
    C. EXPERT AI REPORTS:
    - Sentiment (0-1): {s.sentiment_score} (Context: {s.reason})
    - Urgency (0-1): {u.urgency_score} (Context: {u.reason})
    - Severity (0-1): {sev.severity_score} (Context: {sev.reason})
    
    --- SCORING RUBRIC (1-10) ---
    
    [9-10] SAFE / GREEN:
    - Casual conversation, jokes, friendly banter.
    - Even if Sentiment is low (0.2), if Severity is 0, it might just be an argument between friends.
    
    [7-8] SUSPICIOUS / YELLOW:
    - Unwanted pestering after being told "no" (Check History!).
    - Creepy comments, weird questions about location.
    - Sudden change in tone from friendly to aggressive.
    
    [4-6] HARASSMENT / ORANGE:
    - Explicit sexual comments.
    - Stalking behavior ("I see you at the station").
    - Persistent abuse.
    
    [1-3] DANGER / RED:
    - Direct threats of violence.
    - "Help", "Police", "Emergency".
    - User explicitly stating they are being followed or touched.
    
    --- ANALYSIS INSTRUCTIONS ---
    
    1. CHECK HISTORY PATTERNS: 
       - Is this a one-off bad joke, or repeated harassment? 
       - If the user said "Stop" previously and he continues, BOOST the score by +3 points.
       
    2. CHECK CONTRADICTIONS:
       - If Sentiment is Positive (He is "smiling") but Severity is High (He is "stalking"), TRUST SEVERITY. Stalkers can be polite.
       
    3. FINAL DECISION:
       - Output a precise score and a detailed explanation citing specific messages from history if relevant.
    """
    
    result = await final_engine.ainvoke(prompt)
    return {"final_model_score": result}

# --- 7. COMPILE GRAPH ---
graph = StateGraph(GraphState)

graph.add_node("analyze_sentiment", analyze_sentiment)
graph.add_node("analyze_urgency", analyze_urgency)
graph.add_node("analyze_severity", analyze_severity)
graph.add_node("final_judge", final_judge)

# Parallel execution
graph.add_edge(START, "analyze_sentiment")
graph.add_edge(START, "analyze_urgency")
graph.add_edge(START, "analyze_severity")

# Aggregation
graph.add_edge("analyze_sentiment", "final_judge")
graph.add_edge("analyze_urgency", "final_judge")
graph.add_edge("analyze_severity", "final_judge")

graph.add_edge("final_judge", END)

memory = MemorySaver()
app_graph = graph.compile(checkpointer=memory)