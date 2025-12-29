import axios from "axios"
const orchestrate_agent_1=async(req,res)=>{
    try {
        const {roomId,messages,currentUseremssage,currentUserId}=req.body
        const modelresponse=await axios.post('http://127.0.0.1:8000/agent1',{
            roomId,
            messages,
            currentUsermessage:currentUseremssage,
            currentUserId
        })
    
        res.status(200).json(modelresponse.data);
    } catch (error) {
        console.log("AI Engine Error",error.message);
        res.status(500).json({error:"Failed to orchestrate agent1"})

        
    }

}
export default orchestrate_agent_1