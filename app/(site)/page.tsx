import Link from "next/link";

import { Header } from "@/features/site/header";
import { BadgeCredits } from "@/features/site/badge";
import { LayoutGrid } from 'lucide-react';

import { MenuClient } from "@/features/site/menu-client";

import { getCurrentUser } from "@/data/current-user";
import { userTotalCredit } from "@/data/user";


import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await getCurrentUser();
  const all_credit = session ? await userTotalCredit(session?.id) : null;

  if (session?.role === 'admin') {
    redirect('/admin')
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Header />
      <section className="flex items-center justify-between px-6">
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-500">Numéro {session?.role} : {session?.id}</span>
          <span className="text-md text-white">{session?.name}</span>
        </div>
        <BadgeCredits all_credit={all_credit} />
      </section>
      <section className="w-full flex flex-col items-center px-6 py-2 space-y-6">
        <h1 className="w-full flex items-center text-gray-200 text-xl font-[600] gap-2"><LayoutGrid className="h-[20px] w-[20px] text-blue-500" />Dashboard</h1>
        <div className="w-full grid grid-cols-1 gap-2.5">
          <MenuClient session={session} />
        </div>
      </section>
    </div>
  );
}
