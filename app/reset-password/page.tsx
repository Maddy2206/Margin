import type { Metadata } from "next";
import ResetPassword from "@/components/login/ResetPassword";

export const metadata: Metadata = { title: "New password · Margin" };

export default function ResetPasswordPage() {
  return (
    <div className="nb nb-page">
      <ResetPassword />
    </div>
  );
}
