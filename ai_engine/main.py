from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, RootModel
from typing import List, Dict
from brain.layel_1 import app_graph, FrontendMessage
from brain.layel_2 import surveillance_agent # Assuming this is your surveillance graph

app = FastAPI()

# 1. Chat Request Schema
class ChatRequest(BaseModel):
    roomId: str
    messages: List[FrontendMessage]
    currentUserMessage: str
    currentUserId: str

@app.post("/agent1")
async def chat_endpoint(req: ChatRequest):
    try:
        # 2. Prepare the State
        initial_state = {
            "roomId": req.roomId,
            "messages": req.messages,
            "currentUserMessage": req.currentUserMessage,
            "currentUserId": req.currentUserId
        }

        # 3. Threading Config
        config = {"configurable": {"thread_id": req.roomId}}

        # 4. Run Graph (ASYNC NOW)
        # We use 'await' and 'ainvoke' to prevent blocking the server
        final_state = await app_graph.ainvoke(initial_state, config=config)

        # 5. Return structured result
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

# 6. Surveillance Request Schema
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