const socket = io();
let localStream = null;
let peerConnection = null;
let targetSocketId = null;
let isMuted = false;
let isCameraOff = false; 

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// UI Element Mapping
const requestCodeButton = document.getElementById('requestCodeButton');
const nameInput = document.getElementById('nameInput');
const identityStage = document.getElementById('identity-stage');
const verificationStage = document.getElementById('verification-stage');
const codeInput = document.getElementById('codeInput');
const joinButton = document.getElementById('joinButton');

const muteButton = document.getElementById('muteButton');
const cameraButton = document.getElementById('cameraButton'); 
const endButton = document.getElementById('endButton');
const contactsList = document.getElementById('contactsList');
const connectionStatus = document.getElementById('connectionStatus');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const myStationId = document.getElementById('myStationId');
const networkStatusText = document.getElementById('networkStatusText');
const statusIndicator = document.getElementById('statusIndicator');

requestCodeButton.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return alert('Please enter a station location identifier name.');
    
    socket.emit('request-access-code', { userName: name });
    requestCodeButton.textContent = 'Sending Token...';
    requestCodeButton.disabled = true;
});

socket.on('code-sent', (res) => {
    if (res.success) {
        identityStage.style.display = 'none';
        verificationStage.style.display = 'block';
    } else {
        alert(res.error || 'Failed to request security token.');
        requestCodeButton.textContent = 'Request Security Token';
        requestCodeButton.disabled = false;
    }
});
joinButton.addEventListener('click', () => {
    const code = codeInput.value.trim();
    if (!code) return alert('Please input your network authorization credentials code.');

    socket.emit('verify-access-code', { code: code });
});

socket.on('auth-verified', (res) => {
    if (res.success) {
        // Collect full hardware capture arrays (Both Video + Audio)
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                localStream = stream;
                localVideo.srcObject = stream;
                loginContainer.style.display = 'none';
                appContainer.style.display = 'block';
            })
            .catch(err => {
                alert('Audio & Video peripherals are required for Conduit operations.');
            });
    } else {
        alert(res.error || 'Invalid system access authorization code.');
    }
});

cameraButton.addEventListener('click', () => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    
    if (videoTrack) {
        isCameraOff = !isCameraOff;
        videoTrack.enabled = !isCameraOff; // Stops video capture frames while leaving audio unbothered
        
        if (isCameraOff) {
            cameraButton.textContent = '📷 Turn Video On';
            cameraButton.style.backgroundColor = '#7f8c8d';
            localVideo.style.opacity = '0.3'; // Visual confirmation layout dimming indicator
        } else {
            cameraButton.textContent = '📷 Kill Video';
            cameraButton.style.backgroundColor = ''; // Reverts back to style.css defaults
            localVideo.style.opacity = '1';
        }
    }
});

muteButton.addEventListener('click', () => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        isMuted = !isMuted;
        audioTrack.enabled = !isMuted;
        
        if (isMuted) {
            muteButton.textContent = '🔇 Unmute Mic';
            muteButton.classList.add('muted-active');
            connectionStatus.textContent = "Microphone Muted";
        } else {
            muteButton.textContent = '🎤 Mute Mic';
            muteButton.classList.remove('muted-active');
            connectionStatus.textContent = "Broadcasting Live";
        }
    }
});

socket.on('update-contacts', (users) => {
    contactsList.innerHTML = '';
    const myId = socket.id;
    
    Object.keys(users).forEach(uid => {
        if (uid === myId) return;
        
        const li = document.createElement('li');
        li.textContent = `${users[uid]} `;
        
        const callBtn = document.createElement('button');
        callBtn.textContent = '⚡ Broadcast';
        callBtn.addEventListener('click', () => startIntercomCall(uid));
        
        li.appendChild(callBtn);
        contactsList.appendChild(li);
    });
});

function startIntercomCall(targetId) {
    targetSocketId = targetId;
    createPeerConnection(targetId);
    
    peerConnection.createOffer()
        .then(offer => {
            peerConnection.setLocalDescription(offer);
            socket.emit('video-offer', { offer: offer, target: targetSocketId });
            connectionStatus.textContent = "Calling Station..."
            endButton.style.display = 'inline-block';
        });
}

function createPeerConnection(targetId) {
    peerConnection = new RTCPeerConnection(rtcConfig);
    
    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }

    peerConnection.ontrack = (event) => {
        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            connectionStatus.textContent = "Intercom Connected 🟢";
        }
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate && targetSocketId) {
            socket.emit('new-ice-candidate', { candidate: event.candidate, target: targetSocketId });
        }
    };
}

socket.on('video-offer', (data) => {
    targetSocketId = data.sender;
    createPeerConnection(targetSocketId);
    
    connectionStatus.textContent = "Receiving Transmission...";
    endButton.style.display = 'inline-block';
    
    peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
        .then(() => peerConnection.createAnswer())
        .then(answer => {
            peerConnection.setLocalDescription(answer);
            socket.emit('video-answer', { answer: answer, target: targetSocketId });
        });
});

socket.on('video-answer', (data) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

socket.on('new-ice-candidate', (data) => {
    if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
});

endButton.addEventListener('click', () => {
    if (targetSocketId) {
        socket.emit('end-call', { target: targetSocketId });
    }
    cleanUpCall();
});

function cleanUpCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    remoteVideo.srcObject = null;
    connectionStatus.textContent = "TX Ready";
    endButton.style.display = 'none';
    targetSocketId = null;
}

socket.on('end-call', () => cleanUpCall());

socket.on('connect', () => {
    myStationId.textContent = socket.id || 'Connected';
    networkStatusText.textContent = "Connected to Node";
    statusIndicator.className = "status-indicator connected";
});

socket.on('disconnect', () => {
    myStationId.textContent = "******";
    networkStatusText.textContent = "Disconnected from network";
    statusIndicator.className = "status-indicator disconnected";
});