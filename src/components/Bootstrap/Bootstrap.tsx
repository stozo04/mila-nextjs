"use client";
import React, { ReactNode, useEffect } from "react";

const Bootstrap = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    // @ts-ignore
    import("bootstrap/dist/js/bootstrap");
  }, []);
  return <>{children}</>;
};

export default Bootstrap;
