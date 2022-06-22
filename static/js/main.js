let usernameInput = document.querySelector('#username');
let btnJoin = document.querySelector('#btn-join');

let username;
let webSocket;
function webSocketOnMessage(event){
    let parsedData = JSON.parse(event.data);
    let message = parsedData['message'];
    console.log('mesage: ', message)
}

btnJoin.addEventListener('click', ()=>{
   username = usernameInput.value;
   console.log('username:', username)
   if (username === ''){

   }
   usernameInput.value = '';
   usernameInput.disabled = true;
   btnJoin.disabled = true;
   btnJoin.style.visibilty = 'hidden';

   usernameInput.style.visibilty = 'hidden';
   let labelUsername = document.querySelector('#label-username');
    labelUsername.innerHTML = username;

    let loc = window.location;
    let wsStart = 'ws://';
    if (loc.protocol === 'https:'){
        wsStart = 'wss://'
    }
    let endPoint = wsStart + loc.host + loc.pathname;
    console.log(endPoint)

    webSocket = new WebSocket(endPoint);

    webSocket.addEventListener('open', (e => {
        console.log('connection opened');
        let jsonStr = JSON.stringify({'message':'This is message'})
        webSocket.send(jsonStr);

    }));
    webSocket.addEventListener('message', webSocketOnMessage)
    webSocket.addEventListener('close', (e => {
        console.log('connection closed')
    }));
    webSocket.addEventListener('error', (e => {
        console.log('connection was interrupted (errror)_')
    }));
});
let localStream = new MediaStream();

const constrains = {
    'video': true,
    'audio': true
};
const localVideo = document.querySelector('#local-video');
let userMedia = navigator.mediaDevices.getUserMedia(constrains)
    .then(stream => {
        localStream = stream
        localVideo.srcObject = localStream;
        localVideo.muted = true;
    })
        .catch(error =>{
            console.log('cannot access media devices')
        })

let jsonStr = JSON.stringify({
    peer: username,
    'action': 'new-answer',
    'message':{

    },
})
webSocket.send(jsonStr);