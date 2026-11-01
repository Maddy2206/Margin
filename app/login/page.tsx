import type { Metadata } from "next";
import Login from "@/components/login/Login";

export const metadata: Metadata = { title: "Sign in · Margin" };

export default function LoginPage() {
  return (
    <div className="nb nb-page">
      <Login />
    </div>
  );
}
