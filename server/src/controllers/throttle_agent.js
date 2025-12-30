import axios from "axios"
const throttle_agent=async(req,res)=>{
    try {
        const {message,userId,routeId}=req.body;
        const response=await axios.post('http://127.0.0.1:8000/throttle',{
            message,
            userId,
            routeId
        })
        res.status(200).json(response)
    } catch (error) {
        console.log("Error from throttle agent",error.message)
        res.status(500).json({error:"Failed to orchestrate throttle agent"})
    }
}
export default throttle_agent