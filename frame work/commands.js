let currentFrame=0,totalFrames=10,isPlaying=false,drawing=false,playInterval=null;
let brushColor="#fff",brushSize=12,brushOpacity=1,currentTool="Brush";
let zoom=1,panX=0,panY=0,panning=false,lx=0,ly=0,frames=[];

const startupScreen=document.getElementById("startupScreen");
const studio=document.getElementById("studio");
const canvas=document.getElementById("animationCanvas");
const ctx=canvas.getContext("2d");

function newAnimation(){
    let n=Number(prompt("How many frames?","24"));
    if(!Number.isInteger(n)||n<1||n>1000)return alert("Enter 1-1000.");
    totalFrames=n;currentFrame=0;frames=Array(n).fill(null);
    startupScreen.classList.add("hidden");
    startupScreen.style.setProperty("display","none","important");
    studio.classList.remove("hidden");
    studio.style.setProperty("display","flex","important");
    clearCanvas();createTimeline();
}

function createTimeline(){
    const box=document.getElementById("frames");
    box.innerHTML="";
    for(let i=0;i<totalFrames;i++){
        const b=document.createElement("button");
        b.className="frame";b.textContent=i+1;
        b.onclick=()=>selectFrame(i);
        box.appendChild(b);
    }
    updateFrameButtons();
}

function openProject(){alert("Project loading will be added soon.");}

function importArtwork(){
    const input=document.createElement("input");
    input.type="file";input.accept="image/png,image/jpeg";
    input.onchange=e=>{
        const file=e.target.files[0];
        if(!file)return;
        const img=new Image();
        img.onload=()=>{
            clearCanvas();
            ctx.drawImage(img,0,0,canvas.width,canvas.height);
            saveCurrentFrame();
            URL.revokeObjectURL(img.src);
        };
        img.src=URL.createObjectURL(file);
    };
    input.click();
}

function clearCanvas(){
    ctx.globalCompositeOperation="source-over";
    ctx.globalAlpha=1;
    ctx.fillStyle="#fff";
    ctx.fillRect(0,0,canvas.width,canvas.height);
}

function pos(e){
    const r=canvas.getBoundingClientRect();
    return {
        x:(e.clientX-r.left)*canvas.width/r.width,
        y:(e.clientY-r.top)*canvas.height/r.height
    };
}

canvas.onpointerdown=e=>{
    const p=pos(e);

    if(["Brush","Pencil","Eraser"].includes(currentTool)){
        drawing=true;canvas.setPointerCapture(e.pointerId);
        ctx.beginPath();ctx.moveTo(p.x,p.y);
        draw(e);
    }
    else if(currentTool==="Fill"){
        fill(p.x,p.y);saveCurrentFrame();
    }
    else if(currentTool==="Lasso"){
        drawing=true;ctx.beginPath();ctx.moveTo(p.x,p.y);
    }
    else if(currentTool==="Move"){
        drawing=true;lx=p.x;ly=p.y;
    }
    else if(currentTool==="Hand"){
        panning=true;lx=e.clientX;ly=e.clientY;
    }
    else if(currentTool==="Zoom"){
        zoom=Math.min(4,zoom+.25);applyTransform();
    }
};

canvas.onpointermove=e=>{
    if(currentTool==="Brush"||currentTool==="Pencil"||currentTool==="Eraser"){
        if(drawing)draw(e);
    }
    else if(currentTool==="Lasso"&&drawing){
        const p=pos(e);
        ctx.strokeStyle="#6a0dad";ctx.lineWidth=2;
        ctx.setLineDash([5,5]);
        ctx.lineTo(p.x,p.y);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x,p.y);
    }
    else if(currentTool==="Move"&&drawing){
        const p=pos(e);
        ctx.translate(p.x-lx,p.y-ly);lx=p.x;ly=p.y;
    }
    else if(currentTool==="Hand"&&panning){
        panX+=e.clientX-lx;panY+=e.clientY-ly;
        lx=e.clientX;ly=e.clientY;applyTransform();
    }
};

canvas.onpointerup=e=>{
    if(drawing){
        drawing=false;
        ctx.setLineDash([]);
        ctx.globalAlpha=1;
        ctx.globalCompositeOperation="source-over";
        saveCurrentFrame();
    }
    panning=false;
};

function draw(e){
    const p=pos(e);
    ctx.lineCap="round";ctx.lineJoin="round";
    ctx.lineWidth=currentTool==="Pencil"?Math.max(1,brushSize/2):
        currentTool==="Eraser"?brushSize*1.5:brushSize;
    ctx.globalAlpha=currentTool==="Eraser"?1:brushOpacity;
    ctx.globalCompositeOperation=currentTool==="Eraser"?
        "destination-out":"source-over";
    ctx.strokeStyle=brushColor;
    ctx.lineTo(p.x,p.y);ctx.stroke();
    ctx.beginPath();ctx.moveTo(p.x,p.y);
}

function fill(x,y){
    const d=ctx.getImageData(0,0,canvas.width,canvas.height),p=d.data;
    const i=(Math.floor(y)*canvas.width+Math.floor(x))*4;
    const target=[p[i],p[i+1],p[i+2],p[i+3]];
    const color=hex(brushColor);
    if(target.join()===[...color,255].join())return;
    const stack=[[Math.floor(x),Math.floor(y)]];
    while(stack.length){
        const [x,y]=stack.pop();
        if(x<0||y<0||x>=canvas.width||y>=canvas.height)continue;
        const i=(y*canvas.width+x)*4;
        if(p[i]!==target[0]||p[i+1]!==target[1]||p[i+2]!==target[2]||p[i+3]!==target[3])continue;
        p[i]=color[0];p[i+1]=color[1];p[i+2]=color[2];p[i+3]=255;
        stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    }
    ctx.putImageData(d,0,0);
}

function hex(c){
    c=c.replace("#","");
    return[parseInt(c.slice(0,2),16),parseInt(c.slice(2,4),16),parseInt(c.slice(4,6),16)];
}

function applyTransform(){
    canvas.style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`;
    const z=document.querySelector(".canvasControls span");
    if(z)z.textContent=Math.round(zoom*100)+"%";
}

function saveCurrentFrame(){
    frames[currentFrame]=ctx.getImageData(0,0,canvas.width,canvas.height);
}

function loadFrame(n){
    ctx.setLineDash([]);
    ctx.globalAlpha=1;
    ctx.globalCompositeOperation="source-over";
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(frames[n])ctx.putImageData(frames[n],0,0);
    else clearCanvas();
}

function selectFrame(n){
    if(n<0||n>=totalFrames)return;
    saveCurrentFrame();currentFrame=n;loadFrame(n);updateFrameButtons();
}

function updateFrameButtons(){
    document.querySelectorAll(".frame").forEach((b,i)=>
        b.classList.toggle("activeFrame",i===currentFrame));
}

function previousFrame(){if(currentFrame>0)selectFrame(currentFrame-1);}
function nextFrame(){if(currentFrame<totalFrames-1)selectFrame(currentFrame+1);}

function togglePlayback(){isPlaying?stopPlayback():startPlayback();}

function startPlayback(){
    isPlaying=true;
    document.getElementById("playButton").textContent="⏸️";
    const fps=Math.max(1,Math.min(120,Number(document.getElementById("fps").value)||12));
    playInterval=setInterval(()=>{
        currentFrame=(currentFrame+1)%totalFrames;
        loadFrame(currentFrame);updateFrameButtons();
    },1000/fps);
}

function stopPlayback(){
    isPlaying=false;clearInterval(playInterval);playInterval=null;
    document.getElementById("playButton").textContent="▶️";
}

document.querySelectorAll(".tool").forEach(t=>{
    t.onclick=()=>{
        document.querySelectorAll(".tool").forEach(x=>x.classList.remove("active"));
        t.classList.add("active");
        currentTool=t.title;
        ctx.setLineDash([]);
    };
});

document.getElementById("brushSize").oninput=e=>{
    brushSize=+e.target.value;
    document.getElementById("sizeValue").textContent=brushSize+"px";
};

document.getElementById("brushOpacity").oninput=e=>{
    brushOpacity=+e.target.value/100;
    document.getElementById("opacityValue").textContent=e.target.value+"%";
};

document.getElementById("colorPicker").oninput=e=>updateColor();

document.querySelectorAll(".colorPalette button").forEach(b=>{
    b.onclick=()=>{
        brushColor=rgbToHex(b.style.backgroundColor);
        document.getElementById("colorPicker").value=brushColor;
        document.getElementById("colorPreview").style.background=brushColor;
    };
});

function updateColor(){
    brushColor=document.getElementById("colorPicker").value;
    document.getElementById("colorPreview").style.background=brushColor;
}

function rgbToHex(rgb){
    const v=rgb.match(/\d+/g);
    return v?"#"+v.map(x=>(+x).toString(16).padStart(2,"0")).join(""):"#fff";
}

document.getElementById("fps").onchange=()=>{
    if(isPlaying){stopPlayback();startPlayback();}
};

document.addEventListener("keydown",e=>{
    if(e.code==="Space"){e.preventDefault();togglePlayback();}
    if(e.key==="ArrowLeft")previousFrame();
    if(e.key==="ArrowRight")nextFrame();
});

document.querySelectorAll(".canvasControls button").forEach((b,i)=>{
    b.onclick=()=>{
        zoom=Math.max(.25,Math.min(4,zoom+(i?0.25:-0.25)));
        applyTransform();
    };
});

updateColor();