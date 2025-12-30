from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, RootModel
from typing import List, Dict
from brain.layel_1 import app_graph, FrontendMessage
from brain.layel_2 import surveillance_agent
from brain.agent3 import analyze_emergency,FrontendMessage
app = FastAPI()
from langchain_core.messages import AIMessage
class ChatRequest(BaseModel):
    roomId: str
    messages: List[FrontendMessage]
    currentUserMessage: str
    currentUserId: str

@app.post("/agent1")
async def chat_endpoint(req: ChatRequest):
    try:
        initial_state = {
            "roomId": req.roomId,
            "messages": req.messages,
            "currentUserMessage": req.currentUserMessage,
            "currentUserId": req.currentUserId
        }

        config = {"configurable": {"thread_id": req.roomId}}

   
        final_state = await app_graph.ainvoke(initial_state, config=config)

    
        return {
            "status": "success",
            "final_score": final_state["final_model_score"].final_safety_score,
            "analysis": final_state["final_model_score"].reason,
            "details": {
                "sentiment": final_state["model_1"],
                "urgency": final_state["model_2"],
                "severity": final_state["model_3"]
            }
        }

    except Exception as e:
        print(f"Error in Chat Endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class RouteBatchRequest(RootModel):
    root: Dict[str, List[float]]

@app.post("/agent2")
async def surveillance_scan(req: RouteBatchRequest):
    try:
        initial_state = {
            "route_data": req.root,
            "messages": []
        }

        # This was already async, keeping it consistent
        result = await surveillance_agent.ainvoke(initial_state)

        final_msg = result["messages"][-1].content

        return {
            "status": "success",
            "ai_report": final_msg
        }

    except Exception as e:
        print(f"Error in Surveillance Endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ThrottleRequest(BaseModel):
    userId: str
    routeId: str
    messages: List[FrontendMessage] 

@app.post("/throttle")
async def throttle_push(req: ThrottleRequest):
    try:
        
        initial_state = {
            "userId": req.userId,
            "routeId": req.routeId,
            "messages": req.messages, 
            "context": None          
        }

        # 3. Invoke the graph
        result = await analyze_emergency.ainvoke(initial_state)
        
        final_msg = result.get("context", "No analysis generated")

        return {
            "status": "Emergency Marked",
            "ai_analysis": final_msg
        }

    except Exception as e:
        print(f"Error in throttle agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))