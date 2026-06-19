import { useMemo, useRef, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { sendChatMessage } from "../../api/chatApi";
import { AUTH_STORAGE_KEYS } from "../../api/authSession";

const QUICK_QUESTIONS = [
  "레티놀은 매일 사용해도 되나요?",
  "지성 피부 보습은 어떻게 해야 하나요?",
  "선크림은 얼마나 자주 발라야 하나요?",
];

function hasLoginToken() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(localStorage.getItem(AUTH_STORAGE_KEYS.token));
}

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const isLoggedIn = useMemo(hasLoginToken, []);

  if (!isLoggedIn) {
    return null;
  }

  async function submitMessage(nextMessage = message) {
    const trimmedMessage = nextMessage.trim();

    if (!trimmedMessage || isLoading) {
      return;
    }

    setMessage("");
    setMessages((current) => [
      ...current,
      { role: "user", content: trimmedMessage },
    ]);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(trimmedMessage);
      setMessages((current) => [
        ...current,
        {
          role: "bot",
          content: response?.answer || "답변을 만들지 못했습니다. 잠시 후 다시 질문해 주세요.",
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "bot",
          content: error?.message || "챗봇 연결을 확인해 주세요.",
        },
      ]);
    } finally {
      setIsLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  }

  return (
    <>
      <style>{`
        .sf-chatbot-launcher {
          position: fixed;
          right: 22px;
          bottom: 92px;
          z-index: 180;
          width: 58px;
          height: 58px;
          border: 0;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: linear-gradient(135deg, #167d7f 0%, #14b8a6 100%);
          box-shadow: 0 18px 38px rgba(22, 125, 127, 0.28);
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .sf-chatbot-launcher:hover {
          transform: translateY(-2px);
          box-shadow: 0 22px 44px rgba(22, 125, 127, 0.34);
        }

        .sf-chatbot-panel {
          position: fixed;
          right: 22px;
          bottom: 164px;
          z-index: 181;
          width: min(380px, calc(100vw - 28px));
          height: min(560px, calc(100vh - 190px));
          display: grid;
          grid-template-rows: auto auto minmax(0, 1fr) auto;
          overflow: hidden;
          border: 1px solid rgba(226, 232, 240, 0.94);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 28px 70px rgba(15, 23, 42, 0.18);
        }

        .sf-chatbot-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 17px 18px;
          color: #ffffff;
          background: linear-gradient(135deg, #167d7f 0%, #0f766e 100%);
        }

        .sf-chatbot-title {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .sf-chatbot-title span {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.14);
        }

        .sf-chatbot-title strong {
          display: block;
          font-size: 15px;
          font-weight: 950;
          line-height: 1.2;
        }

        .sf-chatbot-title small {
          display: block;
          margin-top: 2px;
          color: rgba(255, 255, 255, 0.76);
          font-size: 11px;
          font-weight: 800;
          line-height: 1.2;
        }

        .sf-chatbot-close {
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.13);
          cursor: pointer;
        }

        .sf-chatbot-quick {
          display: flex;
          gap: 7px;
          overflow-x: auto;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.86);
        }

        .sf-chatbot-quick button {
          flex: 0 0 auto;
          height: 32px;
          padding: 0 11px;
          border: 1px solid rgba(22, 125, 127, 0.16);
          border-radius: 999px;
          color: #0f766e;
          background: rgba(22, 125, 127, 0.07);
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
        }

        .sf-chatbot-body {
          display: grid;
          align-content: start;
          gap: 10px;
          overflow-y: auto;
          padding: 16px 14px;
          background: #f8fafc;
        }

        .sf-chatbot-empty,
        .sf-chatbot-message {
          max-width: 88%;
          padding: 11px 13px;
          border-radius: 18px;
          color: #334155;
          background: #ffffff;
          font-size: 13px;
          font-weight: 750;
          line-height: 1.55;
          word-break: keep-all;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.055);
        }

        .sf-chatbot-empty {
          max-width: none;
          color: #64748b;
          text-align: center;
          box-shadow: none;
        }

        .sf-chatbot-message.user {
          justify-self: end;
          color: #ffffff;
          background: #167d7f;
        }

        .sf-chatbot-message.bot {
          justify-self: start;
        }

        .sf-chatbot-input {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 42px;
          gap: 9px;
          padding: 13px;
          border-top: 1px solid rgba(226, 232, 240, 0.92);
          background: #ffffff;
        }

        .sf-chatbot-input input {
          width: 100%;
          height: 42px;
          box-sizing: border-box;
          border: 1px solid rgba(203, 213, 225, 0.96);
          border-radius: 15px;
          padding: 0 13px;
          color: #0f172a;
          font-size: 13px;
          font-weight: 750;
          outline: none;
        }

        .sf-chatbot-input input:focus {
          border-color: rgba(22, 125, 127, 0.5);
          box-shadow: 0 0 0 3px rgba(22, 125, 127, 0.1);
        }

        .sf-chatbot-input button {
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 15px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: #167d7f;
          cursor: pointer;
        }

        .sf-chatbot-input button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        @media (max-width: 640px) {
          .sf-chatbot-launcher {
            right: 18px;
            bottom: 104px;
          }

          .sf-chatbot-panel {
            left: 14px;
            right: 14px;
            bottom: 174px;
            width: auto;
            height: min(540px, calc(100vh - 200px));
          }
        }
      `}</style>

      {isOpen && (
        <section className="sf-chatbot-panel" aria-label="SkinFlow 챗봇">
          <div className="sf-chatbot-header">
            <div className="sf-chatbot-title">
              <span aria-hidden="true">
                <Sparkles size={18} />
              </span>
              <div>
                <strong>SkinFlow 챗봇</strong>
                <small>피부 관리 질문 도우미</small>
              </div>
            </div>
            <button className="sf-chatbot-close" type="button" onClick={() => setIsOpen(false)} aria-label="챗봇 닫기">
              <X size={18} />
            </button>
          </div>

          <div className="sf-chatbot-quick">
            {QUICK_QUESTIONS.map((question) => (
              <button key={question} type="button" onClick={() => submitMessage(question)}>
                {question}
              </button>
            ))}
          </div>

          <div className="sf-chatbot-body">
            {messages.length === 0 && (
              <div className="sf-chatbot-empty">성분, 루틴, 보습, 자외선 차단처럼 피부 관리와 관련된 질문을 남겨 주세요.</div>
            )}
            {messages.map((item, index) => (
              <div className={`sf-chatbot-message ${item.role}`} key={`${item.role}-${index}`}>
                {item.content}
              </div>
            ))}
            {isLoading && <div className="sf-chatbot-message bot">답변을 준비하고 있습니다.</div>}
          </div>

          <form className="sf-chatbot-input" onSubmit={(event) => {
            event.preventDefault();
            submitMessage();
          }}>
            <input
              ref={inputRef}
              value={message}
              maxLength={500}
              placeholder="피부 관리 질문을 입력하세요"
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button type="submit" disabled={isLoading || !message.trim()} aria-label="질문 보내기">
              <Send size={17} />
            </button>
          </form>
        </section>
      )}

      <button
        className="sf-chatbot-launcher"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? "챗봇 닫기" : "챗봇 열기"}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={25} />}
      </button>
    </>
  );
}

export default ChatWidget;
