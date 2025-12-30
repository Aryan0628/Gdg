import axios from "axios"
const orchestrate_agent_1=async(req,res)=>{
    try {
        const {roomId,messages,currentUserMessage,currentUserId}=req.body
        const modelresponse=await axios.post('http://127.0.0.1:8000/agent1',{
            roomId,
            messages,
            currentUserMessage,
            currentUserId
        })
    
        res.status(200).json(modelresponse.data);
    } catch (error) {
    // 🔴 ADD THIS LOG TO SEE THE REAL ERROR
    if (error.response) {
        console.error("❌ PYTHON VALIDATION ERROR:", JSON.stringify(error.response.data, null, 2));
    } else {
        console.error("❌ CONNECTION ERROR:", error.message);
    }
    res.status(500).json({ error: "AI Engine Failed" });
}

}
export default orchestrate_agent_1