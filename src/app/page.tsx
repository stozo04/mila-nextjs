"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [message, setMessage] = useState("Connecting...");

  useEffect(() => {
    const checkConnection = async () => {
      const { data, error } = await supabase.from("test").select("*");
      if (error) setMessage("Supabase not connected");
      else setMessage("Supabase is working!");
    };

    checkConnection();
  }, []);

  return <h1 className="text-2xl font-bold">{message}</h1>;
}
