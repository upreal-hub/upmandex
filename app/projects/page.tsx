import Link from "next/link";

import { prisma } from "@/lib/prisma";

import styles from "./projects.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProjectsPage() {
  const projects = await prisma.personProject.findMany({
    where: { person: { is: { isPublic: true } } },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      person: {
        select: {
          id: true,
          displayName: true,
          user: { select: { twitchLogin: true } },
        },
      },
    },
  });

  return (
    <main className={styles.projectsPage}>
      <header className={styles.hero}>
        <p>COMMUNITY NOTES</p>
        <h1>PROJECTS</h1>
        <span>Small ideas, works in progress, and tiny worlds shared around UPMANDEX.</span>
      </header>

      {projects.length > 0 ? (
        <section className={styles.grid} aria-label="Community projects">
          {projects.map((project) => {
            const profileHref = `/people/${project.person.id}`;

            return (
              <article key={project.id} className={styles.note}>
                <h2>{project.title}</h2>
                <p>{project.description}</p>
                <footer>
                  <Link href={profileHref} className={styles.personLink}>
                    by {project.person.displayName}
                    {project.person.user?.twitchLogin && <small>@{project.person.user.twitchLogin}</small>}
                  </Link>
                  <Link href={profileHref} className={styles.profileLink} aria-label={`View ${project.person.displayName}'s profile`}>
                    Profile <span aria-hidden="true">↗</span>
                  </Link>
                </footer>
              </article>
            );
          })}
        </section>
      ) : (
        <section className={styles.empty}>
          <span aria-hidden="true">✎</span>
          <h2>No project notes have drifted in yet.</h2>
          <p>Public projects shared from Person profiles will appear here.</p>
          <Link href="/people">Explore Creators &amp; Friends <span aria-hidden="true">→</span></Link>
        </section>
      )}
    </main>
  );
}
