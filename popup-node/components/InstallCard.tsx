"use client";

import { useEffect, useState } from "react";
import { askNotification, subscribePush } from "@/components/alerts";
import { isIos, isStandalone, listenInstall, promptInstall } from "@/components/install";

export function InstallCard({ compact = false }: { compact?: boolean }) {
  const [hidden, setHidden] = useState(true);
  const [steps, setSteps] = useState<"ios" | "manual" | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    listenInstall();
    if (isStandalone()) return;
    if (compact && sessionStorage.getItem("node-install-hide") === "1") return;
    setHidden(false);
    if (isIos()) setSteps("ios");
  }, [compact]);

  if (hidden) return null;

  async function addHome() {
    const result = await promptInstall();
    if (result === "ios") setSteps("ios");
    if (result === "manual") setSteps("manual");
    if (result === "prompted") setNote("홈 화면에 추가한 뒤, 그 아이콘으로 다시 열어 주세요.");
  }

  async function allow() {
    const perm = askNotification();
    if (perm && (await perm) === "granted") {
      try {
        await subscribePush();
        setNote("알림을 켰습니다.");
      } catch {
        setNote("알림 권한은 켜졌습니다. 이 탭이 열려 있으면 도착합니다.");
      }
      return;
    }
    setNote("알림을 끄면 상단 종으로만 확인할 수 있습니다.");
  }

  return (
    <section className={compact ? "install compact" : "install"}>
      <p>{compact ? "홈 화면에 추가하면 탭을 닫아도 말이 종으로 옵니다." : "탭을 닫아도 받으려면 홈 화면 아이콘이 필요합니다."}</p>
      {steps === "ios" ? (
        <p className="hint">공유 → 홈 화면에 추가 → 그 아이콘으로 다시 열기 → 알림 허용.</p>
      ) : null}
      {steps === "manual" ? (
        <p className="hint">브라우저 메뉴에서 홈 화면에 추가한 뒤, 아이콘으로 다시 여세요.</p>
      ) : null}
      <div className="row">
        <button className="btn-ghost" type="button" onClick={() => void addHome()}>
          홈 화면에 추가
        </button>
        <button className="btn-ghost" type="button" onClick={() => void allow()}>
          알림 허용
        </button>
      </div>
      {note ? <p className="hint">{note}</p> : null}
      {compact ? (
        <button
          className="text-btn"
          type="button"
          onClick={() => {
            sessionStorage.setItem("node-install-hide", "1");
            setHidden(true);
          }}
        >
          닫기
        </button>
      ) : null}
    </section>
  );
}
