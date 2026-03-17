"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string;
  job_title: string;
  description: string;
  role: string;
};

type Labels = {
  noProfiles: string;
  defaultMember: string;
  defaultUser: string;
  admin: string;
  employee: string;
  defaultDescription: string;
  liveTag: string;
};

function filterProfiles(items: Profile[]) {
  return items.filter((member) => {
    // Exclude "visitante" role from public team display
    if (member.role === "visitante") return false;
    const hasName = !!member.full_name?.trim();
    const hasRole = !!member.job_title?.trim();
    const hasDescription = !!member.description?.trim();
    return hasName || hasRole || hasDescription;
  });
}

export default function TeamMembersRealtime({
  initialTeamMembers,
  labels,
}: {
  initialTeamMembers: Profile[];
  labels: Labels;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [teamMembers, setTeamMembers] = useState<Profile[]>(filterProfiles(initialTeamMembers));

  useEffect(() => {
    let active = true;

    const refreshTeamMembers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, job_title, description, role")
        .not("role", "eq", "visitante")
        .order("full_name", { ascending: true });

      if (!active) return;
      setTeamMembers(filterProfiles((data as Profile[] | null) || []));
    };

    const channel = supabase
      .channel("public:profiles:nosotros")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          void refreshTeamMembers();
        },
      )
      .subscribe();

    // Fallback polling keeps data fresh even if Realtime publication is disabled.
    const pollId = window.setInterval(() => {
      void refreshTeamMembers();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(pollId);
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-400/35 bg-emerald-500/10 text-emerald-300 text-xs font-semibold tracking-wide uppercase mb-6">
        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
        {labels.liveTag}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {teamMembers.length > 0 ? (
          teamMembers.map((member) => (
            <div key={member.id} className="bg-glass rounded-2xl overflow-hidden border border-cyan-400/20 shadow-[0_0_24px_rgba(6,182,212,0.12)] hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:-translate-y-2 transition-all duration-300">
              <div className="h-48 sm:h-56 md:h-64 bg-gray-800 w-full flex items-center justify-center relative overflow-hidden">
                {member.avatar_url ? (
                  <Image
                    src={member.avatar_url}
                    alt={member.full_name || labels.defaultMember}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="text-6xl opacity-20">👤</span>
                )}
              </div>
              <div className="p-6 text-left flex flex-col items-start h-full">
                <h4 className="font-bold text-xl">{member.full_name || labels.defaultUser}</h4>
                <p className="text-[var(--accent-cyan)] text-sm mb-4 font-medium tracking-wide uppercase">
                  {member.job_title || (member.role === "admin" ? labels.admin : labels.employee)}
                </p>
                <p className="text-sm text-gray-400">
                  {member.description || labels.defaultDescription}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-gray-500">{labels.noProfiles}</div>
        )}
      </div>
    </>
  );
}
