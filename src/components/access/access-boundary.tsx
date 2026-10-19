"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, ShieldAlert } from "lucide-react";
import { accessController, useAccess } from "@/lib/access-client";
import { safeReturnPath } from "@/lib/access";
import { repositories } from "@/lib/repositories/provider";
import { LoginPage } from "./login-page";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import type { AccessSnapshot } from "@/lib/repositories/contracts";

function destination() {
  const url = new URL(window.location.href);
  return safeReturnPath(["/auth", "/login"].includes(url.pathname) ? url.searchParams.get("returnTo") : url.pathname + url.search);
}

const copy = {
  unauthenticated: { title: "Đăng nhập LC Design Library", text: "Thư viện thiết kế nội bộ: màn hình, luồng và mẫu giao diện Long Châu.", action: "Đăng nhập với FPT SSO" },
  checking: { title: "Đang kiểm tra phiên đăng nhập...", text: "Vui lòng chờ trong giây lát.", action: "" },
  authenticating: { title: "Đang xác thực tài khoản...", text: "Vui lòng chờ trong khi nhà cung cấp xác thực xử lý yêu cầu.", action: "" },
  denied: { title: "Bạn chưa có quyền truy cập LC Design Library", text: "Quyền truy cập được quản lý bởi tổ chức của bạn. Vui lòng liên hệ quản trị viên để được hỗ trợ.", action: "Liên hệ quản trị viên" },
  expired: { title: "Phiên đăng nhập đã hết hạn", text: "Đăng nhập lại để tiếp tục đến trang bạn đang xem.", action: "Đăng nhập lại" },
  error: { title: "Không thể xác thực tài khoản", text: "Dịch vụ xác thực hiện chưa sẵn sàng. Vui lòng thử lại hoặc liên hệ quản trị viên của tổ chức.", action: "Thử lại" },
};

function LibraryVisual() {
  return <aside className="access-visual" aria-hidden="true">
    <div className="access-product-scene">
      <div className="access-product-window">
        <div className="access-product-sidebar">
          <strong className="access-product-brand">LC <span>Design Library</span></strong>
          <div className="access-product-nav"><b>⌂ Home</b><span>▦ Screens</span><span>↗ Flows</span></div>
          <small>PRODUCTS</small>
          <div className="access-product-nav"><strong>Nhà thuốc</strong><span>Đăng ký &amp; Đăng nhập</span><span>Tìm kiếm sản phẩm</span><span>Đơn hàng của tôi</span><strong>Tiêm chủng</strong><strong>Xét nghiệm</strong><strong>Mẹ &amp; Bé</strong></div>
          <span className="access-product-avatar">LC <span>Library workspace</span></span>
        </div>
        <div className="access-product-main">
          <div className="access-product-search">⌕ <span>Search screens and flows...</span><span>⌘ K</span></div>
          <small>LONG CHÂU DESIGN LIBRARY</small><h2>Good design.<br/>A healthier tomorrow.</h2>
          <div className="access-product-heading"><strong>Recently updated</strong><span>View all ↗</span></div>
          <div className="access-product-screens">{["Khám phá", "Tìm kiếm sản phẩm", "Đơn hàng"].map((title, index) => <div key={title}>
            <div className="access-phone"><div className="access-phone-status">9:41 <span>••• ▰</span></div><div className="access-phone-blue"><b>LONG CHÂU</b><span>{index === 0 ? "Chăm sóc sức khỏe mỗi ngày" : title}</span></div>
              <div className="access-phone-content"><div className="access-phone-search">⌕ Tìm sản phẩm</div><div className="access-phone-feature"><span>✚</span><b>{index === 2 ? "Theo dõi đơn hàng" : "Sức khỏe của bạn"}</b><small>Long Châu luôn bên bạn</small></div><div className="access-phone-products">{["Vitamin", "Chăm sóc"].map(label => <div key={label}><i/><small>{label}</small><b>Long Châu</b></div>)}</div><div className="access-phone-cta">{index === 2 ? "Xem đơn hàng" : "Khám phá ngay"}</div></div>
            </div><span className="access-product-card-title">{title}</span><small>Nhà thuốc · Mobile</small>
          </div>)}</div>
          <div className="access-product-heading"><strong>Popular flows</strong><span>Explore →</span></div>
          <div className="access-product-flows"><div><span>↗</span><b>Đăng ký</b><small>Luồng default</small></div><div><span>↗</span><b>Đăng nhập</b><small>Luồng default</small></div></div>
        </div>
      </div>
      <div className="access-product-overlay"><span className="access-product-flow-icon">↗</span><div><small>FLOW OVERVIEW</small><strong>Đăng ký &amp; Đăng nhập</strong><div className="access-product-steps"><span>01 · Welcome</span><i>→</i><span>02 · Đăng nhập</span><i>→</i><span>03 · Home</span></div></div></div>
    </div>
    <p className="access-visual-note">SCREENS. FLOWS. ONE SHARED LIBRARY.</p>
  </aside>;
}

function AccessSurface({ state }: { state: AccessSnapshot }) {
  const kind = state.status === "authenticated" ? "denied" : state.status;
  const content = copy[kind];
  const loading = kind === "checking" || kind === "authenticating";
  const heading = useRef<HTMLHeadingElement>(null);
  const [notice, setNotice] = useState("");
  const [contacting, setContacting] = useState(false);
  useEffect(() => { heading.current?.focus(); }, [kind]);
  const contact = async () => {
    if (contacting) return;
    setContacting(true);
    try {
      const support = repositories.identity.session?.contactAdministrator;
      if (support) await support();
      else setNotice("Liên hệ bộ phận IT hoặc quản trị viên nội bộ để yêu cầu quyền truy cập. Thông tin liên hệ chưa được tổ chức cung cấp.");
    } catch { setNotice("Không thể mở kênh hỗ trợ. Vui lòng liên hệ bộ phận IT nội bộ."); }
    finally { setContacting(false); }
  };
  return <main className="access-page">
    <section aria-labelledby="access-heading" className="access-content">
      <div className="access-brand"><span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-sm font-bold text-white">LC</span><p><span className="access-wordmark">LONG CHÂU</span><span className="access-brand-subtitle">Design Library</span></p></div><div className="access-message"><p className="access-eyebrow">DESIGN BETTER. TOGETHER.</p>
      {loading ? <LoaderCircle aria-hidden className="mb-4 size-6 animate-spin text-blue-600 motion-reduce:animate-none"/> : kind === "denied" ? <ShieldAlert aria-hidden className="mb-4 size-6 text-slate-500"/> : null}
      <div role={kind === "error" || kind === "expired" || kind === "denied" ? "alert" : "status"} aria-live={loading ? "polite" : undefined}>
        <h1 ref={heading} tabIndex={-1} id="access-heading" className="access-title outline-none">{content.title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{content.text}</p>
      </div>
      <div aria-busy={loading || contacting} className="mt-6 flex flex-wrap items-center gap-3">
        {loading ? <button disabled className="inline-flex h-10 cursor-wait items-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white opacity-50">Đang xử lý...</button> : <button type="button" disabled={contacting} onClick={() => { if (kind === "denied") void contact(); else void accessController.login(destination()); }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500 disabled:cursor-wait disabled:opacity-50">{content.action}<ArrowRight aria-hidden size={16}/></button>}
        {kind === "denied" && <button type="button" onClick={() => void accessController.logout()} className="inline-flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100">Đăng xuất</button>}
        {kind === "error" && <button type="button" onClick={() => accessController.backToEntry()} className="inline-flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100">Quay lại</button>}
      </div>
      {kind === "unauthenticated" && <p className="mt-3 text-xs text-slate-500">Chỉ dành cho người dùng nội bộ được cấp quyền.</p>}
      {notice && <p role="status" className="mt-4 text-sm leading-6 text-slate-600">{notice}</p>}
      </div><footer className="access-footer"><p>GOOD DESIGN<br/>A HEALTHIER TOMORROW</p><ThemeSwitcher align="end"/></footer>
    </section>
    <LibraryVisual/>
  </main>;
}

/** UI gate only: FPT must enforce authorization on every server/data operation. */
export function AccessBoundary({ children }: { children: ReactNode }) {
  const state = useAccess();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = state.status === "authenticated" && state.access === "allowed";
  useEffect(() => {
    if (state.status === "checking" || state.status === "authenticating") return;
    if (allowed && ["/auth", "/login"].includes(pathname)) router.replace(destination());
    else if (!allowed && !["/auth", "/login"].includes(pathname)) router.replace(`/login?returnTo=${encodeURIComponent(destination())}`);
  }, [allowed, pathname, router, state.status]);
  if (state.status === "checking" || state.status === "unauthenticated" || state.status === "authenticating") return <LoginPage loading={state.status !== "unauthenticated"} returnTo={destination}/>;
  if (allowed) return ["/auth", "/login"].includes(pathname) ? <LoginPage loading returnTo={destination}/> : children;
  return <AccessSurface key={state.status} state={state}/>;
}
