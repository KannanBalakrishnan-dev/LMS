import React,{useState} from "react";
import {
 Box,
 Paper,
 TextField,
 IconButton,
 Typography,
 Fab
} from "@mui/material";

import SmartToyIcon from "@mui/icons-material/SmartToy";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";

import api from "../../api";


function AIChatBot(){

const [open,setOpen]=useState(false);
const [message,setMessage]=useState("");
const [chat,setChat]=useState([]);


const sendMessage=async()=>{

if(!message.trim()) return;


const userText=message;


setChat(prev=>[
...prev,
{
role:"user",
text:userText
}
]);


setMessage("");


try{

const res=await api.post(
"/ai/chat/",
{
message:userText
}
);


setChat(prev=>[
...prev,
{
role:"ai",
text:res.data.reply
}
]);


}catch(error){

console.log(error);

}

}



return(
<>

{open &&

<Paper

sx={{
position:"fixed",
right:25,
bottom:90,
width:350,
height:450,
zIndex:9999,
borderRadius:4,
p:2,
display:"flex",
flexDirection:"column"
}}

>

<Box
display="flex"
justifyContent="space-between"
>

<Typography fontWeight={700}>
🤖 AI Tutor
</Typography>


<IconButton
onClick={()=>setOpen(false)}
>
<CloseIcon/>
</IconButton>


</Box>


<Box sx={{
flex:1,
overflow:"auto"
}}>

{chat.map((c,i)=>(

<Typography
key={i}
sx={{
textAlign:
c.role==="user"
?"right":"left",
my:1
}}
>

{c.text}

</Typography>


))}


</Box>


<Box display="flex">

<TextField
size="small"
fullWidth
value={message}
placeholder="Ask anything..."
onChange={(e)=>
setMessage(e.target.value)
}
/>


<IconButton
onClick={sendMessage}
>
<SendIcon/>
</IconButton>


</Box>

</Paper>

}


<Fab

onClick={()=>
setOpen(!open)
}

sx={{
position:"fixed",
right:25,
bottom:25,
background:"#1E5FD9",
color:"white"
}}

>

<SmartToyIcon/>

</Fab>


</>
)

}


export default AIChatBot;