"use client";

import { useState } from "react";
import Image from "next/image";
import {
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  Star,
  Tag,
  BarChart3,
  ImageIcon,
  Building2,
} from "lucide-react";

type LocalizedProyecto = {
  id: string;
  title: string;
  slug: string | null;
  img_url: string | null;
  client_name: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  metrics: { label: string; value: string }[];
  gallery: string[];
  tags: string[];
  featured: boolean;
  status: string;
  created_at: string;
  _title: string;
  _excerpt: string | null;
  _description: string | null;
  _category: string | null;
  _statusLabel: string;
  _statusColor: string;
};

type Labels = {
  allFilter: string;
  viewDetails: string;
  location: string;
  client: string;
  status: string;
  dates: string;
  metrics: string;
  gallery: string;
  description: string;
  tags: string;
  filterBy: string;
  resultsCount: string;
  featured: string;
};

interface Props {
  projects: LocalizedProyecto[];
  categories: string[];
  labels: Labels;
  lang: string;
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-EC", {
    month: "short",
    year: "numeric",
  });
}

export default function ProyectosClient({ projects, categories, labels, lang }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = activeCategory
    ? projects.filter((p) => p._category === activeCategory)
    : projects;

  const featuredProjects = filtered.filter((p) => p.featured);
  const regularProjects = filtered.filter((p) => !p.featured);

  return (
    <>
      {/* Category Filters */}
      {categories.length > 1 && (
        <section className="w-full py-6 border-b border-white/5 bg-[var(--bg-dark)]/50 backdrop-blur-sm sticky top-16 z-30">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs text-gray-500 mr-2 shrink-0">{labels.filterBy}:</span>
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 shrink-0 ${
                  !activeCategory
                    ? "bg-[var(--accent-cyan)]/15 border-[var(--accent-cyan)]/40 text-[var(--accent-cyan)]"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300"
                }`}
              >
                {labels.allFilter} ({projects.length})
              </button>
              {categories.map((cat) => {
                const count = projects.filter((p) => p._category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 shrink-0 ${
                      activeCategory === cat
                        ? "bg-[var(--accent-cyan)]/15 border-[var(--accent-cyan)]/40 text-[var(--accent-cyan)]"
                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300"
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Featured Projects */}
      {featuredProjects.length > 0 && (
        <section className="w-full py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 mb-8">
              <Star size={18} className="text-amber-400 fill-amber-400" />
              <h2 className="text-xl font-bold">{labels.featured}</h2>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {featuredProjects.map((p) => (
                <FeaturedCard
                  key={p.id}
                  project={p}
                  labels={labels}
                  expanded={expandedId === p.id}
                  onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Projects Grid */}
      <section className="w-full py-12 md:py-16">
        <div className="container mx-auto px-4">
          {featuredProjects.length > 0 && regularProjects.length > 0 && (
            <h2 className="text-xl font-bold mb-8">
              {labels.allFilter} ({filtered.length} {labels.resultsCount})
            </h2>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(featuredProjects.length > 0 ? regularProjects : filtered).map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                labels={labels}
                expanded={expandedId === p.id}
                onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── Featured Card (large horizontal layout) ──────────────── */
function FeaturedCard({
  project: p,
  labels,
  expanded,
  onToggle,
}: {
  project: LocalizedProyecto;
  labels: Labels;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="group rounded-3xl overflow-hidden bg-glass border border-amber-400/20 hover:border-amber-400/40 transition-all duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Image */}
        <div className="relative h-64 lg:h-auto min-h-[280px] bg-gray-900 overflow-hidden">
          {p.img_url ? (
            <Image
              src={p.img_url}
              alt={p._title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-10">
              🏗️
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[var(--bg-dark)]/80 hidden lg:block" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-dark)] to-transparent lg:hidden" />

          {/* Category & Status badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-20">
            {p._category && (
              <span className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-[10px] font-bold tracking-wider text-[var(--accent-green)] border border-white/10 uppercase">
                {p._category}
              </span>
            )}
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border backdrop-blur-md ${p._statusColor}`}
            >
              {p._statusLabel}
            </span>
          </div>
          <div className="absolute top-4 right-4 z-20">
            <Star size={20} className="text-amber-400 fill-amber-400" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 lg:p-8 flex flex-col justify-center">
          <h3 className="text-2xl lg:text-3xl font-bold mb-3">{p._title}</h3>
          {p._excerpt && (
            <p className="text-gray-400 text-sm leading-relaxed mb-5">{p._excerpt}</p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500 mb-5">
            {p.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={13} /> {p.location}
              </span>
            )}
            {p.client_name && (
              <span className="flex items-center gap-1.5">
                <Building2 size={13} /> {p.client_name}
              </span>
            )}
            {(p.start_date || p.end_date) && (
              <span className="flex items-center gap-1.5">
                <Calendar size={13} /> {formatDate(p.start_date)} – {formatDate(p.end_date)}
              </span>
            )}
          </div>

          {/* Metrics */}
          {p.metrics && p.metrics.length > 0 && (
            <div className="flex flex-wrap gap-4 border-t border-white/10 pt-5 mb-5">
              {p.metrics.map((m, i) => (
                <div key={i} className="min-w-[80px]">
                  <span className="block text-xl font-bold text-white">{m.value}</span>
                  <span className="text-[11px] text-gray-500">{m.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {p.tags && p.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {p.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-gray-400 border border-white/5"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={onToggle}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-cyan)] hover:underline w-fit"
          >
            {labels.viewDetails}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && <ExpandedDetails project={p} labels={labels} />}
    </div>
  );
}

/* ─── Standard Project Card ──────────────────────────────── */
function ProjectCard({
  project: p,
  labels,
  expanded,
  onToggle,
}: {
  project: LocalizedProyecto;
  labels: Labels;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="group rounded-2xl overflow-hidden bg-glass border border-white/5 hover:border-[var(--accent-cyan)]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_-15px_rgba(0,186,224,0.1)] flex flex-col">
      {/* Image */}
      <div className="relative h-48 bg-gray-900 overflow-hidden">
        {p.img_url ? (
          <Image
            src={p.img_url}
            alt={p._title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-10">
            🏗️
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-dark)] to-transparent z-10" />

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-20">
          {p._category && (
            <span className="px-2.5 py-0.5 bg-black/50 backdrop-blur-md rounded-full text-[10px] font-bold tracking-wider text-[var(--accent-green)] border border-white/10 uppercase">
              {p._category}
            </span>
          )}
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border backdrop-blur-md ${p._statusColor}`}
          >
            {p._statusLabel}
          </span>
        </div>
        {p.featured && (
          <div className="absolute top-3 right-3 z-20">
            <Star size={16} className="text-amber-400 fill-amber-400" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold mb-2 line-clamp-2">{p._title}</h3>
        {p._excerpt && (
          <p className="text-gray-400 text-sm mb-4 line-clamp-3 leading-relaxed">{p._excerpt}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-gray-500 mb-4 mt-auto">
          {p.location && (
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {p.location}
            </span>
          )}
          {p.client_name && (
            <span className="flex items-center gap-1">
              <Building2 size={12} /> {p.client_name}
            </span>
          )}
        </div>

        {/* Metrics preview */}
        {p.metrics && p.metrics.length > 0 && (
          <div className="flex gap-3 border-t border-white/10 pt-3 mb-3">
            {p.metrics.slice(0, 3).map((m, i) => (
              <div key={i}>
                <span className="block text-base font-bold text-white">{m.value}</span>
                <span className="text-[10px] text-gray-500">{m.label}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onToggle}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-cyan)] hover:underline w-fit mt-auto"
        >
          {labels.viewDetails}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded */}
      {expanded && <ExpandedDetails project={p} labels={labels} />}
    </div>
  );
}

/* ─── Expanded details panel (shared) ────────────────────── */
function ExpandedDetails({
  project: p,
  labels,
}: {
  project: LocalizedProyecto;
  labels: Labels;
}) {
  return (
    <div className="border-t border-white/10 bg-black/20 p-5 md:p-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
      {/* Description */}
      {p._description && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
            <BarChart3 size={14} className="text-[var(--accent-cyan)]" />
            {labels.description}
          </h4>
          <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">
            {p._description}
          </p>
        </div>
      )}

      {/* Full metrics */}
      {p.metrics && p.metrics.length > 0 && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3">
            <BarChart3 size={14} className="text-[var(--accent-green)]" />
            {labels.metrics}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {p.metrics.map((m, i) => (
              <div
                key={i}
                className="bg-white/5 rounded-xl p-3 border border-white/5 text-center"
              >
                <span className="block text-lg font-bold text-white">{m.value}</span>
                <span className="text-[11px] text-gray-500">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline + Client + Location details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {p.location && (
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1">
              <MapPin size={12} /> {labels.location}
            </span>
            <span className="text-sm text-white">{p.location}</span>
          </div>
        )}
        {p.client_name && (
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1">
              <Building2 size={12} /> {labels.client}
            </span>
            <span className="text-sm text-white">{p.client_name}</span>
          </div>
        )}
        {(p.start_date || p.end_date) && (
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1">
              <Calendar size={12} /> {labels.dates}
            </span>
            <span className="text-sm text-white">
              {formatDate(p.start_date)} – {formatDate(p.end_date)}
            </span>
          </div>
        )}
      </div>

      {/* Tags */}
      {p.tags && p.tags.length > 0 && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
            <Tag size={14} className="text-[var(--accent-cyan)]" />
            {labels.tags}
          </h4>
          <div className="flex flex-wrap gap-2">
            {p.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-lg bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] text-xs border border-[var(--accent-cyan)]/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Gallery */}
      {p.gallery && p.gallery.length > 0 && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3">
            <ImageIcon size={14} className="text-[var(--accent-green)]" />
            {labels.gallery}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {p.gallery.map((url, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl overflow-hidden bg-gray-900 border border-white/5 hover:border-white/20 transition-all duration-200 hover:scale-[1.02]"
              >
                <Image
                  src={url}
                  alt={`${p._title} ${i + 1}`}
                  width={300}
                  height={300}
                  className="object-cover w-full h-full"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
