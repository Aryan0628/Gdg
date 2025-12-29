from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from brain.layel_1 import app_graph, FrontendMessage

app = FastAPI()

# 1. Define Request that matches your Frontend
class ChatRequest(BaseModel):
    roomId: str
    messages: List[FrontendMessage]
    currentUserMessage: str
    currentUserId: str

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        # 2. Prepare the State
        initial_state = {
            "roomId": req.roomId,
            "messages": req.messages,
            "currentUserMessage": req.currentUserMessage,
            "currentUserId": req.currentUserId
        }

        # 3. Configure Threading (Memory)
        # Using roomId as thread_id ensures context is kept for this specific room
        config = {"configurable": {"thread_id": req.roomId}}

        # 4. Run Graph
        final_state = app_graph.invoke(initial_state, config=config)

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
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))