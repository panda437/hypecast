"use client";
/* eslint-disable @next/next/no-img-element */

import { ArrowRight, Cloud, FileVideo, ImageIcon, Plus, UserRound } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import type { SavedProject } from "@/lib/types";

type Props = {
  projects: SavedProject[];
  loading: boolean;
  onOpenProject: (clientProjectId: string) => void;
  onNewProject: () => void;
};

export function hasProjectContent(project: SavedProject) {
  const snapshot = project.snapshot;
  return Boolean(snapshot.productUrl?.trim() || snapshot.brief || snapshot.creators.length || snapshot.reels.length);
}

function projectCast(project: SavedProject) {
  const snapshot = project.snapshot;
  return snapshot.creators.find((creator) => creator.id === snapshot.activeCastId)
    || snapshot.creators.find((creator) => creator.id === snapshot.selectedCreatorId);
}

function projectStage(project: SavedProject) {
  const snapshot = project.snapshot;
  if (snapshot.step === 3 && projectCast(project)) return "Ready to create reels";
  if (snapshot.creators.length > 0) return "Choose your cast";
  if (snapshot.brief) return "Review your product";
  return snapshot.productUrl ? "Finish reading your product link" : "Add your product link";
}

function projectDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function ProjectCard({ project, featured, onOpen }: { project: SavedProject; featured?: boolean; onOpen: () => void }) {
  const cast = projectCast(project);
  const snapshot = project.snapshot;
  const name = project.productName === "Untitled product" && snapshot.productUrl
    ? (() => { try { return new URL(snapshot.productUrl).hostname.replace(/^www\./, ""); } catch { return project.productName; } })()
    : project.productName;

  return (
    <button type="button" className={`project-card ${featured ? "project-card--featured" : ""}`} onClick={onOpen}>
      <div className="project-card-portrait">
        {cast?.imageDataUrl ? <img src={cast.imageDataUrl} alt={cast.name} /> : <UserRound size={featured ? 38 : 28} />}
      </div>
      <div className="project-card-body">
        <div className="project-card-meta"><span>{featured ? "PICK UP WHERE YOU LEFT OFF" : "STUDIO"}</span><span>{project.source === "cloud" ? <><Cloud size={12} /> Cloud saved</> : "This device only"}</span></div>
        <h2>{name}</h2>
        <p className="project-card-cast">{cast ? <>Cast: <strong>{cast.name}</strong></> : snapshot.creators.length ? `${snapshot.creators.length} cast choices ready` : "Cast not selected yet"}</p>
        <p className="project-card-stage">{projectStage(project)}</p>
        <div className="project-card-bottom"><span><FileVideo size={13} /> {snapshot.reels.length} reels</span><span><ImageIcon size={13} /> {snapshot.clips.length} backgrounds</span><span>{projectDate(project.updatedAt)}</span><span className="project-card-open">Continue <ArrowRight size={15} /></span></div>
      </div>
    </button>
  );
}

export function ProjectDashboard({ projects, loading, onOpenProject, onNewProject }: Props) {
  const visibleProjects = projects.filter(hasProjectContent);
  const [latest, ...others] = visibleProjects;

  return (
    <div className="project-dashboard">
      <header className="project-dashboard-nav"><div className="brand"><span className="brand-mark">C</span><span>CUEFACE</span></div><div className="project-dashboard-nav-actions"><button type="button" className="button button--small" onClick={onNewProject}><Plus size={15} /> New product</button><UserButton /></div></header>
      <main className="project-dashboard-main">
        <div className="project-dashboard-heading"><div><span className="eyebrow">YOUR WORKSPACE</span><h1>Your studios.</h1><p>All your saved projects and their casts, in one place. Continue a project or start something new.</p></div><span className="project-dashboard-count">{visibleProjects.length} {visibleProjects.length === 1 ? "project" : "projects"}</span></div>
        {loading && !latest ? <div className="project-dashboard-state">Loading your saved studios…</div> : latest ? (
          <>
            <ProjectCard project={latest} featured onOpen={() => onOpenProject(latest.clientProjectId)} />
            {others.length ? <section className="project-dashboard-others"><div className="project-dashboard-section-heading"><h2>All other projects</h2><span>Most recently updated first</span></div><div className="project-dashboard-grid">{others.map((project) => <ProjectCard key={project.clientProjectId} project={project} onOpen={() => onOpenProject(project.clientProjectId)} />)}</div></section> : null}
          </>
        ) : <div className="project-dashboard-empty"><UserRound size={32} /><h2>No studios yet</h2><p>Start with a product link. Your cast, stories, and reels will appear here when you return.</p><button type="button" className="button button--primary" onClick={onNewProject}>Create your first studio <ArrowRight size={15} /></button></div>}
      </main>
    </div>
  );
}
