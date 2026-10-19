"use client";
import type { ReactNode } from "react";
import { ChevronRight, LoaderCircle, LockKeyhole } from "lucide-react";
import { accessController } from "@/lib/access-client";
import styles from "./login-page.module.css";

export function AuthCard({ children }: { children: ReactNode }) {
  return <section className={styles.card} aria-labelledby="login-title">{children}</section>;
}
export function SSOButton({ loading, disabled, onClick }: { loading: boolean; disabled: boolean; onClick: () => void }) {
  return <button type="button" className={styles.sso} disabled={disabled} onClick={onClick}>
    {loading ? <LoaderCircle className={styles.spinner} aria-hidden size={20}/> : <span aria-hidden className={styles.fpt}><i>F</i><i>P</i><i>T</i></span>}
    {loading ? "Đang xác thực tài khoản..." : "Đăng nhập với FPT SSO"}<ChevronRight aria-hidden size={18}/>
  </button>;
}
export function LoginPage({ loading, returnTo }: { loading: boolean; returnTo: () => string }) {
  return <main className={styles.page}><div className={styles.shell}>
    <AuthCard><div className={styles.logo} aria-hidden>LC</div><p className={styles.eyebrow}>LONG CHÂU DESIGN LIBRARY</p><h1 id="login-title">Chào mừng quay lại</h1><p className={styles.subtitle}>Đăng nhập để truy cập Long Châu Design Library</p>
      <SSOButton loading={loading} disabled={loading} onClick={() => void accessController.login(returnTo())}/>
      <p className={styles.security}><LockKeyhole size={13} aria-hidden/>Chỉ dành cho người dùng nội bộ được cấp quyền.</p>
      <p className={styles.legal}>Bằng việc tiếp tục, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo mật.</p>
    </AuthCard>
    <footer className={styles.footer}><p>Vì một<br/>Việt Nam khỏe mạnh hơn</p><p><strong>LONG CHÂU</strong><br/>DESIGN FOR A HEALTHIER VIETNAM</p></footer>
  </div></main>;
}
