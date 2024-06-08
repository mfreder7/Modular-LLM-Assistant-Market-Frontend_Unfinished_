import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonInput,
  IonButton,
  IonItem,
  IonLabel,
  useIonViewDidEnter,
  useIonViewWillLeave,
  IonButtons,
  IonMenuButton,
} from "@ionic/react";
import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./Chat.css";

enum From {
  Assistant = "Assistant",
  User = "You",
}

interface Message {
  from: From;
  message: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [stream, setStream] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");
  const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL;
  const ws = useRef<WebSocket | null>(null);

  useIonViewDidEnter(() => {
    ws.current = new WebSocket(websocketUrl);

    ws.current.onopen = () => {
      console.log("WebSocket connection established");
    };

    ws.current.onmessage = (event) => {
      handleIncomingMessage(event);
    };

    ws.current.onclose = () => {
      console.log("WebSocket connection closed");
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error", error);
    };

    return () => {
      ws.current?.close();
    };
  }, [websocketUrl]);

  useIonViewWillLeave(() => {
    ws.current?.close();
  });

  const handleIncomingMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data?.completed) {
        updateMessagesWithCompletion(data.value);
      } else if (data?.value) {
        updateMessagesWithStream(data.value);
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  };

  const updateMessagesWithCompletion = (value: string) => {
    setMessages((prevMessages) => {
      const newMessage = stream + value;
      const updatedMessages = prevMessages.map((msg, index) => {
        if (index === prevMessages.length - 1 && msg.from === From.Assistant) {
          return { ...msg, message: newMessage };
        }
        return msg;
      });
      setStream("");
      console.log("Updated messages (completion):", updatedMessages);
      return updatedMessages;
    });
  };

  const updateMessagesWithStream = (value: string) => {
    setStream((prevStream) => {
      const newStream = prevStream + value;
      setMessages((prevMessages) => {
        if (
          prevMessages.length > 0 &&
          prevMessages[prevMessages.length - 1].from === From.Assistant
        ) {
          const updatedMessages = prevMessages.map((msg, index) => {
            if (index === prevMessages.length - 1) {
              return { ...msg, message: newStream };
            }
            return msg;
          });
          console.log("Updated messages (stream):", updatedMessages);
          return updatedMessages;
        } else {
          const updatedMessages = [
            ...prevMessages,
            { from: From.Assistant, message: newStream },
          ];
          console.log("Updated messages (stream):", updatedMessages);
          return updatedMessages;
        }
      });
      return newStream;
    });
  };

  const sendMessage = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const messageText = inputValue.trim();
      const userMessage: Message = { from: From.User, message: messageText };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      ws.current.send(messageText); // Use trimmed messageText
      setInputValue(""); // Clear input field after sending
    } else {
      console.log("WebSocket is not open. Unable to send message.");
    }
  };

  const handleInputChange = (event: CustomEvent) => {
    setInputValue(event.detail.value);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle className="toolbar-title">Chat</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Chat</IonTitle>
          </IonToolbar>
        </IonHeader>
        <div className="chat-container">
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index}>
                <b>{msg.from}:</b>{" "}
                <div className="chat-message">
                  <span>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.message}
                    </ReactMarkdown>
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <IonItem>
              <IonLabel position="floating">Type a message</IonLabel>
              <IonInput
                value={inputValue}
                onIonInput={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
              />
            </IonItem>
            <IonButton expand="block" onClick={sendMessage}>
              Send
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Chat;
