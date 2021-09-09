var connection; 
var userId = ""; 
var userNum = 0;
let first = true;
window.addEventListener("click", (event) => {
   if(first){
      connection = new WebSocket('ws://localhost:9090');
      console.log(5555);

      //handle messages from the server 
connection.onmessage = function (message) { 
   console.log("Got message", message.data);
   var data = JSON.parse(message.data); 
	
   switch(data.type) { 
      case "login": 
         onLogin(data.success, data.userId); 
         break; 
      case "joinQueue":
         connectToUser(data.userId);
         break;
      case "offer": 
         onOffer(data.offer, data.name); 
         break; 
      case "answer": 
         onAnswer(data.answer); 
         break; 
      case "candidate": 
         onCandidate(data.candidate); 
         break; 
      case "message":
          console.log(data.message);
          document.getElementById("pp").innerHTML = data.message;
          break;
      default: 
         break; 
   } 
};

      connection.onopen = function () { 
         console.log("Connected"); 
         send({
            type: 'login'
         })
      };
        
      connection.onerror = function (err) { 
         console.log("Got error", err); 
      };
   }
   first = false;
})
 
var joinBtn = document.querySelector('#joinRandomQueue'); 
var messageInput = document.querySelector('#message'); 
var messageBtn = document.querySelector('#messageBtn'); 
var otherUsernameInput = document.querySelector('#otherUsernameInput'); 
var connectToOtherUsernameBtn = document.querySelector('#connectToOtherUsernameBtn'); 
var connectedUser, myConnection;

messageBtn.addEventListener("click", function(event){
    console.log(messageInput.value.length);

    if(messageInput.value.length > 0){
        send({
            type: "message",
            message: messageInput.value
        });
    }
})


joinBtn.addEventListener("click", (event) => {
   send({
      type: "joinQueue"
   })
})
  
//when a user logs in 
function onLogin(success, id) { 

   if (success === false) { 
      alert("oops...try a different username"); 
   } else { 
      userId = id;
      document.getElementById("userId").innerHTML = userId;

      //creating our RTCPeerConnection object 

      var configuration = { 
         "iceServers": [{ "url": "stun:stun.1.google.com:19302" }] 
      }; 
		
      myConnection = new webkitRTCPeerConnection(configuration); 
      console.log("RTCPeerConnection object was created"); 
      console.log(myConnection); 
  
      //setup ice handling
      //when the browser finds an ice candidate we send it to another peer 
      myConnection.onicecandidate = function (event) { 
		
         if (event.candidate) { 
            send({ 
               type: "candidate", 
               candidate: event.candidate 
            }); 
         } 
      }; 
   } 
};
  

  
// Alias for sending messages in JSON format 
function send(message) {
   if (connectedUser) { 
      message.name = connectedUser; 
   } 
	
   connection.send(JSON.stringify(message)); 
};

//setup a peer connection with another user 
function connectToUser(otherUsername) { 
 
   connectedUser = otherUsername;
    
   if (otherUsername.length > 0) { 
      //make an offer 
      myConnection.createOffer(function (offer) { 
         console.log(); 
         send({ 
            type: "offer", 
            offer: offer 
         });
            
         myConnection.setLocalDescription(offer); 
      }, function (error) { 
         alert("An error has occurred."); 
      }); 
   } 
}
connectToOtherUsernameBtn.addEventListener("click", function(){
   connectToUser(otherUsernameInput.value);
}); 
  
 //when somebody wants to call us 
 function onOffer(offer, name) { 
    userNum = 1;
    connectedUser = name; 
    myConnection.setRemoteDescription(new RTCSessionDescription(offer)); 
     
    myConnection.createAnswer(function (answer) { 
       myConnection.setLocalDescription(answer); 
         
       send({ 
          type: "answer", 
          answer: answer 
       }); 
         
    }, function (error) { 
       alert("oops...error"); 
    }); 
 }
   
 //when another user answers to our offer 
 function onAnswer(answer) { 
    userNum = 2;
    myConnection.setRemoteDescription(new RTCSessionDescription(answer)); 
 } 
  
 //when we got ice candidate from another user 
 function onCandidate(candidate) { 
    myConnection.addIceCandidate(new RTCIceCandidate(candidate)); 
 }