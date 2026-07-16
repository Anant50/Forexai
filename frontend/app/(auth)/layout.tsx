import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-screen bg-bg-base flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans select-none">
      
      {/* Background glow effects to wows our user */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-primary-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent-cyan/5 blur-[120px] pointer-events-none" />

      {/* Main card viewport */}
      <div className="w-full max-w-[460px] relative z-10">
        {children}
      </div>

    </div>
  );
}
