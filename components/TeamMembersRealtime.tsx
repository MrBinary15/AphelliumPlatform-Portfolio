"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string;
  job_title: string;
  description: string;
  role: string;
  team_order?: number | null;
  team_section?: string | null;
};

type Labels = {
  noProfiles: string;
  defaultMember: string;
  defaultUser: string;
  admin: string;
  employee: string;
  defaultDescription: string;
  liveTag: string;
  foundersTitle: string;
  leadershipTitle: string;
  teamTitle: string;
};

type TeamSectionKey = "founders" | "leadership" | "team";

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

function detectSection(member: Profile): TeamSectionKey {
  const explicit = (member.team_section || "").toLowerCase();
  if (explicit === "founders") return "founders";
  if (explicit === "coordinator") return "leadership";
  if (explicit === "technical") return "team";

  const role = (member.role || "").toLowerCase();
  const text = `${member.job_title || ""} ${member.description || ""}`.toLowerCase();

  if (
    text.includes("fundador") ||
    text.includes("cofundador") ||
    text.includes("founder") ||
    text.includes("co-founder") ||
    text.includes("ceo")
  ) {
    return "founders";
  }

  if (
    role === "admin" ||
    role === "coordinador" ||
    text.includes("director") ||
    text.includes("manager") ||
    text.includes("lider") ||
    text.includes("lead") ||
    text.includes("cto") ||
    text.includes("cfo")
  ) {
    return "leadership";
  }

  return "team";
}

export default function TeamMembersRealtime({
  initialTeamMembers,
  labels,
}: {
  initialTeamMembers: Profile[];
  labels: Labels;
}) {
  const [teamMembers, setTeamMembers] = useState<Profile[]>(filterProfiles(initialTeamMembers));

  const grouped = useMemo(() => {
    const buckets: Record<TeamSectionKey, Profile[]> = {
      founders: [],
      leadership: [],
      team: [],
    };
    for (const m of teamMembers) {
      buckets[detectSection(m)].push(m);
    }
    return buckets;
  }, [teamMembers]);

  const sectionsBase: Array<{ key: TeamSectionKey; title: string; items: Profile[] }> = [
    { key: "founders", title: labels.foundersTitle, items: grouped.founders },
    { key: "leadership", title: labels.leadershipTitle, items: grouped.leadership },
    { key: "team", title: labels.teamTitle, items: grouped.team },
  ];
  const sections = sectionsBase.filter((s) => s.items.length > 0);

  useEffect(() => {
    let active = true;

    const refreshTeamMembers = async () => {
      try {
        const res = await fetch("/api/public/team-members", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as { teamMembers?: Profile[] };
        const data = payload.teamMembers || [];
        if (!active) return;
        setTeamMembers(filterProfiles(data));
      } catch {
        // Keep the existing list on transient network/server errors.
      }
    };

    void refreshTeamMembers();

    // Fallback polling keeps data fresh even if Realtime publication is disabled.
    const pollId = window.setInterval(() => {
      void refreshTeamMembers();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(pollId);
    };
  }, []);

  return (
    <>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-400/35 bg-emerald-500/10 text-emerald-300 text-xs font-semibold tracking-wide uppercase mb-6">
        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
        {labels.liveTag}
      </div>

      {teamMembers.length > 0 ? (
        <div className="space-y-12">
          {sections.map((section) => (
            <section key={section.key} className="space-y-5">
              <div className="flex items-center justify-center gap-3">
                <div className="h-px w-12 bg-cyan-400/30" />
                <h3 className="text-lg sm:text-xl font-bold text-cyan-200 tracking-wide uppercase">{section.title}</h3>
                <div className="h-px w-12 bg-cyan-400/30" />
              </div>
              <div className={
                section.key === "founders"
                  ? "grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto"
                  : section.key === "leadership" && section.items.length === 1
                    ? "grid grid-cols-1 gap-6 sm:gap-8 max-w-xl mx-auto"
                    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
              }>
                {section.items.map((member) => (
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
                      <h4 className="font-bold text-xl" data-inline-edit-key={`profile:${member.id}:full_name`}>{member.full_name || labels.defaultUser}</h4>
                      <p className="text-[var(--accent-cyan)] text-sm mb-4 font-medium tracking-wide uppercase" data-inline-edit-key={`profile:${member.id}:job_title`}>
                        {member.job_title || (member.role === "admin" ? labels.admin : labels.employee)}
                      </p>
                      <p className="text-sm text-gray-400" data-inline-edit-key={`profile:${member.id}:description`}>
                        {member.description || labels.defaultDescription}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="py-12 text-gray-500">{labels.noProfiles}</div>
      )}
    </>
  );
}
