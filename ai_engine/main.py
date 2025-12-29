from fastapi import FastAPI
from pydantic import BaseModel
from brain.graph import app_graph # Import the graph you just made

app = FastAPI()

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    # Run the graph!
    initial_state = {"message": req.message, "response": ""}
    result = app_graph.invoke(initial_state)
    return {"reply": result["response"]}