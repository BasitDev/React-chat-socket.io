import React, { useState, useEffect, useRef } from 'react';
import io from "socket.io-client";
import { FiUpload } from 'react-icons/fi';
import './app.css'

const ENDPOINT = "http://localhost:8800";
const socket = io(ENDPOINT);

function App() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [hasEnteredChat, setHasEnteredChat] = useState(false);
  const [userList, setUserList] = useState({});
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const chatRef = useRef(null);

  // handling receive messages from socket broadcasting
  useEffect(() => {
    const receiveMessage = (data) => {
      setChat((prevChat) => [...prevChat, data]);
    };
    socket.on('receive-message', receiveMessage);
    return () => {
      socket.off('receive-message', receiveMessage);
    };
  }, [chat, socket]);


  // get ussr list from backend
  useEffect(() => {
    socket.on('user-list', (users) => {
      setUserList(users);
    });
    return () => {
      socket.off('user-list');
    };
  }, []);

  //handling active inactive state of users
  useEffect(() => {
    const handleInactive = () => {
      socket.emit('user-inactive');
    };
    const handleActive = () => {
      socket.emit('user-active');
    };

    window.addEventListener('blur', handleInactive);
    window.addEventListener('focus', handleActive);

    return () => {
      window.removeEventListener('blur', handleInactive);
      window.removeEventListener('focus', handleActive);
    };
  }, []);


  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const timestamp = new Date().toISOString();

    if (image) {
      setUploading(true);
      const formData = new FormData();
      formData.append('uploadedImage', image);

      try {
        const response = await fetch(ENDPOINT + '/upload', {
          method: 'POST',
          body: formData
        });

        const imageUrl = await response.text();
        const messageData = {
          name: name,
          message: message,
          timestamp: timestamp,
          imageUrl: imageUrl
        };

        socket.emit('send-message', messageData);
        setMessage('');
        setImage(null);
        setUploading(false);
      } catch (error) {
        console.error("Error uploading the image", error);
        setUploading(false);
      }
    } else {
      const messageData = { name: name, message: message, timestamp: timestamp };
      socket.emit('send-message', messageData);
      setMessage('');
    }
  };


  const joinChat = () => {
    if (name.trim()) {
      setHasEnteredChat(true);
      socket.emit('user-joined', name);
    }
  };


  return (
    <div className="App">
      {!hasEnteredChat ? (
        <div className="enter-chat">
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={joinChat}>Join</button>
        </div>
      ) : (
        <div className="chat-container">
          <div className="users-box">
            <div className="header">Active Users:</div>
            {Object.values(userList).map(user => (
              <div key={user.name} className="user-item">
                {user.name} - {user.status}
              </div>
            ))}
          </div>

          <div className="chat-box">
            <div className="username-header">
              Group Chat
            </div>
            <div ref={chatRef} className="chat-content" style={{ display: 'flex', flexDirection: 'column' }}>
              {chat.map((m, index) => (
                <div key={index} className={name === m.name ? "message-sender" : "message-receiver"}>
                  <div className="username-display">
                    <strong>{m.name}</strong>
                  </div>
                  <div className="message-content">
                    {m.message}
                    {m.imageUrl && <img src={ENDPOINT + m.imageUrl} alt="Shared content" style={{ maxWidth: "30%" }} />}
                  </div>
                  <div className="message-time">
                    {new Date(m.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
            <div className="chat-inputs">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="send-area">
                <label className="upload-icon" htmlFor="file-upload">
                  <FiUpload />
                  <input id="file-upload" type="file" onChange={handleImageChange} />
                </label>
                <button onClick={sendMessage} disabled={uploading}>{uploading ? "Uploading" : "Send"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
