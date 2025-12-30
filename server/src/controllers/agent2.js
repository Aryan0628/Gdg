import axios from "axios"
const orchestrate_agent_2=async(req,res)=>{
    try {
        const {payload}=req.body;
        const response=await axios.post('http://127.0.0.1:8000/agent2',{
            payload,
        })
        res.status(200).json(response.data)
    } catch (error) {
  // 👇 ADD THIS BLOCK TO SEE THE REAL ERROR
        if (error.response) {
            console.error("❌ AGENT 2 VALIDATION ERROR:");
            console.error(JSON.stringify(error.response.data, null, 2)); // This prints the exact missing field
        } else {
            console.error("❌ CONNECTION ERROR:", error.message);
        }
        res.status(500).json({ error: "Agent 2 Failed" });
}

}
export default orchestrate_agent_2