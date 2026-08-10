"use client";
import React, { ReactNode, useEffect } from "react";

const Bootstrap = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    // A ts-ignore directive used to sit here. It was suppressing nothing —
    // asking the compiler to prove an error existed reported the directive as
    // unused instead. Bootstrap's bundle type-resolves fine, so it is gone.
    import("bootstrap/dist/js/bootstrap");
  }, []);
  return <>{children}</>;
};

export default Bootstrap;
