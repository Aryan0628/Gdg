import os
import requests
import json
from typing import List, Dict, TypedDict, Annotated
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, ToolMessage
from langchain_core.tools import tool
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from dotenv import load_dotenv

load_dotenv()

# --- 1. DEFINE THE TOOL ---
@tool
def flag_suspicious_route(route_id: str):
    """
    Triggers a backend alert for a specific route ID. 
    Use this tool when a route's score pattern indicates danger.
    
    Args:
        route_id: The ID of the suspicious route.
    """
    try:
        # Calls your Node.js/FastAPI backend
        backend_url = os.getenv("BACKEND_URL", "http://localhost:3000")
        endpoint = f"{backend_url}/api/room/flag-room"
        
        # Since the tool only accepts route_id, we infer defaults for the backend
        payload = {
            "roomId": route_id,
            "severity": "HIGH",            # Defaulting to HIGH as agent flagged it
            "ai_reason": "Automated surveillance flag by AI Agent" # Generic reason
        }
        
        response = requests.post(endpoint, json=payload, timeout=5)
        return f"ALARM TRIGGERED for {route_id}. Status: {response.status_code}"
            
    except Exception as e:
        return f"FAILED to trigger alarm for {route_id}: {str(e)}"

# --- 2. STATE DEFINITION ---
class SurveillanceState(TypedDict):
    # This is the INPUT data (The Dictionary)
    route_data: Dict[str, List[float]]
    # This is the INTERNAL scratchpad (UserMsg -> AI -> Tool -> ToolMsg ...)
    messages: Annotated[List[BaseMessage], add_messages]

# --- 3. MODEL SETUP ---
llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0)
llm_with_tools = llm.bind_tools([flag_suspicious_route])

# --- 4. NODES ---

def analyst_node(state: SurveillanceState):
    """
    The Brain: Looks at 'route_data' and decides if tools are needed.
    """
    data = state["route_data"]
    
    # If this is the start of the conversation (no internal messages yet)
    # We construct the initial prompt using the dictionary data.
    if not state["messages"]:
        prompt_content = f"""
        Analyze this Route Safety Data: {json.dumps(data)}

        --- THE SAFETY RUBRIC (Reference) ---
        [9-10] SAFE (Green): Friendly banter, logistics.
        [7-8]  CAUTION (Yellow): Rude, weird vibes.
        [4-6]  UNSAFE (Orange): Harassment, "Stop" ignored, Stalking.
        [1-3]  DANGER (Red): Threats, SOS, Violence.
        
        RULES:
        1. Input is a dictionary: {{ "routeId": [score_history] }}
        2. DANGER CRITERIA:
           - Rapid Drop: Score drops >= 3 points (e.g., 9 -> 5).
           - Low Average: Last 3 scores are all < 5.
        3. ACTION:
           - If a route matches DANGER CRITERIA, call 'flag_suspicious_route(route_id)'.
           - If multiple routes are bad, call the tool for EACH one.
        4. If all are safe, simply respond "Surveillance Clean".
        """
        # We manually inject this as a HumanMessage to start the chain
        return {"messages": [HumanMessage(content=prompt_content)]}
    
    # If we are looping back (after a tool call), we just invoke the model 
    # with the existing history.
    response = llm_with_tools.invoke(state["messages"])
    return {"messages": [response]}

def tool_node(state: SurveillanceState):
    """
    The Executor: actually calls the function `flag_suspicious_route`.
    """
    last_message = state["messages"][-1]
    tool_outputs = []
    
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        for tool_call in last_message.tool_calls:
            if tool_call["name"] == "flag_suspicious_route":
                # Execute the tool
                print(f"🚨 FLAGGING ROUTE: {tool_call['args']['route_id']}")
                result = flag_suspicious_route.invoke(tool_call)
                
                # Append result to history
                tool_outputs.append(
                    ToolMessage(
                        content=result,
                        tool_call_id=tool_call["id"],
                        name=tool_call["name"]
                    )
                )
    
    return {"messages": tool_outputs}

# --- 5. LOGIC & EDGES ---

def router(state: SurveillanceState):
    last_message = state["messages"][-1]
    # If AI wants to call a tool -> Go to tool_node
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "call_tool"
    # Otherwise -> End
    return "end"

workflow = StateGraph(SurveillanceState)

workflow.add_node("analyst", analyst_node)
workflow.add_node("tools", tool_node)

workflow.add_edge(START, "analyst")

workflow.add_conditional_edges(
    "analyst",
    router,
    {
        "call_tool": "tools",
        "end": END
    }
)

# After tool runs, go back to analyst (to see if more routes need flagging or to finish)
workflow.add_edge("tools", "analyst")

surveillance_agent = workflow.compile()