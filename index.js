const express = require("express");
const app = express();
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const jwt = require('jsonwebtoken');
const user = { id:1,username:'testuser'};
const secretKey = 'omprakashkey';
const PORT = process.env.PORT || 3000;
const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 300 });
app.use(express.json());
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  handler: (req, res, next, options) =>
    res
      .status(429)
      .json({ error : "You can make only 5 request per IP in 60 seconds" }),
});

app.get('/generate-token', (req,res)=>{
    const {id, username} = req.query;
    
    if(!id||!username)
    {
        return res.status(400).send('username and Id is required');
    }
    const user = {id,username};
    const token = jwt.sign(user,secretKey, {expiresIn:'1h'});
    res.json({token});
})



function verifyToken(req,res,next){
    const authHeader = req.headers['authentication'];
    if(!authHeader)
        return res.status(403).send('Token is required');

    const token = authHeader;
    jwt.verify(token,secretKey, (err,user)=>{
        if(err) {
            return res.status(401).send('Invalid User');
        }
        req.user = user;
        next();
    })
}

const logging = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const ipAddress = req.ip;
  const rateLimitStatus = JSON.stringify(req.rateLimit);
  console.log(`TimeStamp :[${timestamp},IP : ${ipAddress},Rate-Limit-Status ${rateLimitStatus}]`);
  next();
};

app.listen(PORT, () => {
  console.log("Server Listening on ", PORT);
});

app.use(limiter);
app.use(logging);
app.get("/app/json", verifyToken,async (req, res) => {
  try {
    // console.log(req.ip, "rfgrfgbrw");
    const apiUrl = "https://jsonplaceholder.typicode.com/todos/";
    const cachedResponse = cache.get(apiUrl);
    if (cachedResponse) {
      return res.json(cachedResponse);
    }
    console.log("Inside");
    const response = await axios.get(apiUrl);
    cache.set(apiUrl, response.data);

    return res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to fetch todo data" });
  }
});
