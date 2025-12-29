import axios from "axios"
const orchestrate_agent_2=async(req,res)=>{
    try {
        const {payload}=req.body;
        const response=await axios.post('http://127.0.0.1:8000/agent2',{
            payload,
        })
        res.status(200).json(response)
    } catch (error) {
        console.log("Error from agent2",error.message)
        res.status(500).json({error:"Failed to orchestrate agent2"})
    }

}
export default orchestrate_agent_2