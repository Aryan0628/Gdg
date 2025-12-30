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
        
        payload = {
            "roomId": route_id,
            "severity": "HIGH",
            "ai_reason": "Automated surveillance flag by AI Agent"
        }
        
        # Requests is synchronous, so using 'def' is the correct way.
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
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)
llm_with_tools = llm.bind_tools([flag_suspicious_route])

# --- 4. NODES ---

# ... inside layel_2.py ...

async def analyst_node(state: SurveillanceState):
    """
    The Brain: Looks at 'route_data' and decides if tools are needed.
    """
    print("\n--- 🧠 ANALYST NODE STARTED ---")
    data = state["route_data"]
    messages = state["messages"]
    
    # 1. INITIALIZATION: If no messages exist, we must start the conversation
    if not messages:
        print("🔹 Mode: Initialization (Creating Prompt)")
        prompt_content = f"""
        Analyze this Route Safety Data: {json.dumps(data)}

        --- THE SAFETY RUBRIC (Reference) ---
        [9-10] SAFE (Green): Friendly banter, logistics.
        [7-8]  CAUTION (Yellow): Rude, weird vibes.
        [4-6]  UNSAFE (Orange): Harassment, "Stop" ignored, Stalking.
        [1-3]  DANGER (Red): Threats, SOS, Violence.
        
        RULES:
        1. Input is a dictionary: {{ "routeId": [score_history] }}
        2. DATA STRUCTURE: The array is chronological. The LAST number is the LATEST score.
        3. DANGER CRITERIA:
           - Rapid Drop: Score drops >= 3 points (e.g., 9 -> 5).
           - Low Average: Last 3 scores are all < 5.
        4. ACTION:
           - If a route matches DANGER CRITERIA, call 'flag_suspicious_route(route_id)'.
           - If multiple routes are bad, call the tool for EACH one.
        5. If all are safe, simply respond "Surveillance Clean".
        """
        
        # Create the prompt object
        first_message = HumanMessage(content=prompt_content)
        
        # ⚠️ CRITICAL STEP: Invoke the LLM *IMMEDIATELY* with this new message
        print("🔹 Invoking LLM with initial prompt...")
        response = await llm_with_tools.ainvoke([first_message])
        
        print(f"🔹 LLM Response Generated. Tool Calls: {response.tool_calls}")
        
        # ⚠️ CRITICAL RETURN: We must return BOTH the prompt AND the response
        # This ensures the Router sees the AI's response as the last message.
        return {"messages": [first_message, response]}
    
    # 2. CONTINUATION: If messages exist (e.g., looping back from a tool)
    print("🔹 Mode: Continuation (History exists)")
    response = await llm_with_tools.ainvoke(state["messages"])
    print(f"🔹 LLM Response Generated. Tool Calls: {response.tool_calls}")
    
    return {"messages": [response]}


async def tool_node(state: SurveillanceState):
    """
    The Executor: actually calls the function `flag_suspicious_route`.
    Handles both 'tool_calls' and legacy 'function_call'.
    """
    last_message = state["messages"][-1]
    tool_outputs = []
    
    # 1. Get the tool calls (Try standard first, then fallback)
    tool_calls = getattr(last_message, "tool_calls", [])
    
    # 2. If empty, check for legacy 'function_call' (The Fix)
    if not tool_calls and "function_call" in last_message.additional_kwargs:
        fc = last_message.additional_kwargs["function_call"]
        # Convert legacy format to modern format manually
        tool_calls = [{
            "name": fc["name"],
            "args": json.loads(fc["arguments"]),
            "id": "legacy_call" 
        }]

    # 3. Execute Loop
    if tool_calls:
        for tool_call in tool_calls:
            if tool_call["name"] == "flag_suspicious_route":
                print(f"🚨 FLAGGING ROUTE: {tool_call['args']['route_id']}")
                
                # Since we changed the tool to 'def' (sync), .ainvoke handles the thread automatically.
                # This is much safer than before.
                result = await flag_suspicious_route.ainvoke(tool_call)
                
                tool_outputs.append(
                    ToolMessage(
                        content=str(result),
                        tool_call_id=tool_call["id"],
                        name=tool_call["name"]
                    )
                )
    else:
        print("⚠️ Tool Node ran but found no tool calls to execute!")
    
    return {"messages": tool_outputs}
# --- 5. LOGIC & EDGES ---

async def router(state: SurveillanceState):
    """
    Router with Debugging to fix the 'Silent Failure'
    """
    messages = state["messages"]
    last_message = messages[-1]
    
    # 🔍 DEBUGGING: Print exactly what the Router sees
    print("\n--- 🧐 ROUTER DIAGNOSTICS ---")
    print(f"Message Type: {type(last_message)}")
    print(f"Message Content: {last_message.content[:50]}...") # Print first 50 chars
    
    # Check for tool_calls safely
    tool_calls = getattr(last_message, "tool_calls", [])
    print(f"Tool Calls Found: {tool_calls}")

    # 1. Check standard tool_calls (New LangChain standard)
    if tool_calls and len(tool_calls) > 0:
        print("✅ DECISION: Routing to 'tools' node.")
        print("-----------------------------\n")
        return "call_tool"
    
    # 2. Safety Fallback: Sometimes Gemini puts it in additional_kwargs (Older style)
    # This catches cases where tool_calls might be empty but the data exists elsewhere
    if "function_call" in last_message.additional_kwargs:
        print("✅ DECISION: Routing to 'tools' node (via fallback).")
        print("-----------------------------\n")
        return "call_tool"

    print("🛑 DECISION: Routing to END.")
    print("-----------------------------\n")
    return "end"

# ... (Ens
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