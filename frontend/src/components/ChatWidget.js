import React, { useState, useEffect, useRef } from 'react';

function ChatWidget({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const ws = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      ws.current = new WebSocket('ws://43.201.164.155:8000/ws/chat');
      ws.current.onmessage = (event) => {
        try { setMessages((prev) => [...prev, JSON.parse(event.data)]); }
        catch (e) { console.error('채팅 메시지 파싱 실패:', e); }
      };
      ws.current.onerror = () => console.error('WebSocket 연결 오류');
      return () => { if (ws.current) ws.current.close(); };
    }
  }, [isOpen]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !ws.current) return;
    const messageData = { user: currentUser ? currentUser.nickname : '익명', text: inputMessage, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    ws.current.send(JSON.stringify(messageData)); setInputMessage('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-white w-[85vw] sm:w-96 h-[500px] max-h-[70vh] rounded-2xl shadow-2xl border border-gray-200 mb-4 flex flex-col overflow-hidden">
          <div className="bg-blue-600 text-white p-4 font-bold flex justify-between items-center shadow-md z-10"><span>💬 라운지</span><button onClick={() => setIsOpen(false)} className="text-blue-200 hover:text-white">✕</button></div>
          <div className="flex-1 p-4 overflow-y-auto bg-blue-50 space-y-4">
            {messages.length === 0 ? <div className="text-center text-gray-500 text-sm mt-10">채팅방에 입장했습니다. 인사를 건네보세요! 👋</div> : messages.map((msg, idx) => {
              const isMe = currentUser && msg.user === currentUser.nickname;
              return (
                <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-gray-500 mb-1 ml-1">{msg.user}</span>
                  <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}>{msg.text}</div>
                  <span className="text-[10px] text-gray-400 mt-1">{msg.time}</span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-200 flex gap-2">
            {!currentUser ? <input type="text" disabled placeholder="로그인 후 이용 가능" className="flex-1 bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm cursor-not-allowed" /> : (
              <><input type="text" placeholder="메시지 입력..." value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 outline-none" />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm">전송</button></>
            )}
          </form>
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)} className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl transition-transform hover:scale-110">
        {isOpen ? '✕' : '💬'}
      </button>
    </div>
  );
}

export default ChatWidget;
