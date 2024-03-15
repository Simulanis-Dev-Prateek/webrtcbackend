import https from "https"
import { Server } from "socket.io";
import crypto from "crypto";
import fs from 'fs';


const key = fs.readFileSync('cert.key');
const cert = fs.readFileSync('cert.crt');

const httpserver=https.createServer({key,cert});

const socketio = new Server(httpserver,{
    cors: {
        origin: [`https://192.168.1.136:5173`]
    }
});

const socketroom=new Map();
const socketusername=new Map();
const roomhost=new Map();
socketio.on("connection", (socket) => {
    console.log(`connected to client of id ${socket.id}`);
    console.log(`Total connected sockets: ${socketio.sockets.sockets.size}`);
    socket.on("create-room",()=>{
        const es = crypto.randomBytes(128).toString('base64').slice(0,20);
        let code = "";
        let x = 0;
        for(let i=0; i<20 && code.length<=11; i++){
            if((es[i]>='a' && es[i]<='z') || (es[i]>='A' && es[i]<='Z')|| (es[i]>='0' && es[i]<'9')){
                code+=es[i];
                x++;
            }
            if(x===3){
                code+='-';
                x=0;
            }
        }
        code=code.slice(0,-1);
        socket.emit("create-room",code);
        console.log("room created");
        
    });
    socket.on("check-meet",(code)=>{
        if (socketio.sockets.adapter.rooms.has(code)) {
            socket.emit("check-meet", true);
        }
        else {
            socket.emit("check-meet", false);
        }
    })
    socket.on("join-meet",({code,type,name})=>{
        socket.join(code);
        socketroom.set(socket.id,code);
        socketusername.set(socket.id,name);
        if(type==="host"){
            roomhost.set(code,socket.id);
        }
        socket.emit("join-meet");
    })

    //sending offer to new user from existing
    socket.on("redirectoffers",({to,offer,selfname})=>{
        socket.to(to).emit("offerscame",{offer,from:socket.id,remotename:selfname});
    })

    //triggering existing users to send offers to new user
    socket.on("sendoffers",({code,selfname})=>{
        socket.to(code).emit("sendoffers",{to:socket.id,remotename:selfname});
    })
    

    //sending answers - both
    socket.on("sendAnswer",({to,myanswer })=>{
        socket.to(to).emit("sendAnswer",{answer:myanswer,from:socket.id});
    })


    //handling negotiation
    socket.on("peer:negoNeeded",({offer,to})=>{
        socket.to(to).emit("peer:negoNeeded",{from:socket.id,offer});
    })

    socket.on("peer:negodone",({to,answer})=>{
        socket.to(to).emit("peer:negofinal",{from:socket.id,answer})
    })

    socket.on("stopvideo",(code)=>{
        socket.to(code).emit("stopvideo",socket.id);
    })
    socket.on("stopaudio",(code)=>{
        socket.to(code).emit("stopaudio",socket.id);
    })
    socket.on("stopscreen",(code)=>{
        socket.to(code).emit("stopscreen", socket.id);
    })
    socket.on("trackinfo",({id,code})=>{
        socket.to(code).emit("trackinfo",{id,from:socket.id});
    })
    socket.on("sendtrack",({id,from})=>{
        socket.to(from).emit("sendtrack",{id,from:socket.id});
    })
    //asking permission of host to enter
    socket.on("askhost",({code,name})=>{
        let temphost=roomhost.get(code);
        socket.to(temphost).emit("askhost",{name,to:socket.id});
        console.log("asking to ",temphost)
    })
    socket.on("hostdecision",({answer,to})=>{
        socket.to(to).emit("hostdecision",answer);
    })
    //sending chat messages
    socket.on("chatmessage",({uName,message})=>{
        let room=socketroom.get(socket.id);
        socket.to(room).emit("chatmessage", { uName, message });
    })
    socket.on("handonoff",({type,code})=>{
        socket.to(code).emit("handonoff",{type,from:socket.id});
    })
    socket.on("disconnect",()=>{
        console.log("socket disconnected");
        if(socketroom.get(socket.id)){
            socket.to(socketroom.get(socket.id)).emit("disconnectuser", socket.id);
            socketroom.delete(socket.id)
            socketusername.delete(socket.id);
            let temproom = socketroom.get(socket.id);
            if (roomhost.get(temproom) === socket.id) {
                roomhost.delete(temproom);
            }
        }
        
        
        
    })
});



httpserver.listen(8888,()=>{
    console.log(`server is listening to ${8888} `);
})
