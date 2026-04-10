// import Image from "next/image";

import Link from "next/link";

export default function Home() {
  return (
   <div>
      <h1>PDF Tool</h1>
      <Link href="/dashboard" className="text-blue-700 underline">Go to Dashboard</Link>
   </div>
  );
}
