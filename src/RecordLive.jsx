import React, { useState, useEffect, useRef } from "react";

const RecordLive = () => {
  const [isWebSocketOpen, setIsWebSocketOpen] = useState(false);

  const userVideo = useRef();
  const userStream = useRef();
  const partnerVideo = useRef();
  const peerRef = useRef();
  const webSocketRef = useRef();

  const openCamera = async () => {
    const constraints = {
      video: true,
      audio: true,
    };
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      userVideo.current.srcObject = stream;
      userStream.current = stream;
    });
  };

  useEffect(() => {
    openCamera().then(async () => {
      webSocketRef.current = new WebSocket(
        `wss://streaming-app-server-v6yx.onrender.com/ws/webtrc`
      );

      // On socket connect
      webSocketRef.current.addEventListener("open", () => {
        setIsWebSocketOpen(() => true);
        console.log("WebSocket connection established!");
        peerRef.current = createPeer();
        // handleNegotiationNeeded();
      });

      webSocketRef.current.addEventListener("message", async (e) => {
        const message = JSON.parse(e.data);
        console.log("message", message);

        if (message.answer) {
          console.log("Receiving Answer from the server");
          console.log("Answer from the server", message);
          peerRef.current.setRemoteDescription(
            new RTCSessionDescription(message.answer)
          );
        }

        if (message.iceCandidate) {
          console.log("Receiving and Adding ICE Candidate");
          try {
            await peerRef.current.addIceCandidate(message.iceCandidate);
          } catch (err) {
            console.log("error ICE CANDIDATE");
          }
        }
      });
      // On socket disconnect
      webSocketRef.current.addEventListener("close", () => {
        setIsWebSocketOpen(() => false);
        console.log("WebSocket connection closed!");
        // You can add additional logic here if needed
      });
    });
  }, [isWebSocketOpen, setIsWebSocketOpen]);

  const createPeer = () => {
    console.log("Creating Peer Connection");
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peer.onnegotiationneeded = handleNegotiationNeeded;
    peer.onicecandidate = handleIceCandidateEvent;
    peer.ontrack = handleTrackEvent;

    return peer;
  };

  const handleNegotiationNeeded = async () => {
    console.log("Creating Offer");

    try {
      const myOffer = await peerRef.current.createOffer();
      await peerRef.current.setLocalDescription(myOffer);

      if (isWebSocketOpen) {
        console.log("sending offer to the server");
        console.log(
          "peerRef.current.localDescription",
          peerRef.current.localDescription
        );
        await webSocketRef.current.send(
          // JSON.stringify({ offer: peerRef.current.localDescription })
          JSON.stringify(peerRef.current.localDescription)
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleIceCandidateEvent = async (e) => {
    console.log("Found Ice Candidate");
    if (isWebSocketOpen && e.candidate) {
      console.log("sending Icecandidate to the server");
      await webSocketRef.current.send(
        JSON.stringify({ iceCandidate: e.candidate })
      );
    }
  };

  const handleTrackEvent = (e) => {
    console.log("Received Tracks");
    console.log(e.streams);
    partnerVideo.current.srcObject = e.streams[0];
  };

  return (
    <div>
      <h1>RecordLive</h1>

      <div>
        <video
          playsInline
          autoPlay
          muted
          controls={true}
          ref={userVideo}
          width="160"
          height="120"
        />
        <video
          playsInline
          autoPlay
          controls={true}
          ref={partnerVideo}
          width="160"
          height="120"
        />
      </div>
    </div>
  );
};

export default RecordLive;
