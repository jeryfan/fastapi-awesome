import Loading from "@/components/base/loading";
import Link from "next/link";
import { FC } from "react";

export default function TestPage() {
  return (
    <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Loading type="app" />
      </div>
    </div>
  );
}
