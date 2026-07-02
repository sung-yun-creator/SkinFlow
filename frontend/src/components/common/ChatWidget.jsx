// ChatWidget.jsx
// 로그인한 사용자가 화면 어디서든 간단한 피부 관리 질문을 보낼 수 있는 채팅 위젯입니다.
// PageLayout에 포함되어 있어 대부분의 주요 페이지에서 공통으로 표시됩니다.
// 답변은 참고용 안내이며, 의료적 판단처럼 보이지 않도록 사용자가 이해하기 쉬운 흐름을 우선합니다.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { sendChatMessage } from "../../api/chatApi";
import { AUTH_STORAGE_KEYS } from "../../api/authSession";
import { safeCareText } from "../../utils/safeCareText";

// 사용자가 처음 채팅을 열었을 때 바로 눌러볼 수 있는 예시 질문입니다.
const QUICK_QUESTIONS = [
  "색소침착 관리는 어떻게 해야 하나요?",
  "주름 관리에 레티놀을 써도 되나요?",
  "선크림은 얼마나 자주 발라야 하나요?",
];

// 채팅은 로그인 사용자에게만 보여주기 때문에 토큰이 있는지 먼저 확인합니다.
const CHATBOT_QUESTION_EVENT = "skinflow:chatbot-question";

function hasLoginToken() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(localStorage.getItem(AUTH_STORAGE_KEYS.token));
}

// ChatWidget 컴포넌트입니다.
// 열림/닫힘 상태, 입력 메시지, 대화 목록, API 요청 중 상태를 관리합니다.
function ChatWidget() {
  // isOpen은 채팅창이 열렸는지, message는 입력창의 현재 글자입니다.
  // messages는 화면에 쌓이는 대화 목록, isLoading은 답변을 기다리는 중인지 표시합니다.
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const bodyRef = useRef(null);
  const bottomRef = useRef(null);
  const isLoggedIn = useMemo(() => hasLoginToken(), []);

  const scrollToLatestMessage = useCallback((behavior = "smooth") => {
    window.setTimeout(() => {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ block: "end", behavior });
        return;
      }

      if (bodyRef.current) {
        bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
      }
    }, 0);
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToLatestMessage(messages.length > 0 ? "smooth" : "auto");
    }
  }, [isOpen, isLoading, messages.length, scrollToLatestMessage]);

  // 로그인하지 않은 사용자는 채팅 위젯을 보지 않도록 합니다.
  // 보호 API 호출을 줄이고, 비로그인 사용자가 헷갈리지 않게 하는 처리입니다.
  // 사용자가 직접 입력하거나 예시 질문을 눌렀을 때 메시지를 전송합니다.
  // 빈 메시지이거나 이미 답변을 기다리는 중이면 중복 요청을 막습니다.
  const submitMessage = useCallback(async (nextMessage = message) => {
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
      // 실제 채팅 API 호출입니다.
      // 성공하면 사용자 메시지와 AI 응답을 messages 배열에 추가해 화면에 보여줍니다.
      const response = await sendChatMessage(trimmedMessage);
      setMessages((current) => [
        ...current,
        {
          role: "bot",
          content: safeCareText(response?.answer) || "답변을 만들지 못했습니다. 잠시 후 다시 질문해 주세요.",
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "bot",
          content: "답변을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        },
      ]);
    } finally {
      setIsLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isLoading, message]);

  useEffect(() => {
    if (!isLoggedIn || typeof window === "undefined") {
      return undefined;
    }

    function handleExternalQuestion(event) {
      const nextMessage = typeof event.detail?.message === "string" ? event.detail.message.trim() : "";

      if (!nextMessage) {
        return;
      }

      setIsOpen(true);
      scrollToLatestMessage();
      window.setTimeout(() => submitMessage(nextMessage), 0);
    }

    window.addEventListener(CHATBOT_QUESTION_EVENT, handleExternalQuestion);

    return () => {
      window.removeEventListener(CHATBOT_QUESTION_EVENT, handleExternalQuestion);
    };
  }, [isLoggedIn, scrollToLatestMessage, submitMessage]);

  if (!isLoggedIn) {
    return null;
  }

  // Enter 키로 메시지를 보낼 수 있게 하는 키보드 UX 처리입니다.
  // Shift+Enter는 줄바꿈으로 남겨두고, Enter만 눌렀을 때 전송합니다.
  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  }

  return (
    <>
      {/* 플로팅 채팅 버튼과 채팅 패널을 함께 반환합니다. */}
      <style>{`
        .sf-chatbot-launcher {
          position: fixed;
          right: 22px;
          bottom: calc(92px + env(safe-area-inset-bottom, 0px));
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
          bottom: calc(164px + env(safe-area-inset-bottom, 0px));
          z-index: 181;
          width: min(380px, calc(100vw - 28px));
          height: min(560px, calc(100vh - 190px));
          display: grid;
          grid-template-rows: auto auto auto minmax(0, 1fr) auto;
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

        .sf-chatbot-disclaimer {
          margin: 0;
          padding: 9px 14px;
          color: #64748b;
          background: #ffffff;
          border-bottom: 1px solid rgba(226, 232, 240, 0.86);
          font-size: 11px;
          font-weight: 750;
          line-height: 1.5;
          word-break: keep-all;
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
            bottom: calc(104px + env(safe-area-inset-bottom, 0px));
          }

          .sf-chatbot-panel {
            left: 14px;
            right: 14px;
            bottom: calc(174px + env(safe-area-inset-bottom, 0px));
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

          <p className="sf-chatbot-disclaimer">
            피부 관리 참고 정보이며, 개인별 상태에 따라 다를 수 있습니다.
          </p>

          <div className="sf-chatbot-body" ref={bodyRef}>
            {messages.length === 0 && (
              <div className="sf-chatbot-empty">성분, 루틴, 보습, 자외선 차단처럼 피부 관리와 관련된 질문을 남겨 주세요.</div>
            )}
            {messages.map((item, index) => (
              <div className={`sf-chatbot-message ${item.role}`} key={`${item.role}-${index}`}>
                {item.content}
              </div>
            ))}
            {isLoading && <div className="sf-chatbot-message bot">답변을 준비하고 있습니다.</div>}
            <div ref={bottomRef} aria-hidden="true" />
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
