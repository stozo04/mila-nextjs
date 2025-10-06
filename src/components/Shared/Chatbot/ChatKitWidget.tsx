'use client';

import { useMemo, useRef } from "react";
import { ChatKit, useChatKit } from "@openai/chatkit-react";

const STORAGE_KEY = "chatkit-device-id";

const loadDeviceId = () => {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const created = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return undefined;
  }
};

export default function ChatKitWidget() {
  const deviceId = useMemo(() => loadDeviceId(), []);
  const latestDeviceId = useRef(deviceId);
  latestDeviceId.current = deviceId;

  const { control } = useChatKit({
    theme: {
      colorScheme: "light",
      color: {
        accent: {
          primary: "#fe9a9b",
          level: 2,
        },
        surface: {
          background: '#fe9a9b',
          foreground: '#ffffff'
        }
      },
      typography: {
        fontFamily: "'Dancing Script', cursive",
        fontSources: [
          {
            family: "Dancing Script",
            src: "url('https://fonts.gstatic.com/s/dancingscript/v29/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSoHTQ.ttf') format('truetype')",
            weight: "400",
            style: "normal",
            display: "swap",
          },
          {
            family: "Dancing Script",
            src: "url('https://fonts.gstatic.com/s/dancingscript/v29/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7B1i0HTQ.ttf') format('truetype')",
            weight: "700",
            style: "normal",
            display: "swap",
          },
        ],
      },
    },

    startScreen: {
      greeting: "Chat with me",
      prompts: [
        {
          icon: "circle-question",
          label: "Who is Mila?",
          prompt: "Tell me about Mila's story.",
        },
        {
          icon: "sparkle",
          label: "Fun milestone",
          prompt: "Share a fun milestone from Mila's journey.",
        },
      ],
    },
    composer: {
      placeholder: "Type your message...",
    },
    api: {
      async getClientSecret() {
        const res = await fetch("/api/chatkit/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            deviceId: latestDeviceId.current,
          }),
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          const message =
            typeof error?.error === "string"
              ? error.error
              : error?.error?.message || "Unable to fetch ChatKit client secret.";
          throw new Error(message);
        }

        const payload = await res.json();
        if (!payload?.client_secret) {
          throw new Error("ChatKit session response missing client_secret.");
        }
        return payload.client_secret as string;
      },
    },
  });

  return (
    <div
      className="position-fixed bottom-0 end-0 mb-4 me-4"
      style={{ zIndex: 1050 }}
    >
      <ChatKit
        control={control}
        className="chatkit-widget rounded shadow"
        style={{ width: 360, height: 520 }}
      />
    </div>
  );
}
