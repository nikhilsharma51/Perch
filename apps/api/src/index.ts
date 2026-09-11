import express from "express";
import helmet from "helmet"
import cors from "cors";


const app = express();

app.use(helmet());

app.use(cors({
    origin: "http://localhost:3000",
}))

app.listen(3000,()=>{
    console.log("API running on port 3000");
})