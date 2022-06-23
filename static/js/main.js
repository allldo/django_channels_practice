let usernameInput = document.querySelector('#username');
let btnJoin = document.querySelector('#btn-join');

let mapPeers = {};

let username;
let webSocket;
function webSocketOnMessage(event){
    let parsedData = JSON.parse(event.data);
    let peerUsername = parsedData['peer'];
    let action = parsedData['action'];
    let message = parsedData['message'];

    if (username === peerUsername){
        return;
    }

    let receiver_channel_name = parsedData['message']['receiver_channel_name']
    if (action === 'new-peer'){
        createOfferer(peerUsername, receiver_channel_name);
        return;
    }
    if (action === 'new-offer'){
        let offer = parsedData['message']['sdp'];
        createAnswerer(offer, peerUsername, receiver_channel_name);
        return;
    }


    if (action === 'new-answer'){
        let answer = parsedData['message']['sdp'];

        let peer = mapPeers[peerUsername][0];

        peer.setRemoteDescription(answer);

    }
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
        sendSignal('new-peer', {})

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

const btnToggleAudio = document.querySelector('#btn-toggle-audio');
const btnToggleVideo = document.querySelector('#btn-toggle-video');


let userMedia = navigator.mediaDevices.getUserMedia(constrains)
    .then(stream => {
        localStream = stream
        localVideo.srcObject = localStream;
        localVideo.muted = true;

        let audioTracks = stream.getAudioTracks();
        let videoTracks = stream.getVideoTracks();
        audioTracks[0].enabled = true;
        videoTracks[0].enabled = true;
        btnToggleAudio.addEventListener('click', ()=>{
            audioTracks[0].enabled = !audioTracks[0].enabled;
            if (audioTracks[0].enabled === true){
                btnToggleAudio.innerHTML = 'AudioMute';
                return;
            }
            btnToggleAudio.innerHTML = 'Audio Unmute';
        });

        btnToggleVideo.addEventListener('click', ()=>{
            videoTracks[0].enabled = !videoTracks[0].enabled;
            if (videoTracks[0].enabled === true){
                btnToggleVideo.innerHTML = 'VideoMute';
                return;
            }
            btnToggleVideo.innerHTML = 'Video Unmute';
        });

    })
        .catch(error =>{
            console.log('cannot access media devices')
        })



function sendSignal(action, message){
let jsonStr = JSON.stringify({
    'peer': username,
    'action': action,
    'message': message
});
webSocket.send(jsonStr);
}

function createOfferer(peerUsername, receiver_channel_name){
    let peer = new RTCPeerConnection(null);

    addLocalTracks(peer);
    let dc = peer.createDataChannel('channel');
    dc.addEventListener('open', ()=>{
        console.log('connection opened');
    });
    dc.addEventListener(
        'message', dcOnMessage
    );
    let remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);
    mapPeers[peerUsername] = [peer, dc];

    peer.addEventListener('iceconnectionstatechange', ()=>{
        let iceConnectionState  = peer.iceConnectionState;
        if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            delete mapPeers[peerUsername]
            if (iceConnectionState !== 'closed'){
                peer.close()
            }
            removeVideo(remoteVideo);
        }
    });
    peer.addEventListener('icecandidate', (event)=>{
       if (event.candidate){
           console.log('New ice canditate: ', JSON.stringify(peer.localDescription));
       }

       sendSignal('new-offer', {
           'sdp': peer.localDescription,
           'receiver_channel_name': receiver_channel_name,
       })
    });
    peer.createOffer()
        .then(o=>peer.setLocalDescription(o))
        .then(()=>{
            console.log('local descrip has been set')
        })
}

function addLocalTracks(peer){
    localStream.getTracks().forEach(track =>{
        peer.addTrack(track, localStream);
    });

}
let messageList = document.querySelector('#message-list');
function dcOnMessage (event){
    let message = event.data
    let li = document.createElement('li');
    li.appendChild(document.createTextNode(message));
    messageList.appendChild(li);
}

function createVideo(peerUsername){
    let videoContainer = document.querySelector('#video-container');
    let remoteVideo = document.createElement('video');
    remoteVideo.id = peerUsername + '-video';
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;

    let videoWrapper = document.createElement('div');

    videoContainer.appendChild(videoWrapper);

    videoWrapper.appendChild(remoteVideo);

    return remoteVideo;

}

function setOnTrack(peer, remoteVideo){
    let remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;
    peer.addEventListener('track', async (event)=>{
        remoteStream.addTrack(event.track, remoteStream);
    })
}

function removeVideo(video){
    let videoWrapper = video.parentNode;
    videoWrapper.parentNode.removeChild((videoWrapper()));
}

function createAnswerer(offer, peerUsername, receiver_channel_name){
    let peer = new RTCPeerConnection(null);

    addLocalTracks(peer);

    let remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    peer.addEventListener('datachannel', e=>{
       peer.dc = e.channel
        peer.dc.addEventListener('open', ()=>{
        console.log('connection opened');
    });
    peer.dc.addEventListener(
        'message', dcOnMessage
    );
        mapPeers[peerUsername] = [peer, peer.dc];

    });



    peer.addEventListener('iceconnectionstatechange', ()=>{
        let iceConnectionState  = peer.iceConnectionState;
        if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed'){
            delete mapPeers[peerUsername]
            if (iceConnectionState !== 'closed'){
                peer.close()
            }
            removeVideo(remoteVideo);
        }
    });
    peer.addEventListener('icecandidate', (event)=>{
       if (event.candidate){
           console.log('New ice canditate: ', JSON.stringify(peer.localDescription));
       }

       sendSignal('new-answer', {
           'sdp': peer.localDescription,
           'receiver_channel_name': receiver_channel_name,
       })
    });

        peer.setRemoteDescription(offer)
            .then(()=>{
                console.log('remote description set successfully for %s', peerUsername);

                return peer.createAnswer();

            })
            .then(a=>{
                console.log('answer created ');

                peer.setLocalDescription(a)
            })

}